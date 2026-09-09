import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { rollElitePromotion } from './eliteEnemies.js';

// docs/planning/depth-01-elite-and-relic-lane-2026-09-09.md D5.
//
// Parent plan section 14 item 3 requires the promotion decision to be made
// under the authoritative host and not rolled independently by each peer.
//
// The mechanism here is determinism, not serialization, and it is the one
// the codebase already relies on for cross-client enemy identity:
// createChunkScatterPlacements seeds a single RNG from
// hashTile(chunkX, chunkY) XOR runEntropy with no Math.random() anywhere in
// that path, and setupMultiplayerNetwork pins fixedRunEntropy so every peer
// in a match settles on the same constant (see the Sprint 26 comment at
// setupMultiplayerNetwork, and threeGame.setupMultiplayerNetworkSeedSync.test.js).
// Elite promotion is drawn from that same stream, so peers agree without a
// new network message. Kill/damage authority is unchanged and still resolves
// through handleEnemyHitReported on the host.
//
// These tests pin that property. If someone later reaches for Math.random()
// in the promotion path, or makes promotion depend on client-local state,
// the "two peers agree" case below fails.

function eliteSequence(seed, ring, count = 60) {
    const random = ThreeGame.prototype.createSeededRandom(seed);
    const out = [];
    for (let i = 0; i < count; i++) {
        out.push(rollElitePromotion(ring, random(), { type: 'cybersnail' }));
    }
    return out;
}

describe('elite promotion determinism (multiplayer agreement)', () => {
    it('two peers on the same seed promote the identical set', () => {
        const host = eliteSequence(123456789, 4);
        const guest = eliteSequence(123456789, 4);
        expect(guest).toEqual(host);
        expect(host.some(Boolean)).toBe(true); // and it is not trivially all-false
    });

    it('a different seed gives a different set, so the seed is doing the work', () => {
        expect(eliteSequence(987654321, 4)).not.toEqual(eliteSequence(123456789, 4));
    });

    it('a late-joining peer rebuilding the same chunk resolves the same ranks', () => {
        const first = eliteSequence(42, 5);
        const rebuilt = eliteSequence(42, 5);
        expect(rebuilt).toEqual(first);
    });

    it('produces roughly the contract rate over a large sample', () => {
        // Not a precision claim about the RNG -- a guard that the wiring
        // reaches the contract at all, rather than promoting everything or
        // nothing. Ring 4's chance is 0.22.
        const sample = eliteSequence(2024, 4, 4000);
        const rate = sample.filter(Boolean).length / sample.length;
        expect(rate).toBeGreaterThan(0.15);
        expect(rate).toBeLessThan(0.30);
    });

    it('promotes nobody on ring I over a large sample', () => {
        const sample = eliteSequence(2024, 1, 2000);
        expect(sample.some(Boolean)).toBe(false);
    });
});
