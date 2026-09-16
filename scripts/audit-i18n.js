#!/usr/bin/env node
/**
 * Localization coverage audit.
 *
 * Answers one question: which player-visible words do NOT change when the
 * player changes language? It reports three independent failure modes.
 *
 *   1. markup   - text and attributes in index.html with no data-i18n
 *                 annotation, attributed to the screen that owns them.
 *   2. runtime  - string literals written straight into the DOM by JS
 *                 modules that never call t().
 *   3. orphans  - catalog keys translated into all 7 locales but referenced
 *                 by no call site, so no player ever sees them.
 *
 * Findings are attributed per screen/module so `scripts/audit-i18n.test.js`
 * can ratchet them against a committed baseline: counts may fall, never rise.
 *
 * Usage:
 *   node scripts/audit-i18n.js            human-readable report
 *   node scripts/audit-i18n.js --json     machine-readable findings
 *   node scripts/audit-i18n.js --baseline rewrite the committed baseline
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BASELINE_PATH = path.resolve(ROOT_DIR, 'docs/reports/i18n-coverage-baseline.json');

/**
 * Developer-only surfaces. These never ship to players in a localized build,
 * so translating them would be waste, not coverage. Anything listed here is
 * excluded from the counts rather than silently passing.
 */
export const DEBUG_ALLOWLIST = Object.freeze({
    screens: [
        'dev-console-modal',
        'debug-toolbar',
        'debug-legend',
        'tile-grid-debug',
        'typography-debug',
        'qa-nexus-modal',
        'debug-museum-modal',
        'showroom-modal'
    ],
    /** Any id matching these is developer tooling regardless of nesting. */
    screenPatterns: [/^dev-/, /^debug-/, /-debug$/, /^qa-/],
    modules: [
        'debugConsole.js',
        'debugTileGrid.js',
        'debugShowroom.js',
        'debugMuseum.js',
        'debugQaNexus.js',
        'debugBossArenas.js',
        'debugCampSimulator.js',
        'matureContentAudit.js',
        'progressionWalkthrough.js'
    ]
});

/**
 * Strings that must stay in English in every locale: trademarks, platform
 * product names, and protocol tokens that double as UI text.
 */
export const LOCALE_INVARIANT = Object.freeze([
    'Steam', 'Steamworks', 'Discord', 'GitHub', 'Three.js', 'Electron',
    'Tuesday Cinema Club', 'Hunker', 'Bunker', 'HUNKER', 'BUNKER',
    'Windows', 'Linux', 'macOS', 'Proton', 'Vulkan', 'OpenGL', 'WebGL'
]);

/**
 * Containers whose text is deliberately NOT translated. A language picker must
 * show each language in its own script - a French player looking for
 * "Deutsch" should not find it rendered as "Allemand".
 */
export const LOCALE_NATIVE_CONTAINERS = Object.freeze([
    'language-select-grid',
    'setting-language-select',
    'language-preview-badge'
]);

const VOID_TAGS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

const TRANSLATABLE_ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];

// ---------------------------------------------------------------------------
// Shared text classification
// ---------------------------------------------------------------------------

/**
 * Is this string something a player reads, as opposed to a class name, an
 * asset path, a number, or a code identifier? Deliberately conservative: a
 * false negative costs coverage, a false positive costs trust in the report.
 */
