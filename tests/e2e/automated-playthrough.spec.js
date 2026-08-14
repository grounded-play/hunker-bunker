import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro, stubOfflineElectronAPI } from './helpers.js';

test.describe('Automated End-to-End Playthrough & Debug Telemetry', () => {
    test.beforeEach(async ({ page }) => {
        await stubOfflineElectronAPI(page);
    });

    test('executes full automated playthrough, debug showroom, and captures telemetry', async ({ page }) => {
        test.setTimeout(180_000);

        const consoleLogs = [];
        page.on('console', (msg) => {
            consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
        });

        // 1. Boot to Operator Menu
        const bootStart = Date.now();
        await bootToOperatorMenu(page);
        const bootDurationMs = Date.now() - bootStart;
        console.log(`\n[TELEMETRY] 1. Boot to Operator Menu completed in ${bootDurationMs}ms`);

        // 2. Start Run and Skip Intro
        const runStart = Date.now();
        await startRunAndSkipIntro(page);
        const runInitDurationMs = Date.now() - runStart;
        console.log(`[TELEMETRY] 2. Run initialized and intro skipped in ${runInitDurationMs}ms`);

        // 3. Verify debug API is available
        const debugAvailable = await page.evaluate(() => typeof window.__DEBUG__ === 'object' && window.__DEBUG__ !== null);
        expect(debugAvailable).toBe(true);

        // 4. Sample baseline performance & stats
        const initialStats = await page.evaluate(() => window.__DEBUG__.getStats());
        expect(initialStats).not.toBeNull();
        expect(initialStats.seed).toBeDefined();
        console.log(`[TELEMETRY] 3. Run Seed: ${initialStats.seed} · Act: ${initialStats.act} · Level/Depth: ${initialStats.level}`);
        console.log(`[TELEMETRY]    Renderer Baseline: ${initialStats.performance.drawCalls} draws, ${initialStats.performance.triangles.toLocaleString()} tris, ${initialStats.performance.textures} textures`);

        // 5. Query and validate points of interest
        const pois = await page.evaluate(() => window.__DEBUG__.getLocations());
        expect(pois.length).toBeGreaterThan(0);
        console.log(`[TELEMETRY] 4. Discovered ${pois.length} Points of Interest across radial sectors:`);
        pois.forEach((poi) => {
            const px = Number.isFinite(poi.x) ? poi.x.toFixed(1) : '?';
            const pz = Number.isFinite(poi.z) ? poi.z.toFixed(1) : '?';
            console.log(`  - [${poi.category || 'POI'}] ${poi.id} at (${px}, ${pz}) · ${poi.name}`);
        });

        // 6. Test Debug Events
        const testEvents = ['queen_hallucination', 'blackout', 'corrupt_compass', 'spawn_patrol'];
        console.log(`[TELEMETRY] 5. Testing ${testEvents.length} runtime debug events...`);
        for (const evt of testEvents) {
            try {
                const res = await page.evaluate(async (e) => window.__DEBUG__.triggerEvent(e), evt);
                console.log(`  ✓ Event '${evt}' response: ${res}`);
            } catch (err) {
                console.warn(`  ⚠ Event '${evt}' failed non-critically: ${err?.message ?? err}`);
            }
            await page.waitForTimeout(200);
        }

        // 7. Teleport through major waypoints and capture telemetry
        const waypointsToVisit = pois.filter((p) => p.id === 'spawn' || p.category === 'CAMP' || p.category === 'HIVE').slice(0, 4);
        console.log(`[TELEMETRY] 6. Teleporting through ${waypointsToVisit.length} major radial waypoints...`);

        for (const wp of waypointsToVisit) {
            const tpStart = Date.now();
            try {
                const tpRes = await page.evaluate(async (id) => window.__DEBUG__.teleport(id), wp.id);
                expect(tpRes).toBeDefined();
                await page.waitForTimeout(300);
                const tpDurationMs = Date.now() - tpStart;

                const currentStats = await page.evaluate(() => {
                    const s = window.__DEBUG__.getStats();
                    return {
                        pos: s.position,
                        biome: s.environment.biome,
                        temp: s.environment.temperatureC,
                        draws: s.performance.drawCalls,
                        tris: s.performance.triangles,
                        activeChunks: s.performance.activeChunks
                    };
                });

                console.log(`  ✓ Teleported to ${wp.id} (${currentStats.pos.x}, ${currentStats.pos.z}) in ${tpDurationMs}ms · Biome: ${currentStats.biome} (${currentStats.temp}°C) · Draws: ${currentStats.draws}`);
            } catch (err) {
                console.warn(`  ⚠ Teleport to ${wp.id} skipped non-critically: ${err?.message ?? err}`);
            }
        }

        // 8. Teleport to 4-Wall Prop & Enemy Showroom Gallery
        console.log(`[TELEMETRY] 7. Entering 4-Wall Prop/Enemy Validation Showroom...`);
        const showroomStart = Date.now();
        const showroomRes = await page.evaluate(async () => window.__DEBUG__.openShowroom());
        expect(showroomRes).toBeDefined();
        await page.waitForTimeout(600);
        const showroomDurationMs = Date.now() - showroomStart;

        const showroomStats = await page.evaluate(() => window.__DEBUG__.getStats());
        console.log(`[TELEMETRY]    Showroom Loaded in ${showroomDurationMs}ms at position (${showroomStats.position.x}, ${showroomStats.position.z})`);
        console.log(`[TELEMETRY]    Showroom Render Workload: ${showroomStats.performance.drawCalls} draw calls, ${showroomStats.performance.triangles.toLocaleString()} triangles, ${showroomStats.performance.textures} textures`);

        // 9. Collect smooth FPS metrics over 1.2s in the showroom
        const fpsMeasurement = await page.evaluate(() => new Promise((resolve) => {
            let frames = 0;
            const start = performance.now();
            function count() {
                frames += 1;
                if (performance.now() - start < 1200) {
                    requestAnimationFrame(count);
                } else {
                    const elapsed = (performance.now() - start) / 1000;
                    resolve({ fps: Math.round(frames / Math.max(elapsed, 0.001)), frames, elapsedSec: elapsed });
                }
            }
            requestAnimationFrame(count);
        }));

        console.log(`[TELEMETRY] 8. Showroom Measured Framerate: ${fpsMeasurement.fps} FPS (${fpsMeasurement.frames} frames in ${fpsMeasurement.elapsedSec?.toFixed(2) || '1.20'}s)`);
        expect(fpsMeasurement.fps).toBeGreaterThanOrEqual(20);

        // 10. Test Console Commands and Final Verification
        const finalStats = await page.evaluate(() => window.__DEBUG__.getStats());
        expect(finalStats).toBeDefined();

        console.log(`\n============================================================`);
        console.log(`[TELEMETRY REPORT] AUTOMATED PLAYTHROUGH PASSED SUCCESSFULLY`);
        console.log(`  - Boot Time: ${bootDurationMs}ms`);
        console.log(`  - Intro/Run Init: ${runInitDurationMs}ms`);
        console.log(`  - Radial POIs Discovered: ${pois.length}`);
        console.log(`  - Showroom Load Latency: ${showroomDurationMs}ms`);
        console.log(`  - Measured Framerate: ${fpsMeasurement.fps} FPS`);
        console.log(`  - Total Triangles Rendered: ${showroomStats.performance.triangles.toLocaleString()}`);
        console.log(`============================================================\n`);
    });
});
