// Run against the local Vite server. Re-renders shipped models without editing source artwork.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { getArmoryModel, getArmoryOfferedIds } from '../src/armoryAssets.js';
import { getCatalogIdsByType, getCatalogEntry, ITEM_TYPE } from '../src/itemOwnership.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'public/economy/armory');
fs.mkdirSync(output, { recursive: true });
const ids = [...Object.values(getArmoryOfferedIds()).flat(),
    ...getCatalogIdsByType(ITEM_TYPE.CHARM), ...getCatalogIdsByType(ITEM_TYPE.MOD)].map(String);
const manifest = {};
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
    const page = await browser.newPage();
    await page.goto(`${process.env.ARMORY_PREVIEW_ORIGIN || 'http://127.0.0.1:5186'}/scripts/armory-preview.html`);
    await page.waitForFunction(() => typeof window.renderArmoryPreview === 'function');
    for (const id of ids) {
        const model = getArmoryModel(id);
        if (!model) {
            const entry = getCatalogEntry(id);
            if (entry?.achievementKey) manifest[id] = { icon: `/ach_${entry.achievementKey}.png`, source: 'achievement-emblem', model: null };
            continue;
        }
        const icon = `/economy/armory/${id.replace(':', '-')}.png`;
        const png = await page.evaluate((url) => window.renderArmoryPreview(url), model);
        fs.writeFileSync(path.join(root, 'public', icon), Buffer.from(png, 'base64'));
        manifest[id] = { icon, source: 'model-render', model };
        console.log(`${id}: ${icon}`);
    }
} finally { await browser.close(); }
fs.writeFileSync(path.join(root, 'src/data/armoryPreviews.js'),
    `// Transparent renders of shipped models; unmodeled rewards use their existing achievement emblems.\nexport const ARMORY_PREVIEWS = Object.freeze(${JSON.stringify(manifest, null, 4)});\n`);
console.log(`Saved ${Object.keys(manifest).length} preview entries.`);
