import { describe, expect, it } from 'vitest';
import { installAccessibilitySettings } from './accessibilitySettings.js';

// Repo idiom: this module takes an injected `doc` so tests never need jsdom.
function fakeDoc(ids = []) {
    const classes = new Set();
    const props = {};
    const elements = new Map(ids.map((id) => {
        const handlers = {};
        return [id, {
            value: '',
            addEventListener: (type, fn) => { handlers[type] = fn; },
            fire: (value) => { elements.get(id).value = value; handlers.change?.({ target: { value } }); }
        }];
    }));
    const doc = {
        getElementById: (id) => elements.get(id) ?? null,
        documentElement: { style: { setProperty: (k, v) => { props[k] = v; } } },
        body: { classList: {
            add: (c) => classes.add(c),
            remove: (...c) => c.forEach((x) => classes.delete(x)),
            contains: (c) => classes.has(c)
        } }
    };
    return { doc, classes, props, el: (id) => elements.get(id) };
}

const ALL = ['setting-subtitle-size', 'setting-subtitle-backdrop', 'setting-contrast'];

describe('installAccessibilitySettings', () => {
    it('binds all three controls and applies stored settings on boot', () => {
        const { doc } = fakeDoc(ALL);
        expect(installAccessibilitySettings(doc)).toEqual({ applied: true, bound: 3 });
    });

    it('reflects the stored value into each control so it cannot disagree with the screen', () => {
        const { doc, el } = fakeDoc(ALL);
        installAccessibilitySettings(doc);
        expect(el('setting-subtitle-size').value).toBeTruthy();
        expect(el('setting-contrast').value).toBeTruthy();
    });

    it('a change on the contrast control reaches the document', () => {
        const { doc, classes, el } = fakeDoc(ALL);
        installAccessibilitySettings(doc);
        el('setting-contrast').fire('max');
        expect(classes.has('contrast-max')).toBe(true);
    });

    it('a change on the subtitle control writes the CSS custom property', () => {
        const { doc, props, el } = fakeDoc(ALL);
        installAccessibilitySettings(doc);
        el('setting-subtitle-size').fire('xlarge');
        expect(props['--hb-subtitle-scale']).toBeTruthy();
    });

    it('binds whatever is present when controls are missing', () => {
        const { doc } = fakeDoc(['setting-contrast']);
        expect(installAccessibilitySettings(doc).bound).toBe(1);
    });

    it('is inert with no document', () => {
        expect(installAccessibilitySettings(null)).toEqual({ applied: false, bound: 0 });
    });
});
