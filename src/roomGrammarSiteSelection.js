// G5 site choice stays pure so a campaign can persist the selected chunk before
// any chunk is generated. Callers supply route facts; this module never inspects
// load order or mutable world state.

function stableHash(value) {
    let hash = 2166136261;
    for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
    return hash >>> 0;
}

export function scoreGrammarSite(candidate, {
    targetTravel = 2,
    minimumSafeRadius = 4,
    requireQuestCompatibility = true
} = {}) {
    if (!candidate?.reachable || candidate.occupied) return null;
    if (requireQuestCompatibility && candidate.questCompatible === false) return null;
    const safeRadius = Number(candidate.safeRadius) || 0;
    if (safeRadius < minimumSafeRadius) return null;
    const travel = Math.max(0, Number(candidate.travelDistance) || 0);
    const routeLinks = Math.max(0, Number(candidate.routeAdjacency) || 0);
    const exitCount = Math.max(0, Number(candidate.exitCount) || 0);
    return safeRadius * 12 + Math.min(routeLinks, 4) * 8 + Math.min(exitCount, 3) * 5
        - Math.abs(travel - targetTravel) * 6;
}

export function chooseGrammarSite(candidates, options = {}) {
    const seed = Number(options.seed) || 0;
    return (candidates ?? [])
        .map((candidate) => ({ candidate, score: scoreGrammarSite(candidate, options) }))
        .filter(({ score }) => score !== null)
        .sort((a, b) => b.score - a.score
            || stableHash(`${seed}:${a.candidate.id}`) - stableHash(`${seed}:${b.candidate.id}`)
            || String(a.candidate.id).localeCompare(String(b.candidate.id)))[0]?.candidate ?? null;
}

export const ROOM_GRAMMAR_SITE_PLAN_VERSION = 1;

export const ARRIVAL_MOTIFS = Object.freeze([
    'sheltered-crash-bay',
    'maintenance-landing',
    'breached-cargo-court'
]);

export const CAMP_MOTIFS = Object.freeze([
    'inhabited-hearth-court',
    'sheltered-crescent-camp',
    'occupied-maintenance-alcove'
]);

function topologyFacts(topology) {
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
    const distances = new Map([['0,0', 0]]);
    const queue = ['0,0'];
    for (let index = 0; index < queue.length; index += 1) {
        const key = queue[index];
        for (const neighbor of adjacency.get(key) ?? []) {
            if (distances.has(neighbor)) continue;
            distances.set(neighbor, distances.get(key) + 1);
            queue.push(neighbor);
        }
    }
    return { chunks, adjacency, distances };
}

function chooseMotif(ids, seed, facts) {
    return chooseGrammarSite(ids.map((id) => ({
        id,
        reachable: true,
        occupied: false,
        questCompatible: true,
        safeRadius: facts.safeRadius,
        travelDistance: facts.travelDistance,
        routeAdjacency: facts.routeAdjacency,
        exitCount: facts.exitCount
    })), { seed, targetTravel: facts.travelDistance })?.id ?? ids[0];
}

/**
 * Selects G5's fixed-origin arrival presentation and one inhabited camp court.
 * The selections live in WorldPlan before chunk mounting, so generation order,
 * reloads and serialized plan comparisons cannot reroll them. The arrival is
 * the crash origin itself, which no reservation covers.
 */
