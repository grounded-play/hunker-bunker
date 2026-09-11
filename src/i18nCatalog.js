import { t } from './i18n.js';

/**
 * Narrative data modules (dialogue pools, codex entries, quest copy) are plain
 * frozen structures that consumers read directly and often hold a reference to:
 *
 *     const pool = DIALOGUE_LINES.lowO2;
 *
 * Rewriting every one of those reads into a t() call would touch far more code
 * than it would localize. Instead a catalog is registered once, and the exported
 * structure is rebuilt *in place* whenever the locale changes, so references
 * taken earlier keep working and simply start reading translated text.
 *
 * Keys are derived from the shape of the data itself, so the English source
 * file stays the single place content is authored:
 *
 *     narrative.dialogueLines.lowO2.0
 *
 * Any key missing from the active locale falls back to the authored English via
 * t()'s own fallback chain, so a partially translated locale is safe to ship.
 */

// Keys that would reach Object.prototype if assigned onto a plain object.
// The catalogs here are our own frozen source modules, so this is not
// reachable today -- but these walkers copy key-by-key from data into fresh
// objects, which is the shape of a prototype-pollution sink, and the guard
// costs nothing. Flagged by CodeQL as js/prototype-polluting-function.
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isSafeKey(key) {
    return !UNSAFE_KEYS.has(key);
}

const registry = [];

function deepUnfreeze(value) {
    if (Array.isArray(value)) return value.map(deepUnfreeze);
    if (value && typeof value === 'object') {
        const out = Object.create(null);
        for (const [k, v] of Object.entries(value)) {
            if (!isSafeKey(k)) continue;
            out[k] = deepUnfreeze(v);
        }
        return Object.assign({}, out);
    }
    return value;
}

function translateInto(namespace, source, target, skip, path = []) {
    for (const [key, value] of Object.entries(source)) {
        if (skip.has(key) || !isSafeKey(key)) continue;
        const next = [...path, key];
        if (typeof value === 'string') {
            target[key] = t(`${namespace}.${next.join('.')}`, {}, value);
        } else if (value && typeof value === 'object') {
            translateInto(namespace, value, target[key], skip, next);
        }
    }
}

/**
 * Register a narrative catalog and return its live, locale-aware structure.
 * `skip` names fields that are identifiers rather than prose (ids, asset
 * paths, category enums) and must never be translated.
 * The returned object has the same shape as `source` and is mutated in place
 * on every locale change — never freeze it.
 */
export function localizeCatalog(namespace, source, { skip = [] } = {}) {
    const target = deepUnfreeze(source);
    const skipSet = new Set(skip);
    registry.push({ namespace, source, target, skip: skipSet });
    translateInto(namespace, source, target, skipSet);
    return target;
}

/** Re-resolve every registered catalog against the active locale. */
export function refreshCatalogs() {
    for (const entry of registry) {
        translateInto(entry.namespace, entry.source, entry.target, entry.skip);
    }
    return registry.length;
}

/** Flatten a catalog's English source into `key: text` pairs, for extraction. */
export function flattenCatalog(namespace, source, { skip = [] } = {}, path = [], out = {}) {
    const skipSet = skip instanceof Set ? skip : new Set(skip);
    for (const [key, value] of Object.entries(source)) {
        if (skipSet.has(key) || !isSafeKey(key)) continue;
        const next = [...path, key];
        if (typeof value === 'string') {
            out[`${namespace}.${next.join('.')}`] = value;
        } else if (value && typeof value === 'object') {
            flattenCatalog(namespace, value, { skip: skipSet }, next, out);
        }
    }
    return out;
}

/** Every registered catalog, for extraction tooling. */
export function getRegisteredCatalogs() {
    return registry.map(({ namespace, source, skip }) => ({ namespace, source, skip }));
}

if (typeof window !== 'undefined') {
    window.addEventListener('locale-changed', () => {
        refreshCatalogs();
    });
}
