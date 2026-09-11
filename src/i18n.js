import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';
import ru from './locales/ru.json';
import es419 from './locales/es-419.json';
import de from './locales/de.json';
import ja from './locales/ja.json';
import ptBR from './locales/pt-BR.json';

export const SUPPORTED_LOCALES = Object.freeze([
    { code: 'en', name: 'English', nativeName: 'English', rtl: false },
    { code: 'zh-CN', name: 'Simplified Chinese', nativeName: '简体中文', rtl: false },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', rtl: false },
    { code: 'es-419', name: 'Spanish (Latin America)', nativeName: 'Español (Latinoamérica)', rtl: false },
    { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', rtl: false },
    { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', rtl: false }
]);

const DICTIONARIES = Object.freeze({
    'en': en,
    'zh-CN': zhCN,
    'ru': ru,
    'es-419': es419,
    'de': de,
    'ja': ja,
    'pt-BR': ptBR
});

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
    if (DICTIONARIES[code]) return code;
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

export function setLocale(localeCode) {
    const resolved = resolveLocaleCode(localeCode);
    if (!resolved || !DICTIONARIES[resolved]) return false;
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

// Attributes that carry user-visible text and can be keyed from markup with
// data-i18n-<attr>, e.g. data-i18n-title="ui.hub.codex".
const TRANSLATABLE_ATTRS = Object.freeze(['title', 'aria-label', 'placeholder']);

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

// Keep static markup in sync: translate once the document is parsed, and again
// whenever the player changes language, so switching never needs a reload.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.addEventListener('locale-changed', () => {
        applyStaticTranslations();
    });
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            applyStaticTranslations();
        }, { once: true });
    } else {
        applyStaticTranslations();
    }
}
