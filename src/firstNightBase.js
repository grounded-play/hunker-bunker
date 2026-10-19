import { addCarryObject, createCarryObject } from './carrySystem.js';
import { getBaseModuleDefinition } from './data/baseModules.js';
import { CRASH_SITE_BUILD } from './data/crashSiteBuild.js';

export const FIRST_NIGHT_COT_MISSION_ID = 'first-night-cot-recovery';
export const FIRST_NIGHT_SEAL_MISSION_ID = 'first-night-berth-seal';

// The sleep berth sits on the crash site's authored bed socket, open floor in
// the main chamber's south-west, clear of the maneuver lane (data/
// crashSiteBuild.js). It used to sit at ship (-2, +2): 0.6 m from the
// console, so the bed marker covered the shop prompt and the player spawned
// standing in it (owner, 2026-10-15). Kept relative to the ship.
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
        // West of the wreck, up-screen of the spawn and on the way to the
        // sleep bay. At ship + (5, 2) the HUD covered it (2026-10-15 playtest).
        // At ship + (-2, 0) it sits in the impact cradle clear of the partition wall at x=5.
        sourceOffset: Object.freeze({ x: -2, z: 0 })
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

const LEGACY_COT_SOURCE_OFFSET = Object.freeze({ x: 5, z: 2 });

const LEGACY_GIVEAWAY_MODULE_IDS = new Set(['starter-berth-wall-w', 'starter-berth-door-e']);

/**
 * Plans the minimum viable ship-side berth. The crashed hull supplies the
 * floor, roof, two sound walls, and regulator. The cot, hull patch, and door
 * seal are physical recovery lessons whose sockets complete the first room.
 */
export function planFirstNightBase({ shipX = 0, shipZ = 0 } = {}) {
    // Whole cells: the seal graph rounds module positions (baseSealGraph.js).
    const x = Math.round(shipX + FIRST_NIGHT_BERTH_OFFSET.x);
    const z = Math.round(shipZ + FIRST_NIGHT_BERTH_OFFSET.z);
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
        ],
        worldObjects: returnStrandedCot(state.worldObjects ?? [], plan, options)
    };
    // One step at a time (owner, 2026-10-15): the hull patch and door seal
    // appear once the cot is in, not lying at the wreck from the start.
    const cotIn = Boolean(installedCot(next));
    if (!cotIn) next = { ...next, worldObjects: next.worldObjects.filter((object) => !untouchedSealCargo(object, plan)) };
    const addedCargo = [];
    for (const recovery of plan.recoveryCargo) {
        if (recovery.missionId === FIRST_NIGHT_SEAL_MISSION_ID && !cotIn) continue;
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

// Older saves left the cot where the player was not looking: reserved at a
// survivor camp's rack 120 m+ out (camp-handoff build a7abbb17), or untouched
// at the old ship + (5, 2) spot under the HUD. Either goes to today's spot
// beside the wreck; a cot the player already moved is left where it is.
function returnStrandedCot(worldObjects, plan, { shipX = 0, shipZ = 0 } = {}) {
    const legacyX = Math.round(shipX + LEGACY_COT_SOURCE_OFFSET.x);
    const legacyZ = Math.round(shipZ + LEGACY_COT_SOURCE_OFFSET.z);
    return worldObjects.map((object) => {
        if (object.definitionId !== 'cot_bed') return object;
        const campReserved = object.handoff?.type === 'camp-cot' && object.handoff?.status === 'reserved';
        const atLegacySpot = !object.handoff && object.worldPosition?.x === legacyX && object.worldPosition?.z === legacyZ;
        if (!campReserved && !atLegacySpot) return object;
        const rest = { ...object };
        delete rest.handoff;
        const home = { ...plan.cotSource };
        return { ...rest, worldPosition: home, sourcePosition: { ...home }, lastSafePosition: { ...home } };
    });
}

function untouchedSealCargo(object, plan) {
    if (object.missionId !== FIRST_NIGHT_SEAL_MISSION_ID) return false;
    const source = plan.recoveryCargo.find(({ definitionId }) => definitionId === object.definitionId)?.worldPosition;
    return Boolean(source) && object.worldPosition?.x === source.x && object.worldPosition?.z === source.z;
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
