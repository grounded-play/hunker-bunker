import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Sprint 52 museum walk (owner, 2026-10-07: "walk the prop aisle and see it
// all, is this right"). Opens the Asset Museum, waits for every life-size
// exhibit, then writes:
//   <out>/report.json        every exhibit's measured size, triangles, load error
//   <out>/<category>-NN.png  each row of a category at eye level, beside the
//                            operator-height posts the museum plants
// Run with HB_PROBES=1 against a dev server. Output: $MUSEUM_OUT, default
// playwright-report/museum-walk. MUSEUM_KINDS=world,enemy narrows the rows.
const OUT = process.env.MUSEUM_OUT ?? 'playwright-report/museum-walk';
const KINDS = new Set((process.env.MUSEUM_KINDS ?? 'world,enemy,character').split(','));
const ONLY = process.env.MUSEUM_CATEGORIES ? new Set(process.env.MUSEUM_CATEGORIES.split(',')) : null;

test.setTimeout(1_200_000);
test('museum walk: sizes and eye-level rows', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 640 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.evaluate(() => {
        window.__museumDone = false;
        window.__DEBUG__.openMuseum().then(() => { window.__museumDone = true; });
    });
    // openMuseum resolves after the last category finishes loading.
    await page.waitForFunction(() => window.__museumDone === true, null, { timeout: 900_000, polling: 2000 });
    await page.waitForTimeout(4000);
    await page.evaluate(async () => {
        const THREE = await import('/node_modules/.vite/deps/three.js').catch(() => import('three'));
        window.game.museumBox3 = THREE.Box3;
    });

    const rows = await page.evaluate(() => window.game.scene.getObjectByName('debug-museum').userData.museumReport
        .map(({ category, kind, label, type, ok, error, x, z, size, minY, tris }) => ({ category, kind, label, type, ok, error, x, z, size, minY, tris })));
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(rows, null, 2));

    // Group into the museum's rows (same z), then render each at eye level.
    const byRow = new Map();
    for (const row of rows) {
        if (!row.ok || !KINDS.has(row.kind) || (ONLY && !ONLY.has(row.category))) continue;
        const key = `${row.category}|${row.z}`;
        if (!byRow.has(key)) byRow.set(key, []);
        byRow.get(key).push(row);
    }
    let n = 0;
    for (const [key, members] of byRow) {
        const [category] = key.split('|');
        const xs = members.map((m) => m.x);
        const minX = Math.min(...xs) - 2.4;
        const maxX = Math.max(...xs) + 2.4;
        const z = members[0].z;
        const tallest = Math.max(2.4, ...members.map((m) => (m.size?.y ?? 1) + 0.8));
        const dataUrl = await page.evaluate(({ minX, maxX, z, tallest }) => {
            const game = window.game;
            const halfW = (maxX - minX) / 2;
            const halfH = Math.max(tallest / 2 + 0.3, halfW * (640 / 1600));
            const cx = (minX + maxX) / 2;
            const cam = new game.orthographicCamera.constructor(-halfW, halfW, halfH, -halfH, 0.1, 400);
            cam.position.set(cx, halfH - 0.2, z + 30);
            cam.lookAt(cx, halfH - 0.2, z);
            cam.updateMatrixWorld(true);
            game.player.position.set(cx, 0, z - 60);
            const group = game.scene.getObjectByName('debug-museum');
            // Only this row: hide everything more than half a row away in z.
            const hidden = [];
            for (const child of group.children) {
                if (child.isLight || child.name === 'debug-museum-floor') continue;
                // Exhibits sit inside groups at the origin (paired specimens),
                // so judge each by where its geometry actually is.
                const box = new game.museumBox3();
                box.setFromObject(child);
                if (box.isEmpty()) continue;
                const p = box.getCenter(new child.position.constructor());
                if (Math.abs(p.z - z) > 1.7 || p.x < minX - 1 || p.x > maxX + 1) {
                    if (child.visible) { hidden.push(child); child.visible = false; }
                }
            }
            game.renderer.render(game.scene, cam);
            const url = game.renderer.domElement.toDataURL('image/png');
            for (const child of hidden) child.visible = true;
            return url;
        }, { minX, maxX, z, tallest });
        const file = `${category.replace(/[^A-Z0-9]+/gi, '_')}-${String(n++).padStart(3, '0')}.png`;
        fs.writeFileSync(path.join(OUT, file), Buffer.from(dataUrl.split(',')[1], 'base64'));
    }
});
