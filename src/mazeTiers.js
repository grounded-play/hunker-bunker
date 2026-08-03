// Tiered maze layers, space taxonomy, and site placement rules.
//
// This replaces the idea of a literal concentric ring with a *tier*: a named
// set of maze cells that need not be a circle, a straight line, or contiguous
// in any geometric sense. A tier is defined by what unlocks it and what may be
// built inside it, not by a radius. mazeExpedition.js still computes radial
// geometry for the macro plan; this module is the authority on progression.
//
// Gating deliberately reuses the four bank goals already driving
// RING_UNLOCK_GOAL_ORDER — real, live player state, not new invented flags.

import { TILE_SIZE } from './tileCatalog.js';

// Band thickness is declared here rather than imported so this module keeps
// working while the tile catalog's banding is still in flux. Re-point these at
// tileCatalog's own exports once that lands.
const BAND_THICKNESS = 0;
const ROOM_INTERIOR = TILE_SIZE - 2;

// ── Space taxonomy ──────────────────────────────────────────────────────
//
// One maze cell is one TILE_SIZE tile. Merging N cells deletes the bands
// between them, so a run of N cells spans N*(TILE_SIZE-1)+1 and its walkable
// interior spans that minus the outer bands on both ends.
export const SPACE = Object.freeze({ HALL: 'hall', ROOM: 'room', PLAIN: 'plain' });

export function spanForCells(cells) {
    return (cells * (TILE_SIZE - 1)) + 1;
}

export function interiorForCells(cells) {
    return spanForCells(cells) - (BAND_THICKNESS * 2);
}

// A hall reads as a hall because it is longer than it is wide — but a
// one-cell-wide corridor at this tile size is a claustrophobic slot, so the
// narrowest hall is still the full authored interior width. "Longer than wide,
// never tight."
export const MIN_HALL_WIDTH = ROOM_INTERIOR;
export const MIN_HALL_ASPECT = 1.8;

// Every hall footprint clears MIN_HALL_ASPECT. A 3x2 does not (1.5) — it reads
// as a squat room, which is why the broad hall is 4x2 rather than 3x2.
export const HALL_PROFILES = Object.freeze([
    { id: 'hall-run', long: 2, wide: 1, weight: 1.0 },
    { id: 'hall-gallery', long: 3, wide: 1, weight: 0.7 },
    { id: 'hall-causeway', long: 4, wide: 1, weight: 0.4 },
    { id: 'hall-broad', long: 4, wide: 2, weight: 0.3 }
]);

// Rooms vary in footprint on purpose: the previous layout made every space one
// cell, so every room read as the same box. All of these stay under
// MIN_HALL_ASPECT, otherwise they would simply be halls with props in them.
export const ROOM_PROFILES = Object.freeze([
    { id: 'room-cell', long: 1, wide: 1, weight: 1.0, siteCapacity: 1 },
    { id: 'room-chamber', long: 2, wide: 2, weight: 0.55, siteCapacity: 2 },
    { id: 'room-vault', long: 3, wide: 2, weight: 0.3, siteCapacity: 3 },
    { id: 'room-hold', long: 3, wide: 3, weight: 0.15, siteCapacity: 4 }
]);

// Plains are the open exterior: no pit, no cliff, no bunker shell. Ledge all
// the way out, so neighbouring plains merge into continuous open ground.
export const PLAIN_PROFILES = Object.freeze([
    { id: 'plain-flat', long: 2, wide: 2, weight: 1.0 },
    { id: 'plain-broad', long: 3, wide: 3, weight: 0.5 }
]);

export function classifySpace(profile) {
    const long = Math.max(profile.long, profile.wide);
    const wide = Math.min(profile.long, profile.wide);
    if (profile.id.startsWith('plain')) return SPACE.PLAIN;
    return (long / wide) >= MIN_HALL_ASPECT ? SPACE.HALL : SPACE.ROOM;
}

export function profileFootprint(profile) {
    return {
        spanLong: spanForCells(profile.long),
        spanWide: spanForCells(profile.wide),
        interiorLong: interiorForCells(profile.long),
        interiorWide: interiorForCells(profile.wide)
    };
}

// ── Site kinds ──────────────────────────────────────────────────────────
export const SITE = Object.freeze({
    CAMP: 'camp',
    CAMP_OBJECTIVE: 'campObjective',
    HIVE: 'hive',
    CACHE: 'cache',
    GATE_BOSS: 'gateBoss',
    QUEEN: 'queen'
});

