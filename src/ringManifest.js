// Serializable authored-content requirements layered over mazeExpedition's
// existing macro topology. This module decides which beats must be reserved;
// it deliberately does not choose chunks, stamp grids, or activate quests.

import { ACT2_CAMP_STATUSES, ACT2_HIVE_SITES, ACT2_HIVE_STATUSES } from './act2.js';
import { CAMP_QUESTS } from './data/campQuests.js';
import { computeTopologyDistances } from './mazeExpedition.js';
import {
    buildRingCrossingPlan,
    validateRingCrossingPlan
} from './ringCrossings.js';
import {
    allocateTerritories,
    validateTerritoryPlan
} from './territoryPlanner.js';

export const RING_MANIFEST_VERSION = 1;
export const WORLD_PLAN_VERSION = 1;

export const MANDATORY_SHIP_GOALS = Object.freeze([
    Object.freeze({ goalKey: 'o2Bubble', ring: 1, roomFamily: 'o2', objectiveAnchorId: 'o2_control' }),
    Object.freeze({ goalKey: 'hullExpansion', ring: 2, roomFamily: 'engineering', objectiveAnchorId: 'hull_fabrication_console' }),
    Object.freeze({ goalKey: 'radarNode', ring: 3, roomFamily: 'security', objectiveAnchorId: 'radar_alignment_console' }),
    Object.freeze({ goalKey: 'reactorCompressor', ring: 4, roomFamily: 'engineering', objectiveAnchorId: 'compressor_control' })
]);

export const HIVE_TERRITORY_BEATS = Object.freeze([
    Object.freeze({ id: 'warning', order: 0, role: 'foreshadow' }),
    Object.freeze({ id: 'approach', order: 1, role: 'contaminatedApproach' }),
    Object.freeze({ id: 'outer_nest', order: 2, role: 'defendedOuterNest' }),
    Object.freeze({ id: 'choice_chamber', order: 3, role: 'hiveChoice' }),
    Object.freeze({ id: 'consequence', order: 4, role: 'harvestOrBondConsequence' }),
    Object.freeze({ id: 'escape', order: 5, role: 'escapeOrShortcut' })
]);

export const CAMP_TERRITORY_BEATS = Object.freeze([
    Object.freeze({ id: 'approach', order: 0, role: 'readableApproach' }),
    Object.freeze({ id: 'perimeter', order: 1, role: 'defensivePerimeter' }),
    Object.freeze({ id: 'central', order: 2, role: 'centralInteraction' }),
    Object.freeze({ id: 'service', order: 3, role: 'tradeSupportFabrication' }),
    Object.freeze({ id: 'leader_quest', order: 4, role: 'leaderOrQuestAnchors' }),
    Object.freeze({ id: 'exit', order: 5, role: 'missionRouteExit' })
]);

const CAMP_QUEST_DESTINATIONS = Object.freeze({
    reactor_venting: Object.freeze({ roomFamily: 'engineering', objectiveAnchorId: 'reactor_vent_control' }),
    hive_archive_ch1: Object.freeze({ roomFamily: 'lore', objectiveAnchorId: 'hive_archive_terminal' }),
    lost_probe: Object.freeze({ roomFamily: 'cache', objectiveAnchorId: 'lost_probe' }),
    spore_cleansing: Object.freeze({ roomFamily: 'medical', objectiveAnchorId: 'hydro_bed_controls' }),
    hive_archive_ch2: Object.freeze({ roomFamily: 'lore', objectiveAnchorId: 'stasis_archive_node' }),
    lost_cultist: Object.freeze({ roomFamily: 'rescue', objectiveAnchorId: 'cultist_recovery_point' }),
    armory_breach: Object.freeze({ roomFamily: 'armory', objectiveAnchorId: 'armory_lock' }),
    hive_archive_ch3: Object.freeze({ roomFamily: 'lore', objectiveAnchorId: 'incident_archive_core' }),
    bunker_holdout: Object.freeze({ roomFamily: 'arena', objectiveAnchorId: 'barricade_gate' })
});

