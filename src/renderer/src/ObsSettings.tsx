import { useEffect, useState } from "react";
import type { SpectatorPreset } from "../../shared/spectator-layout";

function previousLayoutSources(scene: string): string[] {
  try {
    if (localStorage.getItem("cyberwire.obs.layoutScene") !== scene) return [];
    const value: unknown = JSON.parse(localStorage.getItem("cyberwire.obs.sources") ?? "[]");
    return Array.isArray(value) ? value.filter((name): name is string => typeof name === "string" && name.length <= 200).slice(0, 9) : [];
  } catch { return []; }
}

export function ObsSettings() {
  const [port, setPort] = useState(() => Number(localStorage.getItem("cyberwire.obs.port")) || 4455);
  const [password, setPassword] = useState("");
  const [hotkey, setHotkey] = useState(() => localStorage.getItem("cyberwire.obs.hotkey") ?? "Control+Shift+F9");
  const [scene, setScene] = useState(() => localStorage.getItem("cyberwire.obs.scene") ?? "");
  const [scenes, setScenes] = useState<string[]>([]);
  const [status, setStatus] = useState("Disconnected");
  const [busy, setBusy] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>(() => {
    try { const value: unknown = JSON.parse(localStorage.getItem("cyberwire.obs.sources") ?? "[]"); return Array.isArray(value) ? value.filter((name): name is string => typeof name === "string").slice(0, 9) : []; } catch { return []; }
  });
  const [preset, setPreset] = useState<SpectatorPreset>(() => { const saved = localStorage.getItem("cyberwire.obs.preset"); return saved === "two" || saved === "main" ? saved : "four"; });
  const [layoutScene, setLayoutScene] = useState(() => localStorage.getItem("cyberwire.obs.layoutScene") ?? "Cyber Wire Spectator");
  const [audible, setAudible] = useState<string | null>(() => localStorage.getItem("cyberwire.obs.audible"));
  useEffect(() => {
    let cancelled = false;
    let reading = false;
    let sourcesLoaded = false;
    const read = async () => {
      if (reading) return;
      reading = true;
      try {
        const info = await window.desktop.obs.status();
        if (cancelled) return;
        if (!info.connected) { sourcesLoaded = false; setScenes([]); setSources([]); setStatus("Disconnected. Connect to OBS to use Spectator Mode."); return; }
        setScenes(info.scenes); setScene(info.scene || info.scenes[0] || ""); setHotkey(info.hotkey);
        setStatus(previous => previous.startsWith("Disconnected") ? "Connected to OBS." : previous);
        if (!sourcesLoaded) { const available = await window.desktop.obs.sources(); if (!cancelled) setSources(available); sourcesLoaded = true; }
      } catch (error) { if (!cancelled) { setScenes([]); setSources([]); setStatus(error instanceof Error ? error.message : "OBS unavailable."); } }
      finally { reading = false; }
    };
    void read();
    const timer = window.setInterval(() => void read(), 3_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);
  async function refreshSources() {
    setBusy(true);
    try {
      const info = await window.desktop.obs.status();
      if (!info.connected) throw new Error("Connect to OBS first.");
      const available = await window.desktop.obs.sources();
      setScenes(info.scenes); setSources(available);
      setSelected(previous => previous.filter(name => available.includes(name)));
      setAudible(previous => previous && available.includes(previous) ? previous : null);
      setStatus("OBS scenes and sources refreshed.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to refresh OBS sources."); }
    finally { setBusy(false); }
  }
  async function connect() {
    setBusy(true);
    try {
      const available = await window.desktop.obs.connect({ port, password, hotkey });
      const chosen = available.includes(scene) ? scene : available[0] ?? "";
      setScenes(available);
      setSources(await window.desktop.obs.sources());
      setScene(chosen);
      if (chosen) await window.desktop.obs.arm(chosen);
      localStorage.setItem("cyberwire.obs.hotkey", hotkey);
      localStorage.setItem("cyberwire.obs.port", String(port));
      setPassword("");
      setStatus("Connected. Choose a spectator scene; the hotkey switches to it and back.");
    } catch (error) { setScenes([]); setStatus(error instanceof Error ? error.message : "OBS connection failed."); }
    finally { setBusy(false); }
  }
  return <section className="settings-section-panel obs-settings">
    <header className="settings-section-heading"><span>OBS</span><h3>Spectator Mode</h3><p>In OBS, enable Tools → WebSocket Server Settings. Your password stays in memory for this session.</p></header>
    <div className="settings-card"><label>OBS port <input aria-label="OBS port" type="number" min={1024} max={65535} value={port} onChange={(event) => setPort(Number(event.target.value))} /></label></div>
    <div className="settings-card"><label>Password <input aria-label="OBS password" autoComplete="off" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label></div>
    <div className="settings-card"><label>Hotkey <input aria-label="OBS hotkey" value={hotkey} onChange={(event) => setHotkey(event.target.value)} /></label><small>Example: Control+Shift+F9. Reconnect to apply.</small></div>
    <div className="settings-card"><button type="button" disabled={busy} onClick={() => void connect()}>{busy ? "Connecting…" : "Connect / test"}</button><button type="button" disabled={busy} onClick={() => { setBusy(true); void window.desktop.obs.disconnect().then(() => { setScenes([]); setSources([]); setStatus("Disconnected"); }).catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Unable to disconnect from OBS.")).finally(() => setBusy(false)); }}>Disconnect</button></div>
    <div className="settings-card"><label>Spectator scene <select aria-label="Spectator scene" disabled={!scenes.length} value={scene} onChange={(event) => { const next = event.target.value; setScene(next); localStorage.setItem("cyberwire.obs.scene", next); void window.desktop.obs.arm(next).catch((error: unknown) => setStatus(String(error))); }}>{scenes.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
    <button type="button" disabled={busy || !scene || !scenes.length} onClick={() => { setBusy(true); void window.desktop.obs.toggle(scene).then((current) => setStatus(`OBS scene: ${current}`)).catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Scene switch failed.")).finally(() => setBusy(false)); }}>Spectator / return to gameplay</button></div>
    <div className="settings-card"><label>Layout scene name <input aria-label="Layout scene name" maxLength={200} value={layoutScene} onChange={(event) => setLayoutScene(event.target.value)} /></label><label>Camera layout <select value={preset} onChange={(event) => setPreset(event.target.value as SpectatorPreset)}><option value="two">Two cameras</option><option value="four">Camera grid</option><option value="main">Main camera + smaller cameras</option></select></label></div>
    <div className="settings-card" style={{ display: "grid", gap: 8 }}><strong>OBS capture layers (first selection is the main camera)</strong>{sources.map((name) => <label key={name}><input type="checkbox" checked={selected.includes(name)} disabled={!selected.includes(name) && selected.length >= 9} onChange={() => setSelected((previous) => previous.includes(name) ? previous.filter((entry) => entry !== name) : [...previous, name])} /> {name}</label>)}{!sources.length && <span>Connect to OBS and add Window Capture sources for your stream pop-outs in OBS.</span>}</div>
    <button type="button" disabled={busy || !scenes.length} onClick={() => void refreshSources()}>Refresh OBS scenes and sources</button>
    <div className="settings-card"><label>Camera audio <select value={audible ?? ""} onChange={(event) => setAudible(event.target.value || null)}><option value="">Mute selected camera sources</option>{selected.map((name) => <option key={name} value={name}>{name}</option>)}</select></label><small>Camera audio is applied when entering Spectator Mode. Original mute states are restored on return or disconnect. OBS inputs share audio across scenes.</small></div>
    <button type="button" disabled={busy || !scenes.length || !selected.length || !layoutScene.trim()} onClick={() => {
      setBusy(true);
      const target = layoutScene.trim();
      void window.desktop.obs.layout({ scene: target, preset, sources: selected, audible, previousSources: previousLayoutSources(target) }).then(async () => {
        localStorage.setItem("cyberwire.obs.sources", JSON.stringify(selected)); localStorage.setItem("cyberwire.obs.layoutScene", target);
        localStorage.setItem("cyberwire.obs.preset", preset); if (audible) localStorage.setItem("cyberwire.obs.audible", audible); else localStorage.removeItem("cyberwire.obs.audible");
        setScenes((previous) => previous.includes(target) ? previous : [...previous, target]); setScene(target); await window.desktop.obs.arm(target);
        setStatus("Layout prepared. Use Spectator Mode or the hotkey to switch scenes.");
      }).catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Layout setup failed.")).finally(() => setBusy(false));
    }}>Apply camera layout in OBS</button>
    <p role="status">{status}</p><p>Applying a layout repositions the selected sources in the named scene. Switching scenes changes what your audience sees.</p>
  </section>;
}
