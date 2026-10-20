import { describe, expect, it } from 'vitest';
import { createCarryState } from './carrySystem.js';
import {
    ensureFirstNightBaseState,
    installedCot,
    planFirstNightBase
} from './firstNightBase.js';

describe('starting camp bed', () => {
    it('places the installed bed wholly inside the first camp O2 ring', () => {
        const plan = planFirstNightBase({ shipX: 9, shipZ: 9 });
        const bed = plan.installSocket.transform;
        const generator = { x: 12.5, z: 9.5 };

        expect(bed).toMatchObject({ x: 14.5, z: 11.5 });
        expect(Math.hypot(bed.x - generator.x, bed.z - generator.z)).toBeLessThan(3);
        // Cot footprint is 1x2; this margin keeps its corners inside radius 4.5.
        expect(Math.hypot(bed.x - generator.x, bed.z - generator.z) + Math.hypot(0.5, 1))
            .toBeLessThan(4.5);
    });

    it('starts with the bed staged as recovery cargo and no obsolete berth-seal cargo', () => {
        const result = ensureFirstNightBaseState(createCarryState('run-a'), { shipX: 9, shipZ: 9 });

        expect(result.addedCot).toBe(true);
        expect(result.addedCargo).toHaveLength(1);
        expect(result.addedCargo[0]).toMatchObject({
            definitionId: 'cot_bed',
            missionId: 'first-night-cot-recovery'
        });
        expect(result.state.worldObjects).toHaveLength(1);
        expect(result.state.worldObjects[0]).toMatchObject({
            definitionId: 'cot_bed',
            worldPosition: { x: 4, z: 19 }
        });
        expect(installedCot(result.state)).toBeNull();
        expect(result.state.installed.some(({ definitionId }) => (
            definitionId === 'hull_patch_panel' || definitionId === 'door_seal_kit'
        ))).toBe(false);
    });

    it('does not duplicate the bed or shell across bootstrap calls', () => {
        const first = ensureFirstNightBaseState(createCarryState('run-a'), { shipX: 9, shipZ: 9 });
        const second = ensureFirstNightBaseState(first.state, { shipX: 9, shipZ: 9 });

        expect(second.addedCot).toBe(false);
        expect(second.state.worldObjects.filter(({ definitionId }) => definitionId === 'cot_bed')).toHaveLength(1);
        expect(second.state.installed.filter(({ definitionId }) => definitionId === 'cot_bed')).toHaveLength(0);
        expect(second.state.installed).toHaveLength(planFirstNightBase().shell.length);
    });

    it('preserves loose, carried, and previously installed beds', () => {
        const states = [
            { ...createCarryState('loose'), worldObjects: [{ instanceId: 'loose-cot', definitionId: 'cot_bed', worldPosition: { x: 130, z: 40 } }] },
            { ...createCarryState('carried'), carried: { instanceId: 'carried-cot', definitionId: 'cot_bed' } },
            { ...createCarryState('installed'), installed: [{ instanceId: 'old-cot', definitionId: 'cot_bed', socketId: 'ship-sleep-bay', x: 14.5, z: 11.5 }] }
        ];

        const migratedLoose = ensureFirstNightBaseState(states[0], { shipX: 9, shipZ: 9 }).state;
        expect(migratedLoose.worldObjects.some(({ definitionId }) => definitionId === 'cot_bed')).toBe(true);

        const migratedCarried = ensureFirstNightBaseState(states[1], { shipX: 9, shipZ: 9 }).state;
        expect(migratedCarried.carried?.definitionId).toBe('cot_bed');

        const migratedInstalled = ensureFirstNightBaseState(states[2], { shipX: 9, shipZ: 9 }).state;
        expect(installedCot(migratedInstalled)).toMatchObject({ x: 14.5, z: 11.5 });
    });

    it('removes obsolete first-night seal cargo and giveaway socket records', () => {
        const legacy = createCarryState('legacy');
        legacy.installed = [
            { instanceId: 'starter-berth-wall-w', definitionId: 'straight_wall_1x1' },
            { instanceId: 'legacy-patch', definitionId: 'hull_patch_panel', missionId: 'first-night-berth-seal' }
        ];
        legacy.worldObjects = [
            { instanceId: 'legacy-door', definitionId: 'door_seal_kit', missionId: 'first-night-berth-seal' }
        ];

        const result = ensureFirstNightBaseState(legacy, { shipX: 9, shipZ: 9 });
        expect(result.state.installed.some(({ missionId }) => missionId === 'first-night-berth-seal')).toBe(false);
        expect(result.state.worldObjects.some(({ missionId }) => missionId === 'first-night-berth-seal')).toBe(false);
        expect(result.state.worldObjects.map(({ definitionId }) => definitionId)).toEqual(['cot_bed']);
    });

    it('migrates the old berth shell to the camp bed position', () => {
        const plan = planFirstNightBase({ shipX: 9, shipZ: 9 });
        const state = createCarryState('run-a');
        state.installed = plan.shell.map((module) => ({
            ...module,
            x: 4,
            z: 16,
            transform: { x: 4, z: 16, yaw: 0 }
        }));

        const migrated = ensureFirstNightBaseState(state, { shipX: 9, shipZ: 9 }).state;
        expect(migrated.installed.filter(({ instanceId }) => instanceId.startsWith('starter-berth-')))
            .toEqual(expect.arrayContaining(plan.shell.map((module) => expect.objectContaining({
                instanceId: module.instanceId,
                x: 14.5,
                z: 11.5,
                transform: expect.objectContaining({ x: 14.5, z: 11.5 })
            }))));
    });

    it('reverts unplaced or auto-installed cots to recovery cargo so the player must carry it', () => {
        const state = createCarryState('campaign');
        state.installed = [
            { instanceId: 'cot_bed:campaign', definitionId: 'cot_bed', socketId: 'ship-sleep-bay', x: 14.5, z: 11.5 }
        ];

        const result = ensureFirstNightBaseState(state, { shipX: 9, shipZ: 9 });
        expect(result.state.installed.some(({ definitionId }) => definitionId === 'cot_bed')).toBe(false);
        expect(result.state.worldObjects.some(({ definitionId }) => definitionId === 'cot_bed')).toBe(true);
        expect(result.addedCot).toBe(true);
    });
});

