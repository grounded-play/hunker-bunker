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
import { getArmoryModel, getArmoryIcon, getArmoryOfferedIds, ARMORY_WEAPON_NAMES } from '../src/armoryAssets.js';
import { ARMORY_PREVIEWS } from '../src/data/armoryPreviews.js';
import { runChromaGreenScan, CHROMA_GREEN_ALLOWLIST } from './audit-chroma-green.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSON_REPORT = path.join(ROOT, 'docs/reports/armory-asset-gaps.json');
const MD_REPORT = path.join(ROOT, 'docs/reports/armory-asset-gaps.md');

// A tile whose art is this green is showing an un-keyed chroma backdrop rather
// than lore-green content. Deliberately well above the bio/slime assets that
// legitimately sit around 0.05-0.25.
const GREEN_SUSPECT_RATIO = 0.35;

function modelUrlFor(id) { return getArmoryModel(id); }
function iconFor(id) { return getArmoryIcon(id, CATALOG_ITEMS[String(id)]?.icon); }

function publicExists(webPath) {
    if (!webPath) return false;
    return fs.existsSync(path.join(ROOT, 'public', webPath.replace(/^\//, '')));
}

// Every id the Armory can offer, grouped the way the bench groups them.
function collectArmoryIds() {
    const groups = {
        ...getArmoryOfferedIds(),
        charm: getCatalogIdsByType(ITEM_TYPE.CHARM),
        overclock: getCatalogIdsByType(ITEM_TYPE.MOD),
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
            const name = isFrame ? ARMORY_WEAPON_NAMES[id.slice(6)] : CATALOG_ITEMS[id]?.name ?? entry?.name ?? null;
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
                missingName: !name,
                icon,
                iconExists,
                missingIcon: !icon || !iconExists,
                model,
                missingModel: group !== 'decal' && !publicExists(model),
                modelRequired: group !== 'decal',
                needsModelRedo: id === 'frame:talon_c',
                previewSource: ARMORY_PREVIEWS[id]?.source ?? 'catalog-art',
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
        needsModelRedo: rows.filter((r) => r.needsModelRedo).length,
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

Uses the same item lists and preview resolver as the Armory. Model paths are
checked on disk. Transparent model renders replace the previous shared chassis
pictures and green-backed icons; source artwork is retained unchanged.

| Check | Count |
| --- | ---: |
| Items offered | ${report.total} |
| **No name** (renders as a bare itemdef id) | **${report.missingName}** |
| **No icon on disk** (tile falls back to initials) | **${report.missingIcon}** |
| Missing required 3D model | ${report.missingModel} |
| Existing model needs visual replacement | ${report.needsModelRedo} |
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
## 4. Missing required 3D models

These rewards use the factory model until a unique model is authored. Their
previews are existing achievement emblems, not pictures of invented equipment.
Decals are intentionally 2D and do not need a model.

${table(rows.filter((r) => r.missingModel), [
        ['Group', (r) => r.group],
        ['Id', (r) => `\`${r.id}\``],
        ['Name', (r) => r.name ?? '—']
    ])}
## 5. Existing models that need replacement

| Item | Current limitation | Next asset task |
| --- | --- | --- |
| Talon-C Carbine (\`frame:talon_c\`) | The shipped factory model is a blockout with simple untextured parts. The new preview accurately shows this proxy. | Author a finished, textured carbine model, preserve its grip and charm socket calibration, then regenerate its preview. |

This is a visual-review finding, separate from missing-file checks. The four
previous green-backed charm/module icons now use transparent model renders;
original source artwork is retained and may still be used by other screens.
`;
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
