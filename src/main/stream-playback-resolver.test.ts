import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));
vi.mock("./native-runtime", () => ({ getNativeRuntimeAvailability: () => ({ available: true, streamlinkPath: "fixture" }) }));
vi.mock("./streamlink-process", () => ({ spawnStreamlink: spawnMock, redactSensitivePlaybackText: (value: string) => value }));
import { StreamPlaybackResolver } from "./stream-playback-resolver";

class Process extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  killed = false;
  kill() { this.killed = true; queueMicrotask(() => this.emit("close", null, "SIGTERM")); return true; }
}
describe("resolver error recovery", () => {
  let resolver: StreamPlaybackResolver;
  let children: Process[];
  beforeEach(() => {
    children = [];
    spawnMock.mockReset().mockImplementation(() => { const child = new Process(); children.push(child); return child; });
    resolver = new StreamPlaybackResolver(() => null);
  });
  afterEach(() => resolver.destroy());
  it("falls back only when the requested rendition is missing", async () => {
    const result = resolver.resolve("streamer", "1080p");
    await vi.waitFor(() => expect(children).toHaveLength(1));
    children[0].stderr.emit("data", "The specified stream(s) '1080p' could not be found. Available streams: 720p");
    children[0].emit("close", 1);
    await vi.waitFor(() => expect(children).toHaveLength(2));
    children[1].stdout.emit("data", "https://cdn.example/live.m3u8\n"); children[1].emit("close", 0);
    await expect(result).resolves.toBe("https://cdn.example/live.m3u8");
  });
  it("preserves authentication failures without retrying best", async () => {
    const result = resolver.resolve("streamer", "1080p");
    const check = expect(result).rejects.toThrow("403 Forbidden");
    await vi.waitFor(() => expect(children).toHaveLength(1));
    children[0].stderr.emit("data", "403 Forbidden"); children[0].emit("close", 1);
    await check; expect(children).toHaveLength(1);
  });
  it("cancels without launching a replacement resolver", async () => {
    const result = resolver.resolve("streamer", "720p");
    const check = expect(result).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(children).toHaveLength(1));
    resolver.cancelActiveResolution(); await check;
    expect(children).toHaveLength(1);
  });
  it("does not invent offline status when the resolver returns nothing", async () => {
    const result = resolver.resolve("streamer", "720p");
    const check = expect(result).rejects.toThrow("No playable stream URL was returned");
    await vi.waitFor(() => expect(children).toHaveLength(1));
    children[0].emit("close", 1); await check;
    expect(children).toHaveLength(1);
  });
  it("does not reuse a resolved URL after switching Twitch sessions", async () => {
    let token: string | null = "fixture-session-one";
    resolver = new StreamPlaybackResolver(() => token);
    const first = resolver.resolve("streamer", "720p");
    await vi.waitFor(() => expect(children).toHaveLength(1));
    children[0].stdout.emit("data", "https://cdn.example/first.m3u8"); children[0].emit("close", 0);
    await first;
    await expect(resolver.resolve("streamer", "720p")).resolves.toContain("first.m3u8");
    expect(children).toHaveLength(1);
    token = "fixture-session-two";
    const second = resolver.resolve("streamer", "720p");
    await vi.waitFor(() => expect(children).toHaveLength(2));
    children[1].stdout.emit("data", "https://cdn.example/second.m3u8"); children[1].emit("close", 0);
    await expect(second).resolves.toContain("second.m3u8");
  });
  it("uses Kick session credentials for quality discovery without a Twitch token", async () => {
    let cookie = "session=fixture-one";
    resolver = new StreamPlaybackResolver(() => "fixture-twitch-token", async () => cookie);
    const first = resolver.getQualities("kick:streamer");
    await vi.waitFor(() => expect(children).toHaveLength(1));
    expect(spawnMock.mock.calls[0][1]).toContain(cookie);
    expect(spawnMock.mock.calls[0][2]).toBeNull();
    children[0].emit("close", 0); await first;
    await resolver.getQualities("kick:streamer"); expect(children).toHaveLength(1);
    cookie = "session=fixture-two";
    const second = resolver.getQualities("kick:streamer");
    await vi.waitFor(() => expect(children).toHaveLength(2));
    children[1].emit("close", 0); await second;
  });
  it("reuses the prewarmed requested quality", async () => {
    resolver.preresolve("streamer", "480p");
    await vi.waitFor(() => expect(children).toHaveLength(1));
    expect(spawnMock.mock.calls[0][1].at(-1)).toBe("480p");
    children[0].stdout.emit("data", "https://cdn.example/warm.m3u8"); children[0].emit("close", 0);
    await expect(resolver.resolve("streamer", "480p")).resolves.toContain("warm.m3u8");
    expect(children).toHaveLength(1);
  });
  it("cancels while Kick session credentials are still loading", async () => {
    let finishCookie!: (value: string | null) => void;
    resolver = new StreamPlaybackResolver(() => null, () => new Promise(resolve => { finishCookie = resolve; }));
    const result = resolver.resolve("kick:streamer", "720p");
    const check = expect(result).rejects.toMatchObject({ name: "AbortError" });
    resolver.cancelActiveResolution(); finishCookie(null); await check;
    expect(children).toHaveLength(0);
  });
  it("does not retry a completed rendition failure after the viewer cancels", async () => {
    const result = resolver.resolve("streamer", "1080p");
    const check = expect(result).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(children).toHaveLength(1));
    children[0].stderr.emit("data", "The specified stream(s) '1080p' could not be found");
    children[0].emit("close", 1); resolver.cancelActiveResolution(); await check;
    expect(children).toHaveLength(1);
  });
  it("does not reuse a cancelled pending URL for a new same-channel request", async () => {
    const first = resolver.resolve("streamer", "720p");
    const check = expect(first).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(children).toHaveLength(1));
    resolver.cancelActiveResolution();
    const second = resolver.resolve("streamer", "720p");
    await check; await vi.waitFor(() => expect(children).toHaveLength(2));
    children[1].stdout.emit("data", "https://cdn.example/reopened.m3u8"); children[1].emit("close", 0);
    await expect(second).resolves.toContain("reopened.m3u8");
  });
});
