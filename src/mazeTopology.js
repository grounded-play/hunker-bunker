function edgeKey(a, b) {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function shortestDistance(openEdges, neighbors, start, goal) {
    const queue = [{ index: start, distance: 0 }];
    const seen = new Set([start]);
    while (queue.length > 0) {
        const current = queue.shift();
        if (current.index === goal) return current.distance;
        for (const { index: next } of neighbors[current.index]) {
            if (!openEdges.has(edgeKey(current.index, next)) || seen.has(next)) continue;
            seen.add(next);
            queue.push({ index: next, distance: current.distance + 1 });
        }
    }
    return Infinity;
}

export function injectBoundedLoops(openEdges, neighbors, roles, random, {
    chance = 0.35,
    maxLoops = 1,
    minCycleLength = 4,
    forbiddenEdges = new Set()
} = {}) {
    const result = new Set(openEdges);
    if (maxLoops <= 0 || random() > chance) return result;
    const candidates = [];
    for (let from = 0; from < neighbors.length; from += 1) {
        for (const { index: to } of neighbors[from]) {
            if (from >= to) continue;
            const key = edgeKey(from, to);
            if (result.has(key) || forbiddenEdges.has(key)) continue;
            if (roles[from] === 'room' && roles[to] === 'room') continue;
            const distance = shortestDistance(result, neighbors, from, to);
            if (!Number.isFinite(distance) || distance + 1 < minCycleLength) continue;
            candidates.push({ key, score: distance + random() });
        }
    }
    candidates.sort((a, b) => b.score - a.score);
    const loopCount = Math.min(maxLoops, candidates.length);
    for (let index = 0; index < loopCount; index += 1) result.add(candidates[index].key);
    return result;
}

export function graphHasCycle(openEdges, nodeCount) {
    return openEdges.size >= nodeCount;
}
