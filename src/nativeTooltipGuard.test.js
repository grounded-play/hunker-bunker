import { describe, expect, it, vi } from 'vitest';
import { installNativeTooltipGuard, stripNativeTitles } from './nativeTooltipGuard.js';

function element(attributes = {}, descendants = []) {
    const attrs = new Map(Object.entries(attributes));
    return {
        nodeType: 1,
        hasAttribute: (name) => attrs.has(name),
        getAttribute: (name) => attrs.get(name) ?? null,
        setAttribute: (name, value) => attrs.set(name, value),
        removeAttribute: (name) => attrs.delete(name),
        querySelectorAll: (selector) => selector === '[title]'
            ? descendants.filter((child) => child.hasAttribute('title'))
            : []
    };
}

describe('native tooltip guard', () => {
    it('removes native titles while retaining their accessible names', () => {
        const child = element({ title: 'Open settings' });
        const root = element({ title: 'Root help' }, [child]);

        expect(stripNativeTitles(root)).toBe(2);
        expect(root.hasAttribute('title')).toBe(false);
        expect(root.getAttribute('aria-label')).toBe('Root help');
        expect(child.hasAttribute('title')).toBe(false);
        expect(child.getAttribute('aria-label')).toBe('Open settings');
    });

    it('keeps an authored aria-label and strips titles added later', () => {
        const root = element();
        const child = element({ title: 'Browser bubble', 'aria-label': 'Authored name' });
        let callback;
        const disconnect = vi.fn();
        class Observer {
            constructor(fn) { callback = fn; }
            observe() {}
            disconnect() { disconnect(); }
        }

        const stop = installNativeTooltipGuard({
            documentObject: { documentElement: root },
            MutationObserverClass: Observer
        });
        callback([{ type: 'attributes', target: child, addedNodes: [] }]);

        expect(child.hasAttribute('title')).toBe(false);
        expect(child.getAttribute('aria-label')).toBe('Authored name');
        stop();
        expect(disconnect).toHaveBeenCalledOnce();
    });
});
