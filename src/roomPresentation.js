const ROOM_LIGHT_PALETTES = Object.freeze({
    active: Object.freeze({ color: 0x71cddf, intensity: 1.45, distance: 7.5 }),
    cryo: Object.freeze({ color: 0x9ddcff, intensity: 1.35, distance: 7.0 }),
    bio: Object.freeze({ color: 0x63e6a7, intensity: 1.2, distance: 6.5 })
});

function boundsForCells(cells) {
    if (!cells?.length) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const cell of cells) {
        minX = Math.min(minX, cell.x);
        maxX = Math.max(maxX, cell.x);
        minY = Math.min(minY, cell.y);
        maxY = Math.max(maxY, cell.y);
    }
    return { minX, maxX, minY, maxY };
}

function closestCell(cells, targetX, targetY) {
    return cells.reduce((best, cell) => {
        const distance = ((cell.x - targetX) ** 2) + ((cell.y - targetY) ** 2);
        return !best || distance < best.distance ? { cell, distance } : best;
    }, null)?.cell ?? null;
}

/**
 * Produce a small, deterministic practical-light plan from authored room cells.
 * The returned fixtures are emissive geometry; one proxy per room feeds the
 * renderer's fixed environmental-light pool.
 */
export function planRoomPracticalLights(room, { biome = 'active' } = {}) {
    const cells = room?.interior ?? [];
    const bounds = boundsForCells(cells);
    if (!bounds) return { fixtures: [], proxy: null };

    const paletteKey = ROOM_LIGHT_PALETTES[biome] ? biome : 'active';
    const palette = ROOM_LIGHT_PALETTES[paletteKey];
    const width = bounds.maxX - bounds.minX + 1;
    const depth = bounds.maxY - bounds.minY + 1;
    const longAxis = width >= depth ? 'x' : 'y';
    const fixtureCount = Math.max(width, depth) >= 5 ? 2 : 1;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const offsets = fixtureCount === 2 ? [-0.24, 0.24] : [0];
    const fixtures = offsets.map((offset) => {
        const targetX = longAxis === 'x' ? centerX + (width - 1) * offset : centerX;
        const targetY = longAxis === 'y' ? centerY + (depth - 1) * offset : centerY;
        const cell = closestCell(cells, targetX, targetY);
        return {
            x: cell.x,
            z: cell.y,
            rotationY: longAxis === 'x' ? 0 : Math.PI / 2,
            color: palette.color,
            paletteKey
        };
    });
    const proxyCell = closestCell(cells, centerX, centerY);

    return {
        fixtures,
        proxy: {
            x: proxyCell.x,
            z: proxyCell.y,
            color: palette.color,
            intensity: palette.intensity,
            distance: palette.distance
        }
    };
}

/**
 * The default isometric camera looks from +X/+Z toward the operator. A room
 * wall is foreground architecture when its inward neighbour lies west or
 * north of it. Keeping this pure makes the convention explicit and testable.
 */
export function isDefaultCameraFacingRoomWall(cell, room) {
    if (!cell || !room?.interior?.length) return false;
    const interior = new Set(room.interior.map((entry) => `${entry.x},${entry.y}`));
    return interior.has(`${cell.x - 1},${cell.y}`)
        || interior.has(`${cell.x},${cell.y - 1}`);
}

export function planDefaultRoomCutawayCells(room, grid) {
    if (!room?.interior?.length || !grid) return [];
    const cells = new Map();
    for (const interior of room.interior) {
        for (const candidate of [
            { x: interior.x + 1, y: interior.y },
            { x: interior.x, y: interior.y + 1 }
        ]) {
            if (grid[candidate.y]?.[candidate.x] === '#') {
                cells.set(`${candidate.x},${candidate.y}`, candidate);
            }
        }
    }
    return [...cells.values()];
}

export const ROOM_CUTAWAY_HEIGHT = 0.82;