export function isPlayerFacingText(raw) {
    if (typeof raw !== 'string') return false;
    const s = raw.trim();
    if (s.length < 2 || s.length > 200) return false;
    if (!/[A-Za-z]{2}/.test(s)) return false;               // needs real letters
    if (/^[{}<>/\\$]/.test(s)) return false;                // template/markup fragment
    if (/^[.#][A-Za-z_-]/.test(s)) return false;            // CSS selector
    if (/^(https?:|mailto:|data:|\.{0,2}\/)/.test(s)) return false;
    if (/\.(js|mjs|json|png|jpe?g|webp|glb|gltf|wav|mp3|ogg|webm|mp4|css|svg|ttf|woff2?)\b/i.test(s)) return false;
    if (/^[a-z][a-zA-Z0-9]*$/.test(s)) return false;        // camelCase identifier
    if (/^[a-z0-9]+(?:[-_]+[a-z0-9]+)+$/.test(s)) return false; // kebab/snake/BEM token
    if (/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/.test(s)) return false; // CONST_NAME
    if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return false;        // color
    if (/^[a-z-]+\s*:\s*[^;]+;?$/.test(s)) return false;    // css declaration
    if (/^\d[\d\s.,:%x/-]*$/.test(s)) return false;         // pure numeric readout
    if (LOCALE_INVARIANT.includes(s)) return false;
    return true;
}

// ---------------------------------------------------------------------------
// 1. Static markup
// ---------------------------------------------------------------------------

/**
 * Walk HTML keeping an element stack, so every text node and attribute can be
 * attributed to the nearest ancestor carrying an id. That attribution is what
 * makes the baseline reviewable: "multiplayer-modal: 61" is actionable,
 * "index.html: 454" is not.
 */
export function auditMarkup(html) {
    const withoutScripts = html
        .replace(/<script[\s\S]*?<\/script>/gi, (m) => '\n'.repeat((m.match(/\n/g) || []).length))
        .replace(/<style[\s\S]*?<\/style>/gi, (m) => '\n'.repeat((m.match(/\n/g) || []).length))
        .replace(/<!--[\s\S]*?-->/g, (m) => '\n'.repeat((m.match(/\n/g) || []).length));

    const findings = [];
    const annotated = { text: 0, attrs: 0 };
    const stack = [];
    const tokenRe = /<\/?([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>])*?)(\/?)>/g;

    const lineAt = (index) => withoutScripts.slice(0, index).split('\n').length;

    // A finding is attributed to the screen a player would name, not to the
    // innermost styling div. Without this, one modal reports as forty ids.
    const SCREEN_ID = /(modal|popup|overlay|screen|menu|hud|panel|toolbar|drawer|sheet|dialog)/i;
    const ownerId = () => {
        for (let i = stack.length - 1; i >= 0; i -= 1) {
            if (stack[i].id && SCREEN_ID.test(stack[i].id)) return stack[i].id;
        }
        for (let i = stack.length - 1; i >= 0; i -= 1) {
            if (stack[i].id) return stack[i].id;
        }
        return '(document)';
    };

    /** True when any ancestor marks this subtree as debug-only or intentionally native. */
    const isExcluded = () => stack.some(({ id }) => id && (
        DEBUG_ALLOWLIST.screens.includes(id)
        || DEBUG_ALLOWLIST.screenPatterns.some((re) => re.test(id))
        || LOCALE_NATIVE_CONTAINERS.includes(id)
    ));

    let cursor = 0;
    let match;
    while ((match = tokenRe.exec(withoutScripts))) {
        const [full, tagName, attrsRaw, selfClose] = match;
        const tag = tagName.toLowerCase();
        const isClose = full.startsWith('</');

        // Text between the previous tag and this one belongs to the open element.
        const text = withoutScripts.slice(cursor, match.index);
        if (text.trim()) {
            const owner = stack[stack.length - 1];
            const hasAnnotation = owner && /\bdata-i18n\s*=/.test(owner.attrs);
            const decoded = text.replace(/&[a-z]+;|&#\d+;/gi, ' ').trim();
            if (isPlayerFacingText(decoded) && !isExcluded()) {
                if (hasAnnotation) {
                    annotated.text += 1;
                } else {
                    findings.push({
                        kind: 'text',
                        screen: ownerId(),
                        tag: owner ? owner.tag : '(root)',
                        line: lineAt(cursor),
                        text: decoded.slice(0, 80)
                    });
                }
            }
        }
        cursor = match.index + full.length;

        if (isClose) {
            for (let i = stack.length - 1; i >= 0; i -= 1) {
                if (stack[i].tag === tag) { stack.length = i; break; }
            }
            continue;
        }

        const idMatch = attrsRaw.match(/\bid\s*=\s*"([^"]*)"/);
        const frame = { tag, id: idMatch ? idMatch[1] : null, attrs: attrsRaw };

        // Attributes are checked on the element itself, before it is pushed,
        // so the element's own id is the owner of its own attribute findings.
        stack.push(frame);
        for (const attr of TRANSLATABLE_ATTRS) {
            const attrMatch = attrsRaw.match(new RegExp(`\\b${attr}\\s*=\\s*"([^"]*)"`));
            if (!attrMatch) continue;
            const value = attrMatch[1].replace(/&[a-z]+;|&#\d+;/gi, ' ').trim();
            if (!isPlayerFacingText(value) || isExcluded()) continue;
            if (new RegExp(`data-i18n-${attr}\\s*=`).test(attrsRaw)) {
                annotated.attrs += 1;
            } else {
                findings.push({
                    kind: 'attr',
                    screen: ownerId(),
                    tag,
                    attr,
                    line: lineAt(match.index),
                    text: value.slice(0, 80)
                });
            }
        }
        if (selfClose || VOID_TAGS.has(tag)) stack.pop();
    }

    return { findings, annotated };
}

// ---------------------------------------------------------------------------
// 2. Runtime-generated UI
// ---------------------------------------------------------------------------

const DOM_SINK = new RegExp([
    '\\.textContent\\s*\\+?=',
    '\\.innerText\\s*\\+?=',
    '\\.innerHTML\\s*\\+?=',
    '\\.placeholder\\s*=',
    '\\.title\\s*=',
    '\\.alt\\s*=',
    'setAttribute\\(\\s*[\'"](?:aria-label|title|placeholder|alt)[\'"]',
    'insertAdjacentHTML\\('
].join('|'));

/**
 * Find string literals that reach the DOM without passing through t(). Lines
 * that already call t() or carry a data-i18n annotation are considered wired.
 */
export function auditRuntimeStrings(source) {
    const findings = [];
    const lines = source.split('\n');
    let inTemplate = false;

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

        // Track multi-line innerHTML template literals: their inner markup is
        // player-visible even though the sink appeared lines earlier.
        if (DOM_SINK.test(line) && /`/.test(line) && (line.match(/`/g) || []).length % 2 === 1) {
            inTemplate = true;
        } else if (inTemplate && (line.match(/`/g) || []).length % 2 === 1) {
            inTemplate = false;
        }

        const isSink = DOM_SINK.test(line);
        if (!isSink && !inTemplate) return;
        if (/\bt\(\s*['"`]/.test(line)) return;              // already translated
        if (/data-i18n/.test(line)) return;                   // annotated template

        if (inTemplate && !isSink) {
            // Inside a template: look at markup text nodes and attributes.
            for (const m of line.matchAll(/>([^<>{}`]{2,120})</g)) {
                const text = m[1].trim();
                if (!isPlayerFacingText(text)) continue;
                // Template bookkeeping (").join('')}", "} else {") reads as text
                // to a regex but is code, not words a player sees. Interpolated
                // expressions are stripped first so real sentences survive.
                if (/[(){};]|=>/.test(text.replace(/\$\{[^}]*\}/g, ''))) continue;
                findings.push({ line: index + 1, kind: 'template', text: text.slice(0, 80) });
                break;
            }
            return;
        }

        for (const m of line.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
            const literal = m[2];
            if (!isPlayerFacingText(literal)) continue;
            // A template literal that is purely interpolation carries no words.
            if (m[1] === '`' && literal.replace(/\$\{[^}]*\}/g, '').trim().length < 2) continue;
            // A backtick run that swallowed code punctuation is a fragment of a
            // multi-line template, not a sentence. Interpolations are stripped
            // first: `DIST: ${x.toFixed(1)}m` is real player text whose braces
            // live inside the expression, not in the words.
            if (m[1] === '`' && /[(){};]|=>/.test(literal.replace(/\$\{[^}]*\}/g, ''))) continue;
            findings.push({ line: index + 1, kind: 'literal', text: literal.slice(0, 80) });
            break;
        }
    });

    return findings;
}

// ---------------------------------------------------------------------------
// 3. Orphaned keys
// ---------------------------------------------------------------------------

export function flattenKeys(obj, prefix = '', out = {}) {
    for (const key of Object.keys(obj)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
        const value = obj[key];
        const full = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            flattenKeys(value, full, out);
        } else {
            out[full] = value;
        }
    }
    return out;
}

/**
 * Keys present in the catalog that no source file references. Narrative keys
 * are excluded: they are addressed by derived path from the data catalogs, not
 * by a literal key in source, so a text search cannot see their call sites.
 */
export function findOrphanKeys(englishCatalog, corpus) {
    return Object.keys(flattenKeys(englishCatalog))
        .filter((key) => !key.startsWith('narrative.'))
        .filter((key) => !isKeyReferenced(key, corpus));
}

/**
 * A plain substring test reports `settings.title` as referenced because
 * `ui.settings.title` contains it, which hides a whole dead namespace. The
 * match must not be preceded by a key character or a dot.
 */
export function isKeyReferenced(key, corpus) {
    let from = 0;
    for (;;) {
        const at = corpus.indexOf(key, from);
        if (at === -1) return false;
        const before = at === 0 ? '' : corpus[at - 1];
        const after = corpus[at + key.length] ?? '';
        if (!/[\w.$-]/.test(before) && !/[\w.]/.test(after)) return true;
        from = at + 1;
    }
}

// ---------------------------------------------------------------------------
// Report assembly
// ---------------------------------------------------------------------------

export function collectSourceFiles(dir, acc = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'locales' || entry.name === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            collectSourceFiles(full, acc);
        } else if (entry.name.endsWith('.js') && !entry.name.includes('.test.')) {
            acc.push(full);
        }
    }
    return acc;
}

