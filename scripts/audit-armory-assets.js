#!/usr/bin/env node
// Armory asset gap report.
//
// Answers three questions the bench cannot answer at a glance:
//   1. Which offered items have no name, so they render as a bare itemdef id?
//   2. Which have no icon on disk, so their tile falls back to initials?
//   3. Which icons still carry an un-keyed green chroma background?
//
// Everything here is derived from the same catalogs the Armory renders from,
// so the report cannot drift from what the player actually sees.
//
// Usage: node scripts/audit-armory-assets.js [--check]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ITEM_TYPE, getCatalogIdsByType, getCatalogEntry } from '../src/itemOwnership.js';
import { CATALOG_ITEMS } from '../src/armoryUi.js';
import { WEAPON_ARCHETYPES, WEAPON_SKIN_MESHES, CHASSIS_SKIN_MODELS } from '../src/player3dOverlay.js';
import { CHARM_GLB_MAP, MOD_GLB_MAP } from '../src/armoryScene.js';
import { deriveIconFromModelUrl } from '../src/armoryPicker.js';
import { runChromaGreenScan, CHROMA_GREEN_ALLOWLIST } from './audit-chroma-green.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSON_REPORT = path.join(ROOT, 'docs/reports/armory-asset-gaps.json');
const MD_REPORT = path.join(ROOT, 'docs/reports/armory-asset-gaps.md');

// A tile whose art is this green is showing an un-keyed chroma backdrop rather
// than lore-green content. Deliberately well above the bio/slime assets that
// legitimately sit around 0.05-0.25.
const GREEN_SUSPECT_RATIO = 0.35;

const COMMUNITY_CLASS_ICON = {
    scout: '/economy/chassis_cryo_vanguard_scout.png',
    tank: '/economy/chassis_trench_warden_heavy.png',
    engineer: '/economy/chassis_subterran_drill_engineer.png'
};

function modelUrlFor(id) {
    const key = String(id);
    if (key.startsWith('frame:')) return WEAPON_ARCHETYPES[key.slice(6)] ?? null;
    return WEAPON_SKIN_MESHES[key] ?? CHARM_GLB_MAP[key] ?? MOD_GLB_MAP[key] ?? CHASSIS_SKIN_MODELS[key] ?? null;
}

function iconFor(id) {
    const key = String(id);
    if (key.startsWith('comm_')) return COMMUNITY_CLASS_ICON[key.split('_')[1]] ?? null;
    const entry = getCatalogEntry(id);
    return CATALOG_ITEMS[key]?.icon
        ?? entry?.localImg
        ?? entry?.icon
        ?? deriveIconFromModelUrl(modelUrlFor(key))
        ?? null;
}

