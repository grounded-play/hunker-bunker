import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// 2026-10-16 browser probe: at deploy the profile flips to 'gameplay' one
// frame before the player leaves the menu showcase chunk (100, 100), which
// sits at ABYSS depth. That frame recorded a tier-3 crossing on every run:
// maxDepthTierReached 3 at the crash site, the arc's deepestDepthTier, the
// survivor contract, a camera shake, and cinematic beat 14 spent at boot.
function fakeGame(tierAt) {
    const fake = Object.create(ThreeGame.prototype);
    Object.assign(fake, {
        performanceProfile: 'gameplay',
        maxDepthTierReached: 0,
        getDepthTier: tierAt,
        arcManager: { recordSignal: vi.fn(), evaluate: vi.fn() },
        emitDepthTierChanged: vi.fn()
    });
    return fake;
}

describe('depth progress ignores the menu showcase chunk', () => {
    it('records no crossing while parked in the showcase', () => {
        const game = fakeGame(() => 3);
        game.updateDepthTierProgress(100, 100);
        expect(game.maxDepthTierReached).toBe(0);
        expect(game.emitDepthTierChanged).not.toHaveBeenCalled();
        expect(game.arcManager.recordSignal).not.toHaveBeenCalled();
        expect(game.currentDepthTier).toBe(3);
    });

    it('still records a real crossing in the world', () => {
        const game = fakeGame(() => 2);
        game.updateDepthTierProgress(6, -4);
        expect(game.maxDepthTierReached).toBe(2);
        expect(game.emitDepthTierChanged).toHaveBeenCalledWith(2, { isCrossing: true });
    });
});
