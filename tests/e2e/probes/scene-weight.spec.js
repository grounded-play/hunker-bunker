import fs from 'node:fs';
import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro, stubOfflineElectronAPI } from '../helpers.js';

// S53-02 (docs/planning/sprint-53-plan-2026-10-15.md): where do the triangles
// and draw calls go? The 2026-10-15 PC run ended at 7.6 M triangles and 890
// draw calls. This walks a square spiral (as long-walk.spec.js does, so chunks
// stream as in play) and, at each stop, attributes three frames of draws to
// their source and pass by wrapping renderer.renderBufferDirect.
//
//   HB_PROBES=1 SCENE_WEIGHT_OUT=<dir> npx playwright test tests/e2e/probes/scene-weight.spec.js
//
// <dir>/scene-weight.json: per stop, totals for the main and shadow passes,
// the heaviest sources by triangles, and how many chunks drew.
const OUT = process.env.SCENE_WEIGHT_OUT ?? 'playwright-report/scene-weight';
const RINGS = Number(process.env.SCENE_WEIGHT_RINGS ?? 3);
const LEG_SECONDS = Number(process.env.SCENE_WEIGHT_LEG_SECONDS ?? 10);

test('scene weight: triangles and draw calls by source as the run explores', async ({ page }) => {
    test.skip(!process.env.HB_PROBES, 'HB_PROBES=1');
    test.setTimeout(900_000);
    fs.mkdirSync(OUT, { recursive: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await stubOfflineElectronAPI(page);
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.evaluate(() => {
        const g = window.game;
        g.setGodMode?.(true);
        g.setNoclip?.(true, 1);
        const r = g.renderer;
        const label = (object) => {
            for (let o = object; o; o = o.parent) {
                const u = o.userData ?? {};
                const t = u.world3dModelType || u.modelType || u.dressingType || u.propType || u.type;
                if (t) return String(t);
                if (o.name && !/^(Scene|Group|Object3D|node_\d+|Mesh)$/.test(o.name)) return o.name;
            }
            const m = Array.isArray(object.material) ? object.material[0] : object.material;
            return `${object.type}:${m?.name || m?.type || '?'}<${object.parent?.name || object.parent?.type || '?'}`;
        };
        window.__weight = { recording: false, rows: new Map(), chunks: new Set() };
        const original = r.renderBufferDirect.bind(r);
        r.renderBufferDirect = (camera, scene, geometry, material, object, group) => {
            const w = window.__weight;
            if (w.recording) try {
                // By camera: the key light's and the suit spotlight's shadow
                // cameras, or the game camera (a depth-material draw from the
                // game camera is a composer depth pass, not a shadow).
                const pass = camera === g.directionalLight?.shadow?.camera ? 'shadow-key'
                    : camera === g.playerForwardSpotLight?.shadow?.camera ? 'shadow-spot'
                        : material.isMeshDepthMaterial || material.isMeshDistanceMaterial ? (camera === g.camera ? 'depth-pass' : 'shadow-other')
                            : camera === g.camera ? 'main' : 'other';
                const index = geometry.index;
                const count = group ? group.count : (index ? index.count : geometry.attributes.position?.count ?? 0);
                const instances = object.isInstancedMesh ? object.count : (geometry.isInstancedBufferGeometry ? geometry.instanceCount : 1);
                const tris = object.isMesh ? Math.round((count / 3) * instances) : 0;
                const key = `${pass}|${label(object)}`;
                const row = w.rows.get(key) ?? { calls: 0, tris: 0 };
                row.calls += 1;
                row.tris += tris;
                w.rows.set(key, row);
                w.chunkSet ??= new Set(g.chunkMeshes?.values?.() ?? []);
                for (let o = object; o; o = o.parent) if (w.chunkSet.has(o)) { w.chunks.add(o); break; }
            } catch (error) {
                w.error ??= String(error?.stack ?? error).slice(0, 400);
            }
            return original(camera, scene, geometry, material, object, group);
        };
    });

    const stops = [];
    const sample = async (label) => {
        await page.evaluate(() => { const w = window.__weight; w.rows.clear(); w.chunks.clear(); w.chunkSet = null; w.recording = true; });
        await page.evaluate(() => new Promise((resolve) => { let n = 0; const tick = () => (++n >= 3 ? resolve() : requestAnimationFrame(tick)); requestAnimationFrame(tick); }));
        const stop = await page.evaluate((lbl) => {
            const g = window.game;
            const w = window.__weight;
            w.recording = false;
            const frames = 3;
            const rows = [...w.rows.entries()].map(([key, v]) => {
                const [pass, source] = key.split('|');
                return { pass, source, calls: Math.round(v.calls / frames), tris: Math.round(v.tris / frames) };
            });
            const passes = [...new Set(rows.map((x) => x.pass))];
            const total = (pass) => rows.filter((x) => x.pass === pass).reduce((acc, x) => ({ calls: acc.calls + x.calls, tris: acc.tris + x.tris }), { calls: 0, tris: 0 });
            const top = (pass) => rows.filter((x) => x.pass === pass).sort((a, b) => b.tris - a.tris).slice(0, 15);
            return {
                label: lbl,
                pos: [Math.round(g.player.position.x), Math.round(g.player.position.z)],
                passes: Object.fromEntries(passes.map((p) => [p, total(p)])),
                main: total('main'),
                shadow: total('shadow-key'),
                chunksDrawing: w.chunks.size,
                probeError: w.error ?? null,
                chunksMounted: g.chunkMeshes?.size ?? 0,
                heapMB: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1e6),
                gpu: { geometries: g.renderer.info.memory.geometries, textures: g.renderer.info.memory.textures },
                top: Object.fromEntries(passes.map((p) => [p, top(p)]))
            };
        }, label);
        stops.push(stop);
        console.log(`${label} ${Object.entries(stop.passes).map(([p, v]) => `${p} ${v.tris}/${v.calls}`).join(', ')}; chunks ${stop.chunksDrawing}/${stop.chunksMounted}`);
    };

    await page.waitForTimeout(4000);
    await sample('spawn');
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    let leg = LEG_SECONDS;
    for (let ring = 0; ring < RINGS * 2; ring++) {
        const [vx, vz] = dirs[ring % 4];
        const end = Date.now() + leg * 1000;
        while (Date.now() < end) {
            await page.evaluate(({ vx, vz }) => window.game.setVirtualInput(vx, vz), { vx, vz });
            await page.waitForTimeout(1000);
        }
        await page.evaluate(() => window.game.setVirtualInput(0, 0));
        await page.waitForTimeout(1500);
        await sample(`leg-${ring + 1}`);
        if (ring % 2 === 1) leg += LEG_SECONDS;
    }
    fs.writeFileSync(`${OUT}/scene-weight.json`, JSON.stringify(stops, null, 1));
});
