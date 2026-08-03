const SIDE_OFFSETS = Object.freeze({
    north: [0, -1, 'south'],
    east: [1, 0, 'west'],
    south: [0, 1, 'north'],
    west: [-1, 0, 'east']
});

export function extractChunkPortals(grid) {
    const size = grid?.length ?? 0;
    const hasWalkable = (cells) => cells.some(([x, y]) => {
        const tile = grid?.[y]?.[x];
        return tile === '.' || tile === 'D' || tile === 'R' || tile === 'B' || tile === 'L';
    });
    return {
        north: hasWalkable(Array.from({ length: size }, (_, x) => [x, 0])),
        east: hasWalkable(Array.from({ length: size }, (_, y) => [size - 1, y])),
        south: hasWalkable(Array.from({ length: size }, (_, x) => [x, size - 1])),
        west: hasWalkable(Array.from({ length: size }, (_, y) => [0, y]))
    };
}

export function buildWorldRouteGraph(chunkRecords) {
    const byKey = new Map((chunkRecords ?? []).map((record) => [record.key, record]));
    const graph = new Map([...byKey.keys()].map((key) => [key, new Set()]));
    for (const record of byKey.values()) {
        for (const [side, [dx, dy, opposite]] of Object.entries(SIDE_OFFSETS)) {
            if (!record.portals?.[side]) continue;
            const neighborKey = `${record.chunkX + dx},${record.chunkY + dy}`;
            const neighbor = byKey.get(neighborKey);
            if (!neighbor?.portals?.[opposite]) continue;
            graph.get(record.key).add(neighborKey);
        }
    }
    return graph;
}

export function reachableChunkKeys(graph, startKey = '0,0') {
    if (!graph.has(startKey)) return new Set();
    const seen = new Set([startKey]);
    const queue = [startKey];
    while (queue.length > 0) {
        const current = queue.shift();
        for (const next of graph.get(current) ?? []) {
            if (seen.has(next)) continue;
            seen.add(next);
            queue.push(next);
        }
    }
    return seen;
}
