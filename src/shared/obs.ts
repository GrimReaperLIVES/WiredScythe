export interface ObsConnection { port: number; password: string; hotkey: string }
export interface ObsApi {
  status(): Promise<{ connected: boolean; scenes: string[]; scene: string; hotkey: string }>;
  onError(listener: (message: string) => void): () => void;
  connect(config: ObsConnection): Promise<string[]>;
  disconnect(): Promise<void>;
  toggle(scene: string): Promise<string>;
  arm(scene: string): Promise<void>;
  sources(): Promise<string[]>;
  layout(config: { scene: string; preset: import("./spectator-layout").SpectatorPreset; sources: string[]; audible: string | null }): Promise<void>;
}
