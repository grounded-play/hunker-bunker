import { addCarryObject, createCarryObject } from './carrySystem.js';
import { getBaseModuleDefinition } from './data/baseModules.js';

export const FIRST_NIGHT_COT_MISSION_ID = 'first-night-cot-recovery';
export const FIRST_NIGHT_SEAL_MISSION_ID = 'first-night-berth-seal';
export const FIRST_NIGHT_COT_HANDOFF_OFFSET = Object.freeze({ x: -2.2, z: 2.6 });

const RECOVERY_DEFINITIONS = Object.freeze([
    Object.freeze({
        definitionId: 'cot_bed',
        missionId: FIRST_NIGHT_COT_MISSION_ID,
        socketId: 'ship-sleep-bay',
        sourceOffset: Object.freeze({ x: 5, z: 2 })
    }),
    Object.freeze({
        definitionId: 'hull_patch_panel',
        missionId: FIRST_NIGHT_SEAL_MISSION_ID,
        socketId: 'ship-berth-wall-west',
        sourceOffset: Object.freeze({ x: 7, z: 1 })
    }),
    Object.freeze({
        definitionId: 'door_seal_kit',
        missionId: FIRST_NIGHT_SEAL_MISSION_ID,
        socketId: 'ship-berth-door-east',
        sourceOffset: Object.freeze({ x: 7, z: 3 })
    })
]);

const LEGACY_GIVEAWAY_MODULE_IDS = new Set(['starter-berth-wall-w', 'starter-berth-door-e']);

/**
 * Plans the minimum viable ship-side berth. The crashed hull supplies the
 * floor, roof, two sound walls, and regulator. The cot, hull patch, and door
 * seal are physical recovery lessons whose sockets complete the first room.
 */
export function planFirstNightBase({ shipX = 0, shipZ = 0 } = {}) {
    const x = Math.round(shipX - 2);
    const z = Math.round(shipZ + 2);
    const installSockets = Object.freeze([
        Object.freeze({
            id: 'ship-sleep-bay',
            acceptsTags: Object.freeze(['bed', 'sleep_anchor']),
            transform: Object.freeze({ x, z, yaw: Math.PI / 2 })
        }),
        Object.freeze({
            id: 'ship-berth-wall-west',
            acceptsTags: Object.freeze(['hull_patch']),
            transform: Object.freeze({ x, z, yaw: Math.PI / 2 }),
            side: 'west'
        }),
        Object.freeze({
            id: 'ship-berth-door-east',
            acceptsTags: Object.freeze(['seal_kit']),
            transform: Object.freeze({ x, z, yaw: Math.PI / 2 }),
            side: 'east'
        })
    ]);
    const shell = [
        { instanceId: 'starter-berth-floor', definitionId: 'floor_plate_1x1', x, z },
        { instanceId: 'starter-berth-ceiling', definitionId: 'ceiling_panel_1x1', x, z },
        { instanceId: 'starter-berth-wall-n', definitionId: 'straight_wall_1x1', x, z, side: 'north' },
        { instanceId: 'starter-berth-wall-s', definitionId: 'straight_wall_1x1', x, z, side: 'south' },
        { instanceId: 'starter-berth-o2', definitionId: 'o2_regulator', x, z }
    ].map((module) => ({ ...module, socketId: 'crashed-ship-berth', transform: { x, z, yaw: 0 } }));
    const recoveryCargo = RECOVERY_DEFINITIONS.map((recovery) => ({
        ...recovery,
        worldPosition: {
            x: Math.round(shipX + recovery.sourceOffset.x),
            z: Math.round(shipZ + recovery.sourceOffset.z)
        }
    }));
    return {
        installSocket: installSockets[0],
        installSockets,
        shell,
        recoveryCargo,
        cotSource: recoveryCargo[0].worldPosition
    };
}

