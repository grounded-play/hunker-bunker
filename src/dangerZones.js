// Radar danger zones. A canyon rim or cliff is dozens of lethal tiles; ringing
// each one turned a single hazard into a field of red circles. Connected
// danger tiles are grouped into one zone, and a zone is outlined only along
// its lip -- the edges that border ground the carrier can stand on -- which
// is exactly where the fall happens.

const EIGHT_WAY = Object.freeze([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
const SIDES = Object.freeze([
    ['n', 0, -1],
    ['s', 0, 1],
    ['w', -1, 0],
    ['e', 1, 0]
]);

/**
 * @param {Map<string, object>} dangerTiles "x,z" -> hole info ({ x, z, ... })
 * @param {(x: number, z: number) => boolean} isWalkable
 * @param {{ x: number, z: number }} origin scan centre, for reveal order
 * @returns {{ key: string, tiles: object[], lipEdges: { x: number, z: number, side: string }[],
 *             lipTiles: object[], minDistance: number }[]}
 */
export function groupDangerZones(dangerTiles, isWalkable, origin = { x: 0, z: 0 }) {
    const seen = new Set();
    const zones = [];
    for (const [startKey, startInfo] of dangerTiles) {
        if (seen.has(startKey)) continue;
        seen.add(startKey);
        const tiles = [];
        const queue = [startInfo];
        while (queue.length) {
            const tile = queue.pop();
            tiles.push(tile);
            for (const [dx, dz] of EIGHT_WAY) {
                const key = `${tile.x + dx},${tile.z + dz}`;
                if (seen.has(key) || !dangerTiles.has(key)) continue;
                seen.add(key);
                queue.push(dangerTiles.get(key));
            }
        }
        const lipEdges = [];
        const lipTiles = [];
        let minDistance = Infinity;
        for (const tile of tiles) {
            let onLip = false;
            for (const [side, dx, dz] of SIDES) {
                const nx = tile.x + dx;
                const nz = tile.z + dz;
                if (dangerTiles.has(`${nx},${nz}`) || !isWalkable(nx, nz)) continue;
                lipEdges.push({ x: tile.x, z: tile.z, side });
                onLip = true;
            }
            if (onLip) {
                lipTiles.push(tile);
                minDistance = Math.min(minDistance, Math.hypot(tile.x - origin.x, tile.z - origin.z));
            }
        }
        tiles.sort((a, b) => (a.z - b.z) || (a.x - b.x));
        zones.push({ key: `${tiles[0].x},${tiles[0].z}`, tiles, lipEdges, lipTiles, minDistance });
    }
    return zones;
}

/**
 * Flat quads (x0, z0, x1, z1) for a zone's lip: a thin bar on every lip edge
 * of a unit tile centred on its integer coordinate, pulled slightly inward so
 * it sits on the danger side of the rim.
 */
export function lipEdgeQuads(lipEdges, thickness = 0.12) {
    return lipEdges.map(({ x, z, side }) => {
        switch (side) {
            case 'n': return [x - 0.5, z - 0.5, x + 0.5, z - 0.5 + thickness];
            case 's': return [x - 0.5, z + 0.5 - thickness, x + 0.5, z + 0.5];
            case 'w': return [x - 0.5, z - 0.5, x - 0.5 + thickness, z + 0.5];
            default: return [x + 0.5 - thickness, z - 0.5, x + 0.5, z + 0.5];
        }
    });
}
