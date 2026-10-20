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

const LEGACY_BERTH_OFFSETS = Object.freeze([
    // v3 rounded the authored half-cell socket (3.5, 15.5) to (4, 16),
    // directly matching the dynamic-collider pushes in the 16:30 PC log.
    Object.freeze({ x: -5, z: 7 })
]);

const LEGACY_GIVEAWAY_MODULE_IDS = new Set(['starter-berth-wall-w', 'starter-berth-door-e']);

/**
 * Plans the starting camp rest point. The cot is present from the beginning;
 * installing and repairing the separate camp O2 core is the physical build
 * lesson and the only environmental gate for sleeping here.
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
    return {
        installSocket: installSockets[0],
        installSockets,
        shell,
        recoveryCargo: Object.freeze([]),
        cotSource: Object.freeze({ x, z })
    };
}

export function ensureFirstNightBaseState(state, options = {}) {
    if (!state) return { state, plan: planFirstNightBase(options), addedCot: false, addedCargo: [] };
    const plan = planFirstNightBase(options);
    const shipX = options.shipX ?? 0;
    const shipZ = options.shipZ ?? 0;
    const shellById = new Map(plan.shell.map((module) => [module.instanceId, module]));
    const installedWithoutLegacyGiveaways = state.installed
        .filter(({ instanceId, missionId }) => (
            !LEGACY_GIVEAWAY_MODULE_IDS.has(instanceId)
            && missionId !== FIRST_NIGHT_SEAL_MISSION_ID
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
    const cotSocket = plan.installSocket;
    const existingCot = installedWithoutLegacyGiveaways.find(({ definitionId }) => definitionId === 'cot_bed')
        ?? (state.carried?.definitionId === 'cot_bed' ? state.carried : null)
        ?? state.worldObjects?.find(({ definitionId }) => definitionId === 'cot_bed')
        ?? null;
    const installedCotRecord = {
        ...(existingCot ?? {}),
        instanceId: existingCot?.instanceId ?? `cot_bed:${state.runId ?? 'campaign'}`,
        definitionId: 'cot_bed',
        missionId: FIRST_NIGHT_COT_MISSION_ID,
        socketId: cotSocket.id,
        transform: { ...cotSocket.transform },
        x: cotSocket.transform.x,
        z: cotSocket.transform.z,
        yaw: cotSocket.transform.yaw
    };
    const installedWithoutCot = installedWithoutLegacyGiveaways.filter(({ definitionId }) => definitionId !== 'cot_bed');
    const next = {
        ...state,
        installed: [
            ...installedWithoutCot,
            ...plan.shell.filter(({ instanceId }) => !installedIds.has(instanceId)),
            installedCotRecord
        ],
        carried: state.carried?.definitionId === 'cot_bed' || state.carried?.missionId === FIRST_NIGHT_SEAL_MISSION_ID
            ? null
            : state.carried,
        worldObjects: (state.worldObjects ?? []).filter((object) => (
            object.definitionId !== 'cot_bed'
            && object.missionId !== FIRST_NIGHT_SEAL_MISSION_ID
        ))
    };
    return {
        state: next,
        plan,
        addedCot: !existingCot,
        addedCargo: []
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
