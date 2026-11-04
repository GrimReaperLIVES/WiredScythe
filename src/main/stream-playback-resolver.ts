import type { ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import type {
  NativePlayerAvailability,
  NativeQuality,
  NativeQualityValue,
} from "../shared/player";
import { parseStreamlinkQualityOutput } from "../shared/player";
import { streamQualitySelector } from "../shared/playback-quality";
import { isMissingRendition } from "../shared/playback-errors";
import {
  channelUrl,
  parseChannelKey,
  streamlinkPlatformArguments,
} from "../shared/platform";
import { getNativeRuntimeAvailability } from "./native-runtime";
import {
  redactSensitivePlaybackText,
  spawnStreamlink,
} from "./streamlink-process";

const RESOLVE_CACHE_LIFETIME = 60_000;
const QUALITY_CACHE_LIFETIME = 5 * 60_000;
const MAX_CONCURRENT_PRERESOLVES = 2;

/**
 * Resolves public Twitch and Kick streams for Chromium HLS playback. Optional
 * service sessions can improve available qualities, but never gate playback.
 * This owns only Streamlink processes and caches; it has no video-rendering
 * dependency and can be used independently by every player surface.
 */
export class StreamPlaybackResolver {
  private resolutionGeneration = 0;
  private resolverProcess: ChildProcess | null = null;
  private readonly preresolveProcesses = new Set<ChildProcess>();
  private readonly resolveCache = new Map<
    string,
    { expiresAt: number; url: Promise<string>; generation?: number }
  >();
  private readonly qualityCache = new Map<
    string,
    { expiresAt: number; result: Promise<NativeQuality[]> }
  >();

  constructor(
    private readonly getTwitchPlaybackToken: () => string | null,
    private readonly getKickCookie: () => Promise<string | null> = async () => null,
  ) {}

  getAvailability(): NativePlayerAvailability {
    return getNativeRuntimeAvailability();
  }

  private async sessionKey(channel: string): Promise<string> {
    const platform = parseChannelKey(channel).platform;
    const credential = platform === "kick" ? await this.getKickCookie() : this.getTwitchPlaybackToken();
    return createHash("sha256").update(`${platform}:${credential ?? "anonymous"}`).digest("hex");
  }

  async getQualities(channel: string): Promise<NativeQuality[]> {
    const target = parseChannelKey(channel);
    const playbackToken = target.platform === "twitch" ? this.getTwitchPlaybackToken() : null;
    const kickCookie = target.platform === "kick" ? await this.getKickCookie() : null;
    const cacheKey = `${channel}:${await this.sessionKey(channel)}`;
    const cached = this.qualityCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.result;

    const availability = this.getAvailability();
    if (!availability.available || !availability.streamlinkPath) {
      return Promise.resolve([{ value: "best", label: "Auto" }]);
    }

    const result = new Promise<NativeQuality[]>((resolve) => {
      const child = spawnStreamlink(
        availability.streamlinkPath!,
        [
          "--no-config",
          "--loglevel",
          "none",
          ...streamlinkPlatformArguments(target.platform),
          ...(kickCookie === null ? [] : ["--http-cookie", kickCookie]),
          channelUrl(target.platform, target.login),
        ],
        playbackToken,
        {
          windowsHide: true,
          stdio: ["ignore", "pipe", "ignore"],
        },
      );
      let output = "";
      let settled = false;
      const finish = (qualities: NativeQuality[]) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(qualities);
      };
      const timeout = setTimeout(() => {
        child.kill();
        finish([{ value: "best", label: "Auto" }]);
      }, 12_000);

      child.stdout?.on("data", (chunk: Buffer | string) => {
        if (output.length < 32_768) output += chunk.toString();
      });
      child.on("error", () => finish([{ value: "best", label: "Auto" }]));
      child.on("close", () => finish(parseStreamlinkQualityOutput(output)));
    });
    this.qualityCache.set(cacheKey, {
      expiresAt: Date.now() + QUALITY_CACHE_LIFETIME,
      result,
    });
    return result;
  }

  preresolve(channel: string, quality: NativeQualityValue = "720p"): void {
    void this.prewarm(channel, quality).catch(() => undefined);
  }

  private async prewarm(channel: string, quality: NativeQualityValue): Promise<void> {
    if (!this.getAvailability().available) return;
    const key = `${channel.toLowerCase()}:${quality}:${await this.sessionKey(channel)}`;
    const cached = this.resolveCache.get(key);
    if (cached && cached.expiresAt > Date.now() && (cached.generation === undefined || cached.generation === this.resolutionGeneration)) return;
    if (this.preresolveProcesses.size >= MAX_CONCURRENT_PRERESOLVES) return;
    const url = this.resolveStreamUrl(channel, quality, false);
    this.storeResolvedUrl(key, url);
    url.catch(() => undefined);
  }

  async resolve(channel: string, quality: NativeQualityValue): Promise<string> {
    const generation = this.resolutionGeneration;
    const key = `${channel.toLowerCase()}:${quality}:${await this.sessionKey(channel)}`;
    if (generation !== this.resolutionGeneration) throw Object.assign(new Error("Stream resolution cancelled."), { name: "AbortError" });
    const cached = this.resolveCache.get(key);
    if (cached && cached.expiresAt > Date.now() && (cached.generation === undefined || cached.generation === generation)) return cached.url;
    // A channel may be live without publishing the exact requested ladder
    // (for example, no 720p rendition). Fall back to the best available URL
    // instead of incorrectly reporting that the channel is offline.
    const url = this.resolveStreamUrl(channel, quality, true).catch((error) => {
      if (generation !== this.resolutionGeneration) throw Object.assign(new Error("Stream resolution cancelled."), { name: "AbortError" });
      if (!isMissingRendition(error) || quality === "best" || quality === "worst" || quality === "audio_only") {
        throw error;
      }
      return this.resolveStreamUrl(channel, "best", true);
    });
    this.storeResolvedUrl(key, url, generation);
    return url;
  }

  cancelActiveResolution(): void {
    this.resolutionGeneration += 1;
    if (!this.resolverProcess) return;
    this.resolverProcess.kill();
    this.resolverProcess = null;
  }

  destroy(): void {
    this.cancelActiveResolution();
    for (const process of this.preresolveProcesses) process.kill();
    this.preresolveProcesses.clear();
    this.resolveCache.clear();
    this.qualityCache.clear();
  }

  private storeResolvedUrl(key: string, url: Promise<string>, generation?: number): void {
    const entry = { expiresAt: Date.now() + RESOLVE_CACHE_LIFETIME, url, generation };
    this.resolveCache.set(key, entry);
    url.catch(() => {
      if (this.resolveCache.get(key) === entry) this.resolveCache.delete(key);
    });
  }

  private async resolveStreamUrl(
    channel: string,
    quality: NativeQualityValue,
    trackAsPrimary: boolean,
  ): Promise<string> {
    const streamlinkPath = this.getAvailability().streamlinkPath;
    if (!streamlinkPath) throw new Error("Streamlink is unavailable.");
    const { platform, login } = parseChannelKey(channel);
    const generation = this.resolutionGeneration;
    const playbackToken = platform === "twitch" ? this.getTwitchPlaybackToken() : null;
    const kickCookie = platform === "kick" ? await this.getKickCookie() : null;
    if (trackAsPrimary && generation !== this.resolutionGeneration) throw Object.assign(new Error("Stream resolution cancelled."), { name: "AbortError" });

    return new Promise((resolve, reject) => {
      const child = spawnStreamlink(
        streamlinkPath,
        [
          "--no-config",
          "--loglevel",
          "error",
          "--stream-url",
          ...streamlinkPlatformArguments(platform),
          ...(kickCookie === null ? [] : ["--http-cookie", kickCookie]),
          channelUrl(platform, login),
          streamQualitySelector(quality),
        ],
        playbackToken,
        {
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      if (trackAsPrimary) this.resolverProcess = child;
      else this.preresolveProcesses.add(child);

      let output = "";
      let errorOutput = "";
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (this.resolverProcess === child) this.resolverProcess = null;
        this.preresolveProcesses.delete(child);
        if (error) {
          reject(error);
          return;
        }
        const url = output
          .split(/\r?\n/)
          .map((line) => line.trim())
          .find((line) => /^https?:\/\//i.test(line));
        if (url) {
          resolve(url);
          return;
        }
        const details = redactSensitivePlaybackText(errorOutput.trim());
        reject(
          new Error(
            details || "No playable stream URL was returned. Retry or check the service connection.",
          ),
        );
      };
      const timeout = setTimeout(() => {
        finish(new Error("Streamlink timed out while resolving the stream."));
        child.kill();
      }, 20_000);

      child.stdout?.on("data", (chunk: Buffer | string) => {
        if (output.length < 65_536) output += chunk.toString();
      });
      child.stderr?.on("data", (chunk: Buffer | string) => {
        if (errorOutput.length < 16_384) errorOutput += chunk.toString();
      });
      child.on("error", (error) => finish(error));
      child.on("close", (code) => {
        if (child.killed) {
          const error = new Error("Stream resolution cancelled.");
          error.name = "AbortError";
          finish(error);
          return;
        }
        if (code === 0) {
          finish();
          return;
        }
        const details = redactSensitivePlaybackText(errorOutput.trim());
        finish(details ? new Error(details) : undefined);
      });
    });
  }
}
