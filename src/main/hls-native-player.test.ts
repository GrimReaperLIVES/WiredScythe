import { describe, expect, it, vi } from "vitest";
vi.mock("./filtered-hls-relay", () => ({ FilteredHlsRelay: class { mediaTransportName = "direct-cdn"; start = async () => "https://fixture.test/playlist.m3u8"; close = async () => undefined; } }));
import { HlsNativePlayer } from "./hls-native-player";

describe("decoded quality state", () => {
  function player() { return new HlsNativePlayer(() => null, () => "wiredscythe://app", async () => "https://fixture.test/source.m3u8", () => 50, () => "balanced", vi.fn()); }
  it("publishes decoded resolution separately from the requested quality", async () => {
    const service = player(); await service.start("streamer", "720p");
    service.report({ target: "main", sessionId: service.getState().hlsSource!.sessionId, status: "playing", muted: false, paused: false, volume: 50, behindLive: false, stats: { Resolution: "1920 × 1080" } });
    expect(service.getState()).toMatchObject({ quality: "720p", actualResolution: "1920 × 1080" });
    service.destroy();
  });
  it("clears old resolution on restart and ignores old-session reports", async () => {
    const service = player(); await service.start("first", "720p");
    const oldSession = service.getState().hlsSource!.sessionId;
    await service.start("second", "480p");
    service.report({ target: "main", sessionId: oldSession, status: "playing", muted: false, paused: false, volume: 50, behindLive: false, stats: { Resolution: "1920 × 1080" } });
    expect(service.getState().actualResolution).toBeUndefined();
    service.destroy();
  });
});
