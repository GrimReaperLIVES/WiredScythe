import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ObsService, obsAuthentication } from "./obs-service";

class FakeObsSocket extends EventTarget {
  static current: FakeObsSocket;
  scene = "Gameplay";
  muted = new Map([["Camera A", true], ["Camera B", false]]);
  enabled = new Map([[1, true], [2, true]]);
  transforms = new Map<number, Record<string, unknown>>([[1, { positionX: 25, positionY: 25 }], [2, { positionX: 50, positionY: 50 }]]);
  failOnce: string | null = null;
  dropRequests = false;
  sent: Array<{ op: number; d: Record<string, unknown> }> = [];
  constructor(readonly url: string) {
    super(); FakeObsSocket.current = this;
    queueMicrotask(() => this.message({ op: 0, d: { rpcVersion: 1, authentication: { salt: "salt", challenge: "challenge" } } }));
  }
  message(data: unknown) { this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(data) })); }
  send(raw: string) {
    const message = JSON.parse(raw) as { op: number; d: Record<string, unknown> };
    this.sent.push(message);
    if (message.op === 1) queueMicrotask(() => this.message({ op: 2, d: {} }));
    if (message.op !== 6) return;
    const type = message.d.requestType;
    if (this.dropRequests) return;
    if (type === this.failOnce) {
      this.failOnce = null;
      queueMicrotask(() => this.message({ op: 7, d: { requestId: message.d.requestId, requestStatus: { result: false, comment: "Fixture operation failed" } } }));
      return;
    }
    const request = message.d.requestData as { sceneItemId: number; inputName: string; inputMuted: boolean; sceneItemEnabled: boolean; sceneItemTransform: Record<string, unknown> };
    let data: Record<string, unknown> = {};
    if (type === "GetSceneList") data = { scenes: [{ sceneName: "Gameplay" }, { sceneName: "Spectator" }] };
    if (type === "GetInputList") data = { inputs: [{ inputName: "Camera A", inputKind: "window_capture" }, { inputName: "Camera B", inputKind: "window_capture" }] };
    if (type === "GetVideoSettings") data = { baseWidth: 1920, baseHeight: 1080 };
    if (type === "GetSceneItemList") data = { sceneItems: [{ sourceName: "Camera A", sceneItemId: 1 }, { sourceName: "Camera B", sceneItemId: 2 }] };
    if (type === "GetCurrentProgramScene") data = { currentProgramSceneName: this.scene };
    if (type === "GetInputMute") data = { inputMuted: this.muted.get(request.inputName) ?? false };
    if (type === "SetInputMute") this.muted.set(request.inputName, request.inputMuted);
    if (type === "GetSceneItemEnabled") data = { sceneItemEnabled: this.enabled.get(request.sceneItemId) ?? false };
    if (type === "SetSceneItemEnabled") this.enabled.set(request.sceneItemId, request.sceneItemEnabled);
    if (type === "GetSceneItemTransform") data = { sceneItemTransform: this.transforms.get(request.sceneItemId) ?? {} };
    if (type === "SetSceneItemTransform") this.transforms.set(request.sceneItemId, request.sceneItemTransform);
    if (type === "SetCurrentProgramScene") this.scene = (message.d.requestData as { sceneName: string }).sceneName;
    queueMicrotask(() => this.message({ op: 7, d: { requestId: message.d.requestId, requestStatus: { result: true }, responseData: data } }));
  }
  close() { this.dispatchEvent(new Event("close")); }
}