export function ensureFirstNightBaseState(state, options = {}) {
    if (!state) return { state, plan: planFirstNightBase(options), addedCot: false, addedCargo: [] };
    const plan = planFirstNightBase(options);
    const installedWithoutLegacyGiveaways = state.installed.filter(({ instanceId }) => !LEGACY_GIVEAWAY_MODULE_IDS.has(instanceId));
    const installedIds = new Set(installedWithoutLegacyGiveaways.map(({ instanceId }) => instanceId));
    let next = {
        ...state,
        installed: [
            ...installedWithoutLegacyGiveaways,
            ...plan.shell.filter(({ instanceId }) => !installedIds.has(instanceId))
        ]
    };
    const addedCargo = [];
    for (const recovery of plan.recoveryCargo) {
        const alreadyExists = next.installed.some(({ definitionId }) => definitionId === recovery.definitionId)
            || next.carried?.definitionId === recovery.definitionId
            || next.worldObjects.some(({ definitionId }) => definitionId === recovery.definitionId);
        if (alreadyExists) continue;
        const definition = getBaseModuleDefinition(recovery.definitionId);
        const object = createCarryObject({
            instanceId: `${recovery.definitionId}:${next.runId ?? 'campaign'}`,
            definitionId: recovery.definitionId,
            missionId: recovery.missionId,
            massClass: definition?.massClass ?? 'medium',
            worldPosition: recovery.worldPosition,
            carrySocket: 'both-hands',
            buildTags: definition?.buildTags ?? [],
            runId: next.runId
        });
        const result = addCarryObject(next, object);
        if (!result.ok) continue;
        next = result.state;
        addedCargo.push(object);
    }
    return {
        state: next,
        plan,
        addedCot: addedCargo.some(({ definitionId }) => definitionId === 'cot_bed'),
        addedCargo
    };
}

export function availableFirstNightSocket(state, plan, object) {
    if (!object) return null;
    const occupied = new Set((state?.installed ?? []).map(({ socketId }) => socketId));
    return (plan?.installSockets ?? []).find((socket) => {
        if (occupied.has(socket.id)) return false;
        const accepted = new Set(socket.acceptsTags ?? []);
        return !accepted.size || object.buildTags?.some((tag) => accepted.has(tag));
    }) ?? null;
}

export function installedCot(state) {
    return state?.installed?.find(({ definitionId }) => definitionId === 'cot_bed') ?? null;
}

/**
 * Moves the still-unclaimed tutorial cot from the crash debris to an authored
 * camp supply rack. The camp owns the handoff until its interaction releases
 * the object; installed/carried/released cots are never teleported.
 */
export function stageFirstNightCotAtCamp(state, camp) {
    if (!state || !camp?.id || !Number.isFinite(camp?.pos?.x) || !Number.isFinite(camp?.pos?.z)) {
        return { state, staged: null };
    }
    const index = state.worldObjects.findIndex((object) => (
        object.definitionId === 'cot_bed'
        && object.missionId === FIRST_NIGHT_COT_MISSION_ID
        && object.handoff?.status !== 'released'
    ));
    if (index < 0) return { state, staged: null };

    const position = {
        x: camp.pos.x + FIRST_NIGHT_COT_HANDOFF_OFFSET.x,
        z: camp.pos.z + FIRST_NIGHT_COT_HANDOFF_OFFSET.z
    };
    const current = state.worldObjects[index];
    if (current.handoff?.campId === camp.id
        && current.worldPosition?.x === position.x
        && current.worldPosition?.z === position.z) {
        return { state, staged: null };
    }
    const staged = {
        ...current,
        worldPosition: position,
        sourcePosition: { ...position },
        lastSafePosition: { ...position },
        handoff: { type: 'camp-cot', campId: camp.id, status: 'reserved' }
    };
    const worldObjects = [...state.worldObjects];
    worldObjects[index] = staged;
    return { state: { ...state, worldObjects }, staged };
}

export function getFirstNightCotHandoff(state, campId) {
    return state?.worldObjects?.find((object) => (
        object.definitionId === 'cot_bed'
        && object.missionId === FIRST_NIGHT_COT_MISSION_ID
        && object.handoff?.type === 'camp-cot'
        && object.handoff?.campId === campId
        && object.handoff?.status === 'reserved'
    )) ?? null;
}

export function releaseFirstNightCotHandoff(state, campId) {
    const index = state?.worldObjects?.findIndex((object) => object.instanceId === getFirstNightCotHandoff(state, campId)?.instanceId) ?? -1;
    if (index < 0) return { ok: false, reason: 'missing-handoff', state };
    const worldObjects = [...state.worldObjects];
    worldObjects[index] = {
        ...worldObjects[index],
        handoff: { ...worldObjects[index].handoff, status: 'released' }
    };
    return { ok: true, object: worldObjects[index], state: { ...state, worldObjects } };
}
