import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('updateFacingYaw', () => {
    it('derives aim direction and facing basis from yaw, and marks aim active', () => {
        const game = {
            facingPlanarForward: { set: vi.fn() },
            facingPlanarRight: { set: vi.fn() },
            getFacingRow: vi.fn(() => 3),
            hasActiveAim: false
        };

        ThreeGame.prototype.updateFacingYaw.call(game, Math.PI / 2);

        expect(game.facingYaw).toBeCloseTo(Math.PI / 2, 5);
        expect(game.aimDirX).toBeCloseTo(1, 5);
        expect(game.aimDirZ).toBeCloseTo(0, 5);
        const forwardArgs = game.facingPlanarForward.set.mock.calls[0];
        expect(forwardArgs[0]).toBeCloseTo(1, 5);
        expect(forwardArgs[1]).toBeCloseTo(0, 5);
        expect(game.getFacingRow).toHaveBeenCalledWith(game.aimDirX, game.aimDirZ);
        expect(game.aimFacingRow).toBe(3);
        expect(game.hasActiveAim).toBe(true);
    });

    it('wraps yaw into (-PI, PI]', () => {
        const game = {
            facingPlanarForward: { set: vi.fn() },
            facingPlanarRight: { set: vi.fn() },
            getFacingRow: vi.fn(() => 0)
        };

        ThreeGame.prototype.updateFacingYaw.call(game, Math.PI * 3);

        expect(game.facingYaw).toBeCloseTo(Math.PI, 5);
    });
});
