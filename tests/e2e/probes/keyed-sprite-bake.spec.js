import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Exports every runtime-keyed sprite exactly as the game's keyer produced it,
// for scripts/art/build_keyed_sprite_ktx2.py to encode (src/keyedSpriteBakes.js).
// Baked sprites are switched off for the run so everything keys live.
//   HB_PROBES=1 SPRITE_BAKE_OUT=/tmp/keyed npx playwright test -c <gpu config> tests/e2e/probes/keyed-sprite-bake.spec.js
// SPRITE_BAKE_RADIUS (chunks, default 4) widens the area mounted to meet more sprites.
// SPRITE_BAKE_MISSES=1 keeps the existing bakes on, so only sprites that still
// key at runtime are exported: the way to grow coverage (the encoder merges).
const OUT = process.env.SPRITE_BAKE_OUT ?? 'playwright-report/keyed-sprite-bake';
const RADIUS = Number(process.env.SPRITE_BAKE_RADIUS ?? 4);
const MISSES_ONLY = process.env.SPRITE_BAKE_MISSES === '1';

test.setTimeout(1_200_000);
test('keyed sprites: export for baking', async ({ page }) => {
    await page.addInitScript((missesOnly) => {
        window.__HB_SPRITE_BAKE__ = true;
        try { localStorage.setItem('hb_sprite_ktx2', missesOnly ? '1' : '0'); } catch { /* private mode */ }
    }, MISSES_ONLY);
    await page.setViewportSize({ width: 1280, height: 800 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForFunction(() => window.game?.performanceProfile === 'gameplay', null, { timeout: 60_000 });
    await page.evaluate((radius) => {
        const game = window.game;
        for (let cy = -radius; cy <= radius; cy += 1) {
            for (let cx = -radius; cx <= radius; cx += 1) {
                game.getOrCreateChunk(cx, cy);
                if (!game.chunkMeshes.has(`${cx},${cy}`)) game.mountChunk(cx, cy);
            }
        }
    }, RADIUS);
    // Keying runs in idle time: wait until the queue has stayed empty a while.
    await page.waitForFunction(() => {
        const queue = window.game._deferredGameplayAtlasProcessors ?? [];
        if (queue.length) window.__bakeQuietSince = null;
        else window.__bakeQuietSince ??= performance.now();
        return window.__bakeQuietSince && performance.now() - window.__bakeQuietSince > 6000;
    }, null, { timeout: 600_000, polling: 500 });

    const keys = await page.evaluate(async () => (await import('/src/keyedSpriteBakes.js')).listRecordedKeyedSprites().map(({ key }) => key));
    fs.mkdirSync(OUT, { recursive: true });
    const index = [];
    for (const [n, key] of keys.entries()) {
        const dataUrl = await page.evaluate(async (wanted) => {
            const entry = (await import('/src/keyedSpriteBakes.js')).listRecordedKeyedSprites().find(({ key: k }) => k === wanted);
            const canvas = document.createElement('canvas');
            canvas.width = entry.image.width;
            canvas.height = entry.image.height;
            canvas.getContext('2d').drawImage(entry.image, 0, 0);
            return canvas.toDataURL('image/png');
        }, key);
        const file = `${String(n).padStart(3, '0')}.png`;
        fs.writeFileSync(path.join(OUT, file), Buffer.from(dataUrl.split(',')[1], 'base64'));
        index.push({ key, file });
    }
    fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1));
    console.log(`keyed sprites exported: ${index.length}`);
    if (!MISSES_ONLY) expect(index.length).toBeGreaterThan(0);
});
