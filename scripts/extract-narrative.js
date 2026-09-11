#!/usr/bin/env node
/**
 * Extract authored narrative prose into the localization catalog.
 *
 *   node scripts/extract-narrative.js           # sync en.json, report coverage
 *   node scripts/extract-narrative.js --handoff # also write translator files
 *
 * English lives in the src/data/*.js modules -- writers keep editing those.
 * This script mirrors the prose into src/locales/en.json under narrative.*,
 * which is what translators fill in for the other locales. Identifier fields
 * (ids, asset paths, category enums) are excluded via each catalog's `skip`
 * list, declared where localizeCatalog() is called.
 *
 * --handoff writes docs/localization/handoff/<locale>.json containing only the
 * keys that locale is still missing, each with the English source text, ready
 * to send to a translator and paste back into src/locales/<locale>.json.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import '../src/data/dialogueLines.js';
import '../src/data/lineDirectorPools.js';
import '../src/data/campQuests.js';
import '../src/data/campDialogue.js';
import '../src/data/codex.js';
import { getRegisteredCatalogs, flattenCatalog } from '../src/i18nCatalog.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = ['en', 'zh-CN', 'ru', 'es-419', 'de', 'ja', 'pt-BR'];
const handoff = process.argv.includes('--handoff');

const flat = {};
for (const catalog of getRegisteredCatalogs()) {
    Object.assign(flat, flattenCatalog(catalog.namespace, catalog.source, { skip: catalog.skip }));
}
const keys = Object.keys(flat).sort();

function setPath(obj, path, value) {
    const parts = path.split('.');
    let cur = obj;
    for (const part of parts.slice(0, -1)) {
        if (typeof cur[part] !== 'object' || cur[part] === null) cur[part] = {};
        cur = cur[part];
    }
    cur[parts.at(-1)] = value;
}

function getPath(obj, path) {
    let cur = obj;
    for (const part of path.split('.')) {
        if (cur == null || typeof cur !== 'object') return undefined;
        cur = cur[part];
    }
    return cur;
}

const enPath = join(ROOT, 'src/locales/en.json');
const enDict = JSON.parse(readFileSync(enPath, 'utf8'));

let added = 0;
let updated = 0;
for (const key of keys) {
    const current = getPath(enDict, key);
    if (current === undefined) added += 1;
    else if (current !== flat[key]) updated += 1;
    setPath(enDict, key, flat[key]);
}

// Drop narrative keys whose source prose no longer exists.
const stale = [];
(function sweep(node, path) {
    for (const [k, v] of Object.entries(node)) {
        const next = path ? `${path}.${k}` : k;
        if (v && typeof v === 'object') sweep(v, next);
        else if (!(next in flat)) stale.push(next);
    }
})(enDict.narrative ?? {}, 'narrative');
for (const key of stale) {
    const parts = key.split('.');
    const parent = getPath(enDict, parts.slice(0, -1).join('.'));
    if (parent) delete parent[parts.at(-1)];
}

writeFileSync(enPath, `${JSON.stringify(enDict, null, 2)}\n`);
console.log(`narrative strings: ${keys.length} (added ${added}, updated ${updated}, removed ${stale.length})`);

for (const locale of LOCALES) {
    const dict = JSON.parse(readFileSync(join(ROOT, `src/locales/${locale}.json`), 'utf8'));
    const missing = keys.filter((k) => getPath(dict, k) === undefined);
    const pct = Math.round(((keys.length - missing.length) / keys.length) * 100);
    console.log(`  ${locale.padEnd(7)} ${String(keys.length - missing.length).padStart(4)}/${keys.length}  ${pct}%`);

    if (handoff && locale !== 'en' && missing.length) {
        const dir = join(ROOT, 'docs/localization/handoff');
        mkdirSync(dir, { recursive: true });
        const payload = {};
        for (const key of missing) setPath(payload, key, flat[key]);
        writeFileSync(join(dir, `${locale}.json`), `${JSON.stringify(payload, null, 2)}\n`);
    }
}

if (handoff) console.log('handoff files written to docs/localization/handoff/');
