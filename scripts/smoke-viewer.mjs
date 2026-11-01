import { app } from "electron";
import process from "node:process";
import { setTimeout, clearTimeout } from "node:timers";
import console from "node:console";
import path from "node:path";
import { pathToFileURL } from "node:url";

if (!process.env.CYBERWIRE_TEST_USER_DATA) throw new Error("Smoke test requires a separate CYBERWIRE_TEST_USER_DATA profile.");
const timeout = setTimeout(() => { console.error("Smoke test timed out"); app.exit(1); }, 30000);
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
        return results;
      })()`);
      console.log(JSON.stringify({ smokeTests: result }));
      clearTimeout(timeout); app.exit(0);
    } catch (error) { console.error(error); clearTimeout(timeout); app.exit(1); }
  });
});
await import(pathToFileURL(path.resolve("dist-electron/main/index.js")).href);