// Budgets are deterministic content obligations, not generated placements.
// Required counts are filled from the reservations created for the expedition.
const RING_CONTENT_BUDGETS = Object.freeze({
    1: Object.freeze({
        optional: Object.freeze({ min: 3, max: 5 }),
        support: Object.freeze({ medical: 1, armory: 0, fabricator: 1 }),
        challenge: Object.freeze({ puzzle: 1, trapReward: 1, arena: 0 }),
        reward: Object.freeze({ cache: 2, schematic: 1, major: 0 }),
        narrative: Object.freeze({ routeLore: 1, siteLore: 2, deepLore: 0 })
    }),
    2: Object.freeze({
        optional: Object.freeze({ min: 4, max: 6 }),
        support: Object.freeze({ medical: 1, armory: 1, fabricator: 1 }),
        challenge: Object.freeze({ puzzle: 1, trapReward: 1, arena: 1 }),
        reward: Object.freeze({ cache: 2, schematic: 1, major: 1 }),
        narrative: Object.freeze({ routeLore: 1, siteLore: 2, deepLore: 1 })
    }),
    3: Object.freeze({
        optional: Object.freeze({ min: 4, max: 7 }),
        support: Object.freeze({ medical: 1, armory: 1, fabricator: 1 }),
        challenge: Object.freeze({ puzzle: 1, trapReward: 2, arena: 1 }),
        reward: Object.freeze({ cache: 2, schematic: 1, major: 1 }),
        narrative: Object.freeze({ routeLore: 1, siteLore: 2, deepLore: 1 })
    }),
    4: Object.freeze({
        optional: Object.freeze({ min: 4, max: 7 }),
        support: Object.freeze({ medical: 1, armory: 1, fabricator: 1 }),
        challenge: Object.freeze({ puzzle: 2, trapReward: 2, arena: 1 }),
        reward: Object.freeze({ cache: 2, schematic: 1, major: 1 }),
        narrative: Object.freeze({ routeLore: 1, siteLore: 2, deepLore: 2 })
    }),
    5: Object.freeze({
        optional: Object.freeze({ min: 2, max: 4 }),
        support: Object.freeze({ medical: 1, armory: 0, fabricator: 0 }),
        challenge: Object.freeze({ puzzle: 1, trapReward: 1, arena: 1 }),
        reward: Object.freeze({ cache: 1, schematic: 0, major: 1 }),
        narrative: Object.freeze({ routeLore: 1, siteLore: 1, deepLore: 2 })
    })
});

function copyBudget(value) {
    return Object.fromEntries(Object.entries(value).map(([key, count]) => [key, count]));
}

function findNode(expedition, id) {
    return expedition?.nodes?.find((node) => node.id === id) ?? null;
}

function sourcePlacement(source) {
    if (!source) return null;
    return {
        sourceId: source.id,
        chunkX: source.chunkX,
        chunkY: source.chunkY,
        chunkKey: Number.isInteger(source.chunkX) && Number.isInteger(source.chunkY)
            ? `${source.chunkX},${source.chunkY}`
            : null
    };
}

function reservation(spec) {
    return {
        required: true,
        conditional: false,
        activationState: 'active',
        ...spec
    };
}

function makeCoreReservations(expedition, ring) {
    const reservations = [reservation({
        id: `ring-${ring}:entry`,
        ring,
        role: 'entry',
        roomFamily: 'entry'
    }), reservation({
        id: `ring-${ring}:return-shortcut`,
        ring,
        role: 'returnShortcut',
        roomFamily: 'connector',
        activationState: 'sealed'
    })];

    const camp = Object.keys(CAMP_QUESTS)
        .map((campId) => findNode(expedition, campId))
        .find((node) => node?.ring === ring);
    if (camp) {
        const placement = sourcePlacement(camp);
        reservations.push(reservation({
            id: `territory:${camp.id}`,
            territoryId: `territory:${camp.id}`,
            kind: 'camp',
            ring,
            role: 'campTerritory',
            siteId: camp.id,
            roomFamily: 'camp',
            placement,
            routeChunkKey: placement.chunkKey,
            // The existing radial point becomes the readable approach. The
            // camp heart is still the content/state anchor two beats inward.
            anchorBeatIndex: 0,
            contentAnchorBeatIndex: 2,
            beats: CAMP_TERRITORY_BEATS.map((beat) => ({
                id: `${camp.id}:${beat.id}`,
                beatId: beat.id,
                order: beat.order,
                role: beat.role
            })),
            stateAnchorIds: ACT2_CAMP_STATUSES.map((stateKey) => `${camp.id}:state:${stateKey}`)
        }));
        for (const stateKey of ACT2_CAMP_STATUSES) {
            reservations.push(reservation({
                id: `${camp.id}:state:${stateKey}`,
                ring,
                role: 'campStateAnchor',
                siteId: camp.id,
                stateKey,
                roomFamily: 'camp',
                conditional: true,
                activationState: 'dormant',
                required: true
            }));
        }
    }

    const hive = ACT2_HIVE_SITES
        .map((site) => findNode(expedition, site.id))
        .find((node) => node?.ring === ring);
    if (hive) {
        const placement = sourcePlacement(hive);
        reservations.push(reservation({
            id: `territory:${hive.id}`,
            territoryId: `territory:${hive.id}`,
            kind: 'hive',
            ring,
            role: 'hiveTerritory',
            siteId: hive.id,
            roomFamily: 'hive',
            placement,
            routeChunkKey: placement.chunkKey,
            // The existing radial point becomes hive foreshadowing; the
            // authored choice chamber remains the content/state anchor.
            anchorBeatIndex: 0,
            contentAnchorBeatIndex: 3,
            beats: HIVE_TERRITORY_BEATS.map((beat) => ({
                id: `${hive.id}:${beat.id}`,
                beatId: beat.id,
                order: beat.order,
                role: beat.role
            })),
            stateAnchorIds: ACT2_HIVE_STATUSES.map((stateKey) => `${hive.id}:state:${stateKey}`)
        }));
        for (const stateKey of ACT2_HIVE_STATUSES) {
            reservations.push(reservation({
                id: `${hive.id}:state:${stateKey}`,
                ring,
                role: 'hiveStateAnchor',
                siteId: hive.id,
                stateKey,
                roomFamily: 'hive',
                conditional: true,
                activationState: 'dormant',
                required: true
            }));
        }
    }

    const blocker = expedition?.blockers?.find((candidate) => candidate.ring === ring);
    if (blocker) {
        reservations.push(reservation({
            id: `crossing:${blocker.id}`,
            ring,
            role: 'ringCrossing',
            blockerId: blocker.id,
            roomFamily: 'gate',
            placement: sourcePlacement(blocker)
        }));
    }

    if (ring === 5) {
        const queen = findNode(expedition, 'queen_chamber');
        if (queen) {
            reservations.push(reservation({
                id: 'site:queen_chamber',
                ring,
                role: 'finale',
                siteId: queen.id,
                roomFamily: 'queen',
                placement: sourcePlacement(queen)
            }));
        }
    }
    return reservations;
}

