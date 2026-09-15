const THEME_DEFINITIONS = Object.freeze({
    4150: { name: 'Amber CRT', shape: 'crt', '--hud-primary': '#f59e0b', '--hud-secondary': '#fde68a', '--hud-glow': 'rgba(245, 158, 11, 0.4)', '--hud-scanline': '#d97706', '--hud-border': 'rgba(245, 158, 11, 0.62)', '--hud-panel': 'rgba(55, 30, 4, 0.84)', '--hud-warning': '#fb7185' },
    4151: { name: 'Emerald Radar', shape: 'radar', '--hud-primary': '#10b981', '--hud-secondary': '#a7f3d0', '--hud-glow': 'rgba(16, 185, 129, 0.4)', '--hud-scanline': '#059669', '--hud-border': 'rgba(16, 185, 129, 0.62)', '--hud-panel': 'rgba(2, 44, 34, 0.84)', '--hud-warning': '#fbbf24' },
    4206: { name: 'Deep Frost', shape: 'frost', '--hud-primary': '#a5f3fc', '--hud-secondary': '#e0f2fe', '--hud-glow': 'rgba(165, 243, 252, 0.4)', '--hud-scanline': '#0891b2', '--hud-border': 'rgba(165, 243, 252, 0.62)', '--hud-panel': 'rgba(8, 47, 73, 0.88)', '--hud-warning': '#f43f5e' },
    4213: { name: 'Rust & Bone', shape: 'bone', '--hud-primary': '#ea580c', '--hud-secondary': '#fed7aa', '--hud-glow': 'rgba(234, 88, 12, 0.4)', '--hud-scanline': '#9a3412', '--hud-border': 'rgba(234, 88, 12, 0.62)', '--hud-panel': 'rgba(43, 20, 10, 0.88)', '--hud-warning': '#ef4444' },
    4220: { name: 'Hive Chitin', shape: 'chitin', '--hud-primary': '#84cc16', '--hud-secondary': '#d9f99d', '--hud-glow': 'rgba(132, 204, 22, 0.4)', '--hud-scanline': '#4d7c0f', '--hud-border': 'rgba(132, 204, 22, 0.62)', '--hud-panel': 'rgba(26, 46, 5, 0.88)', '--hud-warning': '#eab308' },
    4227: { name: 'Horizon Corporate', shape: 'corporate', '--hud-primary': '#14b8a6', '--hud-secondary': '#ccfbf1', '--hud-glow': 'rgba(20, 184, 166, 0.35)', '--hud-scanline': '#0f766e', '--hud-border': 'rgba(20, 184, 166, 0.55)', '--hud-panel': 'rgba(15, 23, 42, 0.92)', '--hud-warning': '#f97316' },
    4234: { name: 'Bunker 404', shape: 'heart', '--hud-primary': '#d946ef', '--hud-secondary': '#fae8ff', '--hud-glow': 'rgba(217, 70, 239, 0.45)', '--hud-scanline': '#a21caf', '--hud-border': 'rgba(217, 70, 239, 0.65)', '--hud-panel': 'rgba(38, 10, 42, 0.90)', '--hud-warning': '#f43f5e' },
    4241: { name: 'Grand Marshal', shape: 'marshal', '--hud-primary': '#f59e0b', '--hud-secondary': '#fef3c7', '--hud-glow': 'rgba(245, 158, 11, 0.45)', '--hud-scanline': '#b45309', '--hud-border': 'rgba(245, 158, 11, 0.70)', '--hud-panel': 'rgba(30, 24, 12, 0.90)', '--hud-warning': '#dc2626' }
});

const LEGACY_THEME_IDS = Object.freeze({
    hudtheme_amber_crt: 4150,
    hudtheme_emerald_radar: 4151,
    hudtheme_deep_frost: 4206,
    hudtheme_rust_bone: 4213,
    hudtheme_hive_chitin: 4220,
    hudtheme_horizon_corporate: 4227,
    hudtheme_bunker404: 4234,
    hudtheme_grand_marshal: 4241
});

export const HUD_THEME_VARS = Object.freeze([
    '--hud-primary', '--hud-secondary', '--hud-glow', '--hud-scanline',
    '--hud-border', '--hud-panel', '--hud-warning'
]);

export function resolveHudTheme(themeId) {
    const canonicalId = LEGACY_THEME_IDS[themeId] ?? Number(themeId);
    const preset = THEME_DEFINITIONS[canonicalId] ?? null;
    return preset ? { id: String(canonicalId), ...preset } : null;
}

export function applyHudThemeToElement(element, themeId) {
    if (!element?.style) return null;
    const preset = resolveHudTheme(themeId);
    for (const property of HUD_THEME_VARS) element.style.removeProperty(property);
    if (!preset) {
        delete element.dataset.hudTheme;
        delete element.dataset.hudShape;
        return null;
    }
    for (const property of HUD_THEME_VARS) element.style.setProperty(property, preset[property]);
    element.dataset.hudTheme = preset.id;
    element.dataset.hudShape = preset.shape;
    return preset;
}

export function hudThemeInlineStyle(themeId) {
    const preset = resolveHudTheme(themeId);
    if (!preset) return '';
    return HUD_THEME_VARS.map((property) => `${property}:${preset[property]}`).join(';');
}
