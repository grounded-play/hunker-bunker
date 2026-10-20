import { addCarryObject, createCarryObject } from './carrySystem.js';
import { getBaseModuleDefinition } from './data/baseModules.js';

export const SHIP_REBUILD_MISSION_PREFIX = 'ship-rebuild';

export const CAMP_O2_STAGE = Object.freeze({
    goalKey: 'o2Bubble',
    prerequisiteGoalKey: null,
    definitionId: 'camp_o2_generator_core',
    legacyDefinitionIds: Object.freeze(['ship_life_support_core', 'o2_regulator']),
    missionId: 'camp-o2:generator-core',
    socketId: 'camp-o2-generator',
    socketTag: 'camp_utility'
});

// Compatibility name retained while callers migrate. This collection is now
// strictly the three flight systems installed on the separate escape craft.
export const SHIP_REBUILD_STAGES = Object.freeze([
    Object.freeze({
        goalKey: 'hullExpansion',
        prerequisiteGoalKey: 'o2Bubble',
        definitionId: 'ship_navigation_core',
        missionId: `${SHIP_REBUILD_MISSION_PREFIX}:navigation`,
        socketId: 'escape-craft-navigation',
        socketTag: 'navigation',
        socketOffset: Object.freeze({ x: -4, z: 1, yaw: Math.PI / 2 })
    }),
    Object.freeze({
        goalKey: 'radarNode',
        prerequisiteGoalKey: 'hullExpansion',
        definitionId: 'ship_comms_array',
        missionId: `${SHIP_REBUILD_MISSION_PREFIX}:comms`,
        socketId: 'escape-craft-comms',
        socketTag: 'comms',
        socketOffset: Object.freeze({ x: 0, z: -4, yaw: 0 })
    }),
    Object.freeze({
        goalKey: 'reactorCompressor',
        prerequisiteGoalKey: 'radarNode',
        definitionId: 'ship_engine_manifold',
        missionId: `${SHIP_REBUILD_MISSION_PREFIX}:engine`,
        socketId: 'escape-craft-engine',
        socketTag: 'engine',
        socketOffset: Object.freeze({ x: 4, z: 1, yaw: -Math.PI / 2 })
    })
]);

export const ESCAPE_CRAFT_STAGES = SHIP_REBUILD_STAGES;

export function planCampO2({ socketPosition = {}, sourcePosition = {} } = {}) {
    const installSocket = Object.freeze({
        id: CAMP_O2_STAGE.socketId,
        acceptsTags: Object.freeze([CAMP_O2_STAGE.socketTag]),
        transform: Object.freeze({
            x: Number(socketPosition.x) || 0,
            z: Number(socketPosition.z) || 0,
            yaw: Number(socketPosition.yaw) || 0
        }),
        goalKey: CAMP_O2_STAGE.goalKey,
        definitionId: CAMP_O2_STAGE.definitionId,
        siteKind: 'camp-o2'
    });
    const recoveryCargo = Number.isFinite(sourcePosition.x) && Number.isFinite(sourcePosition.z)
        ? [{ ...CAMP_O2_STAGE, worldPosition: { x: sourcePosition.x, z: sourcePosition.z } }]
        : [];
    return { installSocket, installSockets: [installSocket], recoveryCargo };
}

export function availableCampO2Socket(state, plan, object) {
    if (!object || isCampO2CoreInstalled(state)) return null;
    const acceptedDefinition = object.definitionId === CAMP_O2_STAGE.definitionId
        || CAMP_O2_STAGE.legacyDefinitionIds.includes(object.definitionId);
    if (!acceptedDefinition) return null;
    return plan?.installSocket ?? null;
}

export function isCampO2CoreInstalled(state) {
    return Boolean(state?.installed?.some(({ definitionId, socketId }) => (
        socketId === CAMP_O2_STAGE.socketId
        && (definitionId === CAMP_O2_STAGE.definitionId
            || CAMP_O2_STAGE.legacyDefinitionIds.includes(definitionId))
    )));
}

/** Install valid QA copies of the camp core and all three escape-craft modules. */
export function ensureQaShipRebuildModules(carryState) {
    const installed = carryState?.installed;
    if (!Array.isArray(installed)) return { installedModules: [], addedModules: [] };

    const addedModules = [];
    const allStages = [CAMP_O2_STAGE, ...SHIP_REBUILD_STAGES];
    for (const stage of allStages) {
        let record = installed.find((entry) => (
            entry?.definitionId === stage.definitionId
            || stage.legacyDefinitionIds?.includes(entry?.definitionId)
        ));
        if (!record) {
            record = {
                instanceId: `qa:${stage.definitionId}`,
                definitionId: stage.definitionId,
                socketId: stage.socketId,
                isDestroyed: false,
                damageState: 'intact'
            };
            installed.push(record);
            addedModules.push(record);
        }
    }

    const installedModules = allStages.flatMap((stage) => {
        const record = installed.find((entry) => (
            entry?.definitionId === stage.definitionId
            || stage.legacyDefinitionIds?.includes(entry?.definitionId)
        ));
        return record ? [{
            definitionId: record.definitionId,
            socketId: record.socketId,
            instanceId: record.instanceId
        }] : [];
    });
    return { installedModules, addedModules };
}

