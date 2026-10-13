import { getBaseModuleDefinition } from './data/baseModules.js';

const copyPosition = (position) => ({
    x: Number(position?.x) || 0,
    z: Number(position?.z) || 0
});

export function createCarryState(runId = null) {
    return { runId, carried: null, worldObjects: [], installed: [] };
}

export function createCarryObject({
    instanceId,
    definitionId,
    missionId = null,
    massClass = 'medium',
    worldPosition,
    carrySocket = 'both-hands',
    buildTags = [],
    condition = 1,
    modelType = null,
    runId = null
} = {}) {
    if (!instanceId || !definitionId) return null;
    const moduleDef = getBaseModuleDefinition(definitionId);
    const sourcePosition = copyPosition(worldPosition);
    return {
        instanceId: String(instanceId),
        definitionId,
        missionId,
        massClass,
        worldPosition: sourcePosition,
        sourcePosition: { ...sourcePosition },
        lastSafePosition: { ...sourcePosition },
        failedRecoveryChecks: 0,
        carrySocket,
        modelType: modelType ?? moduleDef?.carryModelType ?? moduleDef?.modelType ?? null,
        buildTags: [...new Set(buildTags)].sort(),
        condition: Math.min(1, Math.max(0, Number(condition) || 0)),
        carrierPlayerId: null,
        runId
    };
}

export function addCarryObject(state, object) {
    if (!state || !object || (object.runId != null && object.runId !== state.runId)) {
        return { ok: false, reason: 'wrong-run', state };
    }
    if (state.worldObjects.some((entry) => entry.instanceId === object.instanceId)
        || state.installed.some((entry) => entry.instanceId === object.instanceId)
        || state.carried?.instanceId === object.instanceId) {
        return { ok: false, reason: 'duplicate-instance', state };
    }
    return { ok: true, state: { ...state, worldObjects: [...state.worldObjects, { ...object }] } };
}

export function beginCarry(state, instanceId, carrierPlayerId) {
    if (!state || state.carried) return { ok: false, reason: 'hands-full', state };
    const index = state.worldObjects.findIndex((object) => object.instanceId === instanceId);
    if (index < 0) return { ok: false, reason: 'missing-object', state };
    const selected = state.worldObjects[index];
    if (selected.runId != null && selected.runId !== state.runId) {
        return { ok: false, reason: 'wrong-run', state };
    }
    const carried = { ...selected, carrierPlayerId: carrierPlayerId ?? null };
    delete carried.worldPosition;
    return {
        ok: true,
        carried,
        state: {
            ...state,
            carried,
            worldObjects: state.worldObjects.filter((_, objectIndex) => objectIndex !== index)
        }
    };
}

export function dropCarriedObject(state, worldPosition, { carrierPlayerId = null } = {}) {
    if (!state?.carried) return { ok: false, reason: 'empty-hands', state };
    if (carrierPlayerId != null && state.carried.carrierPlayerId !== carrierPlayerId) {
        return { ok: false, reason: 'not-owner', state };
    }
    const position = copyPosition(worldPosition);
    const dropped = {
        ...state.carried,
        carrierPlayerId: null,
        worldPosition: position,
        lastSafePosition: { ...position },
        failedRecoveryChecks: 0
    };
    return {
        ok: true,
        dropped,
        state: { ...state, carried: null, worldObjects: [...state.worldObjects, dropped] }
    };
}

/**
 * Audits loose mission cargo without consulting rendering state. An invalid
 * location must fail repeatedly before recovery, avoiding one-frame terrain
 * streaming gaps; relocation preserves identity and returns it to the latest
 * known-safe point, falling back to its authored staging source.
 */
export function recoverStrandedCarryObjects(state, {
    isNavigable = () => true,
    requiredFailedChecks = 3
} = {}) {
    if (!state) return { state, recovered: [] };
    const recovered = [];
    const threshold = Math.max(1, Math.round(Number(requiredFailedChecks) || 3));
    const worldObjects = state.worldObjects.map((object) => {
        if (!object.missionId) return object;
        const position = object.worldPosition;
        if (isNavigable(position, object)) {
            if (!object.failedRecoveryChecks) return object;
            return { ...object, failedRecoveryChecks: 0 };
        }
        const failures = (Number(object.failedRecoveryChecks) || 0) + 1;
        if (failures < threshold) return { ...object, failedRecoveryChecks: failures };
        const lastSafe = isNavigable(object.lastSafePosition, object)
            ? object.lastSafePosition
            : object.sourcePosition;
        const relocation = copyPosition(lastSafe);
        const next = {
            ...object,
            worldPosition: relocation,
            lastSafePosition: { ...relocation },
            failedRecoveryChecks: 0,
            recoveryCount: (Number(object.recoveryCount) || 0) + 1
        };
        recovered.push(next);
        return next;
    });
    return { state: { ...state, worldObjects }, recovered };
}

export function installCarriedObject(state, socket, { carrierPlayerId = null } = {}) {
    if (!state?.carried) return { ok: false, reason: 'empty-hands', state };
    if (carrierPlayerId != null && state.carried.carrierPlayerId !== carrierPlayerId) {
        return { ok: false, reason: 'not-owner', state };
    }
    const accepted = new Set(socket?.acceptsTags ?? []);
    if (accepted.size && !state.carried.buildTags.some((tag) => accepted.has(tag))) {
        return { ok: false, reason: 'incompatible-socket', state };
    }
    if (!socket?.id) return { ok: false, reason: 'invalid-socket', state };
    const installed = {
        ...state.carried,
        carrierPlayerId: null,
        socketId: socket.id,
        transform: socket.transform ?? null,
        ...(socket.side ? { side: socket.side } : {}),
        ...(state.carried.buildTags?.includes('door') ? { isOpen: false } : {}),
        ...(Number.isFinite(socket.transform?.x) ? { x: socket.transform.x } : {}),
        ...(Number.isFinite(socket.transform?.z) ? { z: socket.transform.z } : {}),
        ...(Number.isFinite(socket.transform?.yaw) ? { yaw: socket.transform.yaw } : {})
    };
    return {
        ok: true,
        installed,
        state: { ...state, carried: null, installed: [...state.installed, installed] }
    };
}

export function canUseWeaponWhileCarrying(state) {
    return !state?.carried;
}

export function getCarrierTacticalStance(state) {
    return state?.carried ? 'cover-carrier' : 'normal';
}

export function shouldCompanionCoverCarrier(state) {
    return Boolean(state?.carried);
}

export function companionCarrierCoverPosition(playerPosition, facing = { dirX: 0, dirZ: 1 }, index = 0) {
    const length = Math.hypot(Number(facing?.dirX) || 0, Number(facing?.dirZ) || 0) || 1;
    const forwardX = (Number(facing?.dirX) || 0) / length;
    const forwardZ = (Number(facing?.dirZ) || 1) / length;
    const side = index % 2 === 0 ? 1 : -1;
    return {
        x: (Number(playerPosition?.x) || 0) + forwardX * 0.75 + forwardZ * 1.05 * side,
        z: (Number(playerPosition?.z) || 0) + forwardZ * 0.75 - forwardX * 1.05 * side
    };
}

export function resetCarryRunState(nextRunId = null, installed = []) {
    return { runId: nextRunId, carried: null, worldObjects: [], installed: [...installed] };
}
