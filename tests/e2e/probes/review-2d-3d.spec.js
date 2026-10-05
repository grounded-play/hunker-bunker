import { test } from '@playwright/test';
import fs from 'node:fs';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';
import { WORLD_3D_CANDIDATES } from '../../../src/data/world3dCandidates.js';

// 2D -> 3D review row: opens the debug museum and captures each 2D sprite beside
// its candidate GLB, isolated from the rest of the hall. Writes
// docs/reports/assets/2d-3d-review/. Run with HB_PROBES=1 (needs the dev server).
const OUT = 'docs/reports/assets/2d-3d-review';
const PAIRS = WORLD_3D_CANDIDATES.reduce((n, c) => n + c.candidates.length, 0);

test.setTimeout(600_000);
test('2D -> 3D review row', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.evaluate(() => { window.__museumPromise = window.__DEBUG__.openMuseum(); });
    await page.waitForFunction((pairs) => {
        const report = window.game?.scene?.getObjectByName('debug-museum')?.userData?.museumReport ?? [];
        return report.filter((r) => r.kind === 'compare').length >= pairs;
    }, PAIRS, { timeout: 300_000, polling: 1000 });
    await page.waitForTimeout(6000); // sprite textures decode after the models land
    const rows = await page.evaluate(() => window.game.scene.getObjectByName('debug-museum').userData.museumReport
        .filter((r) => r.kind === 'compare').map(({ label, ok, error, x, z }) => ({ label, ok, error, x, z })));
    fs.mkdirSync(OUT, { recursive: true });
    for (const [i, row] of rows.entries()) {
        if (!row.ok) { console.log(`not loaded: ${row.label} ${row.error ?? ''}`); continue; }
        const dataUrl = await page.evaluate(({ x, z }) => {
            const game = window.game;
            const cam = new game.orthographicCamera.constructor(-3.2, 3.2, 2.0, -2.0, 0.1, 200);
            cam.position.set(x, 1.9, z + 9);
            cam.lookAt(x, 0.9, z);
            cam.updateMatrixWorld(true);
            game.player.position.set(x, 0, z - 40);
            const group = game.scene.getObjectByName('debug-museum');
            const near = (p) => Math.abs(p.x - x) < 2.4 && Math.abs(p.z - z) < 1.6;
            const hidden = [];
            for (const child of group.children) {
                if (child.isLight || child.name === 'debug-museum-floor') continue;
                const inside = child.name.startsWith('debug-museum-compare')
                    ? child.children.some((c) => near(c.position))
                    : near(child.position);
                if (!inside && child.visible) { hidden.push(child); child.visible = false; }
            }
            game.renderer.render(game.scene, cam);
            const url = game.renderer.domElement.toDataURL('image/png');
            for (const child of hidden) child.visible = true;
            return url;
        }, row);
        const name = row.label.replace(/ \[.*\]$/, '').replace(/ -> /, '__');
        fs.writeFileSync(`${OUT}/${String(i).padStart(2, '0')}-${name}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
    }
});
