import { describe, expect, it } from 'vitest';
import { isPresentationMutation } from './presentationLayer.js';

const el = (className = '', id = '', inner = null) => ({
    nodeType: 1,
    id,
    className,
    querySelector: () => inner
});

describe('isPresentationMutation', () => {
    it('ignores class changes and nodes that can never be a presentation layer', () => {
        expect(isPresentationMutation({ type: 'attributes', target: el('hud-stat is-fading'), oldValue: 'hud-stat' })).toBe(false);
        expect(isPresentationMutation({ type: 'childList', addedNodes: [el('loader-log-line')], removedNodes: [] })).toBe(false);
        expect(isPresentationMutation({ type: 'childList', addedNodes: [{ nodeType: 3 }], removedNodes: [] })).toBe(false);
    });

    it('reacts to a presentation element gaining or losing its active class', () => {
        expect(isPresentationMutation({ type: 'attributes', target: el('class-intro-overlay is-closing'), oldValue: 'class-intro-overlay' })).toBe(true);
        expect(isPresentationMutation({ type: 'attributes', target: el('active', 'transition-overlay'), oldValue: '' })).toBe(true);
        // rgb-cinematic--visible removed: only the old value names it.
        expect(isPresentationMutation({ type: 'attributes', target: el('panel'), oldValue: 'panel rgb-cinematic--visible' })).toBe(true);
    });

    it('reacts to a presentation element added or removed, directly or inside a container', () => {
        expect(isPresentationMutation({ type: 'childList', addedNodes: [el('fullscreen-video-overlay')], removedNodes: [] })).toBe(true);
        expect(isPresentationMutation({ type: 'childList', addedNodes: [], removedNodes: [el('cinematic-still-overlay')] })).toBe(true);
        expect(isPresentationMutation({ type: 'childList', addedNodes: [el('wrapper', '', el('cinematic-overlay'))], removedNodes: [] })).toBe(true);
    });
});
