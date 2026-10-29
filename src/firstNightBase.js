import { addCarryObject, createCarryObject } from './carrySystem.js';
import { getBaseModuleDefinition } from './data/baseModules.js';
import { CRASH_SITE_BUILD } from './data/crashSiteBuild.js';

export const FIRST_NIGHT_COT_MISSION_ID = 'first-night-cot-recovery';
// Retained only to recognize and remove obsolete tutorial cargo from saves.
export const FIRST_NIGHT_SEAL_MISSION_ID = 'first-night-berth-seal';

// The sleep berth sits on the crash site's authored bed socket, open floor in
// the camp beside the generator, clear of the wreck maneuver lane and wholly
// inside the first O2 ring (data/crashSiteBuild.js). Kept relative to the
// authored crash-site origin for co-op and save migration.
const FIRST_BED_SOCKET = CRASH_SITE_BUILD.constructionSockets.find(({ id }) => id === 'first-bed');
export const FIRST_NIGHT_BERTH_OFFSET = Object.freeze({
    x: FIRST_BED_SOCKET.x - CRASH_SITE_BUILD.center.x,
    z: FIRST_BED_SOCKET.z - CRASH_SITE_BUILD.center.z
});

const RECOVERY_DEFINITIONS = Object.freeze([
    Object.freeze({
        definitionId: 'cot_bed',
        missionId: FIRST_NIGHT_COT_MISSION_ID,
        socketId: 'ship-sleep-bay',
        // Stage the folded cot beside its authored berth, outside the 11x11
        // ship maneuver envelope.
        sourceOffset: Object.freeze({ x: -5, z: 10 })
    })
]);

const LEGACY_COT_SOURCE_OFFSETS = Object.freeze([
    Object.freeze({ x: 5, z: 2 }),
    Object.freeze({ x: -2, z: 0 })
]);

const LEGACY_BERTH_OFFSETS = Object.freeze([
    // v3 rounded the authored half-cell socket (3.5, 15.5) to (4, 16),
    // directly matching the dynamic-collider pushes in the 16:30 PC log.
    Object.freeze({ x: -5, z: 7 })
]);

const LEGACY_GIVEAWAY_MODULE_IDS = new Set(['starter-berth-wall-w', 'starter-berth-door-e', 'starter-berth-bed']);

/**
 * Plans the starting camp rest point. The cot begins as physical recovery
 * cargo staged beside the wreck; the player carries it to the authored bed
 * spot and installs it.
 */
export function planFirstNightBase({ shipX = 0, shipZ = 0 } = {}) {
    const x = shipX + FIRST_NIGHT_BERTH_OFFSET.x;
    const z = shipZ + FIRST_NIGHT_BERTH_OFFSET.z;
    const installSockets = Object.freeze([
        Object.freeze({
            id: 'ship-sleep-bay',
            acceptsTags: Object.freeze(['bed', 'sleep_anchor']),
            transform: Object.freeze({ x, z, yaw: Math.PI / 2 })
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
            x: shipX + recovery.sourceOffset.x,
            z: shipZ + recovery.sourceOffset.z
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
    const shipX = options.shipX ?? 0;
    const shipZ = options.shipZ ?? 0;
    const shellById = new Map(plan.shell.map((module) => [module.instanceId, module]));
    const installedWithoutLegacyGiveaways = state.installed
        .filter(({ instanceId, missionId, definitionId, installedByPlayer }) => (
            !LEGACY_GIVEAWAY_MODULE_IDS.has(instanceId)
            && missionId !== FIRST_NIGHT_SEAL_MISSION_ID
            && !(definitionId === 'cot_bed' && !installedByPlayer && (instanceId === `cot_bed:${state.runId ?? 'campaign'}` || instanceId === 'cot_bed:campaign'))
        ))
        .map((module) => {
            const replacement = shellById.get(module.instanceId);
            const atLegacyBerth = replacement && LEGACY_BERTH_OFFSETS.some((offset) => (
                module.x === Math.round(shipX + offset.x)
                && module.z === Math.round(shipZ + offset.z)
            ));
            return atLegacyBerth ? { ...replacement } : module;
        });
    const installedIds = new Set(installedWithoutLegacyGiveaways.map(({ instanceId }) => instanceId));
    let next = {
        ...state,
        installed: [
            ...installedWithoutLegacyGiveaways,
            ...plan.shell.filter(({ instanceId }) => !installedIds.has(instanceId))
        ],
        carried: state.carried?.missionId === FIRST_NIGHT_SEAL_MISSION_ID ? null : state.carried,
        worldObjects: returnStrandedCot(
            (state.worldObjects ?? []).filter(({ missionId }) => missionId !== FIRST_NIGHT_SEAL_MISSION_ID),
            plan,
            options
        )
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
            buildTags: definition?.buildTags ?? ['bed', 'sleep_anchor'],
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

function returnStrandedCot(worldObjects, plan, { shipX = 0, shipZ = 0 } = {}) {
    const legacyPositions = LEGACY_COT_SOURCE_OFFSETS.map((offset) => ({
        x: Math.round(shipX + offset.x),
        z: Math.round(shipZ + offset.z)
    }));
    return worldObjects.map((object) => {
        if (object.definitionId !== 'cot_bed') return object;
        const campReserved = object.handoff?.type === 'camp-cot' && object.handoff?.status === 'reserved';
        const atLegacySpot = !object.handoff && legacyPositions.some(({ x, z }) => (
            object.worldPosition?.x === x && object.worldPosition?.z === z
        ));
        if (!campReserved && !atLegacySpot) return object;
        const rest = { ...object };
        delete rest.handoff;
        const home = { ...plan.cotSource };
        return { ...rest, worldPosition: home, sourcePosition: { ...home }, lastSafePosition: { ...home } };
    });
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