function makeCampQuestReservations(expedition, ring) {
    const reservations = [];
    for (const [campId, quests] of Object.entries(CAMP_QUESTS)) {
        const camp = findNode(expedition, campId);
        if (camp?.ring !== ring) continue;
        for (const quest of quests) {
            const destination = CAMP_QUEST_DESTINATIONS[quest.id];
            reservations.push(reservation({
                id: `quest:${campId}:${quest.id}:destination`,
                ring,
                role: 'campObjective',
                campId,
                questId: quest.id,
                roomFamily: destination?.roomFamily ?? 'mission',
                objectiveAnchorId: destination?.objectiveAnchorId ?? 'objective',
                conditional: true,
                activationState: 'dormant',
                sourceTerritoryId: `territory:${campId}`,
                minimumRouteSegmentsFromCamp: 1,
                forbidAdjacentTo: [`territory:${campId}`],
                latestAllowedRing: ring,
                intendedCrossingId: ring <= 4 ? `ring-${ring}-gate` : null
            }));
        }
    }
    return reservations;
}

function makeProgressionContract(ring) {
    const goal = MANDATORY_SHIP_GOALS.find((candidate) => candidate.ring === ring);
    if (!goal) return { reservations: [], progression: null };

    const objectiveId = `goal:${goal.goalKey}:objective`;
    const alternateId = `goal:${goal.goalKey}:alternate-route`;
    const fallbackId = `goal:${goal.goalKey}:structural-fallback`;
    const reservations = [
        reservation({
            id: objectiveId,
            ring,
            role: 'shipGoalObjective',
            goalKey: goal.goalKey,
            roomFamily: goal.roomFamily,
            objectiveAnchorId: goal.objectiveAnchorId
        }),
        reservation({
            id: alternateId,
            ring,
            role: 'alternativeResourceRoute',
            goalKey: goal.goalKey,
            roomFamily: ring === 1 ? 'salvage' : 'camp',
            conditional: true,
            activationState: 'dormant'
        }),
        reservation({
            id: fallbackId,
            ring,
            role: 'fallbackResourceRoute',
            goalKey: goal.goalKey,
            roomFamily: 'fabricator',
            conditional: true,
            activationState: 'dormant'
        })
    ];
    const crossingId = `ring-${ring}-gate`;
    return {
        reservations,
        progression: {
            goalKey: goal.goalKey,
            ring,
            unlocksCrossingId: crossingId,
            paths: [
                {
                    id: `${goal.goalKey}:primary`,
                    kind: 'primary',
                    reservationIds: [objectiveId],
                    choiceDependencies: [],
                    structurallyIndependent: true
                },
                {
                    id: `${goal.goalKey}:alternative`,
                    kind: 'alternative',
                    reservationIds: [alternateId, objectiveId],
                    choiceDependencies: [ring === 1 ? 'neutral_salvage_available' : 'camp_available'],
                    structurallyIndependent: false
                },
                {
                    id: `${goal.goalKey}:fallback`,
                    kind: 'fallback',
                    reservationIds: [fallbackId, objectiveId],
                    choiceDependencies: [],
                    structurallyIndependent: true
                }
            ]
        }
    };
}

function assertExpeditionShape(expedition) {
    if (!expedition || !Array.isArray(expedition.nodes) || !Array.isArray(expedition.blockers)) {
        throw new TypeError('ring manifests require mazeExpedition output with nodes and blockers');
    }
    for (const id of [...Object.keys(CAMP_QUESTS), ...ACT2_HIVE_SITES.map((site) => site.id), 'queen_chamber']) {
        if (!findNode(expedition, id)) throw new TypeError(`ring manifests require expedition node ${id}`);
    }
    for (let ring = 1; ring <= 4; ring += 1) {
        if (!expedition.blockers.some((blocker) => blocker.id === `ring-${ring}-gate` && blocker.ring === ring)) {
            throw new TypeError(`ring manifests require expedition blocker ring-${ring}-gate`);
        }
    }
}