describe("OBS spectator connection", () => {
  it("arranges existing capture layers without switching the live scene", async () => {
    const service = new ObsService(); await service.connect(4455, "");
    await service.layout({ scene: "Spectator", preset: "two", sources: ["Camera A", "Camera B"], audible: "Camera A" });
    const commands = FakeObsSocket.current.sent.filter((message) => message.op === 6);
    expect(commands.filter((message) => message.d.requestType === "SetSceneItemTransform")).toHaveLength(2);
    expect(commands.some((message) => message.d.requestType === "CreateSceneItem")).toBe(false);
    expect(FakeObsSocket.current.scene).toBe("Gameplay");
    expect(commands.filter((message) => message.d.requestType === "SetInputMute")).toHaveLength(0);
    service.disconnect();
  });
  beforeEach(() => vi.stubGlobal("WebSocket", FakeObsSocket));
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  it("authenticates on localhost and restores the prior gameplay scene", async () => {
    const service = new ObsService();
    expect(await service.connect(4455, "password")).toEqual(["Gameplay", "Spectator"]);
    expect(FakeObsSocket.current.url).toBe("ws://127.0.0.1:4455");
    expect(FakeObsSocket.current.sent[0]).toEqual({ op: 1, d: { rpcVersion: 1, eventSubscriptions: 0, authentication: obsAuthentication("password", "salt", "challenge") } });
    expect(await service.toggle("Spectator")).toBe("Spectator");
    expect(await service.toggle("Spectator")).toBe("Gameplay");
    service.disconnect();
  });
  it("does not replace the return scene when a concurrent toggle is requested", async () => {
    const service = new ObsService(); await service.connect(4455, "");
    const switching = service.toggle("Spectator");
    await expect(service.toggle("Spectator")).rejects.toThrow("already in progress");
    await switching;
    expect(await service.toggle("Spectator")).toBe("Gameplay");
    service.disconnect();
  });
  it("rejects scene changes after disconnection", async () => {
    const service = new ObsService(); await service.connect(4455, ""); service.disconnect();
    await expect(service.toggle("Spectator")).rejects.toThrow("Connect to OBS first");
  });
  it("restores shared input audio when returning to gameplay", async () => {
    const service = new ObsService(); await service.connect(4455, "");
    await service.layout({ scene: "Spectator", preset: "two", sources: ["Camera A", "Camera B"], audible: "Camera A" });
    const socket = FakeObsSocket.current;
    await service.toggle("Spectator");
    expect([...socket.muted.values()]).toEqual([false, true]);
    await service.toggle("Spectator");
    expect([...socket.muted.values()]).toEqual([true, false]);
    service.disconnect();
  });
  it("restores input audio before a requested disconnect", async () => {
    const service = new ObsService(); await service.connect(4455, "");
    await service.layout({ scene: "Spectator", preset: "two", sources: ["Camera A", "Camera B"], audible: null });
    await service.toggle("Spectator"); const socket = FakeObsSocket.current;
    await service.restoreAndDisconnect();
    expect([...socket.muted.values()]).toEqual([true, false]);
    expect(service.isConnected()).toBe(false);
  });
  it("disables cameras removed from a previously managed layout", async () => {
    const service = new ObsService(); await service.connect(4455, "");
    await service.layout({ scene: "Spectator", preset: "two", sources: ["Camera A", "Camera B"], audible: null });
    await service.layout({ scene: "Spectator", preset: "two", sources: ["Camera B"], audible: null });
    expect(FakeObsSocket.current.enabled.get(1)).toBe(false);
    expect(FakeObsSocket.current.enabled.get(2)).toBe(true);
    service.disconnect();
  });
  it("rolls back transforms and visibility when layout application fails", async () => {
    const service = new ObsService(); await service.connect(4455, "");
    const socket = FakeObsSocket.current; socket.failOnce = "SetSceneItemEnabled";
    await expect(service.layout({ scene: "Spectator", preset: "two", sources: ["Camera A"], audible: null })).rejects.toThrow("Fixture operation failed");
    expect(socket.transforms.get(1)).toEqual({ positionX: 25, positionY: 25 });
    expect(socket.enabled.get(1)).toBe(true);
    service.disconnect();
  });
  it("prevents scene switching while a layout is being applied", async () => {
    const service = new ObsService(); await service.connect(4455, "");
    const applying = service.layout({ scene: "Spectator", preset: "two", sources: ["Camera A"], audible: null });
    await expect(service.toggle("Spectator")).rejects.toThrow("already in progress");
    await applying; service.disconnect();
  });
  it("marks an unresponsive OBS socket disconnected", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const service = new ObsService(); await service.connect(4455, "");
    FakeObsSocket.current.dropRequests = true;
    const pending = service.sources(); const check = expect(pending).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(10_000); await check;
    expect(service.isConnected()).toBe(false);
  });
  it("removes saved managed cameras after an app restart", async () => {
    const service = new ObsService(); await service.connect(4455, "");
    await service.layout({ scene: "Spectator", preset: "two", sources: ["Camera B"], audible: null, previousSources: ["Camera A", "Camera B"] });
    expect(FakeObsSocket.current.enabled.get(1)).toBe(false);
    expect(FakeObsSocket.current.enabled.get(2)).toBe(true);
    service.disconnect();
  });
  it("preserves the gameplay return target through a connection loss", async () => {
    const service = new ObsService(); await service.connect(4455, "");
    await service.toggle("Spectator"); FakeObsSocket.current.close();
    await service.connect(4455, ""); FakeObsSocket.current.scene = "Spectator";
    expect(await service.toggle("Spectator")).toBe("Gameplay");
    service.disconnect();
  });
  it("restores mute states if switching into Spectator fails", async () => {
    const service = new ObsService(); await service.connect(4455, "");
    await service.layout({ scene: "Spectator", preset: "two", sources: ["Camera A", "Camera B"], audible: "Camera A" });
    const socket = FakeObsSocket.current; socket.failOnce = "SetCurrentProgramScene";
    await expect(service.toggle("Spectator")).rejects.toThrow("Fixture operation failed");
    expect(socket.scene).toBe("Gameplay");
    expect([...socket.muted.values()]).toEqual([true, false]);
    service.disconnect();
  });
});
