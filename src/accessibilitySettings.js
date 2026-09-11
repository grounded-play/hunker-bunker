/**
 * Accessibility settings that back the Steam store's accessibility tags.
 *
 * Kept in their own module rather than inline in main.js so the normalization
 * and DOM application can be tested directly -- these are claims made on a
 * storefront, and a setting that silently does nothing is worse than no setting
 * at all.
 *
 * Everything is driven through CSS custom properties and body classes, matching
 * the pattern `colorblind-assist` already uses, so the stylesheet owns the
 * actual appearance and this module only owns the state.
 */

export const SUBTITLE_SIZES = Object.freeze(['small', 'medium', 'large', 'xlarge']);
export const SUBTITLE_BACKDROPS = Object.freeze(['off', 'dim', 'solid']);
export const CONTRAST_LEVELS = Object.freeze(['normal', 'high', 'max']);

export const SUBTITLE_SIZE_KEY = 'hb_subtitle_size';
export const SUBTITLE_BACKDROP_KEY = 'hb_subtitle_backdrop';
export const CONTRAST_KEY = 'hb_contrast';

const DEFAULTS = Object.freeze({
    subtitleSize: 'medium',
    subtitleBackdrop: 'dim',
    contrast: 'normal'
});

// Dialogue text multiplies its base size by this. Small stays legible rather
// than shrinking to spite: the point of the control is headroom upward.
const SUBTITLE_SCALE = Object.freeze({
    small: 0.85,
    medium: 1,
    large: 1.25,
    xlarge: 1.55
});

const SUBTITLE_BACKDROP_COLOR = Object.freeze({
    off: 'transparent',
    dim: 'rgba(4, 8, 14, 0.55)',
    solid: 'rgba(2, 4, 8, 0.92)'
});

function readStorage(key) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage.getItem(key);
        }
    } catch {
        // Private window or blocked site data -- fall through to defaults.
    }
    return null;
}

function writeStorage(key, value) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
        }
    } catch {
        // Non-fatal: the choice applies this session but will not persist.
    }
}

/** Clamp a stored value to the allowed set. A stale or hand-edited value must
 *  never leave the UI in a state no CSS rule matches. */
function normalize(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
}

export function loadAccessibilitySettings() {
    return {
        subtitleSize: normalize(readStorage(SUBTITLE_SIZE_KEY), SUBTITLE_SIZES, DEFAULTS.subtitleSize),
        subtitleBackdrop: normalize(readStorage(SUBTITLE_BACKDROP_KEY), SUBTITLE_BACKDROPS, DEFAULTS.subtitleBackdrop),
        contrast: normalize(readStorage(CONTRAST_KEY), CONTRAST_LEVELS, DEFAULTS.contrast)
    };
}

export function applyAccessibilitySettings(settings, doc = (typeof document !== 'undefined' ? document : null)) {
    if (!doc?.documentElement?.style || !doc.body?.classList) return false;

    const size = normalize(settings?.subtitleSize, SUBTITLE_SIZES, DEFAULTS.subtitleSize);
    const backdrop = normalize(settings?.subtitleBackdrop, SUBTITLE_BACKDROPS, DEFAULTS.subtitleBackdrop);
    const contrast = normalize(settings?.contrast, CONTRAST_LEVELS, DEFAULTS.contrast);

    doc.documentElement.style.setProperty('--hb-subtitle-scale', String(SUBTITLE_SCALE[size]));
    doc.documentElement.style.setProperty('--hb-subtitle-backdrop', SUBTITLE_BACKDROP_COLOR[backdrop]);

    // Exactly one level at a time -- stacking them would compound the filters.
    doc.body.classList.remove('contrast-high', 'contrast-max');
    if (contrast === 'high') doc.body.classList.add('contrast-high');
    if (contrast === 'max') doc.body.classList.add('contrast-max');

    return true;
}

function persistAndApply(key, value, allowed, fallback, patch, doc) {
    const resolved = normalize(value, allowed, fallback);
    writeStorage(key, resolved);
    applyAccessibilitySettings({ ...loadAccessibilitySettings(), ...patch(resolved) }, doc);
    return resolved;
}

export function setSubtitleSize(value, doc) {
    return persistAndApply(
        SUBTITLE_SIZE_KEY, value, SUBTITLE_SIZES, DEFAULTS.subtitleSize,
        (v) => ({ subtitleSize: v }), doc
    );
}

export function setSubtitleBackdrop(value, doc) {
    return persistAndApply(
        SUBTITLE_BACKDROP_KEY, value, SUBTITLE_BACKDROPS, DEFAULTS.subtitleBackdrop,
        (v) => ({ subtitleBackdrop: v }), doc
    );
}

export function setContrast(value, doc) {
    return persistAndApply(
        CONTRAST_KEY, value, CONTRAST_LEVELS, DEFAULTS.contrast,
        (v) => ({ contrast: v }), doc
    );
}
