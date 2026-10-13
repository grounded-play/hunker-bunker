import { describe, expect, it } from 'vitest';
import {
    addFieldWeaponDrop,
    consumeFieldWeaponAmmo,
    createFieldWeaponDrop,
    createFieldWeaponRunState,
    reloadFieldWeapon,
    resetFieldWeaponRunState,
    serviceEquippedFieldWeapon,
    swapFieldWeapon
} from './fieldWeaponDrops.js';

function drop(instanceId, profileId, ammoInWeapon, reserveAmmo, runId = 'run-a') {
    return createFieldWeaponDrop({
        instanceId,
        profileId,
        ammoInWeapon,
        reserveAmmo,
        worldPosition: { x: 4, z: 7 },
        runId
    });
}

describe('run-only field weapon drops', () => {
    it('equips one gun and atomically drops the previous gun with its ammo intact', () => {
        let state = createFieldWeaponRunState('run-a');
        state = addFieldWeaponDrop(state, drop('rail-1', 'rail_marksman', 3, 8)).state;
        state = addFieldWeaponDrop(state, drop('cryo-1', 'cryo_lance', 4, 10)).state;
        state = swapFieldWeapon(state, 'rail-1').state;
        state = consumeFieldWeaponAmmo(state).state;

        const result = swapFieldWeapon(state, 'cryo-1');
        expect(result.ok).toBe(true);
        expect(result.equipped).toMatchObject({ instanceId: 'cryo-1', profileId: 'cryo_lance', ammoInWeapon: 4 });
        expect(result.dropped).toMatchObject({ instanceId: 'rail-1', ammoInWeapon: 2, reserveAmmo: 8 });
        expect(result.dropped.worldPosition).toEqual({ x: 4, z: 7 });
        expect(result.state.worldDrops.map(({ instanceId }) => instanceId)).toEqual(['rail-1']);
    });

    it('uses weapon-specific reserves and never invents ammo', () => {
        let state = createFieldWeaponRunState('run-a');
        state = addFieldWeaponDrop(state, drop('shells-1', 'scatter_rep', 1, 4)).state;
        state = swapFieldWeapon(state, 'shells-1').state;
        const result = reloadFieldWeapon(state);
        expect(result).toMatchObject({ ok: true, loaded: 4 });
        expect(result.state.equipped).toMatchObject({ ammoType: 'shells', ammoInWeapon: 5, reserveAmmo: 0 });
        expect(reloadFieldWeapon(result.state)).toMatchObject({ ok: false, reason: 'no-reserve' });
    });

    it('services only the equipped gun reserve and clamps to its unique capacity', () => {
        let state = createFieldWeaponRunState('run-a');
        state = addFieldWeaponDrop(state, drop('flame-1', 'flamethrower', 10, 230)).state;
        state = swapFieldWeapon(state, 'flame-1').state;
        const result = serviceEquippedFieldWeapon(state, 30);
        expect(result).toMatchObject({ ok: true, added: 10 });
        expect(result.state.equipped).toMatchObject({ ammoType: 'fuel-tanks', reserveAmmo: 240 });
        expect(serviceEquippedFieldWeapon(result.state, 30)).toMatchObject({ ok: false, reason: 'full' });
    });

    it('rejects duplicate and cross-run instances', () => {
        let state = createFieldWeaponRunState('run-a');
        const first = drop('gun-1', 'mk1_sidearm', 8, 20);
        state = addFieldWeaponDrop(state, first).state;
        expect(addFieldWeaponDrop(state, first)).toMatchObject({ ok: false, reason: 'duplicate-instance' });
        expect(addFieldWeaponDrop(state, drop('gun-2', 'cryo_lance', 2, 3, 'run-b')))
            .toMatchObject({ ok: false, reason: 'wrong-run' });
    });

    it('clears both equipped and world weapons at the run boundary', () => {
        let state = createFieldWeaponRunState('run-a');
        state = addFieldWeaponDrop(state, drop('gun-1', 'neon_smg', 20, 50)).state;
        state = swapFieldWeapon(state, 'gun-1').state;
        expect(resetFieldWeaponRunState('run-b')).toEqual({ runId: 'run-b', equipped: null, worldDrops: [] });
        expect(state.equipped).not.toBeNull();
    });
});
