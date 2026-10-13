import { describe, expect, it } from 'vitest';
import {
    addCarryObject,
    beginCarry,
    canUseWeaponWhileCarrying,
    companionCarrierCoverPosition,
    createCarryObject,
    createCarryState,
    dropCarriedObject,
    getCarrierTacticalStance,
    installCarriedObject,
    resetCarryRunState,
    shouldCompanionCoverCarrier
} from './carrySystem.js';

const bed = () => createCarryObject({
    instanceId: 'bed-1',
    definitionId: 'field-cot',
    missionId: 'first-night',
    massClass: 'heavy',
    worldPosition: { x: 12, z: 8 },
    buildTags: ['bed', 'sleep'],
    runId: 'run-a'
});

describe('two-handed carry state', () => {
    it('moves a world object into one owned carry slot and blocks weapons', () => {
        const state = addCarryObject(createCarryState('run-a'), bed()).state;
        const result = beginCarry(state, 'bed-1', 'player-a');
        expect(result.ok).toBe(true);
        expect(result.state.worldObjects).toEqual([]);
        expect(result.state.carried).toMatchObject({ instanceId: 'bed-1', carrierPlayerId: 'player-a' });
        expect(canUseWeaponWhileCarrying(result.state)).toBe(false);
        expect(beginCarry(result.state, 'anything', 'player-a')).toMatchObject({ ok: false, reason: 'hands-full' });
    });

    it('drops mission cargo without changing identity or letting another player own the action', () => {
        let state = addCarryObject(createCarryState('run-a'), bed()).state;
        state = beginCarry(state, 'bed-1', 'player-a').state;
        expect(dropCarriedObject(state, { x: 3.5, z: 4.5 }, { carrierPlayerId: 'player-b' }))
            .toMatchObject({ ok: false, reason: 'not-owner' });
        const result = dropCarriedObject(state, { x: 3.5, z: 4.5 }, { carrierPlayerId: 'player-a' });
        expect(result.dropped).toMatchObject({ instanceId: 'bed-1', worldPosition: { x: 3.5, z: 4.5 } });
        expect(result.state.carried).toBeNull();
        expect(canUseWeaponWhileCarrying(result.state)).toBe(true);
    });

    it('installs only into a compatible socket and preserves installed modules across run reset', () => {
        let state = addCarryObject(createCarryState('run-a'), bed()).state;
        state = beginCarry(state, 'bed-1', 'player-a').state;
        expect(installCarriedObject(state, { id: 'engine', acceptsTags: ['engine'] }, { carrierPlayerId: 'player-a' }))
            .toMatchObject({ ok: false, reason: 'incompatible-socket' });
        const result = installCarriedObject(state, {
            id: 'sleep-bay',
            acceptsTags: ['bed'],
            transform: { x: 2, z: 3, yaw: 0 }
        }, { carrierPlayerId: 'player-a' });
        expect(result.installed).toMatchObject({ instanceId: 'bed-1', socketId: 'sleep-bay' });
        expect(resetCarryRunState('run-b', result.state.installed)).toMatchObject({
            runId: 'run-b', carried: null, worldObjects: [], installed: [{ instanceId: 'bed-1', socketId: 'sleep-bay' }]
        });
    });

    it('triggers companion cover-carrier tactical stance when carrier has hands full', () => {
        let state = addCarryObject(createCarryState('run-a'), bed()).state;
        expect(getCarrierTacticalStance(state)).toBe('normal');
        expect(shouldCompanionCoverCarrier(state)).toBe(false);

        state = beginCarry(state, 'bed-1', 'player-a').state;
        expect(getCarrierTacticalStance(state)).toBe('cover-carrier');
        expect(shouldCompanionCoverCarrier(state)).toBe(true);
        expect(companionCarrierCoverPosition({ x: 10, z: 10 }, { dirX: 0, dirZ: 1 }, 0))
            .toEqual({ x: 11.05, z: 10.75 });
    });
});
