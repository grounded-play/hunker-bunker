import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro, isHostNetworkBlip } from './helpers.js';

// docs/planning/depth-01-elite-and-relic-lane-2026-09-09.md D1/D2/D5.
//
// Vitest covers the pure promotion decision (src/eliteEnemies.test.js) and its
// determinism (src/eliteEnemies.determinism.test.js). The one thing that needs
// a real browser is the live engine actually producing promoted enemies from
// its own seeded chunk generator, and the mounted sprite carrying the rank --
// createChunkScatterPlacements reads this.getDepthTier, this.runEntropy,
// this.hashTile and the room-type grid, none of which the unit suite fakes.

async function placementsForTier(page, targetTier) {
    return page.evaluate((tier) => {
        const game = window.game;
        const size = game.chunkSize;
        // A fully walkable chunk: the generator only needs '.' cells to place
        // candidates on. Everything else it derives itself.
        const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => '.'));
        // Walk outward until getDepthTier reports the ring we want, rather than
        // hardcoding coordinates that a future ring-radius change would break.
        for (let d = 0; d < 400; d++) {
            for (const [cx, cy] of [[d, 0], [0, d], [-d, 0], [0, -d], [d, d], [-d, -d]]) {
                if (game.getDepthTier(cx, cy) !== tier) continue;
                const placements = game.createChunkScatterPlacements(cx, cy, grid);
                if (!placements.length) continue;
                return {
                    chunk: [cx, cy],
                    tier,
                    total: placements.length,
                    elites: placements.filter((p) => p.spawnedElite).length,
                    eliteTypes: [...new Set(placements.filter((p) => p.spawnedElite).map((p) => p.type))],
                    keys: placements.filter((p) => p.spawnedElite).map((p) => p.scatterKey)
                };
            }
        }
        return null;
    }, targetTier);
}

test.describe('Depth Contract elite promotion (live engine)', () => {
    test('ring I promotes nobody and a deep ring promotes eligible families only', async ({ page }) => {
        const consoleErrors = [];
        page.on('console', (msg) => { if (msg.type() === 'error' && !isHostNetworkBlip(msg.text())) consoleErrors.push(msg.text()); });
        page.on('pageerror', (err) => consoleErrors.push(err.message));

        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        const surface = await placementsForTier(page, 0);
        expect(surface, 'expected a generatable ring-I chunk').not.toBeNull();
        expect(surface.elites, `ring I promoted ${surface.elites} of ${surface.total}`).toBe(0);

        // Sample the whole deep band, not a handful of chunks. Eligible
        // enemies are a small fraction of total placements, so a 40-chunk
        // sample expects well under one elite and cannot distinguish "works"
        // from "wired to a family that never spawns" -- which is exactly the
        // failure this catches.
        const deep = await page.evaluate(() => {
            const game = window.game;
            const size = game.chunkSize;
            const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => '.'));
            let total = 0;
            let eligible = 0;
            let elites = 0;
            const types = new Set();
            let chunks = 0;
            for (let cx = -14; cx <= 14; cx++) {
                for (let cy = -14; cy <= 14; cy++) {
                    if (game.getDepthTier(cx, cy) < 3) continue;
                    const placements = game.createChunkScatterPlacements(cx, cy, grid);
                    if (!placements.length) continue;
                    chunks++;
                    total += placements.length;
                    for (const p of placements) {
                        if (game.isEnemyType(p.type) && !p.type.startsWith('boss_') && p.type !== 'sentinel') eligible++;
                        if (!p.spawnedElite) continue;
                        elites++;
                        types.add(p.type);
                    }
                }
            }
            return { chunks, total, eligible, elites, types: [...types] };
        });

        expect(deep.chunks, 'expected deep chunks to sample').toBeGreaterThan(0);
        expect(deep.eligible, 'expected promotable enemies to exist at depth').toBeGreaterThan(50);
        expect(deep.elites, 'deep rings produced no elites at all').toBeGreaterThan(0);
        // Ring IV's contract chance is 0.22; this is a wide sanity band, not a
        // precision claim about the generator's RNG.
        const rate = deep.elites / deep.eligible;
        expect(rate, `elite rate ${rate} of ${deep.eligible} eligible`).toBeGreaterThan(0.10);
        expect(rate, `elite rate ${rate} of ${deep.eligible} eligible`).toBeLessThan(0.40);
        // Crawlers ARE promotable and dominate this band -- see the sampling
        // note in eliteEnemies.js. Bosses and sentinels must never be.
        for (const type of deep.types) {
            expect(type.startsWith('boss_')).toBe(false);
            expect(type).not.toBe('sentinel');
        }
        expect(deep.types, 'expected at least one promoted family').not.toEqual([]);

        expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
    });

    test('the same chunk regenerates the identical elite set', async ({ page }) => {
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        const twice = await page.evaluate(() => {
            const game = window.game;
            const size = game.chunkSize;
            const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => '.'));
            for (let cx = 1; cx <= 14; cx++) {
                if (game.getDepthTier(cx, cx) < 3) continue;
                const first = game.createChunkScatterPlacements(cx, cx, grid);
                const second = game.createChunkScatterPlacements(cx, cx, grid);
                if (!first.length) continue;
                return {
                    first: first.map((p) => `${p.scatterKey}:${p.spawnedElite ? 1 : 0}`),
                    second: second.map((p) => `${p.scatterKey}:${p.spawnedElite ? 1 : 0}`)
                };
            }
            return null;
        });

        expect(twice, 'expected a deep chunk to regenerate').not.toBeNull();
        expect(twice.second).toEqual(twice.first);
    });

    test('a promoted placement mounts as a larger sprite carrying the rank', async ({ page }) => {
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        const mounted = await page.evaluate(() => {
            const game = window.game;
            const base = {
                x: game.player.position.x + 3,
                z: game.player.position.z + 3,
                type: 'cybersnail',
                scatterKey: 'depth01-elite-probe',
                scale: 1,
                rotation: 0,
                tiltX: 0,
                tiltZ: 0,
                elevation: 0.09,
                phase: 0,
                opacity: 1
            };
            const ordinary = game.createScatterInstance({ ...base, scatterKey: 'depth01-plain' });
            const elite = game.createScatterInstance({ ...base, spawnedElite: true });
            if (!ordinary || !elite) return null;
            return {
                ordinary: {
                    isElite: Boolean(ordinary.userData.isElite),
                    maxHp: ordinary.userData.maxHp,
                    scaleY: ordinary.scale.y
                },
                elite: {
                    isElite: Boolean(elite.userData.isElite),
                    maxHp: elite.userData.maxHp,
                    scaleY: elite.scale.y,
                    tint: elite.userData.biomeTint
                }
            };
        });

        expect(mounted, 'expected createScatterInstance to build both sprites').not.toBeNull();
        expect(mounted.ordinary.isElite).toBe(false);
        expect(mounted.elite.isElite).toBe(true);
        // Readable before it is wounded: bigger silhouette, and a tint that is
        // not the enrage red (0xff4a4a).
        expect(mounted.elite.scaleY).toBeGreaterThan(mounted.ordinary.scaleY);
        expect(mounted.elite.tint).not.toBe(0xff4a4a);
        expect(mounted.elite.maxHp).toBeGreaterThan(mounted.ordinary.maxHp);
    });
});
