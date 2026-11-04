import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { spectatorFrames, type SpectatorPreset } from "../shared/spectator-layout";

export function obsAuthentication(password: string, salt: string, challenge: string): string {
  const hash = (value: string) => createHash("sha256").update(value).digest("base64");
  return hash(hash(password + salt) + challenge);
}

const envelope = z.object({ op: z.number(), d: z.record(z.string(), z.unknown()) });
const responseSchema = z.object({ requestId: z.string(), requestStatus: z.object({ result: z.boolean(), comment: z.string().optional() }), responseData: z.record(z.string(), z.unknown()).optional() });

/** OBS v5 connection; credentials stay in memory and are never logged. */
export class ObsService {
  private socket: WebSocket | null = null;
  private ready = false;
  private port: number | null = null;
  private previousScene: string | null = null;
  private toggling = false;
  private readonly layouts = new Map<string, { sources: string[]; audible: string | null }>();
  private readonly managedSources = new Map<string, Set<string>>();
  private readonly audioBefore = new Map<string, boolean>();
  private pending = new Map<string, { resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();

  disconnect(resetReturnScene = true): void {
    this.ready = false;
    if (resetReturnScene) this.previousScene = null;
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error("OBS disconnected."));
    }
    this.pending.clear();
  }

  async connect(port: number, password: string): Promise<string[]> {
    if (this.port !== null && this.port !== port && this.audioBefore.size > 0 && !this.ready) throw new Error("Reconnect to the previous OBS port to restore its audio before connecting to another OBS instance.");
    if (this.ready) await this.restoreAudio();
    this.disconnect(false);
    this.port = port;
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    this.socket = socket;
    await new Promise<void>((resolve, reject) => {
      let identified = false;
      const timer = setTimeout(() => { reject(new Error("OBS connection timed out. Check WebSocket settings in OBS.")); this.disconnect(false); }, 10000);
      const fail = () => {
        clearTimeout(timer);
        if (!identified) reject(new Error("OBS connection failed. Check the port and password."));
        if (this.socket === socket) this.disconnect(false);
      };
      socket.addEventListener("error", fail);
      socket.addEventListener("close", fail);
      socket.addEventListener("message", (event) => {
        if (this.socket !== socket) return;
        try {
          const message = envelope.parse(JSON.parse(String(event.data)));
          if (message.op === 0) {
            const auth = z.object({ salt: z.string(), challenge: z.string() }).optional().parse(message.d.authentication);
            socket.send(JSON.stringify({ op: 1, d: { rpcVersion: 1, eventSubscriptions: 0, ...(auth ? { authentication: obsAuthentication(password, auth.salt, auth.challenge) } : {}) } }));
          } else if (message.op === 2) {
            identified = true;
            clearTimeout(timer);
            this.ready = true;
            resolve();
          } else if (message.op === 7) {
            const data = responseSchema.parse(message.d);
            const pending = this.pending.get(data.requestId);
            if (!pending) return;
            this.pending.delete(data.requestId);
            clearTimeout(pending.timer);
            if (data.requestStatus.result) pending.resolve(data.responseData ?? {});
            else pending.reject(new Error(data.requestStatus.comment ?? "OBS rejected the request."));
          }
        } catch { fail(); }
      });
    });
    await this.restoreAudio();
    return this.sceneNames();
  }

  isConnected(): boolean { return this.ready; }

  async sceneNames(): Promise<string[]> {
    if (!this.ready) return [];
    const data = await this.request("GetSceneList");
    return z.array(z.object({ sceneName: z.string() })).parse(data.scenes).map((scene) => scene.sceneName);
  }

  private request(requestType: string, requestData: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const socket = this.socket;
    if (!socket || !this.ready) return Promise.reject(new Error("Connect to OBS first."));
    return new Promise((resolve, reject) => {
      const requestId = randomUUID();
      const timer = setTimeout(() => { this.pending.delete(requestId); reject(new Error("OBS request timed out. Reconnect before retrying.")); this.disconnect(false); }, 10000);
      this.pending.set(requestId, { resolve, reject, timer });
      try { socket.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData } })); }
      catch { clearTimeout(timer); this.pending.delete(requestId); reject(new Error("OBS connection closed.")); }
    });
  }

  async sources(): Promise<string[]> {
    const data = await this.request("GetInputList");
    return z.array(z.object({ inputName: z.string(), inputKind: z.string() })).parse(data.inputs)
      .filter((input) => /capture|browser|ffmpeg|vlc|dshow/.test(input.inputKind))
      .map((input) => input.inputName);
  }

  async layout(config: { scene: string; preset: SpectatorPreset; sources: string[]; audible: string | null; previousSources?: string[] }): Promise<void> {
    if (this.toggling) throw new Error("OBS layout or scene change is already in progress.");
    this.toggling = true;
    try { await this.applyLayout(config); } finally { this.toggling = false; }
  }

  private async applyLayout(config: { scene: string; preset: SpectatorPreset; sources: string[]; audible: string | null; previousSources?: string[] }): Promise<void> {
    if (config.audible !== null && !config.sources.includes(config.audible)) throw new Error("Choose audio from a selected camera source.");
    const undo: Array<() => Promise<unknown>> = [];
    try {
    const available = await this.sources();
    if (config.sources.some((name) => !available.includes(name))) throw new Error("A selected OBS capture source no longer exists. Refresh the connection.");
    const scenes = await this.request("GetSceneList");
    const names = z.array(z.object({ sceneName: z.string() })).parse(scenes.scenes);
    if (!names.some((entry) => entry.sceneName === config.scene)) {
      await this.request("CreateScene", { sceneName: config.scene });
      undo.push(() => this.request("RemoveScene", { sceneName: config.scene }));
    }
    const video = await this.request("GetVideoSettings");
    const dimensions = z.object({ baseWidth: z.number().positive(), baseHeight: z.number().positive() }).parse(video);
    const frames = spectatorFrames(config.preset, config.sources.length, dimensions.baseWidth, dimensions.baseHeight);
    const items = await this.request("GetSceneItemList", { sceneName: config.scene });
    const existing = z.array(z.object({ sourceName: z.string(), sceneItemId: z.number() })).parse(items.sceneItems);
    for (const [index, sourceName] of config.sources.entries()) {
      let sceneItemId = existing.find((item) => item.sourceName === sourceName)?.sceneItemId;
      if (sceneItemId === undefined) {
        const created = await this.request("CreateSceneItem", { sceneName: config.scene, sourceName, sceneItemEnabled: true });
        sceneItemId = z.number().parse(created.sceneItemId);
        const createdId = sceneItemId;
        undo.push(() => this.request("RemoveSceneItem", { sceneName: config.scene, sceneItemId: createdId }));
      } else {
        const previous = await this.request("GetSceneItemTransform", { sceneName: config.scene, sceneItemId });
        const transform = z.record(z.string(), z.unknown()).parse(previous.sceneItemTransform);
        const writable = new Set(["positionX", "positionY", "rotation", "scaleX", "scaleY", "alignment", "boundsType", "boundsAlignment", "boundsWidth", "boundsHeight", "cropLeft", "cropRight", "cropTop", "cropBottom", "cropToBounds"]);
        const restore = Object.fromEntries(Object.entries(transform).filter(([key]) => writable.has(key)));
        const enabled = await this.request("GetSceneItemEnabled", { sceneName: config.scene, sceneItemId });
        const itemId = sceneItemId;
        const wasEnabled = z.boolean().parse(enabled.sceneItemEnabled);
        undo.push(() => this.request("SetSceneItemEnabled", { sceneName: config.scene, sceneItemId: itemId, sceneItemEnabled: wasEnabled }));
        undo.push(() => this.request("SetSceneItemTransform", { sceneName: config.scene, sceneItemId: itemId, sceneItemTransform: restore }));
      }
      const frame = frames[index];
      await this.request("SetSceneItemTransform", { sceneName: config.scene, sceneItemId, sceneItemTransform: { positionX: frame.x, positionY: frame.y, rotation: 0, alignment: 5, boundsType: "OBS_BOUNDS_SCALE_INNER", boundsAlignment: 0, boundsWidth: frame.width, boundsHeight: frame.height, cropLeft: 0, cropRight: 0, cropTop: 0, cropBottom: 0 } });
      await this.request("SetSceneItemEnabled", { sceneName: config.scene, sceneItemId, sceneItemEnabled: true });
    }
    const previousSources = new Set([...(this.managedSources.get(config.scene) ?? []), ...(config.previousSources ?? [])]);
    for (const item of existing) {
      if (!previousSources.has(item.sourceName) || config.sources.includes(item.sourceName)) continue;
      const enabled = await this.request("GetSceneItemEnabled", { sceneName: config.scene, sceneItemId: item.sceneItemId });
      const wasEnabled = z.boolean().parse(enabled.sceneItemEnabled);
      undo.push(() => this.request("SetSceneItemEnabled", { sceneName: config.scene, sceneItemId: item.sceneItemId, sceneItemEnabled: wasEnabled }));
      await this.request("SetSceneItemEnabled", { sceneName: config.scene, sceneItemId: item.sceneItemId, sceneItemEnabled: false });
    }
    this.managedSources.set(config.scene, new Set(config.sources));
    this.layouts.set(config.scene, { sources: [...config.sources], audible: config.audible });
    } catch (error) {
      const results = [];
      for (const restore of undo.reverse()) { try { await restore(); } catch { results.push(false); } }
      if (results.length) throw new Error("OBS layout failed and some changes could not be restored. Reconnect and inspect the named scene before broadcasting.", { cause: error });
      throw error;
    }
  }

  private async restoreAudio(): Promise<void> {
    const failed: string[] = [];
    for (const [inputName, inputMuted] of this.audioBefore) {
      try { await this.request("SetInputMute", { inputName, inputMuted }); this.audioBefore.delete(inputName); }
      catch { failed.push(inputName); }
    }
    if (failed.length) throw new Error("Some OBS audio states could not be restored. Reconnect and retry before broadcasting.");
  }

  async restoreAndDisconnect(): Promise<void> {
    if (this.ready) await this.restoreAudio();
    this.disconnect();
  }

  async toggle(scene: string): Promise<string> {
    if (this.toggling) throw new Error("OBS scene change is already in progress.");
    this.toggling = true;
    try {
      const data = await this.request("GetCurrentProgramScene");
      const current = z.string().parse(data.currentProgramSceneName);
      const returning = current === scene;
      if (returning && !this.previousScene) throw new Error("Choose a spectator scene different from the current gameplay scene.");
      const target = returning ? this.previousScene! : scene;
      if (!returning) {
        await this.restoreAudio();
        const layout = this.layouts.get(scene);
        if (layout) {
          for (const inputName of layout.sources) {
            try {
              const data = await this.request("GetInputMute", { inputName });
              this.audioBefore.set(inputName, z.boolean().parse(data.inputMuted));
            } catch (error) {
              if (error instanceof Error && /input does not support audio/i.test(error.message)) {
                if (inputName === layout.audible) throw new Error("The selected camera has no OBS audio. Choose another audio input or mute camera sources.", { cause: error });
                continue;
              }
              throw error;
            }
          }
        }
        try {
          if (layout) for (const inputName of this.audioBefore.keys()) await this.request("SetInputMute", { inputName, inputMuted: inputName !== layout.audible });
          await this.request("SetCurrentProgramScene", { sceneName: target });
        } catch (error) { await this.restoreAudio(); throw error; }
      } else {
        await this.request("SetCurrentProgramScene", { sceneName: target });
        await this.restoreAudio();
      }
      this.previousScene = returning ? null : current;
      return target;
    } finally { this.toggling = false; }
  }
}
