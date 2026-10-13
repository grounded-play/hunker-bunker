import { addCarryObject, createCarryObject } from './carrySystem.js';

export const FIRST_NIGHT_COT_MISSION_ID = 'first-night-cot-recovery';

/**
 * Plans the minimum viable ship-side berth. The crashed hull supplies a
 * sealed one-cell cabin and regulator; the missing cot is the first cargo
 * lesson. Later construction expands this graph rather than replacing it.
 */
export function planFirstNightBase({ shipX = 0, shipZ = 0 } = {}) {
    const x = Math.round(shipX - 2);
    const z = Math.round(shipZ + 2);
    const installSocket = Object.freeze({
        id: 'ship-sleep-bay',
        acceptsTags: Object.freeze(['bed', 'sleep_anchor']),
        transform: Object.freeze({ x, z, yaw: Math.PI / 2 })
    });
    const shell = [
        { instanceId: 'starter-berth-floor', definitionId: 'floor_plate_1x1', x, z },
        { instanceId: 'starter-berth-ceiling', definitionId: 'ceiling_panel_1x1', x, z },
        { instanceId: 'starter-berth-wall-n', definitionId: 'straight_wall_1x1', x, z, side: 'north' },
        { instanceId: 'starter-berth-wall-s', definitionId: 'straight_wall_1x1', x, z, side: 'south' },
        { instanceId: 'starter-berth-wall-w', definitionId: 'straight_wall_1x1', x, z, side: 'west' },
        { instanceId: 'starter-berth-door-e', definitionId: 'sealable_door_1x1', x, z, side: 'east', isOpen: false },
        { instanceId: 'starter-berth-o2', definitionId: 'o2_regulator', x, z }
    ].map((module) => ({ ...module, socketId: 'crashed-ship-berth', transform: { x, z, yaw: 0 } }));
    return {
        installSocket,
        shell,
        cotSource: {
            x: Math.round(shipX + 5),
            z: Math.round(shipZ + 2)
        }
    };
}

export function ensureFirstNightBaseState(state, options = {}) {
    if (!state) return { state, plan: planFirstNightBase(options), addedCot: false };
    const plan = planFirstNightBase(options);
    const installedIds = new Set(state.installed.map(({ instanceId }) => instanceId));
    let next = {
        ...state,
        installed: [
            ...state.installed,
            ...plan.shell.filter(({ instanceId }) => !installedIds.has(instanceId))
        ]
    };
    const hasCot = next.installed.some(({ definitionId }) => definitionId === 'cot_bed')
        || next.carried?.definitionId === 'cot_bed'
        || next.worldObjects.some(({ definitionId }) => definitionId === 'cot_bed');
    if (hasCot) return { state: next, plan, addedCot: false };
    const cot = createCarryObject({
        instanceId: `first-night-cot:${next.runId ?? 'campaign'}`,
        definitionId: 'cot_bed',
        missionId: FIRST_NIGHT_COT_MISSION_ID,
        massClass: 'heavy',
        worldPosition: plan.cotSource,
        carrySocket: 'both-hands',
        buildTags: ['bed', 'furniture', 'sleep_anchor'],
        runId: next.runId
    });
    const result = addCarryObject(next, cot);
    if (result.ok) next = result.state;
    return { state: next, plan, addedCot: result.ok };
}

export function installedCot(state) {
    return state?.installed?.find(({ definitionId }) => definitionId === 'cot_bed') ?? null;
}
