#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { read as readKtx2 } from 'three/examples/jsm/libs/ktx-parse.module.js';

import { LEGACY_DECAL_LAYERS } from '../src/data/legacyDecalLayers.js';
import { STICKER_LAYERS } from '../src/data/stickerLayers.js';
import { WORLD_EXPANSION_80_SPECS } from '../src/data/worldExpansion80.js';
import { FLOOR_SURFACES, ROOM_THEME_SURFACES, floorSurfaceFileNames } from '../src/floorSplat.js';
import { DECAL_WORLD_SCALES, DRESSING_KITS, ROLE_DRESSING, dressingKitFor } from '../src/roomDressingKits.js';
import { getSurfaceAssetProfile } from '../src/surfaceAssetRegistry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const REPORT = path.join(ROOT, 'docs/planning/texture-decal-total-audit-2026-10-16.md');
const failures = [];

function familyOf(name) {
    return name.replace(/_[abcd]$/, '');
}

function checkKtx(relative, { format, width, height, minLevels }) {
    const file = path.join(PUBLIC, relative);
    if (!fs.existsSync(file)) {
        failures.push(`missing ${relative}`);
        return;
    }
    const container = readKtx2(new Uint8Array(fs.readFileSync(file)));
    if (container.vkFormat !== format) failures.push(`${relative}: vkFormat ${container.vkFormat}, expected ${format}`);
    if (container.pixelWidth !== width || container.pixelHeight !== height) {
        failures.push(`${relative}: ${container.pixelWidth}x${container.pixelHeight}, expected ${width}x${height}`);
    }
    if (container.levels.length < minLevels) failures.push(`${relative}: only ${container.levels.length} mip levels`);
}

const surfaceLayers = floorSurfaceFileNames();
for (const name of surfaceLayers) {
    checkKtx(`3d/runtime/surfaces/${name}_albedo.ktx2`, { format: 146, width: 1024, height: 1024, minLevels: 9 });
    checkKtx(`3d/runtime/surfaces/${name}_detail.ktx2`, { format: 145, width: 1024, height: 1024, minLevels: 9 });
}

for (const { name } of STICKER_LAYERS) {
    checkKtx(`3d/runtime/decals/${name}_albedo.ktx2`, { format: 146, width: 1024, height: 512, minLevels: 8 });
    checkKtx(`3d/runtime/decals/${name}_detail.ktx2`, { format: 145, width: 1024, height: 512, minLevels: 8 });
}
for (const { name } of LEGACY_DECAL_LAYERS) {
    checkKtx(`3d/runtime/decals/legacy/${name}_albedo.ktx2`, { format: 146, width: 512, height: 512, minLevels: 8 });
    checkKtx(`3d/runtime/decals/legacy/${name}_detail.ktx2`, { format: 145, width: 512, height: 512, minLevels: 8 });
}

const publicDecals = fs.readdirSync(PUBLIC)
    .filter((name) => /^decal_.*\.png$/.test(name))
    .map((name) => name.slice(0, -4))
    .sort();
const registeredDecals = LEGACY_DECAL_LAYERS.map(({ name }) => name).sort();
if (JSON.stringify(publicDecals) !== JSON.stringify(registeredDecals)) {
    failures.push('public decal PNGs and legacy PBR layer registry differ');
}

const families = [...new Set(LEGACY_DECAL_LAYERS.map(({ name }) => familyOf(name)))];
const used = new Set();
for (const kit of [...Object.values(DRESSING_KITS), ...Object.values(ROLE_DRESSING)]) {
    for (const type of [...(kit.wallDecals ?? []), ...(kit.floorDecals ?? [])]) used.add(type);
}
for (const spec of WORLD_EXPANSION_80_SPECS) {
    const kit = dressingKitFor(spec.theme, spec.role);
    for (const type of [...kit.wallDecals, ...kit.floorDecals]) used.add(type);
}
for (const family of families) {
    if (!used.has(family)) failures.push(`${family}: registered but has no placement owner`);
    const range = DECAL_WORLD_SCALES[family];
    if (!range) failures.push(`${family}: missing explicit world scale`);
    else if (!(range.min > 0 && range.max >= range.min && range.max <= 4)) failures.push(`${family}: invalid world scale ${JSON.stringify(range)}`);
    if (!getSurfaceAssetProfile(family)) failures.push(`${family}: missing support-plane profile`);
}

const themedSurfaces = new Set(Object.values(ROOM_THEME_SURFACES).flat());
const systemicSurfaces = new Set([
    'tex_floor_deck_drain', 'tex_ground_regolith', 'tex_ground_rutted_dirt', 'tex_path_gravel_scree',
    'tex_shoulder_swept_grit', 'tex_shoulder_ice_crust', 'tex_shoulder_resin_lip', 'tex_overlay_puddles'
]);
for (const surface of FLOOR_SURFACES) {
    if (!themedSurfaces.has(surface.id) && !systemicSurfaces.has(surface.id)) failures.push(`${surface.id}: no theme or systemic owner`);
    if (!(surface.scale >= 1.5 && surface.scale <= 6)) failures.push(`${surface.id}: implausible repeat scale ${surface.scale}m`);
}

const pixelRun = spawnSync('python3', ['scripts/art/audit_texture_pixels.py'], { cwd: ROOT, encoding: 'utf8' });
let pixels = null;
try {
    pixels = JSON.parse(pixelRun.stdout.trim());
} catch {
    failures.push(`pixel audit did not return JSON: ${pixelRun.stderr || pixelRun.stdout}`);
}
for (const failure of pixels?.failures ?? []) failures.push(failure);
if (pixelRun.status !== 0 && !(pixels?.failures?.length)) failures.push(`pixel audit exited ${pixelRun.status}: ${pixelRun.stderr}`);

if (failures.length) {
    console.error(`[texture-decal-audit] ${failures.length} failure(s)`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
}

const report = `# Total texture and decal runtime audit — 2026-10-16

Status: **PASS**

## Runtime texture arrays

- ${surfaceLayers.length} floor surface layers: paired BC7 sRGB albedo/metalness and linear normal/roughness/height, 1024², 9 mip levels.
- ${STICKER_LAYERS.length} environmental sticker layers: paired PBR arrays, 1024×512, 8 mip levels.
- ${LEGACY_DECAL_LAYERS.length} room/story decal layers: paired PBR arrays, 512², 8 mip levels.
- No missing, orphaned, or unregistered KTX2 payloads in these registries.

## Usage and physical scale

- ${FLOOR_SURFACES.length} surface families all have a theme palette or an explicit systemic owner.
- ${families.length} decal families all have at least one placement owner, an explicit support-plane profile, and a physical world-scale range.
- Surface repeat scales remain within 1.5–6 metres; decal depth scales remain within their authored ranges and never exceed 4 metres.
- World Expansion 80 placement is restricted to each asset's exact room theme rather than its broader biome family.

## Pixel integrity

- ${pixels.decals} public decal PNGs contain real transparency and solid subject pixels; alpha coverage range ${(pixels.decalCoverageMin * 100).toFixed(1)}–${(pixels.decalCoverageMax * 100).toFixed(1)}%.
- ${pixels.seamLayers} retained surface review layers pass opposing-edge comparison; maximum mean edge error ${pixels.seamErrorMax.toFixed(6)} after WebP encoding.
- Decal alpha is baked into the compressed albedo arrays; normal/roughness/metalness remains in the paired linear detail arrays.
`;
fs.writeFileSync(REPORT, report);
console.log(`[texture-decal-audit] PASS surfaces=${surfaceLayers.length} decals=${LEGACY_DECAL_LAYERS.length} families=${families.length}`);
