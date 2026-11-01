import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ObsService, obsAuthentication } from "./obs-service";

class FakeObsSocket extends EventTarget {
  static current: FakeObsSocket;
  scene = "Gameplay";
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
    let data: Record<string, unknown> = {};
    if (type === "GetSceneList") data = { scenes: [{ sceneName: "Gameplay" }, { sceneName: "Spectator" }] };
    if (type === "GetInputList") data = { inputs: [{ inputName: "Camera A", inputKind: "window_capture" }, { inputName: "Camera B", inputKind: "window_capture" }] };
    if (type === "GetVideoSettings") data = { baseWidth: 1920, baseHeight: 1080 };
    if (type === "GetSceneItemList") data = { sceneItems: [{ sourceName: "Camera A", sceneItemId: 1 }, { sourceName: "Camera B", sceneItemId: 2 }] };
    if (type === "GetCurrentProgramScene") data = { currentProgramSceneName: this.scene };
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
    expect(commands.filter((message) => message.d.requestType === "SetInputMute").map((message) => message.d.requestData)).toEqual([{ inputName: "Camera A", inputMuted: false }, { inputName: "Camera B", inputMuted: true }]);
    service.disconnect();
  });
  beforeEach(() => vi.stubGlobal("WebSocket", FakeObsSocket));
  afterEach(() => vi.unstubAllGlobals());
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
});
