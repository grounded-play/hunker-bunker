import { describe, expect, it } from 'vitest';
import { beginCarry, createCarryState, installCarriedObject } from './carrySystem.js';
import { evaluateRoomSealGraph } from './baseSealGraph.js';
import {
    availableFirstNightSocket,
    ensureFirstNightBaseState,
    getFirstNightCotHandoff,
    installedCot,
    planFirstNightBase,
    releaseFirstNightCotHandoff,
    stageFirstNightCotAtCamp
} from './firstNightBase.js';

function installDefinition(state, plan, definitionId) {
    const object = state.worldObjects.find((entry) => entry.definitionId === definitionId);
    let next = beginCarry(state, object.instanceId, 'local').state;
    const socket = availableFirstNightSocket(next, plan, next.carried);
    return installCarriedObject(next, socket, { carrierPlayerId: 'local' }).state;
}

describe('first-night base recovery', () => {
    it('places the cot, hull patch, and pressure seal on a short route beside an incomplete berth', () => {
        const result = ensureFirstNightBaseState(createCarryState('run-a'), { shipX: 10, shipZ: 20 });
        expect(result.addedCargo.map(({ definitionId }) => definitionId)).toEqual([
            'cot_bed', 'hull_patch_panel', 'door_seal_kit'
        ]);
        expect(result.state.worldObjects).toEqual(expect.arrayContaining([
            expect.objectContaining({
                definitionId: 'cot_bed',
                missionId: 'first-night-cot-recovery',
                modelType: 'carry_field_cot_folded',
                worldPosition: { x: 15, z: 22 }
            }),
            expect.objectContaining({ definitionId: 'hull_patch_panel', modelType: 'crash_hull_panels' }),
            expect.objectContaining({ definitionId: 'door_seal_kit', modelType: 'mod_pressure_seal' })
        ]));
        const seal = evaluateRoomSealGraph({ modules: result.state.installed, defaultSafeBubble: null });
        expect(seal).toMatchObject({ isEnclosed: false, isOxygenated: false, isSleepSafe: false });
        expect(seal.leaks.map(({ side }) => side).sort()).toEqual(['east', 'west']);
    });

    it('becomes sleep-safe only after all three recovered pieces reach compatible sockets', () => {
        let { state, plan } = ensureFirstNightBaseState(createCarryState('run-a'), { shipX: 10, shipZ: 20 });
        state = installDefinition(state, plan, 'cot_bed');
        expect(installedCot(state)?.socketId).toBe('ship-sleep-bay');
        expect(evaluateRoomSealGraph({ modules: state.installed, defaultSafeBubble: null }).isSleepSafe).toBe(false);
        state = installDefinition(state, plan, 'hull_patch_panel');
        expect(evaluateRoomSealGraph({ modules: state.installed, defaultSafeBubble: null }).isSleepSafe).toBe(false);
        state = installDefinition(state, plan, 'door_seal_kit');
        expect(evaluateRoomSealGraph({ modules: state.installed, defaultSafeBubble: null }).isSleepSafe).toBe(true);
    });

    it('does not duplicate recovery cargo or shell modules across bootstrap calls', () => {
        const first = ensureFirstNightBaseState(createCarryState('run-a'), { shipX: 0, shipZ: 0 });
        const second = ensureFirstNightBaseState(first.state, { shipX: 0, shipZ: 0 });
        expect(second.addedCargo).toEqual([]);
        expect(second.state.worldObjects).toHaveLength(3);
        expect(second.state.installed).toHaveLength(planFirstNightBase().shell.length);
    });

    it('migrates legacy giveaway wall and door records back into physical recovery cargo', () => {
        const legacy = createCarryState('run-a');
        legacy.installed = [
            { instanceId: 'starter-berth-wall-w', definitionId: 'straight_wall_1x1' },
            { instanceId: 'starter-berth-door-e', definitionId: 'sealable_door_1x1' }
        ];
        const result = ensureFirstNightBaseState(legacy);
        expect(result.state.installed.some(({ instanceId }) => instanceId === 'starter-berth-wall-w')).toBe(false);
        expect(result.state.worldObjects.map(({ definitionId }) => definitionId)).toEqual([
            'cot_bed', 'hull_patch_panel', 'door_seal_kit'
        ]);
    });

    it('stages the unclaimed cot at a camp rack and releases it through one authored handoff', () => {
        const initial = ensureFirstNightBaseState(createCarryState('run-a'), { shipX: 0, shipZ: 0 });
        const camp = { id: 'camp_meridian', pos: { x: 40, z: 12 } };
        const staged = stageFirstNightCotAtCamp(initial.state, camp);
        expect(staged.staged).toMatchObject({
            definitionId: 'cot_bed',
            worldPosition: { x: 37.8, z: 14.6 },
            sourcePosition: { x: 37.8, z: 14.6 },
            handoff: { type: 'camp-cot', campId: 'camp_meridian', status: 'reserved' }
        });
        expect(getFirstNightCotHandoff(staged.state, camp.id)?.instanceId).toBe(staged.staged.instanceId);

        const released = releaseFirstNightCotHandoff(staged.state, camp.id);
        expect(released.ok).toBe(true);
        expect(released.object.handoff.status).toBe('released');
        expect(getFirstNightCotHandoff(released.state, camp.id)).toBeNull();
        expect(releaseFirstNightCotHandoff(released.state, camp.id)).toMatchObject({ ok: false, reason: 'missing-handoff' });
    });

    it('never relocates a cot after the camp has released it', () => {
        const initial = ensureFirstNightBaseState(createCarryState('run-a'));
        const firstCamp = { id: 'camp_meridian', pos: { x: 20, z: 20 } };
        const first = stageFirstNightCotAtCamp(initial.state, firstCamp);
        const released = releaseFirstNightCotHandoff(first.state, firstCamp.id);
        const second = stageFirstNightCotAtCamp(released.state, { id: 'camp_tallow', pos: { x: 80, z: 80 } });
        expect(second.staged).toBeNull();
        expect(second.state).toBe(released.state);
    });
});
