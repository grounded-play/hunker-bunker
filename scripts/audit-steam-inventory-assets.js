#!/usr/bin/env node
/* global process, console */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STEAM_ITEM_CATALOG } from '../src/data/steamItemCatalog.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function readPngInfo(filename) {
    const bytes = fs.readFileSync(filename);
    if (bytes.length < 33 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
        throw new Error(`${filename} is not a PNG.`);
    }
    return {
        width: bytes.readUInt32BE(16),
        height: bytes.readUInt32BE(20),
        colorType: bytes[25]
    };
}

export function auditSteamInventoryAssets({
    root = ROOT,
    schema = JSON.parse(fs.readFileSync(path.join(root, 'steam/inventory_schema_hunker_bunker.json'), 'utf8')),
    catalog = STEAM_ITEM_CATALOG
} = {}) {
    const failures = [];
    const visibleSchemaItems = schema.items.filter((entry) => entry.type === 'item' && entry.icon_url);
    for (const entry of visibleSchemaItems) {
        const item = catalog[entry.itemdefid];
        if (!item) {
            failures.push(`ItemDef ${entry.itemdefid} is absent from STEAM_ITEM_CATALOG`);
            continue;
        }
        const remoteSlug = path.basename(new URL(entry.icon_url).pathname, '.png');
        const expectedLocal = `/economy/${remoteSlug}.png`;
        if (item.localImg !== expectedLocal) failures.push(`ItemDef ${entry.itemdefid} local fallback does not match schema icon slug`);
        if (item.img !== entry.icon_url) failures.push(`ItemDef ${entry.itemdefid} remote icon drift`);

        const checks = [
            [path.join(root, 'public', item.localImg.slice(1)), 256, 'local'],
            [path.join(root, 'public', item.localImgLarge.slice(1)), 512, 'large'],
            [path.join(root, `steam/store/item_icons/${remoteSlug}_master.png`), 1254, 'master'],
            [path.join(root, `steam/store/item_icons/chroma/${remoteSlug}_chroma.png`), 1254, 'chroma']
        ];
        for (const [filename, minimumSize, label] of checks) {
            if (!fs.existsSync(filename)) {
                failures.push(`ItemDef ${entry.itemdefid} missing ${label}: ${path.relative(root, filename)}`);
                continue;
            }
            try {
                const info = readPngInfo(filename);
                if (info.width !== info.height || info.width < minimumSize) {
                    failures.push(`ItemDef ${entry.itemdefid} ${label} must be square and at least ${minimumSize}px`);
                }
                if (label !== 'chroma' && info.colorType !== 6) {
                    failures.push(`ItemDef ${entry.itemdefid} ${label} must be RGBA PNG`);
                }
            } catch (error) {
                failures.push(error.message);
            }
        }
    }
    return { ok: failures.length === 0, itemCount: visibleSchemaItems.length, failures };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const result = auditSteamInventoryAssets();
    if (!result.ok) {
        console.error(`[inventory-assets] failed (${result.failures.length}):`);
        for (const failure of result.failures) console.error(`- ${failure}`);
        process.exitCode = 1;
    } else {
        console.log(`[inventory-assets] ok (${result.itemCount} visible ItemDefs; chroma, master, 256px and 512px assets present)`);
    }
}
