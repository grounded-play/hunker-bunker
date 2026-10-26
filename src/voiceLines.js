/**
 * Exact-line voice playback for generated narrative audio.
 *
 * scripts/voice/ renders each spoken narrative line per language to
 * public/audio/voice/lines/<locale>/<i18n key>.mp3 and lists what exists in
 * public/audio/voice/lines/manifest.json ({ locales: { en: [keys], ... } }).
 * The game shows lines as text, often dressed ("> MOTHERSHIP: ...",
 * "BRIGGS: ..."); this maps a displayed line back to its key by comparing it,
 * normalized, with each recorded key's text in the current language.
 *
 * Lines that live in code (camp trees, wanderers, "MOTHERSHIP: ..." literals)
 * have no i18n key: they are English everywhere, recorded once under `en`,
 * and the manifest's `texts` carries what they display.
 *
 * Until a manifest ships (or for a line nobody recorded) resolve() returns
 * null and AudioManager falls back to its keyword-matched clips.
 */
const CODE_LINE_LOCALE = 'en';
export const VOICE_LINES_ROOT = '/audio/voice/lines';

export function voiceLineUrl(locale, key) {
    return `${VOICE_LINES_ROOT}/${locale}/${key}.mp3`;
}

/** Text compared case-, punctuation- and dressing-insensitively, in any script. */
export function normalizeVoiceText(text) {
    return String(text ?? '')
        .replace(/\[[^\]]*\]/g, ' ')
        .replace(/^\s*>\s*/, '')
        .replace(/^\s*[^:：\n]{1,30}[:：]\s*/u, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

/**
 * @param {object} deps
 * @param {() => Promise<object>} deps.fetchJson  loads the manifest
 * @param {() => string} deps.getLocale
 * @param {(key: string) => string} deps.translate  the key's text in the current language
 */
export function createVoiceLineLibrary({ fetchJson, getLocale, translate }) {
    let manifest = null;
    let loading = null;
    const indexes = new Map();

    function load() {
        if (manifest) return Promise.resolve(manifest);
        loading ??= Promise.resolve()
            .then(() => fetchJson())
            .then((data) => { manifest = data && typeof data === 'object' ? data : { locales: {} }; })
            .catch(() => { manifest = { locales: {} }; })
            .then(() => manifest);
        return loading;
    }

    function keysFor(locale) {
        const keys = manifest?.locales?.[locale];
        return Array.isArray(keys) ? keys : [];
    }

    function indexFor(locale) {
        if (!indexes.has(locale)) {
            const byText = new Map();
            for (const key of keysFor(locale)) {
                const normalized = normalizeVoiceText(translate(key));
                if (normalized && !byText.has(normalized)) byText.set(normalized, key);
            }
            indexes.set(locale, { keys: new Set(keysFor(locale)), byText });
        }
        return indexes.get(locale);
    }

    // Code lines, matched by their own text in every language.
    let codeIndex = null;
    function codeLines() {
        if (!codeIndex) {
            codeIndex = new Map();
            const recorded = new Set(keysFor(CODE_LINE_LOCALE));
            for (const [key, text] of Object.entries(manifest?.texts ?? {})) {
                const normalized = normalizeVoiceText(text);
                if (normalized && recorded.has(key) && !codeIndex.has(normalized)) codeIndex.set(normalized, key);
            }
        }
        return codeIndex;
    }

    function urlFor(key) {
        if (!manifest) { void load(); return null; }
        const locale = getLocale();
        return indexFor(locale).keys.has(key) ? voiceLineUrl(locale, key) : null;
    }

    function resolve(text) {
        if (!manifest) { void load(); return null; }
        const locale = getLocale();
        const normalized = normalizeVoiceText(text);
        const key = indexFor(locale).byText.get(normalized);
        if (key) return { key, url: voiceLineUrl(locale, key), source: 'catalog' };
        const codeKey = codeLines().get(normalized);
        return codeKey ? { key: codeKey, url: voiceLineUrl(CODE_LINE_LOCALE, codeKey), source: 'code' } : null;
    }

    return { load, resolve, urlFor };
}
