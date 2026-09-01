import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame Unlimited Ammo & Infinite Cheats', () => {
    let game;

    beforeEach(() => {
        globalThis.window = globalThis.window || {};
        globalThis.window.dispatchEvent = vi.fn();
        globalThis.window.pickupCounterState = { ammo: 10, health: 10, tech: 10, coin: 10 };

        game = Object.create(ThreeGame.prototype);
        game.weaponClipSize = 6;
        game.weaponClipAmmo = 6;
        game.unlimitedAmmo = false;
        game.weaponReloading = false;
        game.weaponReloadTimer = 0;
        game.weaponAmmoRefillTimer = 0;
        game.weaponFireCooldown = 0;
        game.aimDirX = 1;
        game.aimDirZ = 0;
        game.isGameplayInputActive = () => true;
        game.isInsideNoFireZone = () => false;
        game.playThrottledUiError = vi.fn();
        game.triggerGameplayMelee = vi.fn();
        game.spawnPlayerShot = vi.fn();
        game.emitWeaponClipState = vi.fn();
        game.getAmmoRefillInterval = () => 1.5;
    });

    it('enables unlimited ammo with setUnlimitedAmmo(true)', () => {
        game.weaponClipAmmo = 1;
        game.weaponReloading = true;
        game.weaponReloadTimer = 1.0;

        const enabled = game.setUnlimitedAmmo(true);
        expect(enabled).toBe(true);
        expect(game.unlimitedAmmo).toBe(true);
        expect(game.weaponClipAmmo).toBe(6);
        expect(game.weaponReloading).toBe(false);
        expect(game.weaponReloadTimer).toBe(0);
        expect(game.emitWeaponClipState).toHaveBeenCalled();
        expect(globalThis.window.dispatchEvent).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'unlimited-ammo-toggled' })
        );
    });

    it('toggles unlimited ammo with toggleUnlimitedAmmo()', () => {
        expect(game.unlimitedAmmo).toBe(false);
        const on = game.toggleUnlimitedAmmo();
        expect(on).toBe(true);
        expect(game.unlimitedAmmo).toBe(true);

        const off = game.toggleUnlimitedAmmo();
        expect(off).toBe(false);
        expect(game.unlimitedAmmo).toBe(false);
    });

    it('does not deplete clip ammo when firing with unlimitedAmmo enabled', () => {
        game.setUnlimitedAmmo(true);
        expect(game.weaponClipAmmo).toBe(6);

        const fired1 = game.fireWeaponAtCurrentAim();
        expect(fired1).toBe(true);
        expect(game.weaponClipAmmo).toBe(6);
        expect(game.spawnPlayerShot).toHaveBeenCalled();

        game.weaponFireCooldown = 0;
        const fired2 = game.fireWeaponAtCurrentAim();
        expect(fired2).toBe(true);
        expect(game.weaponClipAmmo).toBe(6);
    });

    it('returns high reserve count in getAvailableAmmo when unlimitedAmmo is active', () => {
        globalThis.window.pickupCounterState.ammo = 0;
        expect(game.getAvailableAmmo()).toBe(0);

        game.setUnlimitedAmmo(true);
        expect(game.getAvailableAmmo()).toBe(9999);
    });

    it('depletes clip ammo normally when unlimitedAmmo is false', () => {
        game.setUnlimitedAmmo(false);
        game.weaponClipAmmo = 6;

        const fired = game.fireWeaponAtCurrentAim();
        expect(fired).toBe(true);
        expect(game.weaponClipAmmo).toBe(5);
    });
});
