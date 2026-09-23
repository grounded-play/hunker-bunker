// Persistent physical consequences of campaign choices. The campaign store
// records WHAT changed (campaignWorld.js worldTransformations); this module
// owns the rules for WHEN a choice counts as a world change and WHERE the
// change is built, so threeGame only has to mount meshes at the answers.
import { CAMP_AFTERMATH_FORTIFIED_LEVEL } from './campEconomy.js';

export const HIVE_OUTCOMES = Object.freeze({ BONDED: 'bonded', HARVESTED: 'harvested' });

const BONDED_HIVE_STATUSES = Object.freeze(['bonded', 'rescued', 'aboard']);
const HARVESTED_HIVE_STATUSES = Object.freeze(['slain', 'queen_consumed']);

// A bonded hive's kin part for the carrier inside infested ground. Small per
// hive and capped, so two bonds are felt without trivializing bio sectors.
export const BONDED_HIVE_SPEED_BONUS_PER_HIVE = 0.06;
export const BONDED_HIVE_SPEED_BONUS_CAP = 0.15;
// Hostiles this close to a harvested hive spawn enraged.
export const HARVESTED_HIVE_ENRAGE_RADIUS = 30;

const HEART_BEATS = Object.freeze(['central', 'choice_chamber']);

/**
 * The hive's world outcome implied by its act 2 record, or null while its
 * path is still open. Wounds from Act 1 mining are not an outcome: only the
 * resolved bond or the kill changes the compound.
 */
export function deriveHiveOutcome(record) {
    if (BONDED_HIVE_STATUSES.includes(record?.status)) return HIVE_OUTCOMES.BONDED;
    if (HARVESTED_HIVE_STATUSES.includes(record?.status)) return HIVE_OUTCOMES.HARVESTED;
    return null;
}

export function isCampLevelFortified(level) {
    return Number(level) >= CAMP_AFTERMATH_FORTIFIED_LEVEL;
}

/** The world-plan reservation holding one named compound room. */
export function findTerritoryRoomReservation(worldPlan, siteId, beatKey) {
    const id = HEART_BEATS.includes(beatKey) ? `territory:${siteId}` : `room:${siteId}:${beatKey}`;
    return worldPlan?.reservations?.find((entry) => entry.id === id && !entry.conditional) ?? null;
}

/** World-space center of a compound room's chunk (where its build is stamped). */
export function territoryRoomWorldCenter(worldPlan, siteId, beatKey, chunkSize) {
    const reservation = findTerritoryRoomReservation(worldPlan, siteId, beatKey);
    if (!Number.isInteger(reservation?.chunkX) || !Number.isInteger(reservation?.chunkY)) return null;
    const half = Math.floor(chunkSize / 2);
    return { x: reservation.chunkX * chunkSize + half, z: reservation.chunkY * chunkSize + half };
}

/** Ids of open ring crossings whose clearing spans the chasm with a bridge. */
export function getBridgedCrossingIds(worldPlan, openCrossingIds) {
    const open = new Set(openCrossingIds ?? []);
    return (worldPlan?.ringCrossings ?? [])
        .filter((crossing) => crossing.opensTraversal === 'bridge' && open.has(crossing.id))
        .map((crossing) => crossing.id);
}

/**
 * The deck a bridge crossing lays down, in world units, from the crossing
 * door outward. A door on side `side` of its chunk leads away along that
 * side's axis; the span starts a few cells inside the gate chunk and runs
 * across the chunk seam so the deck visibly continues past the threshold.
 */
export function planBridgeSpan({ worldX, worldZ, side }, { length = 9, inset = 3 } = {}) {
    const axes = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };
    const axis = axes[side];
    if (!axis || !Number.isFinite(worldX) || !Number.isFinite(worldZ)) return null;
    const [dx, dz] = axis;
    const start = { x: worldX - dx * inset, z: worldZ - dz * inset };
    const end = { x: start.x + dx * length, z: start.z + dz * length };
    return {
        start,
        end,
        center: { x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 },
        length,
        horizontal: dx !== 0,
        yaw: dx !== 0 ? Math.PI / 2 : 0
    };
}

const DECK_WALKABLE = new Set(['.', 'B']);
const SIDE_STEPS = Object.freeze({ n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] });

/**
 * The corridor a crossing door opens onto, walked outward from the door's
 * threshold cells until it leaves walkable floor or the chunk. These are the
 * cells a restored crossing re-tags as bridge deck.
 *
 * @returns {{ x: number, y: number }[]}
 */
export function planBridgeDeckCells(grid, door) {
    const step = SIDE_STEPS[door?.side];
    if (!step || !grid?.length) return [];
    const lanes = (door.cells?.length ? door.cells : [{ x: door.localX, y: door.localY }]);
    const cells = [];
    for (const lane of lanes) {
        let x = lane.x + step[0];
        let y = lane.y + step[1];
        while (DECK_WALKABLE.has(grid[y]?.[x])) {
            cells.push({ x, y });
            x += step[0];
            y += step[1];
        }
    }
    return cells;
}

/** Speed multiplier a carrier enjoys on infested ground from bonded hives. */
export function bondedHiveSpeedMultiplier(hivesTransformed) {
    const bonded = Object.values(hivesTransformed ?? {})
        .filter((entry) => entry?.outcome === HIVE_OUTCOMES.BONDED).length;
    return 1 + Math.min(BONDED_HIVE_SPEED_BONUS_CAP, bonded * BONDED_HIVE_SPEED_BONUS_PER_HIVE);
}

const OVERCLOCK_RARITY_RANK = Object.freeze({ common: 0, rare: 1, mythic: 2, corrupted: 3 });

/**
 * The exotic overclock a radical harvest tears out of the hive: the rarest
 * implemented weapon overclock the carrier does not already run. Falls back
 * to any implemented one, and to null when the catalog has none.
 */
export function selectHarvestOverclock(pool, heldIds = []) {
    const held = new Set(heldIds);
    const ranked = (pool ?? [])
        .filter((drop) => drop?.type === 'overclock' && drop.implemented !== false)
        .sort((a, b) => (OVERCLOCK_RARITY_RANK[b.rarity] ?? 0) - (OVERCLOCK_RARITY_RANK[a.rarity] ?? 0));
    return ranked.find((drop) => !held.has(drop.id)) ?? ranked[0] ?? null;
}

export function isWithinHarvestedHiveRange(x, z, harvestedHivePositions, radius = HARVESTED_HIVE_ENRAGE_RADIUS) {
    return (harvestedHivePositions ?? []).some((pos) => Math.hypot(x - pos.x, z - pos.z) <= radius);
}
