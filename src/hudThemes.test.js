import { describe, expect, it, vi } from 'vitest';
import { HUD_THEME_VARS, applyHudThemeToElement, hudThemeInlineStyle, resolveHudTheme } from './hudThemes.js';

describe('HUD theme catalog', () => {
    const themeIds = ['4150', '4151', '4206', '4213', '4220', '4227', '4234', '4241'];

    it.each(themeIds)('defines a complete theme and Armory preview for %s', (themeId) => {
        const theme = resolveHudTheme(themeId);
        expect(theme?.id).toBe(themeId);
        expect(theme?.shape).toBeTruthy();
        for (const property of HUD_THEME_VARS) expect(theme?.[property]).toBeTruthy();
        expect(hudThemeInlineStyle(themeId)).toContain('--hud-primary:');
    });

    it('applies and clears theme state on any HUD root', () => {
        const values = new Map();
        const element = {
            dataset: {},
            style: {
                setProperty: vi.fn((key, value) => values.set(key, value)),
                removeProperty: vi.fn((key) => values.delete(key))
            }
        };
        expect(applyHudThemeToElement(element, '4234')?.shape).toBe('heart');
        expect(element.dataset).toMatchObject({ hudTheme: '4234', hudShape: 'heart' });
        expect(values.get('--hud-primary')).toBe('#d946ef');

        expect(applyHudThemeToElement(element, null)).toBeNull();
        expect(element.dataset.hudTheme).toBeUndefined();
        expect(values.size).toBe(0);
    });

    it('keeps legacy saved theme identifiers compatible', () => {
        expect(resolveHudTheme('hudtheme_bunker404')).toMatchObject({ id: '4234', shape: 'heart' });
    });
});
