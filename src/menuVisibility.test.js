import { describe, expect, it } from 'vitest';
import { captureMenuVisibilitySnapshot, describeOverlayTransition } from './menuVisibility.js';

function surface(style = {}, rect = { width: 400, height: 300 }) {
    return {
        style: { display: 'block', visibility: 'visible', opacity: '1', ...style },
        rect
    };
}

function snapshotOf(elements, ids = Object.keys(elements)) {
    return captureMenuVisibilitySnapshot({
        surfaceIds: ids,
        getElement: (id) => (elements[id] ? {} : null),
        computeStyle: (_el, id) => elements[id].style,
        measure: (_el, id) => elements[id].rect
    });
}

describe('captureMenuVisibilitySnapshot', () => {
    it('reports a shown surface as visible with no hidden reason', () => {
        const snap = snapshotOf({ 'season-pass-modal': surface() });

        expect(snap.surfaces[0]).toMatchObject({
            id: 'season-pass-modal',
            present: true,
            visible: true,
            hiddenReason: null
        });
    });

    it('distinguishes a missing surface from a hidden one', () => {
        const snap = captureMenuVisibilitySnapshot({
            surfaceIds: ['not-built-yet'],
            getElement: () => null
        });

        expect(snap.surfaces[0]).toMatchObject({
            id: 'not-built-yet',
            present: false,
            visible: false,
            hiddenReason: 'absent'
        });
    });

    it('names display:none as the reason a present surface is not visible', () => {
        const snap = snapshotOf({ 'armory-modal': surface({ display: 'none' }) });

        expect(snap.surfaces[0]).toMatchObject({ present: true, visible: false, hiddenReason: 'display-none' });
    });

    it('names visibility:hidden separately from display:none', () => {
        const snap = snapshotOf({ 'armory-modal': surface({ visibility: 'hidden' }) });

        expect(snap.surfaces[0]).toMatchObject({ visible: false, hiddenReason: 'visibility-hidden' });
    });

    it('names a fully transparent surface as transparent, not absent', () => {
        const snap = snapshotOf({ 'armory-modal': surface({ opacity: '0' }) });

        expect(snap.surfaces[0]).toMatchObject({ visible: false, hiddenReason: 'transparent' });
    });

    it('names a collapsed surface as zero-size', () => {
        const snap = snapshotOf({ 'armory-modal': surface({}, { width: 0, height: 0 }) });

        expect(snap.surfaces[0]).toMatchObject({ visible: false, hiddenReason: 'zero-size' });
    });
});

describe('describeOverlayTransition', () => {
    // Rather than instrumenting all 49 modals individually, menu open/close is
    // derived from the one gate that already decides whether world input is
    // suppressed: hasBlockingGameplayOverlay().
    it('reports an open when a blocking overlay appears', () => {
        expect(describeOverlayTransition(false, true)).toBe('open');
    });

    it('reports a close when it goes away', () => {
        expect(describeOverlayTransition(true, false)).toBe('close');
    });

    it('stays quiet while the overlay simply remains open', () => {
        expect(describeOverlayTransition(true, true)).toBe(null);
    });

    it('stays quiet while nothing is open', () => {
        expect(describeOverlayTransition(false, false)).toBe(null);
    });

    it('treats the first observation of an open overlay as an open', () => {
        expect(describeOverlayTransition(null, true)).toBe('open');
    });

    it('does not announce a close for a first observation of nothing', () => {
        expect(describeOverlayTransition(null, false)).toBe(null);
    });
});
