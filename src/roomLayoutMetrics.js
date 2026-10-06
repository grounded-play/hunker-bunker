// Geometry-only measurements: decoration, translation and quarter-turns do not
// count as new layouts. Full strings avoid hash collisions in portfolio reports.
const WALKABLE = new Set(['.', 'D', 'R', 'B', 'L']);

export function measureRoomLayout(grid, bounds = null) {
    const cells = [];
    for (let y = bounds?.top ?? 0; y <= (bounds?.bottom ?? grid.length - 1); y += 1) {
        for (let x = bounds?.left ?? 0; x <= (bounds?.right ?? grid[y].length - 1); x += 1) {
            if (WALKABLE.has(grid[y]?.[x])) cells.push({ x, y });
        }
    }
    if (!cells.length) return { floorArea: 0, width: 0, height: 0, signature: '' };
    const minX = Math.min(...cells.map(p => p.x));
    const minY = Math.min(...cells.map(p => p.y));
    const width = Math.max(...cells.map(p => p.x)) - minX + 1;
    const height = Math.max(...cells.map(p => p.y)) - minY + 1;
    let pattern = Array.from({ length: height }, () => Array(width).fill('#'));
    for (const p of cells) pattern[p.y - minY][p.x - minX] = '.';
    const rotations = [];
    for (let i = 0; i < 4; i += 1) {
        rotations.push(pattern.map(row => row.join('')).join('/'));
        pattern = Array.from({ length: pattern[0].length }, (_, x) =>
            Array.from({ length: pattern.length }, (_, y) => pattern[pattern.length - 1 - y][x]));
    }
    return { floorArea: cells.length, width, height, signature: rotations.sort()[0] };
}
