/* global console, process */
// Pre-cuts the title-screen operator portraits (issue #106).
//
// The title's ACTIVE OPERATOR PROFILE draws one frame of the operator's walk
// sheet. Doing that at runtime downloaded the whole 2048x2048 sheet (1.3 MB
// for TANK) and ran a chroma-key pass over all 4.2M pixels on the main thread
// during boot. This cuts that same frame ahead of time with the game's own
// code (clearChromaGreen + repackGeneratedSpriteAtlas, run in Chromium so the
// canvas maths is the browser's), and saves it losslessly as PNG: the title
// draws the same pixels it always did.
//
// Run against a dev server that serves the current source:
//   npm run dev   (in another terminal)
//   node scripts/build-title-portraits.mjs [http://localhost:5173]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(repoRoot, 'public', 'portraits');
const baseUrl = process.argv[2] ?? 'http://localhost:5173';

// System Chrome when Playwright's own browser isn't installed.
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
try {
    const page = await browser.newPage();
    // A blank page on the dev server's origin, so the game's modules import
    // without booting the game.
    const blank = `${baseUrl}/__title_portraits__.html`;
    await page.route(blank, (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>portraits</title>' }));
    await page.goto(blank);
    const portraits = await page.evaluate(async () => {
        const { clearChromaGreen, repackGeneratedSpriteAtlas } = await import('/src/spriteAtlasRuntime.js');
        const { PLAYER_SPRITE_LAYOUTS } = await import('/src/playerSpriteLayouts.js');
        const out = {};
        for (const [type, layout] of Object.entries(PLAYER_SPRITE_LAYOUTS)) {
            const image = new Image();
            image.src = layout.path;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(image, 0, 0);
            const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
            clearChromaGreen(pixels.data);
            ctx.putImageData(pixels, 0, 0);
            const sheet = repackGeneratedSpriteAtlas(canvas, layout);
            const frameWidth = Math.floor(sheet.width / layout.columns);
            const frameHeight = Math.floor(sheet.height / layout.rows);
            const cell = layout.directionCells[layout.previewDirection];
            const frame = document.createElement('canvas');
            frame.width = frameWidth;
            frame.height = frameHeight;
            const frameCtx = frame.getContext('2d');
            frameCtx.imageSmoothingEnabled = false;
            frameCtx.drawImage(sheet, cell.baseColumn * frameWidth, cell.row * frameHeight, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
            out[type] = frame.toDataURL('image/png');
        }
        return out;
    });
    fs.mkdirSync(outputDir, { recursive: true });
    for (const [type, dataUrl] of Object.entries(portraits)) {
        const file = path.join(outputDir, `title_${type.toLowerCase()}.png`);
        fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
        console.log(`[title-portraits] ${path.relative(repoRoot, file)} ${fs.statSync(file).size} bytes`);
    }
} finally {
    await browser.close();
}