// ── Tiers ───────────────────────────────────────────────────────────────
//
// unlockGoal is the bank goal that opens the tier; it matches
// RING_UNLOCK_GOAL_ORDER element-for-element so the two cannot drift. Tier 1
// is always open — the player has to be able to stand somewhere at spawn.
export const TIERS = Object.freeze([
    {
        tier: 1,
        id: 'crashShelf',
        name: 'Crash Shelf',
        unlockGoal: null,
        gateBoss: null,
        spaces: [SPACE.PLAIN, SPACE.HALL, SPACE.ROOM],
        sites: [SITE.CAMP, SITE.CACHE],
        minSites: 2
    },
    {
        tier: 2,
        id: 'outworks',
        name: 'Outworks',
        unlockGoal: 'o2Bubble',
        gateBoss: 'sentinel',
        spaces: [SPACE.PLAIN, SPACE.HALL, SPACE.ROOM],
        sites: [SITE.CAMP, SITE.CAMP_OBJECTIVE, SITE.CACHE],
        minSites: 3
    },
    {
        tier: 3,
        id: 'deepWorks',
        name: 'Deep Works',
        unlockGoal: 'hullExpansion',
        gateBoss: 'warden',
        spaces: [SPACE.HALL, SPACE.ROOM],
        sites: [SITE.CAMP, SITE.CAMP_OBJECTIVE, SITE.HIVE, SITE.CACHE],
        minSites: 4
    },
    {
        tier: 4,
        id: 'hiveReach',
        name: 'Hive Reach',
        unlockGoal: 'radarNode',
        gateBoss: 'broodmother',
        spaces: [SPACE.HALL, SPACE.ROOM],
        sites: [SITE.HIVE, SITE.CAMP_OBJECTIVE, SITE.CACHE],
        minSites: 4
    },
    {
        tier: 5,
        id: 'queenCore',
        name: 'Queen Core',
        unlockGoal: 'reactorCompressor',
        gateBoss: 'praetorian',
        spaces: [SPACE.HALL, SPACE.ROOM],
        sites: [SITE.QUEEN, SITE.HIVE],
        minSites: 2
    }
]);

export const FINAL_TIER = TIERS[TIERS.length - 1].tier;

export function getTier(tier) {
    return TIERS.find((entry) => entry.tier === tier) ?? null;
}

// Every goal that must be banked before the given tier is enterable.
export function goalsRequiredForTier(tier) {
    return TIERS.filter((entry) => entry.tier <= tier && entry.unlockGoal)
        .map((entry) => entry.unlockGoal);
}

// Every gate boss standing between spawn and the given tier.
export function bossesRequiredForTier(tier) {
    return TIERS.filter((entry) => entry.tier <= tier && entry.gateBoss)
        .map((entry) => entry.gateBoss);
}

// A tier opens only when its own goal is banked, its gate boss is down, and
// every tier before it is already open. Both conditions are required: the goal
// is the economic gate, the boss is the skill gate.
export function isTierUnlocked(tier, { unlockedGoalKeys = new Set(), defeatedBosses = new Set() } = {}) {
    const goals = new Set(unlockedGoalKeys);
    const bosses = new Set(defeatedBosses);
    return goalsRequiredForTier(tier).every((goal) => goals.has(goal))
        && bossesRequiredForTier(tier).every((boss) => bosses.has(boss));
}

export function getMaxUnlockedTier(state = {}) {
    let max = 1;
    for (const entry of TIERS) {
        if (isTierUnlocked(entry.tier, state)) max = entry.tier;
        else break;
    }
    return max;
}

// What the player still has to do to reach the Queen — the answer to
// "what unlocks access to the final layer".
export function describeRouteToFinalTier(state = {}) {
    const goals = new Set(state.unlockedGoalKeys ?? []);
    const bosses = new Set(state.defeatedBosses ?? []);
    return TIERS.filter((entry) => entry.tier > 1).map((entry) => ({
        tier: entry.tier,
        id: entry.id,
        name: entry.name,
        unlockGoal: entry.unlockGoal,
        gateBoss: entry.gateBoss,
        goalBanked: goals.has(entry.unlockGoal),
        bossDefeated: bosses.has(entry.gateBoss),
        open: isTierUnlocked(entry.tier, state)
    }));
}

// ── Two routes to the Queen ─────────────────────────────────────────────
//
// The final tier must be reachable by two routes that share no intermediate
// cell, so a single choke cannot dead-end a run. Endpoints are excluded: both
// routes necessarily share the spawn and the Queen.
export function findDisjointRoutes(adjacency, startKey, goalKey, wanted = 2) {
    const routes = [];
    const consumed = new Set();

    for (let attempt = 0; attempt < wanted; attempt += 1) {
        const prev = new Map([[startKey, null]]);
        const queue = [startKey];
        let reached = false;

        while (queue.length > 0) {
            const current = queue.shift();
            if (current === goalKey) { reached = true; break; }
            for (const next of adjacency.get(current) ?? []) {
                if (prev.has(next)) continue;
                if (consumed.has(next) && next !== goalKey) continue;
                prev.set(next, current);
                queue.push(next);
            }
        }
        if (!reached) break;

        const path = [];
        for (let node = goalKey; node != null; node = prev.get(node)) path.unshift(node);
        routes.push(path);
        for (const node of path.slice(1, -1)) consumed.add(node);
    }

    return routes;
}

export function hasTwoRoutesToQueen(adjacency, startKey, queenKey) {
    return findDisjointRoutes(adjacency, startKey, queenKey, 2).length >= 2;
}
