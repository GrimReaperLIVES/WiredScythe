import { app, BrowserWindow, session } from "electron";
import process from "node:process";
import console from "node:console";
import { setTimeout, clearTimeout } from "node:timers";
import { pathToFileURL } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

if (!process.env.CYBERWIRE_TEST_USER_DATA) throw new Error("Use a separate desktop test profile.");
const timeout = setTimeout(() => app.exit(1), 30_000);
app.on("browser-window-created", (_event, window) => {
  window.webContents.once("did-finish-load", async () => {
    if (!window.webContents.getURL().startsWith("wiredscythe://app/")) return;
    try {
      const requested = [];
      // Verify window ownership and lifecycle without depending on Twitch/CDN availability.
      session.fromPartition("persist:wiredscythe-twitch-playback").webRequest.onBeforeRequest((details, callback) => { requested.push(details.url); callback({ cancel: true }); });
      await window.webContents.executeJavaScript(`(async () => {
        const wait = () => new Promise(resolve => setTimeout(resolve, 100));
        await wait();
        const twitch = [...document.querySelectorAll('.top-actions button')].find(button => button.textContent.trim() === 'Twitch window');
        if (!twitch || twitch.disabled) throw new Error('Twitch window selector unavailable');
        twitch.click(); await wait();
        await window.desktop.preferences.update({ preferredPlayerMode: 'official' });
        const search = document.querySelector('[aria-label="Channel search"]');
        search[Object.keys(search).find(key => key.startsWith('__reactProps'))].onChange({ target: { value: 'twitch:window_fixture' } }); await wait();
        search.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        for (let i = 0; i < 50 && !document.querySelector('.official-window-placeholder'); i++) await wait();
        if (!document.querySelector('.official-window-placeholder')) throw new Error('Official mode did not open');
        if (document.querySelector('iframe.standard-player-frame')) throw new Error('Broken embedded player was mounted');
        if (!await window.desktop.player.focusOfficialWindow()) throw new Error('Official window cannot be restored');
      })()`);
      const windows = BrowserWindow.getAllWindows().filter(candidate => candidate !== window);
      assert.equal(windows.length, 1);
      const official = windows[0];
      const preferences = official.webContents.getLastWebPreferences();
      assert.equal(preferences.nodeIntegration, false); assert.equal(preferences.sandbox, true);
      assert.equal(official.webContents.session, session.fromPartition("persist:wiredscythe-twitch-playback"));
      assert(requested.some(url => url === "https://www.twitch.tv/window_fixture"));
      official.close();
      const closed = await window.webContents.executeJavaScript(`(async () => {
        for (let i = 0; i < 30 && document.querySelector('.player-page'); i++) await new Promise(resolve => setTimeout(resolve, 100));
        return !document.querySelector('.player-page');
      })()`);
      assert(closed, "Closing the Twitch window must close the active stream view");
      console.log("Official Twitch window: isolated session, real window, focus recovery, no broken iframe, and close-to-browse passed. Live Twitch playback not exercised.");
      clearTimeout(timeout); app.exit(0);
    } catch (error) { console.error(error); clearTimeout(timeout); app.exit(1); }
  });
});
await import(pathToFileURL(path.resolve("dist-electron/main/index.js")).href);
