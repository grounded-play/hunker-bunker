import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

function carryingGame() {
    return {
        carryState: { carried: { instanceId: 'bed-1' } },
        aimDirX: 1,
        aimDirZ: 0,
        player: { position: { x: 0, z: 0 } },
        isPlayerDead: false,
        isGameplayInputActive: () => true,
        playThrottledUiError: vi.fn(),
        showBunkerLine: vi.fn(),
        isInsideNoFireZone: vi.fn(() => false)
    };
}

describe('carrying occupies both hands', () => {
    it('blocks ranged fire before ammo, cooldown, or projectile state changes', () => {
        const game = carryingGame();
        game.weaponClipAmmo = 6;
        game.weaponFireCooldown = 0;
        const fired = ThreeGame.prototype.fireWeaponAtCurrentAim.call(game, { source: 'test' });
        expect(fired).toBe(false);
        expect(game.weaponClipAmmo).toBe(6);
        expect(game.weaponFireCooldown).toBe(0);
        expect(game.playThrottledUiError).toHaveBeenCalledOnce();
        expect(game.showBunkerLine).toHaveBeenCalledWith('HANDS FULL — DROP CARGO TO FIRE.');
    });

    it('blocks melee and reload actions while cargo is held', () => {
        const game = carryingGame();
        game.weaponReloading = false;
        expect(ThreeGame.prototype.triggerGameplayMelee.call(game)).toBe(false);
        expect(ThreeGame.prototype.requestReload.call(game, { manual: true })).toBe(false);
        expect(game.isInsideNoFireZone).not.toHaveBeenCalled();
    });
});
