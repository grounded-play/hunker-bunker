import fs from 'node:fs';
import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Live dev loop for the lower-dock layout (HB_PROBES=1 only). Boots once in
// dock mode; each time HB_DOCK_DIR/trigger changes, re-injects
// HB_DOCK_DIR/dock.css, then writes screenshots + element rects at the Deck
// and 1080p sizes. Stops when HB_DOCK_DIR/stop exists.
const DIR = process.env.HB_DOCK_DIR || '/tmp/dockdev';
const IDS = ['desktop-compass', 'hud-blueprint-canvas', 'desktop-compass-distance', 'hud-map-info', 'weapon-status-panel',
    'ship-status-panel', 'vitals-panel', 'hazard-status-panel', 'queens-ledger-hud', 'class-ability-panel', 'radar-scan-panel',
    'pickup-counter-panel', 'boss-status-panel', 'loop-step-hud', 'objective-tracker', 'mission-progress-hud', 'camp-quest-hud',
    'tactical-telemeter-box', 'hud-run-cards', 'hud-bounty-chip', 'hud-event-chip', 'campaign-day-indicator', 'level-num'];
const SELECTORS = ['.level-indicator', '.hud-header', '.hud-header__center', '.hud-header__right', '.hud-corner-settings',
    '.hud-mission-stack', '.hud-notification-stack', '.hud-visor-telemetry'];

test('dock dev loop', async ({ page }) => {
    test.setTimeout(6 * 60 * 60 * 1000);
    await page.addInitScript(() => localStorage.setItem('hb_hud_layout', 'dock'));
    await page.setViewportSize({ width: 1920, height: 1080 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.evaluate(() => window.game?.setGodMode?.(true));
    fs.writeFileSync(`${DIR}/ready`, String(Date.now()));
    let last = '';
    while (!fs.existsSync(`${DIR}/stop`)) {
        const stamp = fs.existsSync(`${DIR}/trigger`) ? fs.readFileSync(`${DIR}/trigger`, 'utf8') : '';
        if (stamp && stamp !== last) {
            last = stamp;
            const css = fs.existsSync(`${DIR}/dock.css`) ? fs.readFileSync(`${DIR}/dock.css`, 'utf8') : '';
            await page.evaluate((text) => {
                let el = document.getElementById('dock-dev-style');
                if (!el) { el = document.createElement('style'); el.id = 'dock-dev-style'; document.head.appendChild(el); }
                el.textContent = text;
            }, css);
            // Optional JS to run each round (e.g. show a hazard, fake a boss).
            const js = fs.existsSync(`${DIR}/round.js`) ? fs.readFileSync(`${DIR}/round.js`, 'utf8') : '';
            if (js) await page.evaluate(js).catch((e) => fs.writeFileSync(`${DIR}/round-error.txt`, String(e)));
            const out = {};
            for (const [w, h] of [[1920, 1080], [1280, 800]]) {
                await page.setViewportSize({ width: w, height: h });
                await page.waitForTimeout(1200);
                out[`${w}x${h}`] = await page.evaluate(({ ids, sels }) => {
                    const r = (el) => {
                        if (!el) return null;
                        const b = el.getBoundingClientRect();
                        const cs = getComputedStyle(el);
                        return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height),
                            vis: !el.classList.contains('hidden') && cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 0,
                            pos: cs.position, parent: el.offsetParent?.id || el.offsetParent?.className?.toString().slice(0, 40) || null };
                    };
                    const res = {};
                    for (const id of ids) res['#' + id] = r(document.getElementById(id));
                    for (const s of sels) res[s] = r(document.querySelector(s));
                    const stage = document.getElementById('game-viewport')?.getBoundingClientRect();
                    res.stage = stage ? { x: Math.round(stage.x), y: Math.round(stage.y), w: Math.round(stage.width), h: Math.round(stage.height) } : null;
                    return res;
                }, { ids: IDS, sels: SELECTORS });
                await page.screenshot({ path: `${DIR}/shot-${w}x${h}.png` });
            }
            await page.setViewportSize({ width: 1920, height: 1080 });
            fs.writeFileSync(`${DIR}/rects.json`, JSON.stringify(out, null, 1));
            fs.writeFileSync(`${DIR}/done`, stamp);
        }
        await page.waitForTimeout(700);
    }
});
