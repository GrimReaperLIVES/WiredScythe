import { app, ipcMain } from "electron";
import process from "node:process";
import { setTimeout, clearTimeout } from "node:timers";
import console from "node:console";
import path from "node:path";
import { pathToFileURL } from "node:url";

if (!process.env.CYBERWIRE_TEST_USER_DATA)
  throw new Error(
    "Smoke test requires a separate CYBERWIRE_TEST_USER_DATA profile.",
  );
const timeout = setTimeout(() => {
  console.error("Smoke test timed out");
  app.exit(1);
}, 30000);
app.on("browser-window-created", (_event, window) => {
  window.webContents.once("did-finish-load", async () => {
    try {
      const result = await window.webContents.executeJavaScript(`(async () => {
        const wait = () => new Promise(resolve => setTimeout(resolve, 100));
        const check = (condition, label) => { if (!condition) throw new Error(label); results.push(label); };
        const results = [];
        await wait();
        const shell = document.querySelector('.app-shell');
        check(Boolean(shell), 'Renderer mounted');
        check(!shell.classList.contains('sidebar-hidden') && !shell.classList.contains('sidebar-collapsed'), 'Followed channels start expanded');
        document.querySelector('[aria-label="Collapse followed channels"]').click(); await wait();
        check(shell.classList.contains('sidebar-collapsed'), 'Followed channels minimize on request');
        document.querySelector('[aria-label="Expand followed channels"]').click(); await wait();
        check(!shell.classList.contains('sidebar-collapsed'), 'Followed channels expand on request');
        document.querySelector('[aria-label="Hide followed channels sidebar"]').click(); await wait();
        check(shell.classList.contains('sidebar-hidden') && document.querySelector('main').getBoundingClientRect().width > 600, 'Sidebar hide keeps main content visible');
        document.querySelector('[aria-label="Show followed channels sidebar"]').click(); await wait();
        check(!shell.classList.contains('sidebar-hidden'), 'Sidebar restore works');
        [...document.querySelectorAll('.top-actions button')].find(button => button.textContent.includes('Clean View')).click(); await wait();
        check(shell.classList.contains('clean-view') && getComputedStyle(document.querySelector('.topbar')).display === 'none', 'Clean View hides navigation');
        const beforeReveal = document.querySelector('main').getBoundingClientRect();
        shell.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 400, clientY: 4 })); await wait();
        check(shell.classList.contains('clean-view-revealed'), 'Top edge reveals navigation');
        const afterReveal = document.querySelector('main').getBoundingClientRect();
        check(beforeReveal.width === afterReveal.width && beforeReveal.height === afterReveal.height, 'Hover reveal preserves player layout space');
        const nav = document.querySelector('.top-nav-item').getBoundingClientRect();
        check(Boolean(document.elementFromPoint(nav.x + nav.width / 2, nav.y + nav.height / 2)?.closest('button')), 'Revealed navigation remains clickable');
        document.querySelector('.clean-view-unlock').click(); await wait();
        shell.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 400, clientY: 4 })); await wait();
        check(!shell.classList.contains('clean-view-revealed'), 'Pinned interface stays hidden');
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait();
        check(!shell.classList.contains('clean-view'), 'Escape exits Clean View');
        document.querySelector('[aria-label="Settings"]').click(); await wait();
        [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'OBS Spectator').click(); await wait();
        check(Boolean(document.querySelector('[aria-label="OBS password"]')), 'OBS setup panel opens');
        document.querySelector('[aria-label="Close settings"]').click(); await wait();
        [...document.querySelectorAll('.top-actions button')].find(button => button.textContent.trim() === 'Multistream').click(); await wait();
        for (let attempt = 0; attempt < 30 && document.querySelectorAll('.multi-tile').length !== 2; attempt++) await wait();
        check(document.querySelectorAll('.multi-tile').length === 2, 'Multistream fixture renders two independent video tiles: ' + document.querySelectorAll('.multi-tile').length + ' / ' + document.querySelector('main')?.textContent.slice(0, 400));
        const layout = document.querySelector('[aria-label="Stream layout"]');
        layout.value = 'free'; layout.dispatchEvent(new Event('change', { bubbles: true })); await wait();
        check(document.querySelector('.multi-grid').classList.contains('layout-free'), 'Custom canvas activates');
        const tile = document.querySelector('.multi-tile');
        tile.style.width = '35%'; tile.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
        await new Promise(resolve => setTimeout(resolve, 350));
        const saved = JSON.parse(localStorage.getItem('cyberwire.layout.placements'));
        check(saved.camera_a.width > 30 && saved.camera_a.width < 40, 'Resized tile position persists');
        [...document.querySelectorAll('.multi-stream-bar button')].find(button => button.textContent.trim() === 'Lock layout').click(); await wait();
        check(getComputedStyle(document.querySelector('.multi-tile')).resize === 'none', 'Layout lock prevents resizing');
        [...document.querySelectorAll('.top-actions button')].find(button => button.textContent.includes('Clean View')).click(); await wait();
        const recovery = document.querySelector('[aria-label="Exit viewing mode"]');
        const bounds = recovery.getBoundingClientRect();
        check(Boolean(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)?.closest('[aria-label="Exit viewing mode"]')), 'Exit view stays clickable above the viewing surface');
        document.querySelector('[aria-label="Hide viewing chat"]').click(); await wait();
        check(shell.classList.contains('panel-chat-hidden'), 'Recovery control hides chat');
        recovery.click(); await wait();
        check(!shell.classList.contains('clean-view') && shell.classList.contains('panel-navigation-always'), 'Exit view restores navigation');
        return results;
      })()`);
      console.log(JSON.stringify({ smokeTests: result }));
      clearTimeout(timeout);
      app.exit(0);
    } catch (error) {
      console.error(error);
      clearTimeout(timeout);
      app.exit(1);
    }
  });
});
await import(pathToFileURL(path.resolve("dist-electron/main/index.js")).href);
// Network-free UI fixture: only this test entry replaces playback IPC.
ipcMain.removeHandler("native-multi:start");
ipcMain.handle("native-multi:start", () =>
  ["camera_a", "camera_b"].map((channel, id) => ({
    id,
    channel,
    active: id === 0,
    state: {
      status: "idle",
      quality: "720p",
      muted: true,
      paused: false,
      volume: 0,
      compressorEnabled: false,
      behindLive: false,
    },
  })),
);
