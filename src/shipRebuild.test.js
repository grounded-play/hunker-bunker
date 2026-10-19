import { describe, expect, it } from 'vitest';
import { beginCarry, createCarryState, installCarriedObject, resetCarryRunState } from './carrySystem.js';
import {
    availableShipRebuildSocket,
    ensureQaShipRebuildModules,
    ensureShipRebuildState,
    isShipModuleInstalledForGoal,
    planShipRebuild,
    shipRebuildProgress
} from './shipRebuild.js';

const SOURCES = {
    o2Bubble: { x: 10, z: 20 },
    hullExpansion: { x: 30, z: 40 },
    radarNode: { x: 50, z: 60 },
    reactorCompressor: { x: 70, z: 80 }
};

describe('physical ship rebuild', () => {
    it('stages only the currently reachable ship parts at authored objective sites', () => {
        const first = ensureShipRebuildState(createCarryState('run-a'), {
            shipX: 2, shipZ: 3, sourcePositions: SOURCES, builtGoalKeys: []
        });
        expect(first.addedCargo.map(({ definitionId }) => definitionId)).toEqual(['ship_life_support_core']);
        expect(first.addedCargo[0].worldPosition).toEqual(SOURCES.o2Bubble);

        const later = ensureShipRebuildState(first.state, {
            shipX: 2, shipZ: 3, sourcePositions: SOURCES,
            builtGoalKeys: ['o2Bubble', 'hullExpansion']
        });
        expect(later.addedCargo.map(({ definitionId }) => definitionId)).toEqual([
            'ship_navigation_core', 'ship_comms_array'
        ]);
        expect(later.state.worldObjects).toHaveLength(3);
    });

    it('installs each part only in its dedicated ship socket and persists across run reset', () => {
        let { state, plan } = ensureShipRebuildState(createCarryState('run-a'), {
            sourcePositions: SOURCES,
            builtGoalKeys: ['o2Bubble', 'hullExpansion', 'radarNode']
        });
        const life = state.worldObjects.find(({ definitionId }) => definitionId === 'ship_life_support_core');
        state = beginCarry(state, life.instanceId, 'local').state;
        const socket = availableShipRebuildSocket(state, plan, state.carried);
        expect(socket.id).toBe('ship-bay-life');
        state = installCarriedObject(state, socket, { carrierPlayerId: 'local' }).state;
        expect(state.installed[0]).toMatchObject({ definitionId: 'ship_life_support_core', socketId: 'ship-bay-life' });
        expect(isShipModuleInstalledForGoal(state, 'o2Bubble')).toBe(true);
        expect(isShipModuleInstalledForGoal(state, 'hullExpansion')).toBe(false);
        expect(resetCarryRunState('run-b', state.installed).installed).toEqual(state.installed);
    });

    it('reports deterministic rebuild completion', () => {
        const installed = planShipRebuild().installSockets.map((socket, index) => ({
            instanceId: `part-${index}`,
            definitionId: socket.definitionId,
            socketId: socket.id
        }));
        expect(shipRebuildProgress({ installed })).toEqual({
            installed: 4, total: 4, complete: true, missingDefinitionIds: []
        });
    });

    it('adds idempotent QA modules without replacing valid installed records', () => {
        const carryState = createCarryState('run-qa');
        const existing = {
            instanceId: 'real-life-support',
            definitionId: 'ship_life_support_core',
            socketId: 'ship-bay-life',
            isDestroyed: false,
            damageState: 'intact'
        };
        carryState.installed.push(existing);
        const installedArray = carryState.installed;

        const first = ensureQaShipRebuildModules(carryState);
        const second = ensureQaShipRebuildModules(carryState);

        expect(carryState.installed).toBe(installedArray);
        expect(carryState.installed).toHaveLength(4);
        expect(carryState.installed[0]).toBe(existing);
        expect(first.addedModules).toHaveLength(3);
        expect(second.addedModules).toEqual([]);
        expect(second.installedModules.map(({ definitionId, socketId }) => `${definitionId}@${socketId}`)).toEqual([
            'ship_life_support_core@ship-bay-life',
            'ship_navigation_core@ship-bay-core',
            'ship_comms_array@ship-bay-mount',
            'ship_engine_manifold@ship-bay-engine'
        ]);
    });
});
