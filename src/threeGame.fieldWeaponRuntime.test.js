import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import {
    addFieldWeaponDrop,
    createFieldWeaponDrop,
    createFieldWeaponRunState,
    swapFieldWeapon
} from './fieldWeaponDrops.js';

function equippedState(profileId = 'cryo_lance', ammoInWeapon = 2, reserveAmmo = 6) {
    let state = createFieldWeaponRunState('run-test');
    state = addFieldWeaponDrop(state, createFieldWeaponDrop({
        instanceId: `${profileId}-1`,
        profileId,
        ammoInWeapon,
        reserveAmmo,
        worldPosition: { x: 2, z: 3 },
        runId: state.runId
    })).state;
    return swapFieldWeapon(state, `${profileId}-1`).state;
}

describe('physical field weapon runtime', () => {
    beforeEach(() => {
        const browser = new EventTarget();
        browser.AudioManager = { play: vi.fn() };
        browser.pickupCounterState = { ammo: 0 };
        vi.stubGlobal('window', browser);
    });

    it('swaps the nearby world gun atomically and mirrors its unique ammo in combat state', () => {
        let state = createFieldWeaponRunState('run-test');
        state = addFieldWeaponDrop(state, createFieldWeaponDrop({
            instanceId: 'rail-1',
            profileId: 'rail_marksman',
            ammoInWeapon: 3,
            reserveAmmo: 7,
            worldPosition: { x: 1, z: 0 },
            runId: state.runId
        })).state;
        const game = {
            carryState: { carried: null },
            fieldWeaponRunState: state,
            getNearestFieldWeaponDrop: () => ({ drop: state.worldDrops[0], distance: 1 }),
            reconcileFieldWeaponDropVisuals: vi.fn(),
            syncEquippedFieldWeapon: ThreeGame.prototype.syncEquippedFieldWeapon,
            emitWeaponClipState: vi.fn(),
            showBunkerLine: vi.fn()
        };

        expect(ThreeGame.prototype.interactWithFieldWeaponDrop.call(game)).toBe(true);
        expect(game.fieldWeaponRunState.equipped).toMatchObject({ profileId: 'rail_marksman', ammoInWeapon: 3, reserveAmmo: 7 });
        expect(game.weaponClipAmmo).toBe(3);
        expect(game.weaponClipSize).toBe(4);
        expect(game.reconcileFieldWeaponDropVisuals).toHaveBeenCalledOnce();
    });

    it('arms a PvP round with the staged class gun, and leaves solo and co-op on the rack', () => {
        const makeGame = (mode) => {
            let state = createFieldWeaponRunState('run-test');
            state = addFieldWeaponDrop(state, createFieldWeaponDrop({
                instanceId: 'sector-zero-loadout:run-test',
                profileId: 'mk1_sidearm',
                ammoInWeapon: 12,
                reserveAmmo: 36,
                worldPosition: { x: 40, z: 40 },
                runId: state.runId
            })).state;
            const game = {
                multiplayerMode: mode,
                carryState: { carried: null },
                fieldWeaponRunState: state,
                stageSectorZeroLoadoutWeapon: () => game.fieldWeaponRunState.worldDrops[0],
                interactWithFieldWeaponDrop: ThreeGame.prototype.interactWithFieldWeaponDrop,
                reconcileFieldWeaponDropVisuals: vi.fn(),
                syncEquippedFieldWeapon: ThreeGame.prototype.syncEquippedFieldWeapon,
                emitWeaponClipState: vi.fn(),
                showBunkerLine: vi.fn()
            };
            return game;
        };

        const pvp = makeGame('pvp');
        expect(ThreeGame.prototype.equipPvpLoadoutWeapon.call(pvp)).toBe(true);
        expect(pvp.fieldWeaponRunState.equipped).toMatchObject({ profileId: 'mk1_sidearm', ammoInWeapon: 12 });
        // Already armed: nothing changes on a second ready signal.
        expect(ThreeGame.prototype.equipPvpLoadoutWeapon.call(pvp)).toBe(false);

        for (const mode of ['coop', undefined]) {
            const game = makeGame(mode);
            expect(ThreeGame.prototype.equipPvpLoadoutWeapon.call(game)).toBe(false);
            expect(game.fieldWeaponRunState.equipped).toBeNull();
        }
    });

    it('reloads from the equipped gun reserve without consuming the shared ammo cache', () => {
        const game = {
            fieldWeaponRunState: equippedState('cryo_lance', 2, 2),
            weaponReloading: true,
            weaponReloadTimer: 0.01,
            weaponReloadDuration: 1,
            weaponFireCooldown: 0,
            weaponClipAmmo: 2,
            weaponClipSize: 5,
            weaponAmmoRefillTimer: 0,
            updateHeldFire: vi.fn(),
            updateWeaponAmmoRefill: ThreeGame.prototype.updateWeaponAmmoRefill,
            syncEquippedFieldWeapon: ThreeGame.prototype.syncEquippedFieldWeapon,
            emitWeaponClipState: vi.fn()
        };
        window.pickupCounterState = { ammo: 99 };

        ThreeGame.prototype.updateWeaponState.call(game, 0.02);

        expect(game.fieldWeaponRunState.equipped).toMatchObject({ ammoInWeapon: 4, reserveAmmo: 0 });
        expect(game.weaponClipAmmo).toBe(4);
        expect(window.pickupCounterState.ammo).toBe(99);
    });

    it('exposes ammo family and field weapon id in the existing HUD event', () => {
        const events = [];
        const listener = (event) => events.push(event.detail);
        window.addEventListener('weapon-clip-updated', listener);
        const game = {
            fieldWeaponRunState: equippedState('scatter_rep', 4, 12),
            weaponReloading: false,
            weaponReloadTimer: 0,
            weaponReloadDuration: 1,
            weaponClipAmmo: 4,
            weaponClipSize: 6,
            weaponAmmoRefillTimer: 0,
            unlimitedAmmo: false,
            getAmmoRefillInterval: () => Infinity,
            getAvailableAmmo: ThreeGame.prototype.getAvailableAmmo
        };

        ThreeGame.prototype.emitWeaponClipState.call(game);
        window.removeEventListener('weapon-clip-updated', listener);

        expect(events.at(-1)).toMatchObject({
            clip: 4,
            maxClip: 6,
            cache: 12,
            fieldWeaponId: 'scatter_rep',
            ammoType: 'shells'
        });
    });
});
