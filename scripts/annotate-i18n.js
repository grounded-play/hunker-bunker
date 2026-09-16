#!/usr/bin/env node
/**
 * Phase 2 codemod: annotate unlocalized markup in index.html with data-i18n
 * keys, and emit the English values for src/locales/en.json.
 *
 * The one rule that matters for safety: applyStaticTranslations() assigns
 * el.textContent, which destroys child elements. So a text finding is only
 * annotated when its owning element holds exactly one text node and no element
 * children. Mixed-content elements ("<div>Base: <strong>7</strong></div>") are
 * reported as needing a manual wrap instead of being silently broken.
 *
 * Usage:
 *   node scripts/annotate-i18n.js --dry     report what would change
 *   node scripts/annotate-i18n.js --write   rewrite index.html + en.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    DEBUG_ALLOWLIST,
    LOCALE_NATIVE_CONTAINERS,
    collectHtmlIds,
    findRuntimeWrittenIds,
    isPlayerFacingText
} from './audit-i18n.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML_PATH = path.join(ROOT_DIR, 'index.html');
const EN_PATH = path.join(ROOT_DIR, 'src/locales/en.json');

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const TRANSLATABLE_ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
const SCREEN_ID = /(modal|popup|overlay|screen|menu|hud|panel|toolbar|drawer|sheet|dialog)/i;

/** Turn display text into a stable, readable key segment. */
/**
 * Element ids whose text content is written by JS at runtime. Annotating one
 * is actively harmful: the locale-changed handler assigns textContent, so a
 * live readout ("0 / 0 ARSENAL", a key count, a timer) would be overwritten
 * with the static English authored in the markup. These need t() at the write
 * site in phase 3, not a data-i18n annotation here.
 */
