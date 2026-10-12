import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Lived-in pass 2, Phase 0 (docs/planning/lived-in-world-pass-2-2026-10-09.md):
// pins the map, then captures the same floor boundaries before and after the
// blended floor lands.
//   HB_PROBES=1 FLOOR_SHOTS_DIR=/tmp/shots FLOOR_SHOTS_LABEL=before \
//     npx playwright test -c <gpu config> tests/e2e/probes/floor-blend-captures.spec.js
const SEED_OFFSET = 424242;

test('floor boundaries: pinned-map captures', async ({ page }) => {
    test.setTimeout(300_000);
    const shaderErrors = [];
    page.on('console', (message) => {
        if (/Shader Error|WebGLProgram|GL_INVALID|Floor layer|Floor surface|Floor utility|No BC7|Stickers failed|Lived-in dressing|Room decal layers failed/i.test(message.text())) shaderErrors.push(message.text().slice(0, 400));
    });
    await page.setViewportSize({ width: 1600, height: 900 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForFunction(() => window.game?.performanceProfile === 'gameplay', null, { timeout: 30_000 });

    // A fixed seed regenerates the same map on every run of this probe.
    await page.evaluate((offset) => {
        const game = window.game;
        game.fixedRunEntropy = true;
        game.globalSeedOffset = offset;
        game.respawnPlayer();
        game.setGodMode?.(true);
    }, SEED_OFFSET);
    await page.waitForTimeout(3_000);

    const spots = await page.evaluate((maxRadius) => {
        const game = window.game;
        const size = game.chunkSize;
        const found = {};
        const chunks = [];
        for (let radius = 0; radius <= maxRadius; radius += 1) {
            for (let cy = -radius; cy <= radius; cy += 1) {
                for (let cx = -radius; cx <= radius; cx += 1) {
                    if (Math.max(Math.abs(cx), Math.abs(cy)) !== radius) continue;
                    chunks.push([cx, cy]);
                }
            }
        }
        const signature = [];
        for (const [cx, cy] of chunks) {
            const grid = game.getOrCreateChunk(cx, cy);
            if (!game.chunkMeshes.has(`${cx},${cy}`)) game.mountChunk(cx, cy);
            const rows = Array.isArray(grid) ? grid : grid?.grid;
            if (!rows) continue;
            signature.push(rows.join('').length + rows.join('').split('#').length);
            const landform = game.getChunkLandform(cx, cy);
            const metadata = game.wfcMetadataCache.get(`${cx},${cy}`);
            const at = (x, y) => rows[y]?.[x];
            const world = (cell) => ({ x: cx * size + cell.x, z: cy * size + cell.y, chunk: `${cx},${cy}`, landform });
            for (const room of metadata?.roomInstances ?? []) {
                const lanes = room.navigation?.doorLanes ?? [];
                const interior = new Set((room.interior ?? []).map((c) => `${c.x},${c.y}`));
                // A door: a lane cell next to the room, standing just outside.
                for (const lane of lanes) {
                    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        const out = { x: lane.x + dx * 2, y: lane.y + dy * 2 };
                        if (at(out.x, out.y) !== '.' || interior.has(`${out.x},${out.y}`)) continue;
                        const key = `${cx},${cy}` === '0,0' ? 'crashDoor' : landform === 'maze' ? 'mazeDoor' : 'openDoor';
                        if (!found[key]) found[key] = world(out);
                    }
                }
                if (!found.roomInterior && `${cx},${cy}` !== '0,0' && room.interior?.length > 20) {
                    found.roomInterior = world(room.interior[Math.floor(room.interior.length / 2)]);
                }
                // One room per theme, to see each theme's floor surface.
                const themeKey = `room-${room.theme}`;
                if (!found[themeKey] && `${cx},${cy}` !== '0,0' && room.interior?.length > 12) {
                    found[themeKey] = world(room.interior[Math.floor(room.interior.length / 2)]);
                }
            }
            const roomCells = new Set((metadata?.roomInstances ?? []).flatMap((r) => r.interior ?? []).map((c) => `${c.x},${c.y}`));
            const isHall = (x, y) => at(x, y) === '.' && !roomCells.has(`${x},${y}`);
            // Exterior ground in the open landforms.
            if (!found[`${landform}Ground`] && landform !== 'maze') {
                for (let y = 10; y < size - 10 && !found[`${landform}Ground`]; y += 1) {
                    for (let x = 10; x < size - 10; x += 1) {
                        if (at(x, y) === 'O' && at(x + 1, y) === 'O' && at(x, y + 1) === 'O') {
                            found[`${landform}Ground`] = world({ x, y });
                            break;
                        }
                    }
                }
            }
            for (let y = 3; y < size - 3; y += 1) {
                for (let x = 3; x < size - 3; x += 1) {
                    if (!isHall(x, y)) continue;
                    // Corridor floor meeting the exterior ground ('O' ledge).
                    const edgeKey = `${cx},${cy}` === '0,0' ? 'crashEdge' : `${landform}Edge`;
                    if (!found[edgeKey] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy) === 'O')) {
                        found[edgeKey] = world({ x, y });
                    }
                    // A corridor: the middle of a straight 7-cell run.
                    if (!found.corridor && landform === 'maze') {
                        const across = [-3, -2, -1, 0, 1, 2, 3].every((k) => isHall(x + k, y));
                        const down = [-3, -2, -1, 0, 1, 2, 3].every((k) => isHall(x, y + k));
                        if (across || down) found.corridor = world({ x, y });
                    }
                }
            }
        }
        return { found, signature };
    }, Number(process.env.FLOOR_SHOTS_RADIUS ?? 2));
    console.log(JSON.stringify(spots, null, 2));
    expect(Object.keys(spots.found).length).toBeGreaterThan(2);

    const dir = process.env.FLOOR_SHOTS_DIR;
    const label = process.env.FLOOR_SHOTS_LABEL || 'capture';
    if (dir) fs.mkdirSync(dir, { recursive: true });
    const stats = {};
    for (const [name, spot] of Object.entries(spots.found)) {
        await page.evaluate(({ x, z }) => {
            const game = window.game;
            game.teleportPlayerTo(x, z, { safeFloor: false });
            game.snapCameraToPlayer?.();
        }, spot);
        await page.waitForTimeout(2_500);
        stats[name] = await page.evaluate(() => {
            const game = window.game;
            for (const id of ['ui', 'tilt-shift-overlay', 'damage-vignette', 'cinematic-overlay']) {
                const element = document.getElementById(id);
                if (element) element.style.visibility = 'hidden';
            }
            document.querySelectorAll('[id*="hud"], [class*="hud"], [id*="prompt"], .modal, [role="dialog"]').forEach((element) => {
                element.style.visibility = 'hidden';
            });
            const info = game.renderer?.info;
            return {
                calls: info?.render?.calls ?? null,
                programs: info?.programs?.length ?? null,
                floorLayersReady: game.floorSplatShared?.uFloorLayersReady?.value ?? null,
                surfacesReady: game.floorSplatShared?.uSurfacesReady?.value ?? null,
                utilityReady: game.floorSplatShared?.uFloorUtilityReady?.value ?? null,
                stickersReady: game.stickerMaterial?.userData?.stickerUniforms?.uStickersReady?.value ?? null,
                stickers: game.scene.getObjectsByProperty('name', 'lived-in-stickers').reduce((sum, mesh) => sum + mesh.count, 0),
                roomDecals: game.scene.getObjectsByProperty('name', 'room-dressing-decals').reduce((sum, mesh) => sum + mesh.count, 0),
                roomDecalsReady: game.roomDecalMaterial?.userData?.stickerUniforms?.uStickersReady?.value ?? null,
                livedInProps: game.scene.getObjectsByProperty('name', 'lived-in-world-dressing').reduce((sum, group) => sum + (group.userData.itemCount ?? 0), 0),
                triangles: game.renderer?.info?.render?.triangles ?? null
            };
        });
        if (dir) await page.screenshot({ path: path.join(dir, `${label}-${name}.png`) });
    }
    console.log(JSON.stringify(stats, null, 2));
    expect(shaderErrors).toEqual([]);
});