function publicExists(webPath) {
    if (!webPath) return false;
    return fs.existsSync(path.join(ROOT, 'public', webPath.replace(/^\//, '')));
}

// Every id the Armory can offer, grouped the way the bench groups them.
function collectArmoryIds() {
    const groups = {
        'weapon frame': Object.keys(WEAPON_ARCHETYPES).map((a) => `frame:${a}`),
        weapon: getCatalogIdsByType(ITEM_TYPE.SKIN),
        charm: getCatalogIdsByType(ITEM_TYPE.CHARM),
        overclock: getCatalogIdsByType(ITEM_TYPE.MOD),
        chassis: getCatalogIdsByType(ITEM_TYPE.CHASSIS),
        decal: getCatalogIdsByType(ITEM_TYPE.DECAL)
    };
    return groups;
}

export function auditArmoryAssets() {
    const greenByFile = new Map();
    try {
        for (const finding of runChromaGreenScan()) greenByFile.set(finding.file, finding.ratio);
    } catch {
        // The scan needs Pillow or the Node PNG path; a missing scanner must not
        // block the name/icon half of the report.
    }

    const rows = [];
    for (const [group, ids] of Object.entries(collectArmoryIds())) {
        for (const rawId of ids) {
            const id = String(rawId);
            const isFrame = id.startsWith('frame:');
            const entry = isFrame ? null : getCatalogEntry(rawId);
            const name = CATALOG_ITEMS[id]?.name ?? entry?.name ?? null;
            const icon = iconFor(id);
            const iconExists = publicExists(icon);
            const model = modelUrlFor(id);
            const greenRatio = icon && iconExists
                ? (greenByFile.get(`public${icon}`) ?? 0)
                : 0;
            rows.push({
                group,
                id,
                name,
                missingName: !isFrame && !name,
                icon,
                iconExists,
                missingIcon: !icon || !iconExists,
                model,
                missingModel: !model,
                greenRatio,
                greenSuspect: greenRatio >= GREEN_SUSPECT_RATIO,
                allowlistedGreen: icon ? CHROMA_GREEN_ALLOWLIST.has(`public${icon}`) : false
            });
        }
    }

    return {
        timestamp: new Date().toISOString(),
        total: rows.length,
        missingName: rows.filter((r) => r.missingName).length,
        missingIcon: rows.filter((r) => r.missingIcon).length,
        missingModel: rows.filter((r) => r.missingModel).length,
        greenSuspect: rows.filter((r) => r.greenSuspect).length,
        rows
    };
}

function table(rows, columns) {
    if (!rows.length) return '_None._\n';
    const head = `| ${columns.map((c) => c[0]).join(' | ')} |\n| ${columns.map(() => '---').join(' | ')} |\n`;
    return head + rows.map((r) => `| ${columns.map((c) => c[1](r)).join(' | ')} |`).join('\n') + '\n';
}

function renderMarkdown(report) {
    const rows = report.rows;
    return `# Armory Asset Gaps

Status: generated | Updated: ${report.timestamp.slice(0, 10)}
| Regenerate: \`npm run audit:armory-assets\`

Derived from the same catalogs the Armory renders from, so this cannot drift
from what the player sees on the bench.

| Check | Count |
| --- | ---: |
| Items offered | ${report.total} |
| **No name** (renders as a bare itemdef id) | **${report.missingName}** |
| **No icon on disk** (tile falls back to initials) | **${report.missingIcon}** |
| No 3D model | ${report.missingModel} |
| **Icon looks like an un-keyed green screen** (≥${GREEN_SUSPECT_RATIO * 100}% green) | **${report.greenSuspect}** |

## 1. Missing names — needs a catalog entry

${table(rows.filter((r) => r.missingName), [
        ['Group', (r) => r.group],
        ['Id', (r) => `\`${r.id}\``]
    ])}
## 2. Missing icons — needs art

${table(rows.filter((r) => r.missingIcon), [
        ['Group', (r) => r.group],
        ['Id', (r) => `\`${r.id}\``],
        ['Name', (r) => r.name ?? '—'],
        ['Expected path', (r) => (r.icon ? `\`${r.icon}\`` : '_no path resolved_')]
    ])}
## 3. Green-screen icons — needs re-keying

These still carry a chroma backdrop. Some are on the chroma allowlist, which
suppresses the presubmit failure but does **not** make them look right on a
tile — an allowlisted entry here still needs the background removed.

${table(rows.filter((r) => r.greenSuspect), [
        ['Group', (r) => r.group],
        ['Id', (r) => `\`${r.id}\``],
        ['Name', (r) => r.name ?? '—'],
        ['Icon', (r) => `\`${r.icon}\``],
        ['Green', (r) => `${Math.round(r.greenRatio * 100)}%`],
        ['Allowlisted', (r) => (r.allowlistedGreen ? 'yes' : 'no')]
    ])}
## 4. Missing 3D models

${table(rows.filter((r) => r.missingModel), [
        ['Group', (r) => r.group],
        ['Id', (r) => `\`${r.id}\``],
        ['Name', (r) => r.name ?? '—']
    ])}`;
}

function main() {
    const check = process.argv.includes('--check');
    const report = auditArmoryAssets();
    fs.writeFileSync(JSON_REPORT, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(MD_REPORT, renderMarkdown(report));
    console.log(`[armory-assets] ${report.total} offered | ${report.missingName} unnamed | `
        + `${report.missingIcon} without art | ${report.greenSuspect} green-screen | `
        + `${report.missingModel} without a model`);
    // Reporting tool, not a gate: these are art tasks, and failing the build on
    // them would block unrelated work. --check is here for CI to opt in later.
    if (check && report.missingName > 0) {
        console.error('[armory-assets] items render as bare ids; add catalog entries');
        process.exitCode = 1;
    }
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) main();
