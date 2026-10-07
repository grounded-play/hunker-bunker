import en from './locales/en.json' with { type: 'json' };

// English is bundled: it is the source text and every lookup's fallback. The
// other six load on demand, so a session downloads and parses one language
// rather than seven -- the six were ~330 KB gzipped, a third of the web
// build's boot JavaScript (Lighthouse, 2026-10-06; issue #106). src/boot.js
// loads the player's language before the game's modules evaluate, so text
// translated at load time is already in the right language.
const LOCALE_LOADERS = Object.freeze({
    'zh-CN': () => import('./locales/zh-CN.json'),
    'ru': () => import('./locales/ru.json'),
    'es-419': () => import('./locales/es-419.json'),
    'de': () => import('./locales/de.json'),
    'ja': () => import('./locales/ja.json'),
    'pt-BR': () => import('./locales/pt-BR.json')
});

export const SUPPORTED_LOCALES = Object.freeze([
    { code: 'en', name: 'English', nativeName: 'English', rtl: false },
    { code: 'zh-CN', name: 'Simplified Chinese', nativeName: '简体中文', rtl: false },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', rtl: false },
    { code: 'es-419', name: 'Spanish (Latin America)', nativeName: 'Español (Latinoamérica)', rtl: false },
    { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', rtl: false },
    { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', rtl: false }
]);

const DICTIONARIES = { 'en': en };
const pendingLoads = new Map();
const SUPPORTED_CODES = new Set(SUPPORTED_LOCALES.map((item) => item.code));

const STEAM_LANGUAGE_MAP = Object.freeze({
    english: 'en',
    schinese: 'zh-CN',
    tchinese: 'zh-CN',
    russian: 'ru',
    spanish: 'es-419',
    latam: 'es-419',
    german: 'de',
    japanese: 'ja',
    brazilian: 'pt-BR',
    portuguese: 'pt-BR'
});

const BROWSER_LOCALE_PREFIX_MAP = Object.freeze({
    'zh': 'zh-CN',
    'ru': 'ru',
    'es': 'es-419',
    'de': 'de',
    'ja': 'ja',
    'pt': 'pt-BR',
    'en': 'en'
});

const STORAGE_KEY = 'hb_locale';
let currentLocale = 'en';

export function resolveLocaleCode(code) {
    if (!code || typeof code !== 'string') return null;
    const lower = code.trim().toLowerCase();
    if (STEAM_LANGUAGE_MAP[lower]) return STEAM_LANGUAGE_MAP[lower];
    if (SUPPORTED_CODES.has(code)) return code;
    const directMatch = SUPPORTED_LOCALES.find((item) => item.code.toLowerCase() === lower);
    if (directMatch) return directMatch.code;
    const prefix = lower.split(/[-_]/)[0];
    if (BROWSER_LOCALE_PREFIX_MAP[prefix]) return BROWSER_LOCALE_PREFIX_MAP[prefix];
    return null;
}

export function detectInitialLocale() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const saved = window.localStorage.getItem(STORAGE_KEY);
            const resolvedSaved = resolveLocaleCode(saved);
            if (resolvedSaved) return resolvedSaved;
        }
    } catch {
        // Ignore localStorage access issues
    }

    try {
        if (typeof window !== 'undefined' && window.electronAPI?.steam?.getCurrentGameLanguage) {
            const steamLang = window.electronAPI.steam.getCurrentGameLanguage();
            const resolvedSteam = resolveLocaleCode(steamLang);
            if (resolvedSteam) return resolvedSteam;
        }
    } catch {
        // Ignore electronAPI errors
    }

    try {
        if (typeof navigator !== 'undefined' && navigator.language) {
            const resolvedNav = resolveLocaleCode(navigator.language);
            if (resolvedNav) return resolvedNav;
        }
    } catch {
        // Ignore navigator errors
    }

    return 'en';
}

export function getLocale() {
    return currentLocale;
}

export function isLocaleLoaded(localeCode) {
    const resolved = resolveLocaleCode(localeCode);
    return Boolean(resolved && Object.hasOwn(DICTIONARIES, resolved));
}

// Loads a language's dictionary once; resolves false if it cannot load (the
// player then keeps English, as with any missing key).
export function loadLocale(localeCode) {
    const resolved = resolveLocaleCode(localeCode);
    if (!resolved || !SUPPORTED_CODES.has(resolved)) return Promise.resolve(false);
    if (Object.hasOwn(DICTIONARIES, resolved)) return Promise.resolve(true);
    if (!pendingLoads.has(resolved)) {
        pendingLoads.set(resolved, LOCALE_LOADERS[resolved]()
            .then((module) => {
                DICTIONARIES[resolved] = module.default ?? module;
                // The session's own language arrived after English text was
                // already applied (static markup translates on DOMContentLoaded,
                // which boot does not hold back): re-render exactly as a
                // language switch does.
                if (resolved === currentLocale && typeof window !== 'undefined' && typeof CustomEvent === 'function') {
                    window.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale: resolved } }));
                }
                return true;
            })
            .catch(() => false)
            .finally(() => pendingLoads.delete(resolved)));
    }
    return pendingLoads.get(resolved);
}

// Boot: the detected language is ready before the game's modules evaluate.
export function ensureLocaleReady() {
    return loadLocale(currentLocale);
}

// Tests and tools that switch through every language synchronously.
export async function loadAllLocales() {
    await Promise.all(SUPPORTED_LOCALES.map((item) => loadLocale(item.code)));
}