export function runAudit() {
    const html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
    const { findings: markupFindings, annotated } = auditMarkup(html);

    const screens = {};
    for (const finding of markupFindings) {
        screens[finding.screen] = (screens[finding.screen] || 0) + 1;
    }

    const modules = {};
    const moduleDetail = {};
    let corpus = html;
    for (const file of collectSourceFiles(path.join(ROOT_DIR, 'src'))) {
        const rel = path.relative(ROOT_DIR, file);
        const source = fs.readFileSync(file, 'utf8');
        corpus += source;
        if (DEBUG_ALLOWLIST.modules.includes(path.basename(file))) continue;
        const findings = auditRuntimeStrings(source);
        if (findings.length) {
            modules[rel] = findings.length;
            moduleDetail[rel] = findings;
        }
    }

    const english = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'src/locales/en.json'), 'utf8'));
    const orphans = findOrphanKeys(english, corpus);

    return {
        markup: {
            annotatedText: annotated.text,
            annotatedAttrs: annotated.attrs,
            unannotated: Object.values(screens).reduce((a, b) => a + b, 0),
            screens
        },
        runtime: {
            unlocalized: Object.values(modules).reduce((a, b) => a + b, 0),
            modules
        },
        orphanKeys: orphans.length,
        orphanKeyList: orphans,
        detail: { markupFindings, moduleDetail }
    };
}