/**
 * Builds the deterministic authored-content contract for every ring. The
 * expedition remains the source of site rings and macro chunk coordinates.
 */
export function buildRingManifestPlan(expedition) {
    assertExpeditionShape(expedition);
    const ringManifests = [];
    for (let ring = 1; ring <= 5; ring += 1) {
        const core = makeCoreReservations(expedition, ring);
        const quests = makeCampQuestReservations(expedition, ring);
        const { reservations: progressionReservations, progression } = makeProgressionContract(ring);
        const reservations = [...core, ...quests, ...progressionReservations];
        const budget = RING_CONTENT_BUDGETS[ring];
        ringManifests.push({
            version: RING_MANIFEST_VERSION,
            id: `ring-${ring}-manifest`,
            ring,
            budgets: {
                required: { min: reservations.filter((entry) => entry.required).length },
                optional: copyBudget(budget.optional),
                support: copyBudget(budget.support),
                challenge: copyBudget(budget.challenge),
                reward: copyBudget(budget.reward),
                narrative: copyBudget(budget.narrative)
            },
            reservations,
            progression
        });
    }
    return {
        version: RING_MANIFEST_VERSION,
        seed: Number(expedition.seed) >>> 0,
        sourceTopologyVersion: expedition.topology?.version ?? null,
        ringManifests
    };
}

export function buildRingManifests(expedition) {
    return buildRingManifestPlan(expedition).ringManifests;
}

export function getManifestReservations(plan) {
    return (plan?.ringManifests ?? plan ?? []).flatMap((manifest) => manifest?.reservations ?? []);
}

export function proveStructuralFallbackViability(plan) {
    const manifests = plan?.ringManifests ?? plan ?? [];
    const reservations = new Map(getManifestReservations(manifests).map((entry) => [entry.id, entry]));
    return MANDATORY_SHIP_GOALS.map((goal) => {
        const progression = manifests.find((manifest) => manifest.ring === goal.ring)?.progression;
        const viablePaths = (progression?.paths ?? []).filter((path) => (
            path.kind === 'fallback'
            && path.structurallyIndependent === true
            && (path.choiceDependencies ?? []).length === 0
            && (path.reservationIds ?? []).every((id) => reservations.has(id))
        ));
        return {
            goalKey: goal.goalKey,
            ring: goal.ring,
            viable: viablePaths.length > 0,
            viablePathIds: viablePaths.map((path) => path.id)
        };
    });
}

function validateBudgetShape(manifest, errors) {
    const budgetNames = ['required', 'optional', 'support', 'challenge', 'reward', 'narrative'];
    for (const name of budgetNames) {
        const budget = manifest?.budgets?.[name];
        if (!budget || Object.values(budget).some((value) => !Number.isInteger(value) || value < 0)) {
            errors.push(`${manifest?.id ?? 'manifest'} has invalid ${name} budget`);
        }
    }
    const optional = manifest?.budgets?.optional;
    if (optional && optional.max < optional.min) {
        errors.push(`${manifest.id} optional budget max is below min`);
    }
    const requiredCount = (manifest?.reservations ?? []).filter((entry) => entry.required).length;
    if (manifest?.budgets?.required?.min !== requiredCount) {
        errors.push(`${manifest?.id ?? 'manifest'} required budget does not match reservations`);
    }
}

