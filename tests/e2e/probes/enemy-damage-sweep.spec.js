import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Owner, 2026-10-07: "enemy were not hitting my player in the last long run".
// Visit eight spots 40 tiles out; at each, set two enemies on the operator and
// record whether a hit landed, plus every rule that can refuse one.
test.describe.configure({ timeout: 600_000 });

for (const cls of (process.env.SWEEP_CLASSES ?? 'ENGINEER').split(',')) test(`enemies land hits at every spot of a ring (${cls})`, async ({ page }) => {
    await page.addInitScript((cls) => { try { localStorage.setItem('hb_active_class_v1', cls); } catch { /* storage blocked */ } }, cls);
    await page.setViewportSize({ width: 1280, height: 800 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForTimeout(3000);
    // SWEEP_ACT2=1 plays the sweep in Act 2, as the 2026-10-07 Deck run was.
    const act2 = process.env.SWEEP_ACT2 === '1'
        ? await page.evaluate(() => { window.game.act2?.begin?.(); return window.game.isAct2Active?.(); })
        : false;
    console.log('ACT2', act2);
    const results = [];
    for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const spot = await page.evaluate(async ([dx, dz]) => {
            const g = window.game;
            for (const s of g.scatterSprites.filter((e) => g.isEnemyType?.(e.userData?.type))) s.userData.burstTriggered = true, s.parent?.remove(s);
            let at = null;
            for (let step = 6; step <= 40; step += 6) {
                let hit = null;
                for (let r = 0; r <= 4 && !hit; r++) {
                    for (let ox = -r; ox <= r && !hit; ox++) for (let oz = -r; oz <= r && !hit; oz++) {
                        const x = Math.round(dx * step) + ox, z = Math.round(dz * step) + oz;
                        if (g.isSnailTileWalkable(x, z) && g.canOccupyPosition(x, z)) hit = [x, z];
                    }
                }
                if (hit) { g.player.position.set(hit[0], 0, hit[1]); at = hit; }
                await new Promise((r) => setTimeout(r, 300));
            }
            // A deep pool so no spot ends in death (a death retargets enemies).
            g.playerVitals.maxHp = 999; g.playerVitals.hp = 999; g.iFrameTimer = 0;
            const p = g.player.position;
            // An Act 2 snail opens its talk-or-fight encounter on touch, which
            // pauses the world; close any left open and use aliens that bite.
            g.closeSnailEncounter?.();
            const second = g.isAct2Active?.() ? 'mycelium_stalker' : 'cybersnail';
            g.spawnEnemyInstance('alien_proto_crawler', p.x + 1.2, p.z + 0.3);
            g.spawnEnemyInstance(second, p.x - 1.0, p.z + 0.6);
            return at;
        }, [dx, dz]);
        await page.waitForTimeout(6000);
        results.push(await page.evaluate((spot) => {
            const g = window.game;
            const p = g.player.position;
            const enemies = g.scatterSprites.filter((e) => g.isEnemyType?.(e.userData?.type) && !e.userData.burstTriggered);
            const zones = g.getActiveContainmentZones();
            const inZone = zones.filter((z) => z.bounds ? (p.x >= z.bounds.minX && p.x <= z.bounds.maxX && p.z >= z.bounds.minZ && p.z <= z.bounds.maxZ) : false).map((z) => z.id ?? z.roomId ?? 'room');
            return {
                spot, player: [+p.x.toFixed(1), +p.z.toFixed(1)], hp: g.playerVitals.hp, encounter: Boolean(g.encounterState), max: g.playerVitals.maxHp, dead: g.isPlayerDead,
                safe: g.isPositionInSafeZone(p.x, p.z), inZone,
                enemies: enemies.map((e) => ({ t: e.userData.type, d: +Math.hypot(e.position.x - p.x, e.position.z - p.z).toFixed(2), mode: e.userData.aiMode, canTarget: g.canEnemyTargetPlayer(e), target: e.userData.targetType }))
            };
        }, spot));
    }
    const cls2 = await page.evaluate(() => window.game.playerType);
    for (const r of results) console.log('SPOT', cls2, JSON.stringify(r));
});