export function readBaseline() {
    if (!fs.existsSync(BASELINE_PATH)) return null;
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
}

function writeBaseline(report) {
    const baseline = {
        description: 'Localization coverage ratchet. Counts may fall, never rise. Regenerate with: npm run i18n:audit -- --baseline',
        generated: new Date().toISOString().slice(0, 10),
        markup: { screens: report.markup.screens, total: report.markup.unannotated },
        runtime: { modules: report.runtime.modules, total: report.runtime.unlocalized },
        orphanKeys: report.orphanKeys
    };
    fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
    fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 4)}\n`);
    return baseline;
}

function main() {
    const args = process.argv.slice(2);
    const report = runAudit();

    if (args.includes('--baseline')) {
        writeBaseline(report);
        console.log(`Baseline written to ${path.relative(ROOT_DIR, BASELINE_PATH)}`);
        console.log(`  markup unannotated : ${report.markup.unannotated}`);
        console.log(`  runtime unlocalized: ${report.runtime.unlocalized}`);
        console.log(`  orphan keys        : ${report.orphanKeys}`);
        return;
    }

    if (args.includes('--json')) {
        console.log(JSON.stringify(report, null, 4));
        return;
    }

    const pad = (n, w) => String(n).padStart(w);
    console.log('LOCALIZATION COVERAGE AUDIT');
    console.log('===========================\n');
    console.log(`Static markup   : ${report.markup.annotatedText} text + ${report.markup.annotatedAttrs} attrs annotated`);
    console.log(`                  ${report.markup.unannotated} UNANNOTATED (excluding debug surfaces)\n`);

    const screenRows = Object.entries(report.markup.screens).sort((a, b) => b[1] - a[1]);
    for (const [screen, count] of screenRows.slice(0, 25)) {
        console.log(`   ${pad(count, 5)}  #${screen}`);
    }
    if (screenRows.length > 25) console.log(`   ... and ${screenRows.length - 25} more screens`);

    console.log(`\nRuntime UI      : ${report.runtime.unlocalized} unlocalized strings reaching the DOM\n`);
    const moduleRows = Object.entries(report.runtime.modules).sort((a, b) => b[1] - a[1]);
    for (const [mod, count] of moduleRows.slice(0, 25)) {
        console.log(`   ${pad(count, 5)}  ${mod}`);
    }
    if (moduleRows.length > 25) console.log(`   ... and ${moduleRows.length - 25} more modules`);

    console.log(`\nOrphan keys     : ${report.orphanKeys} translated into 7 locales, referenced nowhere`);
    if (report.orphanKeys) {
        console.log(`   ${report.orphanKeyList.slice(0, 12).join(', ')}${report.orphanKeys > 12 ? ', ...' : ''}`);
    }

    const baseline = readBaseline();
    if (baseline) {
        const delta = (now, then) => {
            const d = now - then;
            return d === 0 ? 'unchanged' : (d > 0 ? `+${d} REGRESSION` : `${d} improved`);
        };
        console.log('\nAgainst baseline:');
        console.log(`   markup  ${delta(report.markup.unannotated, baseline.markup.total)}`);
        console.log(`   runtime ${delta(report.runtime.unlocalized, baseline.runtime.total)}`);
        console.log(`   orphans ${delta(report.orphanKeys, baseline.orphanKeys)}`);
    }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    main();
}