/** Validates completeness and branch safety without mutating the plan. */
export function validateRingManifestPlan(plan) {
    const errors = [];
    const manifests = plan?.ringManifests ?? [];
    if (plan?.version !== RING_MANIFEST_VERSION) errors.push(`unsupported ring manifest version ${plan?.version}`);
    if (manifests.length !== 5) errors.push('ring manifest plan must contain exactly five rings');

    for (let ring = 1; ring <= 5; ring += 1) {
        if (manifests.filter((manifest) => manifest?.ring === ring).length !== 1) {
            errors.push(`ring manifest plan requires exactly one ring ${ring} manifest`);
        }
    }

    const manifestIds = new Set();
    const reservationIds = new Set();
    for (const manifest of manifests) {
        if (!Number.isInteger(manifest?.ring) || manifest.ring < 1 || manifest.ring > 5) {
            errors.push(`${manifest?.id ?? 'manifest'} has ring outside 1..5`);
        }
        if (manifestIds.has(manifest?.id)) errors.push(`duplicate manifest id ${manifest?.id}`);
        manifestIds.add(manifest?.id);
        validateBudgetShape(manifest, errors);
        for (const entry of manifest?.reservations ?? []) {
            if (!entry?.id) errors.push(`${manifest?.id ?? 'manifest'} contains reservation without id`);
            else if (reservationIds.has(entry.id)) errors.push(`duplicate reservation id ${entry.id}`);
            else reservationIds.add(entry.id);
            if (entry?.ring !== manifest?.ring || entry.ring < 1 || entry.ring > 5) {
                errors.push(`${entry?.id ?? 'reservation'} has invalid ring ${entry?.ring}`);
            }
            if (entry?.role === 'campObjective') {
                const crossingRing = Number(/^ring-(\d+)-gate$/.exec(entry.intendedCrossingId ?? '')?.[1]);
                if (!Number.isInteger(crossingRing)
                    || crossingRing !== entry.latestAllowedRing
                    || entry.ring > crossingRing) {
                    errors.push(`${entry.id} lies beyond its unlocking crossing`);
                }
            }
            if (entry?.conditional && entry.activationState !== 'dormant') {
                errors.push(`${entry.id} conditional reservation activates before its quest/state`);
            }
        }
    }

    const reservations = getManifestReservations(plan);
    const questIds = new Set(reservations.filter((entry) => entry.role === 'campObjective').map((entry) => entry.questId));
    for (const quests of Object.values(CAMP_QUESTS)) {
        for (const quest of quests) {
            if (!questIds.has(quest.id)) errors.push(`missing camp quest destination ${quest.id}`);
        }
    }

    for (const hive of ACT2_HIVE_SITES) {
        const territory = reservations.find((entry) => entry.id === `territory:${hive.id}`);
        if (!territory) errors.push(`missing hive territory ${hive.id}`);
        else {
            const orders = (territory.beats ?? []).map((beat) => beat.order);
            if (orders.length !== HIVE_TERRITORY_BEATS.length || orders.some((order, index) => order !== index)) {
                errors.push(`${hive.id} territory sequence is incomplete or unordered`);
            }
            if (!territory.routeChunkKey || territory.routeChunkKey !== territory.placement?.chunkKey) {
                errors.push(`${hive.id} territory route chunk does not match expedition placement`);
            }
        }
        for (const stateKey of ACT2_HIVE_STATUSES) {
            const state = reservations.find((entry) => entry.id === `${hive.id}:state:${stateKey}`);
            if (!state) errors.push(`missing ${hive.id} state reservation ${stateKey}`);
            else if (!state.conditional || state.activationState !== 'dormant') {
                errors.push(`${state.id} must remain conditionally dormant`);
            }
        }
    }

    for (const campId of Object.keys(CAMP_QUESTS)) {
        const territory = reservations.find((entry) => entry.id === `territory:${campId}`);
        if (!territory) errors.push(`missing camp territory ${campId}`);
        else {
            const orders = (territory.beats ?? []).map((beat) => beat.order);
            if (orders.length !== CAMP_TERRITORY_BEATS.length || orders.some((order, index) => order !== index)) {
                errors.push(`${campId} territory sequence is incomplete or unordered`);
            }
            if (!territory.routeChunkKey || territory.routeChunkKey !== territory.placement?.chunkKey) {
                errors.push(`${campId} territory route chunk does not match expedition placement`);
            }
        }
        for (const stateKey of ACT2_CAMP_STATUSES) {
            const state = reservations.find((entry) => entry.id === `${campId}:state:${stateKey}`);
            if (!state) errors.push(`missing ${campId} state reservation ${stateKey}`);
            else if (!state.conditional || state.activationState !== 'dormant') {
                errors.push(`${state.id} must remain conditionally dormant`);
            }
        }
        for (const quest of CAMP_QUESTS[campId]) {
            const destination = reservations.find((entry) => entry.questId === quest.id);
            if (destination && (
                destination.sourceTerritoryId !== `territory:${campId}`
                || destination.minimumRouteSegmentsFromCamp < 1
                || !destination.forbidAdjacentTo?.includes(`territory:${campId}`)
            )) {
                errors.push(`${destination.id} does not preserve camp-to-objective route separation`);
            }
        }
    }

    for (const result of proveStructuralFallbackViability(plan)) {
        if (!result.viable) errors.push(`${result.goalKey} has no moral-choice-independent structural path`);
    }

    return { valid: errors.length === 0, errors };
}

export function validateRingManifests(ringManifests, version = RING_MANIFEST_VERSION) {
    return validateRingManifestPlan({ version, ringManifests });
}

