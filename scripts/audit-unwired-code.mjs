#!/usr/bin/env node
// Unwired-code audit.
//
// This repository has a recurring failure mode: a system ships as a pure
// module with full unit coverage and no call site, so it reads as "done" in
// both the test count and the plan docs while doing nothing in the game.
// depthContract.js, rollsElite(), advanceQuest() and ten run-card effect keys
// all shipped that way and were each caught late by hand.
//
// This makes the check cheap and repeatable. It reports three things:
//   1. modules no production file imports
//   2. exported functions/classes with no production caller anywhere
//   3. CustomEvents dispatched that nothing references again
//
// Findings are candidates, not verdicts: an intentional extension point or a
// harness hook is a legitimate reason to appear here. Triage, don't auto-delete.
//
// Usage: node scripts/audit-unwired-code.mjs [--json]

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOTS = ['src'];
const ENTRY_POINTS = ['main.js'];
const isTest = (f) => /\.test\.|\.spec\./.test(f);

function walk(dir, out = []) {
    for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) {
            if (entry !== 'node_modules') walk(p, out);
        } else if (/\.(js|mjs)$/.test(p)) {
            out.push(p);
        }
    }
    return out;
}

const files = ROOTS.flatMap((r) => walk(r));
const prodFiles = files.filter((f) => !isTest(f));
const testFiles = files.filter(isTest);
try { walk('tests', testFiles); } catch { /* optional */ }

const prod = new Map(prodFiles.map((f) => [f, readFileSync(f, 'utf8')]));
for (const e of ENTRY_POINTS) {
    try { prod.set(e, readFileSync(e, 'utf8')); } catch { /* optional */ }
}
const html = (() => { try { return readFileSync('index.html', 'utf8'); } catch { return ''; } })();
const allProd = [...prod.values()].join('\n');
const allTests = testFiles.map((f) => readFileSync(f, 'utf8')).join('\n');

// 1. Modules nothing imports.
const deadModules = [];
for (const f of prodFiles) {
    const base = basename(f);
    const stem = base.replace(/\.js$/, '');
    // Static `from '...'` and dynamic `import('...')` both count as wiring.
    const importRe = new RegExp(
        `(?:from|import)\\s*\\(?\\s*['"\`][^'"\`]*\\b${stem}(?:\\.js)?['"\`]`
    );
    let imported = false;
    for (const [g, gs] of prod) {
        if (g === f) continue;
        if (importRe.test(gs)) { imported = true; break; }
    }
    if (!imported && !html.includes(base)) {
        deadModules.push({ file: f, lines: readFileSync(f, 'utf8').split('\n').length });
    }
}
deadModules.sort((a, b) => b.lines - a.lines);

// 2. Exported functions/classes with no production caller.
const exportRe = /export\s+(?:async\s+)?(?:function\*?|class)\s+([A-Za-z_$][\w$]*)/g;
const deadExports = [];
for (const f of prodFiles) {
    const src = prod.get(f);
    for (const m of src.matchAll(exportRe)) {
        const name = m[1];
        const word = new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`, 'g');
        const self = (src.match(word) || []).length - 1;
        let external = 0;
        for (const [g, gs] of prod) {
            if (g === f) continue;
            if (new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`).test(gs)) external++;
        }
        if (external === 0 && self === 0 && !new RegExp(`\\b${name}\\b`).test(html)) {
            deadExports.push({
                file: f,
                name,
                testedOnly: new RegExp(`\\b${name}\\b`).test(allTests)
            });
        }
    }
}

// 3. CustomEvents dispatched and never referenced again.
const dispatched = new Set();
for (const m of allProd.matchAll(/new CustomEvent\(\s*['"`]([a-z0-9-]+)['"`]/g)) dispatched.add(m[1]);
const deadEvents = [];
for (const name of dispatched) {
    const refs = (allProd.match(new RegExp(`['"\`]${name}['"\`]`, 'g')) || []).length;
    if (refs <= 1) {
        deadEvents.push({ name, usedInTests: new RegExp(`['"\`]${name}['"\`]`).test(allTests) });
    }
}
deadEvents.sort((a, b) => a.name.localeCompare(b.name));

const report = { deadModules, deadExports, deadEvents };

if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
} else {
    console.log(`\n== Modules with no production importer (${deadModules.length}) ==`);
    for (const m of deadModules) console.log(`  ${String(m.lines).padStart(5)} lines  ${m.file}`);

    const tested = deadExports.filter((e) => e.testedOnly);
    const untested = deadExports.filter((e) => !e.testedOnly);
    console.log(`\n== Exported functions/classes with no production caller (${deadExports.length}) ==`);
    console.log(`  -- covered by tests but never called by the game (${tested.length}):`);
    for (const e of tested) console.log(`     ${e.file} :: ${e.name}`);
    console.log(`  -- referenced nowhere at all (${untested.length}):`);
    for (const e of untested) console.log(`     ${e.file} :: ${e.name}`);

    console.log(`\n== CustomEvents dispatched with no other reference (${deadEvents.length}) ==`);
    for (const e of deadEvents) console.log(`  ${e.name}${e.usedInTests ? '  (used in tests)' : ''}`);
    console.log('');
}
