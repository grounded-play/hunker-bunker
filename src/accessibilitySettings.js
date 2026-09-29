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
export const CAMERA_SHAKE_LEVELS = Object.freeze(['off', 'low', 'reduced', 'normal']);
export const CAMERA_SHAKE_FACTORS = Object.freeze({
    off: 0.0,
    low: 0.25,
    reduced: 0.5,
    normal: 1.0
});
export const AIM_ASSIST_MODES = Object.freeze(['off', 'low', 'standard']);
export const REDUCED_PRESSURE_MODES = Object.freeze(['off', 'on']);

export const SUBTITLE_SIZE_KEY = 'hb_subtitle_size';
export const SUBTITLE_BACKDROP_KEY = 'hb_subtitle_backdrop';
export const CONTRAST_KEY = 'hb_contrast';
export const CAMERA_SHAKE_KEY = 'hb_camera_shake';
export const AIM_ASSIST_KEY = 'hb_aim_assist';
export const REDUCED_PRESSURE_KEY = 'hb_reduced_pressure';

const DEFAULTS = Object.freeze({
    subtitleSize: 'medium',
    subtitleBackdrop: 'dim',
    contrast: 'normal',
    cameraShake: 'normal',
    aimAssist: 'standard',
    reducedPressure: false
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
    const rawPressure = readStorage(REDUCED_PRESSURE_KEY);
    const reducedPressure = rawPressure === 'true' || rawPressure === 'on';
    const cameraShake = normalize(readStorage(CAMERA_SHAKE_KEY), CAMERA_SHAKE_LEVELS, DEFAULTS.cameraShake);
    return {
        subtitleSize: normalize(readStorage(SUBTITLE_SIZE_KEY), SUBTITLE_SIZES, DEFAULTS.subtitleSize),
        subtitleBackdrop: normalize(readStorage(SUBTITLE_BACKDROP_KEY), SUBTITLE_BACKDROPS, DEFAULTS.subtitleBackdrop),
        contrast: normalize(readStorage(CONTRAST_KEY), CONTRAST_LEVELS, DEFAULTS.contrast),
        cameraShake,
        cameraShakeScale: CAMERA_SHAKE_FACTORS[cameraShake] ?? 1.0,
        aimAssist: normalize(readStorage(AIM_ASSIST_KEY), AIM_ASSIST_MODES, DEFAULTS.aimAssist),
        reducedPressure
    };
}

export function applyAccessibilitySettings(settings, doc = (typeof document !== 'undefined' ? document : null)) {
    const size = normalize(settings?.subtitleSize, SUBTITLE_SIZES, DEFAULTS.subtitleSize);
    const backdrop = normalize(settings?.subtitleBackdrop, SUBTITLE_BACKDROPS, DEFAULTS.subtitleBackdrop);
    const contrast = normalize(settings?.contrast, CONTRAST_LEVELS, DEFAULTS.contrast);
    const cameraShake = normalize(settings?.cameraShake, CAMERA_SHAKE_LEVELS, DEFAULTS.cameraShake);
    const cameraShakeScale = typeof settings?.cameraShakeScale === 'number'
        ? settings.cameraShakeScale
        : (CAMERA_SHAKE_FACTORS[cameraShake] ?? 1.0);
    const aimAssist = normalize(settings?.aimAssist, AIM_ASSIST_MODES, DEFAULTS.aimAssist);
    const reducedPressure = Boolean(settings?.reducedPressure);

    if (doc?.documentElement?.style && doc.body?.classList) {
        doc.documentElement.style.setProperty('--hb-subtitle-scale', String(SUBTITLE_SCALE[size]));
        doc.documentElement.style.setProperty('--hb-subtitle-backdrop', SUBTITLE_BACKDROP_COLOR[backdrop]);
        doc.documentElement.style.setProperty('--hb-camera-shake-scale', String(cameraShakeScale));

        // Exactly one level at a time -- stacking them would compound the filters.
        doc.body.classList.remove('contrast-high', 'contrast-max');
        if (contrast === 'high') doc.body.classList.add('contrast-high');
        if (contrast === 'max') doc.body.classList.add('contrast-max');
    }

    if (typeof window !== 'undefined') {
        window.game?.setCameraShakeScale?.(cameraShakeScale);
        window.game?.setAimAssist?.(aimAssist);
        window.game?.setReducedPressure?.(reducedPressure);
        if (window.state?.settings) {
            window.state.settings.cameraShake = cameraShake;
            window.state.settings.cameraShakeScale = cameraShakeScale;
            window.state.settings.aimAssist = aimAssist;
            window.state.settings.reducedPressure = reducedPressure;
        }
    }

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

export function setCameraShake(value, doc) {
    return persistAndApply(
        CAMERA_SHAKE_KEY, value, CAMERA_SHAKE_LEVELS, DEFAULTS.cameraShake,
        (v) => ({ cameraShake: v, cameraShakeScale: CAMERA_SHAKE_FACTORS[v] ?? 1.0 }), doc
    );
}

export function setAimAssist(value, doc) {
    return persistAndApply(
        AIM_ASSIST_KEY, value, AIM_ASSIST_MODES, DEFAULTS.aimAssist,
        (v) => ({ aimAssist: v }), doc
    );
}

export function setReducedPressure(value, doc) {
    const isBool = typeof value === 'boolean';
    const enabled = isBool ? value : (value === 'true' || value === 'on');
    const storedStr = enabled ? 'true' : 'false';
    writeStorage(REDUCED_PRESSURE_KEY, storedStr);
    applyAccessibilitySettings({ ...loadAccessibilitySettings(), reducedPressure: enabled }, doc);
    return enabled;
}

export const CONTROL_BINDINGS = Object.freeze([
    Object.freeze({ id: 'setting-subtitle-size', key: 'subtitleSize', apply: setSubtitleSize }),
    Object.freeze({ id: 'setting-subtitle-backdrop', key: 'subtitleBackdrop', apply: setSubtitleBackdrop }),
    Object.freeze({ id: 'setting-contrast', key: 'contrast', apply: setContrast }),
    Object.freeze({ id: 'setting-camera-shake', key: 'cameraShake', apply: setCameraShake }),
    Object.freeze({ id: 'setting-aim-assist', key: 'aimAssist', apply: setAimAssist }),
    Object.freeze({ id: 'setting-reduced-pressure', key: 'reducedPressure', apply: setReducedPressure })
]);

export function installAccessibilitySettings(doc = (typeof document !== 'undefined' ? document : null)) {
    if (!doc?.getElementById) return { applied: false, bound: 0 };

    const stored = loadAccessibilitySettings();
    const applied = applyAccessibilitySettings(stored, doc);

    let bound = 0;
    for (const binding of CONTROL_BINDINGS) {
        const el = doc.getElementById(binding.id);
        if (!el) continue;
        if (el.type === 'checkbox') {
            el.checked = Boolean(stored[binding.key]);
            el.addEventListener('change', (event) => binding.apply(event.target.checked, doc));
        } else {
            el.value = String(stored[binding.key]);
            el.addEventListener('change', (event) => binding.apply(event.target.value, doc));
        }
        bound += 1;
    }
    return { applied, bound };
}
