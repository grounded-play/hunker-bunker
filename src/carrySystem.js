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
    runId = null
} = {}) {
    if (!instanceId || !definitionId) return null;
    return {
        instanceId: String(instanceId),
        definitionId,
        missionId,
        massClass,
        worldPosition: copyPosition(worldPosition),
        carrySocket,
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
    const dropped = { ...state.carried, carrierPlayerId: null, worldPosition: copyPosition(worldPosition) };
    return {
        ok: true,
        dropped,
        state: { ...state, carried: null, worldObjects: [...state.worldObjects, dropped] }
    };
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
        transform: socket.transform ?? null
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

export function resetCarryRunState(nextRunId = null, installed = []) {
    return { runId: nextRunId, carried: null, worldObjects: [], installed: [...installed] };
}
