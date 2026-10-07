import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Sprint 52 A1 benchmark (docs/planning/sprint-52-playthrough-2026-10-07.md):
// the Deck logs showed frames slowing as a run explored. This walks the
// operator outward in a square spiral on the analog stick input (noclip at normal
// speed, so walls never stall it), and every 10 s records real frames per
// second and the frame profiler's per-system cost beside the loaded enemy /
// prop / chunk counts. Run before and after each perf change:
//   HB_PROBES=1 LONG_WALK_OUT=<dir> npx playwright test tests/e2e/probes/long-walk.spec.js
// Headless WebGL is software-rendered, so renderFrame is inflated; compare the
// CPU systems and the counts, not absolute FPS.
const OUT = process.env.LONG_WALK_OUT ?? 'playwright-report/long-walk';
const RINGS = Number(process.env.LONG_WALK_RINGS ?? 5);

test.setTimeout(1_500_000);
test('long walk: per-system frame cost as the run explores', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    if (process.env.LONG_WALK_DEEP) {
        await page.addInitScript((names) => { window.__longWalkDeep = names; }, [
            'updateSnailBehavior', 'findSnailPath', 'selectSnailTarget', 'loadNearbyWorld3dReplacement',
            'updateChargerOrStalkerBehavior', 'updateFungalSporeVentBehavior', 'syncSiteProps3d', 'updateSheetSpriteFrame',
            'spawnVisualSnailTrail', 'canOccupyPosition', 'isSnailTileWalkable', 'updateRemoteEnemyReplica',
            'faceSpriteFromDir', 'tryEnemyBreachDoor', 'pickSnailWanderTile', 'updateEnemy3dVisual', 'syncEnemy3dVisual',
            'isEnemySimulationActive', 'shouldSkipHiddenScatter', 'updateCrawlerBehavior', 'updateSentinelBehavior',
            'spawnVisualSnailTrail', 'damageSnail', 'updateBossBehavior', 'updateQueenFightTick'
        ]);
    }
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.evaluate(() => {
        const g = window.game;
        g.setGodMode?.(true);
        // Walk, don't teleport: chunks stream as they do in play. Noclip at
        // normal speed only removes walls, so the route never stalls.
        g.setNoclip?.(true, 1);
        g.frameProfiler.enable();
        g.frameProfiler.reset();
        // Time the scatter loop's inner calls too (LONG_WALK_DEEP=1), by
        // wrapping them on the instance; the code itself is unchanged.
        if (window.__longWalkDeep) {
            for (const name of window.__longWalkDeep) {
                const original = g[name];
                if (typeof original !== 'function') continue;
                g[name] = function wrapped(...args) { return g.frameProfiler.measure(`  ${name}`, () => original.apply(this, args)); };
            }
        }
        window.__walkFrames = 0;
        const tick = () => { window.__walkFrames += 1; requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
    });
    const samples = [];
    let lastAt = Date.now();
    const sample = async (label) => {
        const now = Date.now();
        const row = await page.evaluate(({ label, seconds }) => {
            const g = window.game;
            const snap = g.frameProfiler.snapshot();
            g.frameProfiler.reset();
            const fps = Math.round((window.__walkFrames / seconds) * 10) / 10;
            window.__walkFrames = 0;
            let enemies = 0;
            for (const s of g.scatterSprites ?? []) if (g.isEnemyType?.(s.userData?.type)) enemies += 1;
            return {
                label,
                fps,
                avgFrameMs: snap?.frames ? Math.round((snap.totalMs / snap.frames) * 10) / 10 : null,
                top: (snap?.sections ?? []).slice(0, 8).map((e) => `${e.name}=${e.avgMsPerFrame}`),
                enemies,
                props: (g.scatterSprites?.length ?? 0) - enemies,
                chunks: g.chunkMeshes?.size ?? 0,
                geometries: g.renderer?.info?.memory?.geometries ?? null,
                textures: g.renderer?.info?.memory?.textures ?? null,
                x: Math.round(g.player.position.x),
                z: Math.round(g.player.position.z)
            };
        }, { label, seconds: Math.max(0.001, (now - lastAt) / 1000) });
        lastAt = Date.now();
        samples.push(row);
        console.log(JSON.stringify(row));
    };
    await page.waitForTimeout(4000);
    await sample('spawn');
    // A square spiral on the analog stick input, legs growing each turn.
    // The analog input the touch stick and pad drive (game.virtualInput);
    // held keys do not reach a headless page reliably.
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    let legSeconds = Number(process.env.LONG_WALK_LEG_SECONDS ?? 12);
    for (let ring = 0; ring < RINGS * 2; ring++) {
        const [vx, vz] = dirs[ring % 4];
        const end = Date.now() + legSeconds * 1000;
        let nextSample = Date.now() + 10_000;
        while (Date.now() < end) {
            // Re-applied every second: input polling may zero it between frames.
            await page.evaluate(({ vx, vz }) => window.game.setVirtualInput(vx, vz), { vx, vz });
            await page.waitForTimeout(1000);
            if (Date.now() >= nextSample || Date.now() >= end) {
                await sample(`leg${ring}`);
                nextSample = Date.now() + 10_000;
            }
        }
        await page.evaluate(() => window.game.setVirtualInput(0, 0));
        if (ring % 2 === 1) legSeconds += Number(process.env.LONG_WALK_LEG_SECONDS ?? 12);
    }
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'samples.json'), JSON.stringify(samples, null, 2));
});
