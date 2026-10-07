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
