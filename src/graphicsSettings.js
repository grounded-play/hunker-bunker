/**
 * Graphics settings (Settings > Graphics) and the automatic step-down
 * (docs/planning/graphics-settings-and-auto-adjust-2026-10-11.md).
 *
 * Every machine starts at High. When auto-adjust is on and the game stalls
 * (sustained low frame rate after the deploy grace period), ThreeGame lowers
 * ONE setting at a time, chosen by what is actually holding the frame up:
 *   - GPU-bound: render resolution, then shadow update rate, then resolution;
 *   - main-thread (CPU) bound: draw calls the world can lose most easily
 *     (wall dressing, chasm landmarks, extra effects), then shadow updates.
 * It never turns shadows or post-processing OFF by itself: the owner ruled
 * twice (2026-08-26, 2026-09-25) that doing so made the game look unloaded,
 * and those frames were CPU-bound anyway. Every automatic step is written
 * into the settings with why it happened, shown in the Graphics tab, and can
 * be undone there; a manual change always wins over an automatic one.
 *
 * Pure data: ThreeGame applies the values, main.js draws the tab.
 */

export const GRAPHICS_STORAGE_KEY = 'hb_graphics';

/** Every setting's levels, best first. */
export const GRAPHICS_OPTIONS = Object.freeze({
    /** Render resolution, percent of the device's gameplay pixel ratio. */
    resolution: Object.freeze(['100', '85', '70']),
    /** full: every frame; reduced: every other frame, same look; off: none. */
    shadows: Object.freeze(['full', 'reduced', 'off']),
    /** Bloom, depth of field and grading. */
    postProcessing: Object.freeze(['on', 'off']),
    /** Pipes and hatches on wall tops, drifts and rubble at wall feet, icicles. */
    worldDetail: Object.freeze(['high', 'low']),
    /** Towers rising out of the chasm (they stay on the map either way). */
    landmarks: Object.freeze(['on', 'off']),
    /** Prop steam, sparks, spores, bubbles, flames; reduced drops dust motes. */
    effects: Object.freeze(['full', 'reduced', 'off'])
});

export const GRAPHICS_PRESETS = Object.freeze({
    high: Object.freeze({ resolution: '100', shadows: 'full', postProcessing: 'on', worldDetail: 'high', landmarks: 'on', effects: 'full' }),
    medium: Object.freeze({ resolution: '85', shadows: 'reduced', postProcessing: 'on', worldDetail: 'high', landmarks: 'on', effects: 'reduced' }),
    low: Object.freeze({ resolution: '70', shadows: 'off', postProcessing: 'off', worldDetail: 'low', landmarks: 'off', effects: 'off' })
});

export const DEFAULT_GRAPHICS_SETTINGS = Object.freeze({
    values: GRAPHICS_PRESETS.high,
    autoAdjust: true,
    autoChanges: Object.freeze([])
});

// What auto-adjust may lower, in order, for each bottleneck. Each entry is
// [setting, the lowest level auto-adjust may take it to]; shadows and
// post-processing never go off automatically.
const AUTO_LADDERS = Object.freeze({
    gpu: Object.freeze([['resolution', '85'], ['shadows', 'reduced'], ['resolution', '70']]),
    cpu: Object.freeze([['worldDetail', 'low'], ['landmarks', 'off'], ['effects', 'reduced'], ['shadows', 'reduced']])
});

function levelIndex(key, value) {
    return GRAPHICS_OPTIONS[key]?.indexOf(value) ?? -1;
}

/** 'high' | 'medium' | 'low' when the values match a preset, else 'custom'. */
export function graphicsPresetOf(values) {
    for (const [name, preset] of Object.entries(GRAPHICS_PRESETS)) {
        if (Object.keys(preset).every((key) => values?.[key] === preset[key])) return name;
    }
    return 'custom';
}

export function applyGraphicsPreset(settings, preset) {
    if (!GRAPHICS_PRESETS[preset]) return settings;
    return { ...settings, values: { ...GRAPHICS_PRESETS[preset] }, autoChanges: [] };
}

/** A manual change: it wins, so any automatic note for that setting goes. */
export function setGraphicsValue(settings, key, value) {
    if (levelIndex(key, value) < 0) return settings;
    return {
        ...settings,
        values: { ...settings.values, [key]: value },
        autoChanges: settings.autoChanges.filter((change) => change.key !== key)
    };
}

export function setGraphicsAutoAdjust(settings, enabled) {
    return { ...settings, autoAdjust: Boolean(enabled) };
}

/**
 * The next automatic step for a 'gpu' or 'cpu' bottleneck: one setting, one
 * level down, never below its ladder floor; null once nothing is left.
 */
export function nextAutoGraphicsStep(values, bound) {
    for (const [key, floor] of AUTO_LADDERS[bound] ?? []) {
        const at = levelIndex(key, values[key]);
        if (at < 0 || at >= levelIndex(key, floor)) continue;
        return { key, from: values[key], to: GRAPHICS_OPTIONS[key][at + 1] };
    }
    return null;
}

/** Applies an automatic step and notes why: frame rate, bottleneck, where, when. */
export function recordAutoGraphicsStep(settings, step, { fps = null, bound = null, area = null, at = null, seconds = null } = {}) {
    return {
        ...settings,
        values: { ...settings.values, [step.key]: step.to },
        autoChanges: [...settings.autoChanges, {
            key: step.key,
            from: step.from,
            to: step.to,
            fps: Number.isFinite(fps) ? Math.round(fps) : null,
            bound,
            area,
            seconds,
            at: at ?? new Date().toISOString()
        }]
    };
}

/** Undoes every automatic step: each setting goes back to where it was before the first one. */
export function restoreAutoGraphicsChanges(settings) {
    const values = { ...settings.values };
    const restored = new Set();
    for (const change of settings.autoChanges) {
        if (restored.has(change.key)) continue;
        restored.add(change.key);
        values[change.key] = change.from;
    }
    return { ...settings, values, autoChanges: [] };
}

export function loadGraphicsSettings(storage = globalThis.localStorage) {
    try {
        const raw = storage?.getItem?.(GRAPHICS_STORAGE_KEY);
        if (!raw) return DEFAULT_GRAPHICS_SETTINGS;
        const saved = JSON.parse(raw);
        const values = { ...GRAPHICS_PRESETS.high };
        for (const key of Object.keys(GRAPHICS_OPTIONS)) {
            if (levelIndex(key, saved?.values?.[key]) >= 0) values[key] = saved.values[key];
        }
        const autoChanges = Array.isArray(saved?.autoChanges)
            ? saved.autoChanges.filter((change) => levelIndex(change?.key, change?.from) >= 0 && levelIndex(change?.key, change?.to) >= 0)
            : [];
        return { values, autoAdjust: saved?.autoAdjust !== false, autoChanges };
    } catch {
        return DEFAULT_GRAPHICS_SETTINGS;
    }
}

export function saveGraphicsSettings(settings, storage = globalThis.localStorage) {
    try {
        storage?.setItem?.(GRAPHICS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // Storage unavailable: the settings simply do not persist.
    }
}
