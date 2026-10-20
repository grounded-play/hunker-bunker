import { describe, expect, it } from 'vitest';
import { beginCarry, createCarryState, installCarriedObject, resetCarryRunState } from './carrySystem.js';
import {
    availableCampO2Socket,
    availableShipRebuildSocket,
    ensureQaShipRebuildModules,
    ensureCampO2State,
    ensureShipRebuildState,
    isCampO2CoreInstalled,
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
    it('stages camp O2 separately from reachable escape-craft parts', () => {
        const camp = ensureCampO2State(createCarryState('run-a'), {
            socketPosition: { x: 12.5, z: 9.5, yaw: Math.PI },
            sourcePosition: SOURCES.o2Bubble
        });
        expect(camp.addedCargo.map(({ definitionId }) => definitionId)).toEqual(['camp_o2_generator_core']);
        expect(camp.addedCargo[0].worldPosition).toEqual(SOURCES.o2Bubble);

        const later = ensureShipRebuildState(camp.state, {
            siteX: 28, siteZ: -23, sourcePositions: SOURCES,
            builtGoalKeys: ['o2Bubble', 'hullExpansion']
        });
        expect(later.addedCargo.map(({ definitionId }) => definitionId)).toEqual([
            'ship_navigation_core', 'ship_comms_array'
        ]);
        expect(later.state.worldObjects).toHaveLength(3);
    });

    it('installs camp O2 only at camp and flight parts only at the escape yard', () => {
        let { state, plan } = ensureCampO2State(createCarryState('run-a'), {
            socketPosition: { x: 12.5, z: 9.5, yaw: Math.PI },
            sourcePosition: SOURCES.o2Bubble
        });
        const campCore = state.worldObjects.find(({ definitionId }) => definitionId === 'camp_o2_generator_core');
        state = beginCarry(state, campCore.instanceId, 'local').state;
        const socket = availableCampO2Socket(state, plan, state.carried);
        expect(socket.id).toBe('camp-o2-generator');
        state = installCarriedObject(state, socket, { carrierPlayerId: 'local' }).state;
        expect(state.installed[0]).toMatchObject({ definitionId: 'camp_o2_generator_core', socketId: 'camp-o2-generator' });
        expect(isCampO2CoreInstalled(state)).toBe(true);

        const craft = ensureShipRebuildState(state, {
            siteX: 28, siteZ: -23, sourcePositions: SOURCES, builtGoalKeys: ['o2Bubble']
        });
        state = craft.state;
        const navigation = state.worldObjects.find(({ definitionId }) => definitionId === 'ship_navigation_core');
        state = beginCarry(state, navigation.instanceId, 'local').state;
        const navSocket = availableShipRebuildSocket(state, craft.plan, state.carried);
        expect(navSocket).toMatchObject({ id: 'escape-craft-navigation', siteKind: 'escape-craft' });
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
            installed: 3, total: 3, complete: true, missingDefinitionIds: []
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
            'ship_navigation_core@escape-craft-navigation',
            'ship_comms_array@escape-craft-comms',
            'ship_engine_manifold@escape-craft-engine'
        ]);
    });

    it('migrates a legacy wreck-mounted life-support record to the camp socket', () => {
        const state = createCarryState('legacy');
        state.installed.push({
            instanceId: 'legacy-life', definitionId: 'ship_life_support_core',
            socketId: 'ship-bay-life', transform: { x: 5, z: 5, yaw: 0 }
        });
        const migrated = ensureCampO2State(state, {
            socketPosition: { x: 12.5, z: 9.5, yaw: Math.PI },
            sourcePosition: SOURCES.o2Bubble
        }).state.installed[0];
        expect(migrated).toMatchObject({
            instanceId: 'legacy-life', definitionId: 'camp_o2_generator_core',
            socketId: 'camp-o2-generator', x: 12.5, z: 9.5
        });
        expect(isCampO2CoreInstalled({ installed: [migrated] })).toBe(true);
    });
});
