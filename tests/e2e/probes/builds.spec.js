import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Sprint 46 build comparison: each class meets its arrival pack with a
// scripted aim-and-fire (nearest arrival hostile, one shot per 150 ms).
// Measures time to clear, shots and hearts lost -- not feel, which needs a
// person.
for (const playerClass of ['SCOUT', 'TANK', 'ENGINEER']) {
    test(`build ${playerClass}`, async ({ page }) => {
        test.setTimeout(900_000);
        await page.addInitScript((c) => localStorage.setItem('hb_active_class_v1', c), playerClass);
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);
        const results = [];
        for (let deployment = 0; deployment < 2; deployment += 1) {
            const fight = await page.evaluate(async () => {
                const g = window.game;
                // Headless frame rate makes the 20 s delay minutes long; shorten only that.
                if (g._arrivalIncident?.state === 'pending') g._arrivalIncident.timer = 0.01;
                const hp0 = g.playerVitals.hp;
                const t0 = performance.now();
                const wait = (ms) => new Promise((r) => setTimeout(r, ms));
                while (!(g._arrivalIncident?.state === 'active' || g._arrivalIncident?.state === 'done') && performance.now() - t0 < 60_000) await wait(250);
                const arrivedAt = performance.now();
                // Drawing is the bottleneck under SwiftShader (<1 fps); the
                // simulation keeps running without it, so fights resolve at
                // simulation speed. Outcomes, not visuals, are measured here.
                g.setWorldRenderSuspended(true);
                const pack = (g._arrivalIncident?.sprites ?? []).map((s) => `${s.userData.type}${s.userData.isElite ? '*' : ''}`);
                let shots = 0;
                while (g._arrivalIncident?.state === 'active' && performance.now() - arrivedAt < 90_000 && !g.isPlayerDead) {
                    const target = g._arrivalIncident.sprites.filter((s) => s.parent && !s.userData.burstTriggered)
                        .sort((a, b) => Math.hypot(a.position.x - g.player.position.x, a.position.z - g.player.position.z) - Math.hypot(b.position.x - g.player.position.x, b.position.z - g.player.position.z))[0];
                    if (target) {
                        g.updateFacingYaw(Math.atan2(target.position.x - g.player.position.x, target.position.z - g.player.position.z));
                        if (g.fireWeaponAtCurrentAim()) shots += 1;
                    }
                    await wait(150);
                }
                g.setWorldRenderSuspended(false);
                return {
                    class: g.playerType,
                    expeditionIndex: g.expeditionIndex,
                    condition: g.activeExpedition?.condition?.id,
                    pack,
                    arrivedAfterMs: Math.round(arrivedAt - t0),
                    clearedInMs: g._arrivalIncident?.state === 'done' ? Math.round(performance.now() - arrivedAt) : null,
                    shots,
                    heartsLost: hp0 - g.playerVitals.hp,
                    dead: Boolean(g.isPlayerDead),
                    cacheDropped: (g.pickupMeshes ?? []).filter((p) => p.userData?.type === 'coin').length
                };
            });
            results.push(fight);
            await page.screenshot({ path: `${process.env.HB_PROBE_OUT}/build-${playerClass}-d${deployment}.png` });
            if (deployment === 0) {
                await page.evaluate(() => {
                    const g = window.game;
                    g.setGodMode(false);
                    for (let i = 0; i < 12 && !g.isPlayerDead; i += 1) { g.iFrameTimer = 0; g.takeDamage(99, 'abyss'); }
                });
                await page.waitForFunction(() => !document.getElementById('game-over-modal').classList.contains('hidden'), null, { timeout: 60_000 });
                await page.locator('#game-over-try-again').click();
                await page.waitForFunction(() => window.isGameplayReady?.() === true, null, { timeout: 180_000 });
            }
        }
        console.log('BUILD ' + JSON.stringify(results));
    });
}
