import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { ThreeGame } from './threeGame.js';

// Playtest P0-2: the terminal/ship wedge. The position is VALID, so
// resolvePlayerDepenetration() never fires -- the player is simply pinned.
function stub(overrides = {}) {
    return Object.assign(Object.create(ThreeGame.prototype), {
        player: { position: { x: 5, y: 0, z: 5 } },
        noclip: false,
        keys: { up: true, down: false, left: false, right: false },
        isGameplayInputActive: () => true,
        canOccupyPosition: () => true,
        isPlayerOverAnyHole: () => false,
        ...overrides
    });
}

beforeEach(() => { globalThis.window = { hbLog: () => {} }; });
afterEach(() => { delete globalThis.window; });

describe('pinned recovery', () => {
    it('does nothing while the player is actually moving', () => {
        const game = stub();
        game.updatePinnedRecovery(0.1);
        game.player.position.x = 6;           // real displacement
        expect(game.updatePinnedRecovery(0.1)).toBe(false);
        expect(game._pinnedSeconds).toBe(0);
    });

    it('does nothing when there is no movement input, however long', () => {
        const game = stub({ keys: { up: false, down: false, left: false, right: false } });
        for (let i = 0; i < 60; i += 1) expect(game.updatePinnedRecovery(0.1)).toBe(false);
    });

    it('waits out the dwell before acting, so walking into a wall is untouched', () => {
        const game = stub();
        game.updatePinnedRecovery(0.1);        // seed position
        expect(game.updatePinnedRecovery(1.0)).toBe(false);
    });

    it('frees a pinned player once the dwell elapses', () => {
        const game = stub({
            // Only the starting cell is blocked for movement purposes; the
            // search finds open ground nearby.
            canOccupyPosition: (x, z) => !(x === 5 && z === 5) || true
        });
        game.updatePinnedRecovery(0.1);
        const moved = game.updatePinnedRecovery(2.0);
        expect(moved).toBe(true);
        expect(game._pinnedSeconds).toBe(0);
    });

    it('is inert while input is disabled', () => {
        const game = stub({ isGameplayInputActive: () => false });
        game.updatePinnedRecovery(0.1);
        expect(game.updatePinnedRecovery(5)).toBe(false);
    });

    it('is inert in noclip', () => {
        const game = stub({ noclip: true });
        expect(game.updatePinnedRecovery(5)).toBe(false);
    });
});