// Accepted (true) when the code is a supported language. A language that is
// not loaded yet switches as soon as its dictionary arrives; the
// locale-changed event then re-renders everything, exactly as a switch does.
export function setLocale(localeCode) {
    const resolved = resolveLocaleCode(localeCode);
    if (!resolved || !SUPPORTED_CODES.has(resolved)) return false;
    if (!Object.hasOwn(DICTIONARIES, resolved)) {
        void loadLocale(resolved).then((loaded) => { if (loaded) setLocale(resolved); });
        return true;
    }
    currentLocale = resolved;

    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(STORAGE_KEY, resolved);
        }
    } catch {
        // Ignore storage write errors
    }

    try {
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.lang = resolved;
        }
    } catch {
        // Ignore document element errors
    }

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('locale-changed', {
            detail: { locale: resolved }
        }));
    }

    return true;
}

export function getAvailableLocales() {
    return SUPPORTED_LOCALES;
}

export function getNestedValue(obj, path) {
    if (!obj || typeof obj !== 'object' || !path) return undefined;
    const parts = path.split('.');
    let cur = obj;
    for (const part of parts) {
        if (cur == null || typeof cur !== 'object') return undefined;
        cur = cur[part];
    }
    return cur;
}

export function interpolate(template, vars = {}) {
    if (typeof template !== 'string') return template;
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
        return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match;
    });
}

export function t(key, vars = {}, fallback = null) {
    const dict = DICTIONARIES[currentLocale] ?? DICTIONARIES['en'];
    let val = getNestedValue(dict, key);
    if (val === undefined && currentLocale !== 'en') {
        val = getNestedValue(DICTIONARIES['en'], key);
    }
    if (val === undefined) {
        return fallback !== null ? fallback : key;
    }
    return interpolate(val, vars);
}

export function hasKey(key) {
    if (!key) return false;
    const dict = DICTIONARIES[currentLocale] ?? DICTIONARIES['en'];
    if (getNestedValue(dict, key) !== undefined) return true;
    return getNestedValue(DICTIONARIES['en'], key) !== undefined;
}

/**
 * Re-render a panel whose text this module wrote with t().
 *
 * data-i18n covers markup that exists at parse time, and localizeCatalog covers
 * the content catalogs, but a panel a JS module builds on open keeps whatever
 * language it was rendered in until something rebuilds it. Switching language
 * with the Vault or the lobby open would otherwise leave half the screen in the
 * old locale.
 *
 * `isMounted` is checked at fire time so a closed panel costs nothing and, more
 * importantly, so re-rendering never re-opens something the player has closed.
 * Returns an unsubscribe function.
 */
export function onLocaleChange(render, isMounted = () => true) {
    if (typeof window === 'undefined' || typeof render !== 'function') return () => {};
    const handler = () => {
        let mounted;
        try {
            mounted = Boolean(isMounted());
        } catch {
            return; // a panel that cannot report its state is not one to rebuild
        }
        if (!mounted) return;
        try {
            render();
        } catch {
            // A failed re-render must not break the language switch itself;
            // the panel reopens correctly translated either way.
        }
    };
    window.addEventListener('locale-changed', handler);
    return () => window.removeEventListener('locale-changed', handler);
}

// Attributes that carry user-visible text and can be keyed from markup with
// data-i18n-<attr>, e.g. data-i18n-title="ui.hub.codex". `alt` is included
// because a screen reader announces it: an untranslated alt leaves a Japanese
// player hearing "Crashed ship" in the middle of a localized cutscene.
const TRANSLATABLE_ATTRS = Object.freeze(['title', 'aria-label', 'placeholder', 'alt']);

/**
 * Translate every element in `root` carrying a data-i18n (textContent) or
 * data-i18n-<attr> annotation. Unknown keys are skipped so the authored
 * English in the markup survives rather than being replaced by the key.
 * Returns the number of substitutions applied.
 */
export function applyStaticTranslations(root = (typeof document !== 'undefined' ? document : null)) {
    if (!root || typeof root.querySelectorAll !== 'function') return 0;
    let applied = 0;

    for (const el of root.querySelectorAll('[data-i18n]')) {
        const key = el.getAttribute('data-i18n');
        if (!hasKey(key)) continue;
        el.textContent = t(key);
        applied += 1;
    }

    for (const attr of TRANSLATABLE_ATTRS) {
        for (const el of root.querySelectorAll(`[data-i18n-${attr}]`)) {
            const key = el.getAttribute(`data-i18n-${attr}`);
            if (!hasKey(key)) continue;
            el.setAttribute(attr, t(key));
            applied += 1;
        }
    }

    return applied;
}

// Auto-initialize locale on module load
currentLocale = detectInitialLocale();

/**
 * Mirror the active locale onto <html lang>. setLocale() does this when the
 * player switches, but a session that *starts* in a stored or Steam-detected
 * locale never went through setLocale, so the document claimed lang="en" while
 * showing Japanese. That drives font fallback and CJK glyph selection, text
 * hyphenation, and what a screen reader announces.
 */
function syncDocumentLang() {
    try {
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.lang = currentLocale;
        }
    } catch {
        // Ignore document element errors
    }
}

// Keep static markup in sync: translate once the document is parsed, and again
// whenever the player changes language, so switching never needs a reload.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    syncDocumentLang();
    window.addEventListener('locale-changed', () => {
        syncDocumentLang();
        applyStaticTranslations();
    });
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            syncDocumentLang();
            applyStaticTranslations();
        }, { once: true });
    } else {
        applyStaticTranslations();
    }
}
