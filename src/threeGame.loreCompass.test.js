import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

// getNearbyUnreadLoreTarget feeds getRadarCompassState's new 'lore' branch
// (wave-6 punch list §3a: lore was the one interactable with no compass
// hint at all). Pure-logic method, exercised via the established
// ThreeGame.prototype.method.call(fakeThis, ...) pattern.

function makeTerminal(x, z, loreKey, { detached = false } = {}) {
    return {
        position: { x, z },
        parent: detached ? null : {},
        userData: { type: 'lore_terminal', loreKey }
    };
}

function makeDrop(x, z) {
    return { sprite: { position: { x, z } } };
}

function makeFakeThis({ terminals = [], drops = [], readKeys = [] } = {}) {
    return {
        player: { position: { x: 0, z: 0 } },
        scatterSprites: terminals,
        loreDrops: drops,
        _readLoreKeys: new Set(readKeys)
    };
}

function target(fakeThis, radius) {
    return ThreeGame.prototype.getNearbyUnreadLoreTarget.call(fakeThis, radius);
}

describe('getNearbyUnreadLoreTarget', () => {
    it('picks the nearest unread terminal within the radius', () => {
        const fakeThis = makeFakeThis({
            terminals: [makeTerminal(20, 0, 'far'), makeTerminal(10, 0, 'near')]
        });
        expect(target(fakeThis)).toMatchObject({ dx: 10, dz: 0, distance: 10 });
    });

    it('skips terminals whose lore key was already read this session', () => {
        const fakeThis = makeFakeThis({
            terminals: [makeTerminal(10, 0, 'read-one'), makeTerminal(20, 0, 'unread')],
            readKeys: ['read-one']
        });
        expect(target(fakeThis)).toMatchObject({ dx: 20, distance: 20 });
    });

    it('skips unmounted terminals and considers physical lore drops', () => {
        const fakeThis = makeFakeThis({
            terminals: [makeTerminal(5, 0, 'gone', { detached: true })],
            drops: [makeDrop(0, 12)]
        });
        expect(target(fakeThis)).toMatchObject({ dz: 12, distance: 12 });
    });

    it('returns null when everything is out of radius or underfoot', () => {
        const fakeThis = makeFakeThis({
            terminals: [makeTerminal(50, 0, 'too-far'), makeTerminal(1, 0, 'underfoot')]
        });
        expect(target(fakeThis)).toBeNull();
    });

    it('honors a custom radius', () => {
        const fakeThis = makeFakeThis({ terminals: [makeTerminal(40, 0, 'a')] });
        expect(target(fakeThis, 28)).toBeNull();
        expect(target(fakeThis, 45)).toMatchObject({ distance: 40 });
    });
});