const asGoalSet = (builtGoalKeys) => builtGoalKeys instanceof Set
    ? builtGoalKeys
    : new Set(builtGoalKeys ?? []);

export function planShipRebuild({ siteX, siteZ, shipX = 0, shipZ = 0, sourcePositions = {} } = {}) {
    const centerX = Number.isFinite(siteX) ? siteX : shipX;
    const centerZ = Number.isFinite(siteZ) ? siteZ : shipZ;
    const installSockets = SHIP_REBUILD_STAGES.map((stage) => Object.freeze({
        id: stage.socketId,
        acceptsTags: Object.freeze([stage.socketTag]),
        transform: Object.freeze({
            x: Number(centerX) + stage.socketOffset.x,
            z: Number(centerZ) + stage.socketOffset.z,
            yaw: stage.socketOffset.yaw
        }),
        goalKey: stage.goalKey,
        definitionId: stage.definitionId,
        siteKind: 'escape-craft'
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

export function ensureCampO2State(state, options = {}) {
    const plan = planCampO2(options);
    if (!state) return { state, plan, addedCargo: [] };

    const legacyIds = new Set(CAMP_O2_STAGE.legacyDefinitionIds);
    const normalizeObject = (object) => legacyIds.has(object?.definitionId)
        ? {
            ...object,
            definitionId: CAMP_O2_STAGE.definitionId,
            missionId: CAMP_O2_STAGE.missionId,
            buildTags: [...(getBaseModuleDefinition(CAMP_O2_STAGE.definitionId)?.buildTags ?? [])],
            modelType: getBaseModuleDefinition(CAMP_O2_STAGE.definitionId)?.carryModelType ?? object.modelType
        }
        : object;
    let next = {
        ...state,
        worldObjects: (state.worldObjects ?? []).map(normalizeObject),
        carried: state.carried ? normalizeObject(state.carried) : null,
        installed: (state.installed ?? []).map((record) => {
            const normalized = normalizeObject(record);
            if (normalized.definitionId !== CAMP_O2_STAGE.definitionId) return normalized;
            const socket = plan.installSocket;
            return {
                ...normalized,
                socketId: socket.id,
                transform: socket.transform,
                x: socket.transform.x,
                z: socket.transform.z,
                yaw: socket.transform.yaw
            };
        })
    };
    const alreadyExists = next.installed.some(({ definitionId }) => definitionId === CAMP_O2_STAGE.definitionId)
        || next.carried?.definitionId === CAMP_O2_STAGE.definitionId
        || next.worldObjects.some(({ definitionId }) => definitionId === CAMP_O2_STAGE.definitionId);
    if (alreadyExists || !plan.recoveryCargo.length) return { state: next, plan, addedCargo: [] };

    const definition = getBaseModuleDefinition(CAMP_O2_STAGE.definitionId);
    const recovery = plan.recoveryCargo[0];
    const object = createCarryObject({
        instanceId: `${CAMP_O2_STAGE.definitionId}:${next.runId ?? 'campaign'}`,
        definitionId: CAMP_O2_STAGE.definitionId,
        missionId: CAMP_O2_STAGE.missionId,
        massClass: definition?.massClass ?? 'heavy',
        worldPosition: recovery.worldPosition,
        carrySocket: 'both-hands',
        buildTags: definition?.buildTags ?? [],
        runId: next.runId
    });
    const result = addCarryObject(next, object);
    if (!result.ok) return { state: next, plan, addedCargo: [] };
    next = result.state;
    return { state: next, plan, addedCargo: [object] };
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
    const socketByDefinition = new Map(plan.installSockets.map((socket) => [socket.definitionId, socket]));
    let next = {
        ...state,
        installed: (state.installed ?? []).map((record) => {
            const socket = socketByDefinition.get(record.definitionId);
            if (!socket) return record;
            return {
                ...record,
                socketId: socket.id,
                transform: socket.transform,
                x: socket.transform.x,
                z: socket.transform.z,
                yaw: socket.transform.yaw
            };
        })
    };
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

export function getShipRebuildStageForGoal(goalKey) {
    return SHIP_REBUILD_STAGES.find((stage) => stage.goalKey === goalKey) ?? null;
}

export function isShipModuleInstalledForGoal(state, goalKey) {
    const stage = getShipRebuildStageForGoal(goalKey);
    return Boolean(stage && state?.installed?.some(({ definitionId, socketId }) => (
        definitionId === stage.definitionId && socketId === stage.socketId
    )));
}
