import { describe, expect, it } from 'vitest';
import { beginCarry, createCarryState, installCarriedObject } from './carrySystem.js';
import { evaluateRoomSealGraph } from './baseSealGraph.js';
import {
    availableFirstNightSocket,
    ensureFirstNightBaseState,
    installedCot,
    planFirstNightBase
} from './firstNightBase.js';

function installDefinition(state, plan, definitionId) {
    const object = state.worldObjects.find((entry) => entry.definitionId === definitionId);
    let next = beginCarry(state, object.instanceId, 'local').state;
    const socket = availableFirstNightSocket(next, plan, next.carried);
    return installCarriedObject(next, socket, { carrierPlayerId: 'local' }).state;
}

const ids = (objects) => objects.map(({ definitionId }) => definitionId);

describe('first-night base recovery', () => {
    it('puts the berth on the authored bed socket, well clear of the console', () => {
        const plan = planFirstNightBase({ shipX: 9, shipZ: 9 });
        const { x, z } = plan.installSocket.transform;
        expect({ x, z }).toEqual({ x: 3, z: 15 });
        // Console sits at ship + (-1.6, 1.6); the old berth was 0.6 m from it.
        const fromConsole = Math.hypot(x - (9 - 1.6), z - (9 + 1.6));
        expect(fromConsole).toBeGreaterThan(4);
    });

    it('lays out only the cot beside the wreck while the berth is incomplete', () => {
        const result = ensureFirstNightBaseState(createCarryState('run-a'), { shipX: 10, shipZ: 20 });
        expect(ids(result.addedCargo)).toEqual(['cot_bed']);
        expect(result.state.worldObjects).toEqual([
            expect.objectContaining({
                definitionId: 'cot_bed',
                missionId: 'first-night-cot-recovery',
                modelType: 'carry_field_cot_folded',
                worldPosition: { x: 5, z: 30 }
            })
        ]);
        const seal = evaluateRoomSealGraph({ modules: result.state.installed, defaultSafeBubble: null });
        expect(seal).toMatchObject({ isEnclosed: false, isOxygenated: false, isSleepSafe: false });
        expect(seal.leaks.map(({ side }) => side).sort()).toEqual(['east', 'west']);
    });

    it('brings out the hull patch and door seal once the cot is installed', () => {
        let { state, plan } = ensureFirstNightBaseState(createCarryState('run-a'), { shipX: 10, shipZ: 20 });
        state = installDefinition(state, plan, 'cot_bed');
        expect(installedCot(state)?.socketId).toBe('ship-sleep-bay');
        const after = ensureFirstNightBaseState(state, { shipX: 10, shipZ: 20 });
        expect(ids(after.addedCargo)).toEqual(['hull_patch_panel', 'door_seal_kit']);
        expect(after.state.worldObjects).toEqual(expect.arrayContaining([
            expect.objectContaining({ definitionId: 'hull_patch_panel', modelType: 'crash_hull_panels' }),
            expect.objectContaining({ definitionId: 'door_seal_kit', modelType: 'mod_pressure_seal' })
        ]));
    });

    it('becomes sleep-safe only after all three recovered pieces reach compatible sockets', () => {
        let { state, plan } = ensureFirstNightBaseState(createCarryState('run-a'), { shipX: 10, shipZ: 20 });
        state = installDefinition(state, plan, 'cot_bed');
        expect(evaluateRoomSealGraph({ modules: state.installed, defaultSafeBubble: null }).isSleepSafe).toBe(false);
        state = ensureFirstNightBaseState(state, { shipX: 10, shipZ: 20 }).state;
        state = installDefinition(state, plan, 'hull_patch_panel');
        expect(evaluateRoomSealGraph({ modules: state.installed, defaultSafeBubble: null }).isSleepSafe).toBe(false);
        state = installDefinition(state, plan, 'door_seal_kit');
        expect(evaluateRoomSealGraph({ modules: state.installed, defaultSafeBubble: null }).isSleepSafe).toBe(true);
    });

    it('does not duplicate recovery cargo or shell modules across bootstrap calls', () => {
        const first = ensureFirstNightBaseState(createCarryState('run-a'), { shipX: 0, shipZ: 0 });
        const second = ensureFirstNightBaseState(first.state, { shipX: 0, shipZ: 0 });
        expect(second.addedCargo).toEqual([]);
        expect(second.state.worldObjects).toHaveLength(1);
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
        expect(ids(result.state.worldObjects)).toEqual(['cot_bed']);
    });

    it('hides untouched seal cargo from saves made before the cot gate', () => {
        const { state: withCot, plan } = ensureFirstNightBaseState(createCarryState('run-a'), { shipX: 10, shipZ: 20 });
        const legacy = {
            ...withCot,
            worldObjects: [
                ...withCot.worldObjects,
                ...plan.recoveryCargo
                    .filter(({ definitionId }) => definitionId !== 'cot_bed')
                    .map((cargo, index) => ({
                        instanceId: `legacy-seal-${index}`,
                        definitionId: cargo.definitionId,
                        missionId: cargo.missionId,
                        modelType: cargo.modelType,
                        worldPosition: { ...cargo.worldPosition },
                        sourcePosition: { ...cargo.worldPosition }
                    }))
            ]
        };
        const result = ensureFirstNightBaseState(legacy, { shipX: 10, shipZ: 20 });
        expect(ids(result.state.worldObjects)).toEqual(['cot_bed']);
    });

    it('stages the cot beside the sleep bay and outside the ship maneuver envelope', () => {
        const plan = planFirstNightBase({ shipX: 9, shipZ: 9 });
        expect(plan.cotSource).toEqual({ x: 4, z: 19 });
        const spawn = { x: 9 - 1.6, z: 9 + 2.8 };
        expect(Math.hypot(plan.cotSource.x - spawn.x, plan.cotSource.z - spawn.z)).toBeLessThan(9);
        expect(
            plan.cotSource.x >= 4 && plan.cotSource.x <= 14
            && plan.cotSource.z >= 4 && plan.cotSource.z <= 14
        ).toBe(false);
        const { x, z } = plan.installSocket.transform;
        expect(Math.hypot(plan.cotSource.x - x, plan.cotSource.z - z)).toBeGreaterThan(2.6);
        expect(Math.hypot(plan.cotSource.x - x, plan.cotSource.z - z)).toBeLessThan(5);
    });

    it('migrates the old berth shell away from the logged collision tile', () => {
        const legacyPlan = planFirstNightBase({ shipX: 9, shipZ: 9 });
        const state = createCarryState('run-a');
        state.installed = legacyPlan.shell.map((module) => ({
            ...module,
            x: 4,
            z: 16,
            transform: { x: 4, z: 16, yaw: 0 }
        }));
        const migrated = ensureFirstNightBaseState(state, { shipX: 9, shipZ: 9 }).state;
        expect(migrated.installed.filter(({ instanceId }) => instanceId.startsWith('starter-berth-')))
            .toEqual(expect.arrayContaining(legacyPlan.shell.map((module) => expect.objectContaining({
                instanceId: module.instanceId,
                x: 3,
                z: 15,
                transform: expect.objectContaining({ x: 3, z: 15 })
            }))));
    });

    it('moves an untouched cot from the old spot under the HUD', () => {
        const { state, plan } = ensureFirstNightBaseState(createCarryState('run-a'), { shipX: 10, shipZ: 20 });
        const old = { x: 15, z: 22 };
        const legacy = { ...state, worldObjects: state.worldObjects.map((o) => ({ ...o, worldPosition: old, sourcePosition: old })) };
        expect(ensureFirstNightBaseState(legacy, { shipX: 10, shipZ: 20 }).state.worldObjects[0].worldPosition).toEqual(plan.cotSource);
        const moved = { ...state, worldObjects: state.worldObjects.map((o) => ({ ...o, worldPosition: { x: 13.4, z: 21.2 } })) };
        expect(ensureFirstNightBaseState(moved, { shipX: 10, shipZ: 20 }).state.worldObjects[0].worldPosition).toEqual({ x: 13.4, z: 21.2 });
    });

    it('moves an untouched cot out of the former ship maneuver envelope', () => {
        const { state, plan } = ensureFirstNightBaseState(createCarryState('run-a'), { shipX: 10, shipZ: 20 });
        const previousSource = { x: 8, z: 20 };
        const legacy = {
            ...state,
            worldObjects: state.worldObjects.map((object) => ({
                ...object,
                worldPosition: previousSource,
                sourcePosition: previousSource
            }))
        };

        const [cot] = ensureFirstNightBaseState(legacy, { shipX: 10, shipZ: 20 }).state.worldObjects;
        expect(cot.worldPosition).toEqual(plan.cotSource);
        expect(cot.sourcePosition).toEqual(plan.cotSource);
    });

    it('returns a cot a camp was holding to its spot beside the wreck', () => {
        const { state, plan } = ensureFirstNightBaseState(createCarryState('run-a'), { shipX: 10, shipZ: 20 });
        const atCamp = {
            ...state,
            worldObjects: state.worldObjects.map((object) => ({
                ...object,
                worldPosition: { x: 130, z: 40 },
                sourcePosition: { x: 130, z: 40 },
                handoff: { type: 'camp-cot', campId: 'camp_meridian', status: 'reserved' }
            }))
        };
        const [cot] = ensureFirstNightBaseState(atCamp, { shipX: 10, shipZ: 20 }).state.worldObjects;
        expect(cot.handoff).toBeUndefined();
        expect(cot.worldPosition).toEqual(plan.cotSource);
        expect(cot.sourcePosition).toEqual(plan.cotSource);
    });
});
