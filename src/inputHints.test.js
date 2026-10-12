import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PAD_HINT_KEYS, applyInputHints, hintKeyFor } from './inputHints.js';

// Sprint 51: "Radar Scan [Q]" and "[M] / [ESC] CLOSE" on a Steam Deck.
function element(attribute, key) {
    const attrs = new Map([[attribute, key]]);
    return {
        textContent: '',
        getAttribute: (name) => attrs.get(name) ?? null,
        setAttribute: (name, value) => attrs.set(name, value),
        attrs
    };
}
function root(elements) {
    return {
        querySelectorAll: (selector) => {
            const attribute = selector.slice(1, -1);
            return elements.filter((el) => el.getAttribute(attribute) !== null);
        }
    };
}

describe('keyboard hints have a controller version', () => {
    it('swaps text and titles to the pad wording and back', () => {
        const footer = element('data-i18n', 'ui.tactical_map.m_select_esc_close');
        const radar = element('data-i18n-title', 'ui.radar_scan.title_radar_scan_q');
        const other = element('data-i18n', 'ui.menu.settings');
        const doc = root([footer, radar, other]);
        expect(applyInputHints(doc, true, (key) => `T:${key}`)).toBe(2);
        expect(footer.textContent).toBe('T:ui.input_hint.pad.map_close');
        expect(radar.attrs.get('title')).toBe('T:ui.input_hint.pad.radar_scan');
        expect(other.getAttribute('data-i18n')).toBe('ui.menu.settings');
        applyInputHints(doc, false, (key) => `T:${key}`);
        expect(footer.getAttribute('data-i18n')).toBe('ui.tactical_map.m_select_esc_close');
    });

    it('is a no-op when already on the right device', () => {
        expect(hintKeyFor('ui.menu.esc', false)).toBe('ui.menu.esc');
        expect(hintKeyFor('ui.input_hint.pad.menu_back', true)).toBe('ui.input_hint.pad.menu_back');
    });

    it.each(['en', 'de', 'es-419', 'ja', 'pt-BR', 'ru', 'zh-CN'])('has every pad hint in %s', (locale) => {
        const dict = JSON.parse(readFileSync(new URL(`./locales/${locale}.json`, import.meta.url), 'utf8'));
        const lookup = (key) => key.split('.').reduce((node, part) => node?.[part], dict);
        expect(Object.values(PAD_HINT_KEYS).filter((key) => typeof lookup(key) !== 'string')).toEqual([]);
    });
});