function stableHash(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function parseChunkKey(key) {
    const match = /^(-?\d+),(-?\d+)$/.exec(String(key ?? ''));
    return match ? { chunkX: Number(match[1]), chunkY: Number(match[2]) } : null;
}

function routeIndex(topology) {
    const chunks = new Map((topology?.routeChunks ?? []).map((chunk) => [
        `${chunk.chunkX},${chunk.chunkY}`,
        chunk
    ]));
    const adjacency = new Map([...chunks.keys()].map((key) => [key, new Set()]));
    for (const edge of topology?.routeEdges ?? []) {
        const [a, b, extra] = String(edge).split('|');
        if (extra !== undefined || !adjacency.has(a) || !adjacency.has(b)) continue;
        adjacency.get(a).add(b);
        adjacency.get(b).add(a);
    }
    return { chunks, adjacency };
}

function macroClaimedChunkKeys(expedition) {
    const claimed = new Set(['0,0']);
    for (const blocker of expedition?.blockers ?? []) {
        if (Number.isInteger(blocker?.chunkX) && Number.isInteger(blocker?.chunkY)) {
            claimed.add(`${blocker.chunkX},${blocker.chunkY}`);
        }
    }
    const queen = findNode(expedition, 'queen_chamber');
    if (Number.isInteger(queen?.chunkX) && Number.isInteger(queen?.chunkY)) {
        claimed.add(`${queen.chunkX},${queen.chunkY}`);
    }
    return [...claimed];
}

function assignmentFor(key, placementSource, extra = {}) {
    const coordinates = parseChunkKey(key);
    return coordinates ? {
        chunkKey: key,
        chunkX: coordinates.chunkX,
        chunkY: coordinates.chunkY,
        placementSource,
        ...extra
    } : null;
}

function territoryAnchorBeat(territory) {
    return territory?.beats?.find((beat) => beat.id === territory.contentAnchorBeatId)
        ?? territory?.beats?.find((beat) => beat.id === territory.anchorBeatId)
        ?? null;
}

function candidateChunksForReservation(reservation, index, distances, occupied, territories, seed) {
    const sourceTerritories = new Map(territories.map((territory) => [territory.id, territory]));
    const forbidden = new Set();
    for (const territoryId of reservation?.forbidAdjacentTo ?? []) {
        for (const beat of sourceTerritories.get(territoryId)?.beats ?? []) {
            forbidden.add(beat.ownerChunkKey);
            for (const neighbor of index.adjacency.get(beat.ownerChunkKey) ?? []) forbidden.add(neighbor);
        }
    }
    const candidates = [...index.chunks.entries()]
        .filter(([, chunk]) => chunk.ring === reservation.ring)
        .map(([key]) => key)
        .filter((key) => !occupied.has(key) && !forbidden.has(key));
    const role = reservation.role;
    return candidates.sort((a, b) => {
        const distanceA = distances.get(a) ?? Infinity;
        const distanceB = distances.get(b) ?? Infinity;
        if (role === 'entry' && distanceA !== distanceB) return distanceA - distanceB;
        if ((role === 'returnShortcut' || role === 'shipGoalObjective') && distanceA !== distanceB) {
            return distanceB - distanceA;
        }
        const rankA = stableHash(`${seed}|${reservation.id}|${a}`);
        const rankB = stableHash(`${seed}|${reservation.id}|${b}`);
        return rankA - rankB || distanceA - distanceB || a.localeCompare(b);
    });
}

/**
 * Project every manifest reservation to a stable route chunk. Territory state
 * variants explicitly share their territory heart; every other required room
 * receives exclusive ownership before local chunk generation begins.
 */
export function projectManifestReservations(expedition, manifestPlan, territoryPlan, crossingPlan) {
    const sourceReservations = getManifestReservations(manifestPlan);
    const index = routeIndex(expedition?.topology);
    const routeDistances = computeTopologyDistances(expedition?.topology);
    const assignments = new Map();
    const errors = [];
    const occupied = new Set(
        (territoryPlan?.territories ?? []).flatMap((territory) => (
            territory.beats.map((beat) => beat.ownerChunkKey)
        ))
    );
    occupied.add('0,0');

    const territoryById = new Map((territoryPlan?.territories ?? []).map((territory) => [territory.id, territory]));
    for (const territory of territoryPlan?.territories ?? []) {
        const anchor = territoryAnchorBeat(territory);
        const assignment = assignmentFor(anchor?.ownerChunkKey, 'territoryAnchor', {
            territoryId: territory.id,
            territoryBeatId: anchor?.id ?? null
        });
        if (!assignment) errors.push(`${territory.reservationId} has no allocated territory anchor`);
        else assignments.set(territory.reservationId, assignment);
    }

    // Consequence states are alternate presentations of one territory, not
    // competing physical reservations. Bind each alias to the same heart.
    for (const reservation of sourceReservations.filter((entry) => (
        entry.role === 'campStateAnchor' || entry.role === 'hiveStateAnchor'
    ))) {
        const territoryId = `territory:${reservation.siteId}`;
        const territory = territoryById.get(territoryId);
        const anchor = territoryAnchorBeat(territory);
        const assignment = assignmentFor(anchor?.ownerChunkKey, 'territoryStateAlias', {
            territoryId,
            territoryBeatId: anchor?.id ?? null,
            shareWithReservationId: territoryId
        });
        if (!assignment) errors.push(`${reservation.id} cannot resolve territory ${territoryId}`);
        else assignments.set(reservation.id, assignment);
    }

    for (const crossing of crossingPlan?.ringCrossings ?? []) {
        const reservationId = `crossing:${crossing.id}`;
        const assignment = assignmentFor(crossing.chunkKey, 'macroCrossing', { crossingId: crossing.id });
        if (!assignment) errors.push(`${reservationId} has no macro blocker chunk`);
        else {
            assignments.set(reservationId, assignment);
            occupied.add(crossing.chunkKey);
        }
    }

    const finale = sourceReservations.find((entry) => entry.id === 'site:queen_chamber');
    if (finale?.placement?.chunkKey) {
        assignments.set(finale.id, assignmentFor(finale.placement.chunkKey, 'macroSite'));
        occupied.add(finale.placement.chunkKey);
    }

    const unassigned = sourceReservations.filter((reservation) => !assignments.has(reservation.id));
    const records = unassigned.map((reservation) => ({
        reservation,
        candidates: candidateChunksForReservation(
            reservation,
            index,
            routeDistances,
            occupied,
            territoryPlan?.territories ?? [],
            Number(expedition.seed) >>> 0
        )
    })).sort((a, b) => (
        a.candidates.length - b.candidates.length
        || a.reservation.ring - b.reservation.ring
        || a.reservation.id.localeCompare(b.reservation.id)
    ));

    const used = new Set(occupied);
    const solve = (recordIndex) => {
        if (recordIndex >= records.length) return true;
        const record = records[recordIndex];
        for (const key of record.candidates) {
            if (used.has(key)) continue;
            used.add(key);
            assignments.set(record.reservation.id, assignmentFor(key, 'manifestSelection'));
            if (solve(recordIndex + 1)) return true;
            assignments.delete(record.reservation.id);
            used.delete(key);
        }
        return false;
    };
    if (!solve(0) && records.length > 0) {
        errors.push('manifest reservations have no conflict-free route-chunk allocation');
        for (const record of records) assignments.delete(record.reservation.id);
    }

    const reservations = sourceReservations.map((reservation) => ({
        ...reservation,
        ...(assignments.get(reservation.id) ?? {})
    }));
    for (const reservation of reservations) {
        if (reservation.required && !reservation.chunkKey) errors.push(`${reservation.id} has no projected chunk`);
    }
    return { reservations, errors };
}

/** Build the complete serializable Lane A handoff consumed by structure/runtime lanes. */
export function buildWorldPlan(expedition) {
    assertExpeditionShape(expedition);
    const manifestPlan = buildRingManifestPlan(expedition);
    const territoryReservations = getManifestReservations(manifestPlan)
        .filter((reservation) => Array.isArray(reservation.beats) && reservation.beats.length > 0);
    const territoryPlan = allocateTerritories(expedition.topology, territoryReservations, {
        seed: expedition.seed,
        claimedChunkKeys: macroClaimedChunkKeys(expedition)
    });
    const crossingPlan = buildRingCrossingPlan(expedition);
    const projection = projectManifestReservations(expedition, manifestPlan, territoryPlan, crossingPlan);
    const questFallbacks = manifestPlan.ringManifests
        .filter((manifest) => manifest.progression)
        .map((manifest) => ({
            goalKey: manifest.progression.goalKey,
            ring: manifest.progression.ring,
            unlocksCrossingId: manifest.progression.unlocksCrossingId,
            paths: manifest.progression.paths.map((path) => ({
                ...path,
                reservationIds: [...path.reservationIds],
                choiceDependencies: [...path.choiceDependencies]
            }))
        }));
    const worldPlan = {
        version: WORLD_PLAN_VERSION,
        seed: Number(expedition.seed) >>> 0,
        topology: expedition.topology,
        ringManifestVersion: manifestPlan.version,
        ringManifests: manifestPlan.ringManifests,
        reservations: projection.reservations,
        territoryPlanVersion: territoryPlan.version,
        territories: territoryPlan.territories,
        ringCrossingPlanVersion: crossingPlan.version,
        ringCrossings: crossingPlan.ringCrossings,
        requiredChunkSockets: territoryPlan.requiredChunkSockets,
        questFallbacks,
        diagnostics: {
            territory: territoryPlan.diagnostics,
            projectionErrors: projection.errors
        }
    };
    const validation = validateWorldPlan(worldPlan);
    worldPlan.diagnostics.valid = validation.valid;
    worldPlan.diagnostics.errors = validation.errors;
    return worldPlan;
}

export function getWorldReservation(worldPlan, reservationId) {
    return worldPlan?.reservations?.find((reservation) => reservation.id === reservationId) ?? null;
}

export function findWorldPlanReservationConflicts(worldPlan) {
    const occupants = new Map();
    for (const reservation of worldPlan?.reservations ?? []) {
        if (!reservation?.chunkKey || reservation.shareWithReservationId) continue;
        if (!occupants.has(reservation.chunkKey)) occupants.set(reservation.chunkKey, []);
        occupants.get(reservation.chunkKey).push(reservation.id);
    }
    const territoryBeats = new Map((worldPlan?.territories ?? []).flatMap((territory) => (
        territory.beats.map((beat) => [beat.ownerChunkKey, { territoryId: territory.id, beatId: beat.id }])
    )));
    const conflicts = [];
    for (const [chunkKey, reservationIds] of occupants) {
        if (reservationIds.length > 1) conflicts.push({ kind: 'reservation_overlap', chunkKey, reservationIds });
        const beat = territoryBeats.get(chunkKey);
        const allowedTerritoryAnchor = reservationIds.length === 1 && reservationIds[0] === beat?.territoryId;
        if (beat && !allowedTerritoryAnchor) {
            conflicts.push({
                kind: 'territory_overlap',
                chunkKey,
                reservationIds,
                territoryId: beat.territoryId,
                beatId: beat.beatId
            });
        }
    }
    return conflicts;
}

export function validateWorldPlan(worldPlan) {
    const errors = [];
    if (worldPlan?.version !== WORLD_PLAN_VERSION) errors.push(`unsupported world plan version ${worldPlan?.version}`);
    const manifestValidation = validateRingManifests(
        worldPlan?.ringManifests,
        worldPlan?.ringManifestVersion
    );
    errors.push(...manifestValidation.errors);
    const territoryReservations = (worldPlan?.ringManifests ?? [])
        .flatMap((manifest) => manifest.reservations ?? [])
        .filter((reservation) => Array.isArray(reservation.beats) && reservation.beats.length > 0);
    const territoryValidation = validateTerritoryPlan({
        version: worldPlan?.territoryPlanVersion,
        territories: worldPlan?.territories,
        requiredChunkSockets: worldPlan?.requiredChunkSockets,
        diagnostics: worldPlan?.diagnostics?.territory
    }, worldPlan?.topology, territoryReservations);
    errors.push(...territoryValidation.errors);
    const crossingValidation = validateRingCrossingPlan({
        version: worldPlan?.ringCrossingPlanVersion,
        seed: worldPlan?.seed,
        ringCrossings: worldPlan?.ringCrossings
    });
    errors.push(...crossingValidation.errors);
    errors.push(...(worldPlan?.diagnostics?.projectionErrors ?? []));

    const sourceIds = (worldPlan?.ringManifests ?? [])
        .flatMap((manifest) => manifest.reservations ?? [])
        .map((reservation) => reservation.id);
    const projectedIds = (worldPlan?.reservations ?? []).map((reservation) => reservation.id);
    if (new Set(projectedIds).size !== projectedIds.length) errors.push('projected reservation IDs must be unique');
    if (JSON.stringify(projectedIds) !== JSON.stringify(sourceIds)) {
        errors.push('projected reservations must preserve complete manifest order');
    }
    for (const reservation of worldPlan?.reservations ?? []) {
        if (reservation.required && !parseChunkKey(reservation.chunkKey)) {
            errors.push(`${reservation.id} has no valid projected chunk`);
        }
        if (reservation.shareWithReservationId) {
            const owner = getWorldReservation(worldPlan, reservation.shareWithReservationId);
            if (!owner || owner.chunkKey !== reservation.chunkKey) {
                errors.push(`${reservation.id} has invalid shared reservation ownership`);
            }
        }
    }
    for (const conflict of findWorldPlanReservationConflicts(worldPlan)) {
        errors.push(`${conflict.kind} at ${conflict.chunkKey}: ${conflict.reservationIds.join(', ')}`);
    }

    const index = routeIndex(worldPlan?.topology);
    const territories = new Map((worldPlan?.territories ?? []).map((territory) => [territory.id, territory]));
    for (const reservation of (worldPlan?.reservations ?? []).filter((entry) => entry.role === 'campObjective')) {
        const source = territories.get(reservation.sourceTerritoryId);
        const forbidden = new Set((source?.beats ?? []).flatMap((beat) => [
            beat.ownerChunkKey,
            ...(index.adjacency.get(beat.ownerChunkKey) ?? [])
        ]));
        if (forbidden.has(reservation.chunkKey)) {
            errors.push(`${reservation.id} is adjacent to its camp territory`);
        }
    }
    const distances = computeTopologyDistances(worldPlan?.topology);
    for (const manifest of worldPlan?.ringManifests ?? []) {
        const entry = getWorldReservation(worldPlan, `ring-${manifest.ring}:entry`);
        const shortcut = getWorldReservation(worldPlan, `ring-${manifest.ring}:return-shortcut`);
        if ((distances.get(shortcut?.chunkKey) ?? -Infinity) <= (distances.get(entry?.chunkKey) ?? Infinity)) {
            errors.push(`ring ${manifest.ring} return shortcut is not deeper than its entry`);
        }
    }
    const fallbackProof = proveStructuralFallbackViability(worldPlan?.ringManifests ?? []);
    for (const result of fallbackProof) {
        if (!result.viable) errors.push(`${result.goalKey} has no projected structural fallback`);
    }
    return { valid: errors.length === 0, errors };
}
