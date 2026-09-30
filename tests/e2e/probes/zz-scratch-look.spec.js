import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';
test('rooms', async ({ page }) => {
    test.setTimeout(500_000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.addInitScript(() => localStorage.setItem('hb_camera_mode', 'isometric'));
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForTimeout(3000);
    const rooms = await page.evaluate(() => {
        const g = window.game;
        const out = [];
        for (const [key, meta] of g.wfcMetadataCache ?? []) {
            for (const room of meta?.roomInstances ?? []) {
                const [cx, cy] = String(key).split(',').map(Number);
                out.push({ key, cx, cy, keys: Object.keys(room).slice(0, 14).join(','), room: JSON.stringify(room, (k, v) => (Array.isArray(v) && v.length > 6 ? '[' + v.length + ']' : v)).slice(0, 300) });
            }
        }
        return { chunkSize: g.chunkSize, count: out.length, rooms: out.slice(0, 6), player: { x: g.player.position.x, z: g.player.position.z } };
    });
    const targets = [
        { name: 'iso-01-spawn', x: 7.4, z: 11.8 },
        { name: 'iso-02-medical-room', x: 49 + 27, z: -49 + 23 },
        { name: 'iso-03-utility-room', x: -49 + 27, z: -98 + 21 },
        { name: 'iso-04-outside-door', x: 49 + 33, z: -49 + 22 }
    ];
    for (const target of targets) {
        await page.evaluate(({ x, z }) => { window.game.godMode = true; window.game.teleportPlayerTo(x, z); }, target);
        await page.waitForTimeout(5000);
        const state = await page.evaluate(() => ({ x: window.game.player.position.x, z: window.game.player.position.z, calls: window.game.renderer.info.render.calls, dark: getComputedStyle(window.game.darknessOverlay).opacity, mode: window.game.cameraMode }));
        console.log('SHOT ' + target.name + ' ' + JSON.stringify(state));
        await page.screenshot({ path: '/tmp/claude-1001/-home-caveman-Desktop-icecave-hunker-bunker/528f809a-a246-4358-b2ca-86835c191e9d/scratchpad/shots/' + target.name + '.png' });
    }
});