export function planRoomGrammarSites(worldPlan) {
    const seed = Number(worldPlan?.seed) >>> 0;
    const { chunks, adjacency, distances } = topologyFacts(worldPlan?.topology);
    const camps = (worldPlan?.reservations ?? [])
        .filter((entry) => entry.role === 'campTerritory')
        .map((reservation) => {
            const links = adjacency.get(reservation.chunkKey)?.size ?? 0;
            return {
                id: reservation.id,
                reservation,
                reachable: chunks.has(reservation.chunkKey) && distances.has(reservation.chunkKey),
                occupied: false,
                questCompatible: Boolean(reservation.siteId),
                safeRadius: 5 + Math.min(2, links),
                travelDistance: distances.get(reservation.chunkKey) ?? Number.MAX_SAFE_INTEGER,
                routeAdjacency: links,
                exitCount: links
            };
        });
    const camp = chooseGrammarSite(camps, { seed: seed ^ 0x43414d50, targetTravel: 5 });
    const arrivalLinks = adjacency.get('0,0')?.size ?? 1;
    const arrivalFacts = { safeRadius: 8, travelDistance: 0, routeAdjacency: arrivalLinks, exitCount: arrivalLinks };
    const campFacts = camp ?? { safeRadius: 6, travelDistance: 5, routeAdjacency: 2, exitCount: 2 };
    return {
        version: ROOM_GRAMMAR_SITE_PLAN_VERSION,
        arrival: {
            chunkKey: worldPlan?.topology?.startChunkKey ?? '0,0',
            profile: 'safe-arrival',
            tier: 'standard',
            motifId: chooseMotif(ARRIVAL_MOTIFS, seed ^ 0x41525249, arrivalFacts),
            roomOrigin: { x: 1, y: 1 },
            bindings: {
                player: 'party-spawn',
                shipConsole: 'ship-console',
                firstExit: 'first-exit',
                tutorial: 'tutorial'
            }
        },
        camp: camp ? {
            reservationId: camp.reservation.id,
            siteId: camp.reservation.siteId,
            chunkKey: camp.reservation.chunkKey,
            profile: 'camp-court',
            tier: 'major',
            motifId: chooseMotif(CAMP_MOTIFS, seed ^ stableHash(camp.id), campFacts),
            bindings: {
                camp: 'hearth',
                approach: 'arrival',
                services: 'services',
                sleep: 'sleep'
            }
        } : null
    };
}

/**
 * The plan's reservations with the camp court applied: only for a world whose
 * room grammar is on (the solo grammar pilot). Shared plans, co-op peers and
 * saves use the plain reservations, so nothing changes for them.
 */
export function bindRoomGrammarSites(reservations, sitePlan, seed) {
    const selections = [sitePlan?.camp].filter(Boolean);
    return (reservations ?? []).map((reservation) => {
        const selection = selections.find((entry) => (
            entry.reservationId === reservation.id
            || (entry.siteId && entry.siteId === reservation.siteId && reservation.role === 'campStateAnchor')
        ));
        if (!selection) return reservation;
        return {
            ...reservation,
            roomGrammarProfile: selection.profile,
            roomGrammarTier: selection.tier,
            roomGrammarMotif: selection.motifId,
            roomGrammarSeed: stableHash(`${Number(seed) >>> 0}|${selection.reservationId}`),
            ...(selection.roomOrigin ? { roomGrammarOrigin: { ...selection.roomOrigin } } : {}),
            semanticAnchorBindings: { ...selection.bindings }
        };
    });
}

/** Errors for a plan's G5 selections; none when they match the plan. */
export function validateRoomGrammarSites(worldPlan) {
    const sites = worldPlan?.roomGrammarSites;
    if (!sites) return [];
    const errors = [];
    if (sites.version !== ROOM_GRAMMAR_SITE_PLAN_VERSION) {
        errors.push(`unsupported room grammar site plan version ${sites.version}`);
    }
    const start = worldPlan?.topology?.startChunkKey ?? '0,0';
    if (!sites.arrival || sites.arrival.chunkKey !== start || !ARRIVAL_MOTIFS.includes(sites.arrival.motifId)) {
        errors.push('room grammar arrival selection does not match the crash origin');
    }
    if (sites.camp) {
        const reservation = (worldPlan.reservations ?? []).find((entry) => entry.id === sites.camp.reservationId);
        if (!reservation || reservation.role !== 'campTerritory' || reservation.chunkKey !== sites.camp.chunkKey
            || reservation.siteId !== sites.camp.siteId || !CAMP_MOTIFS.includes(sites.camp.motifId)) {
            errors.push('room grammar camp selection does not match its reservation');
        }
    }
    return errors;
}
