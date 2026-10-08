import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Owner log 2026-10-07 (desktop, Act 1, Tank): 3.5 min near 8-10 enemies and
// no hit landed. Probe the world's own enemies, not freshly spawned ones.
test.describe.configure({ timeout: 400_000 });

test('the world\'s own enemies bite', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('hb_active_class_v1', 'TANK'); } catch { /* storage blocked */ } });
    await page.setViewportSize({ width: 1280, height: 800 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForTimeout(4000);
    // Walk outward so chunks with their own enemies mount.
    await page.evaluate(async () => {
        const g = window.game;
        for (let step = 6; step <= 36; step += 6) {
            for (const [dx, dz] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) {
                const x = dx * step, z = dz * step;
                if (g.isSnailTileWalkable(x, z) && g.canOccupyPosition(x, z)) { g.player.position.set(x, 0, z); break; }
            }
            await new Promise((r) => setTimeout(r, 400));
        }
        g.playerVitals.maxHp = 999; g.playerVitals.hp = 999;
    });
    const results = [];
    for (let i = 0; i < 6; i++) {
        const target = await page.evaluate(() => {
            const g = window.game;
            const enemies = g.scatterSprites.filter((e) => g.isEnemyType?.(e.userData?.type) && !e.userData.burstTriggered && e.parent && !e.userData.probeVisited);
            const e = enemies[0];
            if (!e) return null;
            e.userData.probeVisited = true;
            const ex = Math.round(e.position.x), ez = Math.round(e.position.z);
            let stand = null;
            for (let r = 1; r <= 3 && !stand; r++) for (let ox = -r; ox <= r && !stand; ox++) for (let oz = -r; oz <= r && !stand; oz++) {
                if (g.isSnailTileWalkable(ex + ox, ez + oz) && g.canOccupyPosition(ex + ox, ez + oz)) stand = [ex + ox, ez + oz];
            }
            if (!stand) return { skipped: e.userData.type };
            g.player.position.set(stand[0], 0, stand[1]);
            g.iFrameTimer = 0;
            window.__probeTarget = e;
            window.__probeHp = g.playerVitals.hp;
            return { type: e.userData.type, at: [ex, ez] };
        });
        if (!target) break;
        if (target.skipped) { results.push(target); continue; }
        await page.waitForTimeout(5000);
        results.push(await page.evaluate((target) => {
            const g = window.game;
            const e = window.__probeTarget;
            const p = g.player.position;
            const d = e.userData;
            return {
                ...target, lost: window.__probeHp - g.playerVitals.hp, d: +Math.hypot(e.position.x - p.x, e.position.z - p.z).toFixed(2),
                alive: Boolean(e.parent) && !d.burstTriggered, mode: d.aiMode, tgt: d.targetType, active: g.isEnemySimulationActive?.(e),
                canTarget: g.canEnemyTargetPlayer?.(e), safe: g.isPositionInSafeZone?.(p.x, p.z), kin: g.isHiveKinPassive?.(e),
                flags: Object.fromEntries(Object.entries(d).filter(([, v]) => typeof v === 'boolean' && v)),
                modal: Boolean(g.encounterState) || !document.querySelector('#lore-modal')?.classList.contains('hidden')
            };
        }, target));
        await page.evaluate(() => { window.game.closeSnailEncounter?.(); });
    }
    for (const r of results) console.log('NAT', JSON.stringify(r));
});
