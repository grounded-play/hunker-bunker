import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

test('live Scuttler pack exposes staggered telegraphs through the production runtime', async ({ page }) => {
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);

    const setup = await page.evaluate(() => {
        const game = window.game;
        game.setGodMode?.(true);
        game.isPlayerDead = false;
        if (game.playerVitals) game.playerVitals.hp = game.playerVitals.maxHp;
        game.setLoadingPaused?.(true);
        game.teleportPlayerTo?.(9, 10, { safeFloor: false });
        game.snapCameraToPlayer?.();
        game.canEnemyTargetPlayer = () => true;
        document.querySelectorAll('.cinematic-still-overlay, .cinematic-overlay, .fullscreen-video-overlay')
            .forEach((node) => node.classList.add('hidden'));
        const origin = { x: game.player.position.x, z: game.player.position.z };
        const offsets = [[2.4, 0], [2.7, 0.7], [2.7, -0.7]];
        const pack = offsets.map(([dx, dz], index) => {
            const sprite = game.spawnEnemyInstance('chitin_scuttler', origin.x + dx, origin.z + dz);
            if (!sprite) return null;
            sprite.userData.crawlerTuning = {
                ...sprite.userData.crawlerTuning,
                windup: 0.28 + index * 0.22
            };
            sprite.userData.liveProbeIndex = index;
            return sprite;
        }).filter(Boolean);
        const transitions = pack.map(() => []);
        const delta = 1 / 60;
        for (let step = 0; step < 70; step += 1) {
            pack.forEach((sprite, index) => {
                game.updateCrawlerBehavior(sprite, delta);
                const state = sprite.userData.crawlerState;
                const rows = transitions[index];
                if (rows.at(-1)?.state !== state) {
                    rows.push({ state, atMs: Math.round((step + 1) * delta * 1000) });
                }
            });
        }
        pack.forEach((sprite, index) => {
            sprite.position.set(origin.x + offsets[index][0], sprite.position.y, origin.z + offsets[index][1]);
            sprite.userData.crawlerState = 'alert';
            sprite.material.color.setHex(0xffffff);
        });
        window.__scuttlerLiveProbe = { pack, transitions };
        return {
            pack: pack.map((sprite) => ({
                type: sprite.userData.type,
                hp: sprite.userData.hp,
                scale: sprite.userData.baseScaleX,
                windup: sprite.userData.crawlerTuning.windup
            })),
            transitions
        };
    });

    expect(setup.pack).toHaveLength(3);
    expect(setup.pack.map(({ type }) => type)).toEqual(['chitin_scuttler', 'chitin_scuttler', 'chitin_scuttler']);
    expect(setup.pack.map(({ hp }) => hp)).toEqual([1, 1, 1]);
    expect(setup.pack.map(({ windup }) => windup)).toEqual([0.28, 0.5, 0.72]);
    expect(setup.pack.every(({ scale }) => scale < 1)).toBe(true);

    const telemetry = setup.transitions;
    expect(telemetry.every((rows) => rows.some(({ state }) => state === 'alert'))).toBe(true);
    expect(telemetry.every((rows) => rows.some(({ state }) => state === 'charging'))).toBe(true);
    const chargeTimes = telemetry.map((rows) => rows.find(({ state }) => state === 'charging').atMs);
    expect(chargeTimes[1] - chargeTimes[0]).toBeGreaterThanOrEqual(180);
    expect(chargeTimes[2] - chargeTimes[1]).toBeGreaterThanOrEqual(180);

    const out = process.env.HB_PROBE_OUT;
    if (out) await page.screenshot({ path: `${out}/chitin-scuttler-live.png` });
});
