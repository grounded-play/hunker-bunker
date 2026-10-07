import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    isDeferredMarkupMounted,
    mountDeferredMarkup,
    onDeferredMarkupMounted,
    resetDeferredMarkupForTests,
    setDeferredMarkupDecorator
} from './deferredMarkup.js';

function fakeDocument() {
    const content = { kind: 'fragment' };
    const template = { content, replaceWith: vi.fn() };
    const host = { id: 'multiplayer-modal', querySelector: vi.fn(() => template) };
    return { doc: { getElementById: (id) => (id === host.id ? host : null) }, host, template, content };
}

describe('screens built on first open', () => {
    afterEach(() => resetDeferredMarkupForTests());

    it('builds the children from the template once, then decorates them', () => {
        const { doc, host, template, content } = fakeDocument();
        const decorate = vi.fn();
        setDeferredMarkupDecorator(decorate);
        expect(mountDeferredMarkup('multiplayer-modal', doc)).toBe(host);
        mountDeferredMarkup('multiplayer-modal', doc);
        expect(template.replaceWith).toHaveBeenCalledTimes(1);
        expect(template.replaceWith).toHaveBeenCalledWith(content);
        expect(decorate).toHaveBeenCalledWith(host);
        expect(isDeferredMarkupMounted('multiplayer-modal')).toBe(true);
    });

    it('wires a screen when it mounts, or at once if it already has', () => {
        const { doc, host } = fakeDocument();
        const early = vi.fn();
        onDeferredMarkupMounted('multiplayer-modal', early, doc);
        expect(early).not.toHaveBeenCalled();
        mountDeferredMarkup('multiplayer-modal', doc);
        expect(early).toHaveBeenCalledWith(host);
        const late = vi.fn();
        onDeferredMarkupMounted('multiplayer-modal', late, doc);
        expect(late).toHaveBeenCalledWith(host);
        expect(early).toHaveBeenCalledTimes(1);
    });

    it('does nothing for a screen that is not in the page', () => {
        const { doc } = fakeDocument();
        expect(mountDeferredMarkup('nope', doc)).toBeNull();
        expect(isDeferredMarkupMounted('nope')).toBe(false);
    });

    it('still runs the wiring for a screen whose markup was never deferred', () => {
        const { doc, host } = fakeDocument();
        host.querySelector = () => null;
        const wire = vi.fn();
        onDeferredMarkupMounted('multiplayer-modal', wire, doc);
        mountDeferredMarkup('multiplayer-modal', doc);
        expect(wire).toHaveBeenCalledTimes(1);
    });
});
