import { addCarryObject, createCarryObject } from './carrySystem.js';
import { getBaseModuleDefinition } from './data/baseModules.js';

export const SHIP_REBUILD_MISSION_PREFIX = 'ship-rebuild';

export const SHIP_REBUILD_STAGES = Object.freeze([
    Object.freeze({
        goalKey: 'o2Bubble',
        prerequisiteGoalKey: null,
        definitionId: 'ship_life_support_core',
        missionId: `${SHIP_REBUILD_MISSION_PREFIX}:life-support`,
        socketId: 'ship-bay-life',
        socketTag: 'life_support',
        socketOffset: Object.freeze({ x: -4.1, z: -0.9, yaw: Math.PI / 2 })
    }),
    Object.freeze({
        goalKey: 'hullExpansion',
        prerequisiteGoalKey: 'o2Bubble',
        definitionId: 'ship_navigation_core',
        missionId: `${SHIP_REBUILD_MISSION_PREFIX}:navigation`,
        socketId: 'ship-bay-core',
        socketTag: 'navigation',
        socketOffset: Object.freeze({ x: -4.1, z: 0.9, yaw: Math.PI / 2 })
    }),
    Object.freeze({
        goalKey: 'radarNode',
        prerequisiteGoalKey: 'hullExpansion',
        definitionId: 'ship_comms_array',
        missionId: `${SHIP_REBUILD_MISSION_PREFIX}:comms`,
        socketId: 'ship-bay-mount',
        socketTag: 'comms',
        socketOffset: Object.freeze({ x: 4.1, z: -0.9, yaw: -Math.PI / 2 })
    }),
    Object.freeze({
        goalKey: 'reactorCompressor',
        prerequisiteGoalKey: 'radarNode',
        definitionId: 'ship_engine_manifold',
        missionId: `${SHIP_REBUILD_MISSION_PREFIX}:engine`,
        socketId: 'ship-bay-engine',
        socketTag: 'engine',
        socketOffset: Object.freeze({ x: 4.1, z: 0.9, yaw: -Math.PI / 2 })
    })
]);

const asGoalSet = (builtGoalKeys) => builtGoalKeys instanceof Set
    ? builtGoalKeys
    : new Set(builtGoalKeys ?? []);

export function planShipRebuild({ shipX = 0, shipZ = 0, sourcePositions = {} } = {}) {
    const installSockets = SHIP_REBUILD_STAGES.map((stage) => Object.freeze({
        id: stage.socketId,
        acceptsTags: Object.freeze([stage.socketTag]),
        transform: Object.freeze({
            x: Number(shipX) + stage.socketOffset.x,
            z: Number(shipZ) + stage.socketOffset.z,
            yaw: stage.socketOffset.yaw
        }),
        goalKey: stage.goalKey,
        definitionId: stage.definitionId
    }));
    const recoveryCargo = SHIP_REBUILD_STAGES.flatMap((stage) => {
        const position = sourcePositions[stage.goalKey];
        if (!Number.isFinite(position?.x) || !Number.isFinite(position?.z)) return [];
        return [{
            ...stage,
            worldPosition: { x: position.x, z: position.z }
        }];
    });
    return { installSockets, recoveryCargo };
}

export function availableShipRebuildSocket(state, plan, object) {
    if (!object) return null;
    const occupied = new Set((state?.installed ?? []).map(({ socketId }) => socketId));
    return (plan?.installSockets ?? []).find((socket) => (
        !occupied.has(socket.id)
        && socket.definitionId === object.definitionId
        && object.buildTags?.includes(socket.acceptsTags[0])
    )) ?? null;
}

export function ensureShipRebuildState(state, options = {}) {
    const plan = planShipRebuild(options);
    if (!state) return { state, plan, addedCargo: [] };
    const builtGoals = asGoalSet(options.builtGoalKeys);
    let next = state;
    const addedCargo = [];
    for (const recovery of plan.recoveryCargo) {
        if (recovery.prerequisiteGoalKey && !builtGoals.has(recovery.prerequisiteGoalKey)) continue;
        const alreadyExists = next.installed.some(({ definitionId }) => definitionId === recovery.definitionId)
            || next.carried?.definitionId === recovery.definitionId
            || next.worldObjects.some(({ definitionId }) => definitionId === recovery.definitionId);
        if (alreadyExists) continue;
        const definition = getBaseModuleDefinition(recovery.definitionId);
        if (!definition) continue;
        const object = createCarryObject({
            instanceId: `${recovery.definitionId}:${next.runId ?? 'campaign'}`,
            definitionId: recovery.definitionId,
            missionId: recovery.missionId,
            massClass: definition.massClass ?? 'heavy',
            worldPosition: recovery.worldPosition,
            carrySocket: 'both-hands',
            buildTags: definition.buildTags ?? [],
            runId: next.runId
        });
        const result = addCarryObject(next, object);
        if (!result.ok) continue;
        next = result.state;
        addedCargo.push(object);
    }
    return { state: next, plan, addedCargo };
}

export function shipRebuildProgress(state) {
    const installedDefinitions = new Set((state?.installed ?? []).map(({ definitionId }) => definitionId));
    const installed = SHIP_REBUILD_STAGES.filter(({ definitionId }) => installedDefinitions.has(definitionId));
    return {
        installed: installed.length,
        total: SHIP_REBUILD_STAGES.length,
        complete: installed.length === SHIP_REBUILD_STAGES.length,
        missingDefinitionIds: SHIP_REBUILD_STAGES
            .filter(({ definitionId }) => !installedDefinitions.has(definitionId))
            .map(({ definitionId }) => definitionId)
    };
}
