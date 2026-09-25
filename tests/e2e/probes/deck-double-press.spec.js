import fs from 'node:fs';
import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';
import { MENU_FOCUS_ROOT_IDS } from '../../../src/inputActions.js';

// 2026-09-24 Deck QA: one B press closed the tactical map and then opened the
// pause menu, because the press reached the game twice — Chromium's Gamepad
// API first, the native Steam Input snapshot a moment later. This reproduces
// that ordering with a fake gamepad and a stubbed native bridge.
const OUT = process.env.HB_PROBE_OUT || '/tmp';

test('B closes the map and does nothing else', async ({ page }) => {
    test.setTimeout(600_000);
    await page.addInitScript(() => {
        const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
        window.__pad = { id: 'Steam Deck (fake)', index: 0, connected: true, buttons, axes: [0, 0, 0, 0], timestamp: 0 };
        navigator.getGamepads = () => [window.__pad];
        window.electronAPI = { onSteamInputState: (callback) => { window.__steamInputCallback = callback; } };
    });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    const snapshot = (phase, buttons = {}) => ({
        available: true, isSteamDeck: true, controllerCount: 1, phase,
        anyInput: Object.values(buttons).some(Boolean),
        primaryControllerHandle: 'steam:1', primaryControllerType: 'SteamDeckController',
        controllers: [{ handle: 'steam:1', type: 'SteamDeckController', active: Object.values(buttons).some(Boolean), move: { x: 0, y: 0 }, camera: { x: 0, y: 0 }, ...buttons }]
    });
    const visibleRoots = () => page.evaluate((ids) => ids.filter((id) => {
        const el = document.getElementById(id);
        return el && !el.classList.contains('hidden') && el.getClientRects().length > 0;
    }), [...MENU_FOCUS_ROOT_IDS]);

    // Native idle in gameplay, then open the map with the keyboard.
    await page.evaluate((s) => window.__steamInputCallback?.(s), snapshot('gameplay'));
    await page.keyboard.press('KeyM');
    await page.waitForTimeout(800);
    const mapOpen = await page.evaluate(() => !document.getElementById('tactical-map-modal')?.classList.contains('hidden'));
    await page.evaluate((s) => window.__steamInputCallback?.(s), snapshot('menu'));

    // B: the browser pad sees it first, native reports it 100 ms later.
    await page.evaluate(() => { window.__pad.buttons[1] = { pressed: true, value: 1 }; window.__pad.timestamp += 1; });
    await page.waitForTimeout(100);
    await page.evaluate((s) => window.__steamInputCallback?.(s), snapshot('menu', { menuBack: true, dash: true }));
    await page.waitForTimeout(250);
    await page.evaluate((s) => window.__steamInputCallback?.(s), snapshot('gameplay', { menuBack: true, dash: true }));
    await page.waitForTimeout(250);
    await page.evaluate(() => { window.__pad.buttons[1] = { pressed: false, value: 0 }; window.__pad.timestamp += 1; });
    await page.evaluate((s) => window.__steamInputCallback?.(s), snapshot('gameplay'));
    await page.waitForTimeout(1200);

    const after = await page.evaluate(() => ({
        mapOpen: !document.getElementById('tactical-map-modal')?.classList.contains('hidden'),
        dashing: Boolean(window.game?.isDashing),
        phase: window.__hbAppPhase
    }));
    const result = { label: process.env.HB_PROBE_LABEL || 'probe', mapOpenBefore: mapOpen, ...after, openSurfaces: await visibleRoots() };
    fs.appendFileSync(`${OUT}/deck-double-press.jsonl`, `${JSON.stringify(result)}\n`);
    await page.screenshot({ path: `${OUT}/deck-double-press-${result.label}.png` });
});
