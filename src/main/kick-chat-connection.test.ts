import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KickChatService } from "./kick-chat-service";
import type { KickService } from "./kick-service";

class Socket {
  static instances: Socket[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  constructor() { Socket.instances.push(this); }
  frame(event: string, data: unknown = {}, channel?: string) {
    this.onmessage?.({ data: JSON.stringify({ event, data: JSON.stringify(data), channel }) });
  }
}

describe("Kick chat connection recovery", () => {
  let service: KickChatService;
  const states = vi.fn();
  const messages = vi.fn();
  const getChannel = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    Socket.instances = [];
    vi.stubGlobal("WebSocket", Socket);
    states.mockClear(); messages.mockClear();
    getChannel.mockReset().mockResolvedValue({ id: "1", chatroomId: "2" });
    service = new KickChatService(() => ({ getChannel, getChatHistory: async () => [] }) as unknown as KickService, messages, states, vi.fn());
  });
  afterEach(() => { service.disconnect(); vi.useRealTimers(); vi.unstubAllGlobals(); });
  async function subscribe() {
    await service.connect("streamer");
    const socket = Socket.instances[0];
    socket.onopen?.();
    socket.frame("pusher:connection_established", { activity_timeout: 10 });
    socket.frame("pusher_internal:subscription_succeeded", {}, "chatrooms.2.v2");
    return socket;
  }
  it("waits for handshake and subscription confirmation before reporting connected", async () => {
    await service.connect("streamer");
    const socket = Socket.instances[0]; socket.onopen?.();
    expect(socket.send).not.toHaveBeenCalled();
    expect(states).not.toHaveBeenCalledWith("connected");
    socket.frame("pusher:connection_established", {});
    expect(JSON.parse(socket.send.mock.calls[0][0])).toMatchObject({ event: "pusher:subscribe", data: { channel: "chatrooms.2.v2" } });
    socket.frame("pusher_internal:subscription_succeeded", {}, "chatrooms.other.v2");
    expect(states).not.toHaveBeenCalledWith("connected");
    socket.frame("pusher_internal:subscription_succeeded", {}, "chatrooms.2.v2");
    expect(states).toHaveBeenLastCalledWith("connected");
  });
  it("answers server keepalive pings", async () => {
    const socket = await subscribe(); socket.frame("pusher:ping");
    expect(JSON.parse(socket.send.mock.calls.at(-1)![0])).toEqual({ event: "pusher:pong", data: {} });
  });
  it("pings idle connections and keeps a responsive quiet channel connected", async () => {
    const socket = await subscribe();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(JSON.parse(socket.send.mock.calls.at(-1)![0]).event).toBe("pusher:ping");
    socket.frame("pusher:pong");
    await vi.advanceTimersByTimeAsync(5_000);
    expect(socket.close).not.toHaveBeenCalled();
  });
  it("reconnects a silent connection and resubscribes", async () => {
    const socket = await subscribe();
    await vi.advanceTimersByTimeAsync(41_000);
    expect(socket.close).toHaveBeenCalled();
    expect(Socket.instances).toHaveLength(2);
    const next = Socket.instances[1]; next.onopen?.(); next.frame("pusher:connection_established");
    expect(JSON.parse(next.send.mock.calls[0][0]).event).toBe("pusher:subscribe");
    next.frame("pusher_internal:subscription_succeeded", {}, "chatrooms.2.v2");
    next.frame("App\\Events\\ChatMessageEvent", { id: "recovered", content: "messages resumed", sender: { username: "viewer", slug: "viewer" } });
    expect(messages).toHaveBeenCalledWith(expect.objectContaining({ channel: "streamer", text: "messages resumed" }));
  });
  it("retries when a socket opens but its subscription is never confirmed", async () => {
    await service.connect("streamer"); Socket.instances[0].onopen?.();
    await vi.advanceTimersByTimeAsync(31_000);
    expect(Socket.instances).toHaveLength(2);
    expect(states).not.toHaveBeenCalledWith("connected");
  });
  it("stops reconnecting when the viewer leaves", async () => {
    const socket = await subscribe(); socket.onerror?.(); service.disconnect();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(Socket.instances).toHaveLength(1);
  });
  it("retries failed and missing initial room lookups before opening a socket", async () => {
    getChannel.mockRejectedValueOnce(new Error("Network unavailable")).mockResolvedValueOnce(null);
    await service.connect("streamer");
    expect(Socket.instances).toHaveLength(0);
    expect(states).toHaveBeenLastCalledWith("reconnecting");
    await vi.advanceTimersByTimeAsync(3_000);
    expect(getChannel).toHaveBeenCalledTimes(3);
    expect(Socket.instances).toHaveLength(1);
  });
  it("cancels pending room-lookup retries when leaving", async () => {
    getChannel.mockRejectedValue(new Error("Network unavailable"));
    await service.connect("streamer"); service.disconnect();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(getChannel).toHaveBeenCalledTimes(1);
  });
  it("ignores a stale lookup rejection after switching channels", async () => {
    let rejectLookup!: (error: Error) => void;
    getChannel.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectLookup = reject; }));
    const first = service.connect("first");
    await service.connect("second");
    rejectLookup(new Error("Old lookup failed")); await first;
    await vi.advanceTimersByTimeAsync(2_000);
    expect(getChannel).toHaveBeenCalledTimes(2);
    expect(Socket.instances).toHaveLength(1);
  });
});