export function slugify(text, maxWords = 5) {
    const base = text
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/&[a-z]+;|&#\d+;/gi, ' ')
        .replace(/[^A-Za-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();
    if (!base) return 'label';
    const parts = base.split('_').filter(Boolean).slice(0, maxWords);
    return parts.join('_').slice(0, 44) || 'label';
}

/** `steam-vault-modal` -> `steam_vault`; the namespace a player would name. */
export function screenNamespace(screenId) {
    if (!screenId || screenId === '(document)') return 'misc';
    return screenId
        .replace(/-(modal|popup|overlay|screen|panel|layout|wrap|container)$/i, '')
        .replace(/[^A-Za-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase() || 'misc';
}

/**
 * Parse index.html into annotation targets. Returns both the safe targets and
 * the mixed-content elements a human has to look at.
 */
export function planAnnotations(html, runtimeWrittenIds = new Set()) {
    const blanked = html
        .replace(/<script\b[\s\S]*?<\/script(?:\s+[^>]*)?\s*>/gi, (m) => ' '.repeat(m.length))
        .replace(/<style\b[\s\S]*?<\/style(?:\s+[^>]*)?\s*>/gi, (m) => ' '.repeat(m.length))
        .replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));

    const targets = [];
    const mixed = [];
    const runtimeOwned = [];
    const stack = [];
    const tokenRe = /<\/?([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^<>"'/])*)(\/?)>/g;

    const ownerScreen = () => {
        for (let i = stack.length - 1; i >= 0; i -= 1) {
            if (stack[i].id && SCREEN_ID.test(stack[i].id)) return stack[i].id;
        }
        for (let i = stack.length - 1; i >= 0; i -= 1) if (stack[i].id) return stack[i].id;
        return '(document)';
    };
    const isExcluded = () => stack.some(({ id }) => id && (
        DEBUG_ALLOWLIST.screens.includes(id)
        || DEBUG_ALLOWLIST.screenPatterns.some((re) => re.test(id))
        || LOCALE_NATIVE_CONTAINERS.includes(id)
    ));

    let cursor = 0;
    let match;
    while ((match = tokenRe.exec(blanked))) {
        const [full, tagName, attrsRaw, selfClose] = match;
        const tag = tagName.toLowerCase();
        const isClose = full.startsWith('</');
        const between = html.slice(cursor, match.index);

        if (between.trim()) {
            const owner = stack[stack.length - 1];
            if (owner) {
                owner.textRuns.push({ text: between, start: cursor, end: match.index });
            }
        }
        if (!isClose) {
            const owner = stack[stack.length - 1];
            if (owner) owner.childElements += 1;
        }
        cursor = match.index + full.length;

        if (isClose) {
            for (let i = stack.length - 1; i >= 0; i -= 1) {
                if (stack[i].tag !== tag) continue;
                const frame = stack[i];
                stack.length = i;
                finish(frame);
                break;
            }
            continue;
        }

        const idMatch = attrsRaw.match(/\bid\s*=\s*"([^"]*)"/);
        const frame = {
            tag,
            id: idMatch ? idMatch[1] : null,
            attrs: attrsRaw,
            tagStart: match.index,
            tagEnd: match.index + full.length,
            insertAt: match.index + 1 + tagName.length,
            textRuns: [],
            childElements: 0,
            screen: null,
            excluded: false
        };
        stack.push(frame);
        frame.screen = ownerScreen();
        frame.excluded = isExcluded();

        // Attributes belong to this element, checked while it is on the stack.
        if (!frame.excluded) {
            for (const attr of TRANSLATABLE_ATTRS) {
                const attrMatch = attrsRaw.match(new RegExp(`(?<![-\\w])${attr}\\s*=\\s*"([^"]*)"`));
                if (!attrMatch) continue;
                if (new RegExp(`data-i18n-${attr}\\s*=`).test(attrsRaw)) continue;
                const value = attrMatch[1].replace(/&[a-z]+;|&#\d+;/gi, ' ').trim();
                if (!isPlayerFacingText(value)) continue;
                if (!TRANSLATABLE_ATTRS.slice(0, 3).includes(attr)) continue; // engine handles 3
                targets.push({
                    kind: 'attr',
                    attr,
                    screen: frame.screen,
                    text: attrMatch[1].trim(),
                    insertAt: frame.insertAt
                });
            }
        }

        if (selfClose || VOID_TAGS.has(tag)) {
            stack.pop();
            finish(frame);
        }
    }
    while (stack.length) finish(stack.pop());

    function finish(frame) {
        if (frame.excluded) return;
        if (/\bdata-i18n\s*=/.test(frame.attrs)) return;
        if (frame.id && runtimeWrittenIds.has(frame.id)) {
            runtimeOwned.push({ screen: frame.screen, tag: frame.tag, id: frame.id });
            return;
        }
        const runs = frame.textRuns.filter((r) => {
            const decoded = r.text.replace(/&[a-z]+;|&#\d+;/gi, ' ').trim();
            return isPlayerFacingText(decoded);
        });
        if (!runs.length) return;

        const single = frame.textRuns.filter((r) => r.text.trim()).length === 1;
        if (frame.childElements > 0 || !single) {
            mixed.push({
                screen: frame.screen,
                tag: frame.tag,
                text: runs[0].text.trim().slice(0, 60),
                childElements: frame.childElements
            });
            return;
        }
        targets.push({
            kind: 'text',
            screen: frame.screen,
            tag: frame.tag,
            text: runs[0].text.trim(),
            insertAt: frame.insertAt
        });
    }

    return { targets, mixed, runtimeOwned };
}

/** Assign collision-free keys, reusing one key per identical string per screen. */
export function assignKeys(targets, existingKeys) {
    const byText = new Map();
    const used = new Set(existingKeys);
    const entries = [];

    for (const target of targets) {
        const ns = screenNamespace(target.screen);
        const decoded = target.text.replace(/&times;/g, '×')
            .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/\s+/g, ' ').trim();
        const dedupeKey = `${ns}::${decoded}::${target.kind}::${target.attr ?? ''}`;
        if (byText.has(dedupeKey)) {
            target.key = byText.get(dedupeKey);
            continue;
        }
        // Attribute keys stay short: the tooltip sentence is the value, not the name.
        const prefix = target.kind === 'attr' ? `${target.attr.replace(/-/g, '_')}_` : '';
        const slug = target.kind === 'attr' ? slugify(decoded, 3) : slugify(decoded);
        let key = `ui.${ns}.${prefix}${slug}`;
        let n = 2;
        while (used.has(key)) key = `ui.${ns}.${prefix}${slug}_${n++}`;
        used.add(key);
        byText.set(dedupeKey, key);
        target.key = key;
        entries.push({ key, value: decoded });
    }
    return entries;
}

export function applyAnnotations(html, targets) {
    // Insert from the end so earlier offsets stay valid.
    const sorted = [...targets].sort((a, b) => b.insertAt - a.insertAt);
    let out = html;
    for (const target of sorted) {
        const attrName = target.kind === 'attr' ? `data-i18n-${target.attr}` : 'data-i18n';
        out = `${out.slice(0, target.insertAt)} ${attrName}="${target.key}"${out.slice(target.insertAt)}`;
    }
    return out;
}

function setNested(obj, keyPath, value) {
    const parts = keyPath.split('.');
    let cur = obj;
    for (const part of parts.slice(0, -1)) {
        if (!cur[part] || typeof cur[part] !== 'object') cur[part] = {};
        cur = cur[part];
    }
    cur[parts.at(-1)] = value;
}

function flatten(obj, prefix = '', out = []) {
    for (const k of Object.keys(obj)) {
        const v = obj[k];
        const full = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object') flatten(v, full, out);
        else out.push(full);
    }
    return out;
}

function main() {
    const write = process.argv.includes('--write');
    const html = fs.readFileSync(HTML_PATH, 'utf8');
    const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
    const runtimeWrittenIds = findRuntimeWrittenIds(path.join(ROOT_DIR, 'src'), collectHtmlIds(html));
    const { targets, mixed, runtimeOwned } = planAnnotations(html, runtimeWrittenIds);
    const entries = assignKeys(targets, flatten(en));

    console.log(`annotatable targets : ${targets.length}  (${new Set(targets.map((t) => t.key)).size} distinct keys)`);
    console.log(`mixed-content skips : ${mixed.length}  (need a manual <span> wrap)`);
    console.log(`runtime-written skips: ${runtimeOwned.length}  (JS owns the text; needs t() at the write site)`);

    const byScreen = {};
    for (const t of targets) byScreen[t.screen] = (byScreen[t.screen] || 0) + 1;
    console.log('\ntop screens:');
    Object.entries(byScreen).sort((a, b) => b[1] - a[1]).slice(0, 15)
        .forEach(([s, n]) => console.log(`   ${String(n).padStart(4)}  #${s}`));

    if (mixed.length) {
        console.log('\nmixed-content elements (NOT annotated - textContent would wipe children):');
        mixed.slice(0, 15).forEach((m) => console.log(`   #${m.screen} <${m.tag}> "${m.text}" (${m.childElements} child els)`));
        if (mixed.length > 15) console.log(`   ... and ${mixed.length - 15} more`);
    }

    if (!write) {
        console.log('\nDry run. Pass --write to apply.');
        return;
    }

    fs.writeFileSync(HTML_PATH, applyAnnotations(html, targets));
    for (const { key, value } of entries) setNested(en, key, value);
    fs.writeFileSync(EN_PATH, `${JSON.stringify(en, null, 2)}\n`);
    console.log(`\nWrote ${targets.length} annotations to index.html and ${entries.length} keys to en.json`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    main();
}
