// What the night actually costs. overnightSim.js decides how camps and hive
// creep change while the carrier sleeps; this module turns that state into
// play: creep that slows, suffocates and breeds hostiles, and camps whose
// prices and services follow their condition. Pure, so the rules can be read
// (and tested) without a renderer.
import { CREEP_RING_CAP } from './overnightSim.js';

// Matches overnightBridge.js's decal layout: ring N sits N * 3.1 out from the
// hive, with ~0.7 of jitter. The zone reaches the outer edge of the decals.
const CREEP_RING_SPACING = 3.1;
const CREEP_EDGE_MARGIN = 1.5;

export const CREEP_EFFECTS = Object.freeze({
    // Per ring: stride lost, extra O2 drain, extra hostile density.
    slowPerRing: 0.07,
    o2DrainPerRing: 0.12,
    spawnDensityPerRing: 0.3,
    // At full spread the creep burns: one hit per interval spent standing in it.
    burnRing: CREEP_RING_CAP,
    burnIntervalSeconds: 10
});

/**
 * Creep zones from hive positions and stored overnight state. A bonded hive's
 * creep is kin to the carrier and costs nothing -- the bond buff already
 * rewards infested ground -- so it is left out.
 */
export function buildCreepZones(hiveRecords = [], overnightState = null) {
    const stored = overnightState?.hives ?? {};
    return (Array.isArray(hiveRecords) ? hiveRecords : [])
        .map((record) => ({
            hiveId: record?.id ?? '',
            x: Number(record?.x),
            z: Number(record?.z),
            rings: Math.max(0, Math.min(CREEP_RING_CAP, Math.floor(Number(stored[record?.id]?.creepRings) || 0))),
            bonded: ['bonded', 'rescued', 'aboard'].includes(record?.status)
        }))
        .filter((zone) => zone.hiveId && zone.rings > 0 && !zone.bonded
            && Number.isFinite(zone.x) && Number.isFinite(zone.z))
        .map((zone) => ({ ...zone, radius: zone.rings * CREEP_RING_SPACING + CREEP_EDGE_MARGIN }));
}

/** The strongest creep at a point, or null when the ground is clean. */
export function creepAt(zones, x, z) {
    let strongest = null;
    for (const zone of zones ?? []) {
        if (Math.hypot(x - zone.x, z - zone.z) > zone.radius) continue;
        if (!strongest || zone.rings > strongest.rings) strongest = zone;
    }
    if (!strongest) return null;
    return {
        hiveId: strongest.hiveId,
        rings: strongest.rings,
        speedMultiplier: 1 - strongest.rings * CREEP_EFFECTS.slowPerRing,
        o2DrainMultiplier: 1 + strongest.rings * CREEP_EFFECTS.o2DrainPerRing,
        burns: strongest.rings >= CREEP_EFFECTS.burnRing
    };
}

/** Extra hostile density for a chunk the creep reaches into. */
export function creepSpawnMultiplier(zones, chunkX, chunkY, chunkSize) {
    const half = chunkSize / 2;
    const cx = chunkX * chunkSize + half;
    const cz = chunkY * chunkSize + half;
    let rings = 0;
    for (const zone of zones ?? []) {
        // Nearest point of the chunk square to the hive.
        const nx = Math.max(chunkX * chunkSize, Math.min(zone.x, (chunkX + 1) * chunkSize));
        const nz = Math.max(chunkY * chunkSize, Math.min(zone.z, (chunkY + 1) * chunkSize));
        if (Math.hypot(nx - zone.x, nz - zone.z) <= zone.radius && Math.hypot(cx - zone.x, cz - zone.z) <= zone.radius + chunkSize) {
            rings = Math.max(rings, zone.rings);
        }
    }
    return 1 + rings * CREEP_EFFECTS.spawnDensityPerRing;
}

// A camp under strain is short of everything: help costs more, and past a
// breach it cannot spare a medic, a safe bed or its signature favour.
export const CAMP_CONDITION_EFFECTS = Object.freeze({
    secure: Object.freeze({ priceMultiplier: 1, medic: true, rest: true, activeVerb: true }),
    strained: Object.freeze({ priceMultiplier: 1.25, medic: true, rest: true, activeVerb: true }),
    breached: Object.freeze({ priceMultiplier: 1.5, medic: false, rest: false, activeVerb: true }),
    overrun: Object.freeze({ priceMultiplier: 2, medic: false, rest: false, activeVerb: false }),
    abandoned: Object.freeze({ priceMultiplier: 2, medic: false, rest: false, activeVerb: false })
});

// Shoring up is the counter-play: pay to walk a breached or overrun camp one
// step back toward secure, and reset its neglect so it is not abandoned.
export const SHORE_UP_COSTS = Object.freeze({ breached: 8, overrun: 14 });
const SHORE_UP_TO = Object.freeze({ breached: 'strained', overrun: 'breached' });

export function getCampConditionEffects(condition) {
    return CAMP_CONDITION_EFFECTS[condition] ?? CAMP_CONDITION_EFFECTS.secure;
}

export function scaleCampPrice(baseCost, condition) {
    const base = Math.max(0, Number(baseCost) || 0);
    return Math.ceil(base * getCampConditionEffects(condition).priceMultiplier);
}

/** { cost, to } when the camp can be shored up, else null. */
export function planShoreUp(condition) {
    if (!SHORE_UP_TO[condition]) return null;
    return { cost: SHORE_UP_COSTS[condition], from: condition, to: SHORE_UP_TO[condition] };
}

/** Overnight state after shoring up one camp (pure; the input is not mutated). */
export function applyShoreUp(overnightState, campId, plan) {
    const camps = { ...(overnightState?.camps ?? {}) };
    camps[campId] = { ...(camps[campId] ?? {}), condition: plan.to, neglectNights: 0 };
    return { ...(overnightState ?? {}), camps };
}
