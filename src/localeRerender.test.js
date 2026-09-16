import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { onLocaleChange } from './i18n.js';

/**
 * Covers the third way a string can stay in the wrong language: markup is
 * handled by data-i18n, content by localizeCatalog, but a panel a module built
 * on open keeps its original language until something rebuilds it.
 */
describe('onLocaleChange', () => {
    let listeners;

    beforeEach(() => {
        listeners = new Map();
        vi.stubGlobal('window', {
            addEventListener: (type, fn) => {
                if (!listeners.has(type)) listeners.set(type, new Set());
                listeners.get(type).add(fn);
            },
            removeEventListener: (type, fn) => listeners.get(type)?.delete(fn)
        });
    });

    afterEach(() => vi.unstubAllGlobals());

    const fire = () => [...(listeners.get('locale-changed') ?? [])].forEach((fn) => fn());

    it('re-renders a mounted panel when the locale changes', () => {
        const render = vi.fn();
        onLocaleChange(render, () => true);
        expect(render).not.toHaveBeenCalled();
        fire();
        expect(render).toHaveBeenCalledTimes(1);
    });

    it('leaves a closed panel alone, so switching language never reopens it', () => {
        const render = vi.fn();
        onLocaleChange(render, () => false);
        fire();
        expect(render).not.toHaveBeenCalled();
    });

    it('stops re-rendering after unsubscribe', () => {
        const render = vi.fn();
        const stop = onLocaleChange(render);
        stop();
        fire();
        expect(render).not.toHaveBeenCalled();
    });

    it('does not let one panel\'s failure break the language switch', () => {
        const broken = vi.fn(() => { throw new Error('render failed'); });
        const healthy = vi.fn();
        onLocaleChange(broken);
        onLocaleChange(healthy);
        expect(() => fire()).not.toThrow();
        expect(healthy).toHaveBeenCalledTimes(1);
    });

    it('skips a panel whose mounted check throws rather than rendering blind', () => {
        const render = vi.fn();
        onLocaleChange(render, () => { throw new Error('detached'); });
        fire();
        expect(render).not.toHaveBeenCalled();
    });

    it('is inert without a window, so module import is safe under node', () => {
        vi.unstubAllGlobals();
        vi.stubGlobal('window', undefined);
        expect(() => onLocaleChange(() => {})()).not.toThrow();
    });
});
