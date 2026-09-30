const ROOM_LIGHT_PALETTES = Object.freeze({
    active: Object.freeze({ color: 0x71cddf, intensity: 1.45, distance: 7.5 }),
    cryo: Object.freeze({ color: 0x9ddcff, intensity: 1.35, distance: 7.0 }),
    bio: Object.freeze({ color: 0x63e6a7, intensity: 1.2, distance: 6.5 })
});

const ROOM_ROLE_DISPLAY_PROFILES = Object.freeze({
    generic: Object.freeze({ family: 'operations', color: 0x71cddf, width: 1.0, height: 0.42, segments: 1 }),
    utility: Object.freeze({ family: 'engineering', color: 0xffb347, width: 1.16, height: 0.38, segments: 2 }),
    engineering: Object.freeze({ family: 'engineering', color: 0xffb347, width: 1.16, height: 0.38, segments: 2 }),
    objective: Object.freeze({ family: 'engineering', color: 0xffb347, width: 1.16, height: 0.38, segments: 2 }),
    medical: Object.freeze({ family: 'medical', color: 0x7de6ff, width: 1.28, height: 0.34, segments: 3 }),
    'cryo-lab': Object.freeze({ family: 'cryo', color: 0xbbefff, width: 1.34, height: 0.3, segments: 3 }),
    security: Object.freeze({ family: 'security', color: 0xff5147, width: 0.94, height: 0.5, segments: 2 }),
    storage: Object.freeze({ family: 'logistics', color: 0xffd27a, width: 0.84, height: 0.34, segments: 1 }),
    reward: Object.freeze({ family: 'logistics', color: 0xffd27a, width: 0.84, height: 0.34, segments: 1 }),
    camp: Object.freeze({ family: 'logistics', color: 0xffd27a, width: 0.84, height: 0.34, segments: 1 }),
    nest: Object.freeze({ family: 'bio', color: 0x63e6a7, width: 0.62, height: 0.74, segments: 1 }),
    hive: Object.freeze({ family: 'bio', color: 0x63e6a7, width: 0.62, height: 0.74, segments: 1 })
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
        // Keep the luminous strips against a consistent architectural edge,
        // not floating over the room centre where the generator has no ceiling.
        const targetX = longAxis === 'x'
            ? centerX + (width - 1) * offset
            : bounds.minX;
        const targetY = longAxis === 'y'
            ? centerY + (depth - 1) * offset
            : bounds.minY;
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
 * Plan a compact role-identification console against a room's north or west
 * back wall. Profile proportions and screen segmentation supplement colour so
 * the room grammar remains readable under colour-vision filters.
 */
export function planRoomRoleDisplay(room, { biome = 'active' } = {}) {
    const cells = room?.interior ?? [];
    const bounds = boundsForCells(cells);
    if (!bounds) return null;

    const fallbackRole = biome === 'cryo' ? 'cryo-lab' : biome === 'bio' ? 'hive' : 'generic';
    const role = ROOM_ROLE_DISPLAY_PROFILES[room?.role] ? room.role : fallbackRole;
    const profile = ROOM_ROLE_DISPLAY_PROFILES[role];
    const width = bounds.maxX - bounds.minX + 1;
    const depth = bounds.maxY - bounds.minY + 1;
    const wall = width >= depth ? 'north' : 'west';
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const anchorCell = closestCell(
        cells,
        wall === 'north' ? centerX : bounds.minX,
        wall === 'north' ? bounds.minY : centerY
    );
    const gap = 0.055;
    const segmentWidth = (profile.width - gap * (profile.segments - 1)) / profile.segments;
    const startOffset = -((profile.segments - 1) * (segmentWidth + gap)) / 2;
    const screens = Array.from({ length: profile.segments }, (_, index) => ({
        offset: startOffset + index * (segmentWidth + gap),
        width: segmentWidth,
        height: profile.height,
        color: profile.color
    }));

    return {
        role,
        family: profile.family,
        wall,
        x: wall === 'west' ? bounds.minX - 0.46 : anchorCell.x,
        z: wall === 'north' ? bounds.minY - 0.46 : anchorCell.y,
        rotationY: wall === 'west' ? Math.PI / 2 : 0,
        width: profile.width + 0.16,
        height: profile.height + 0.16,
        screens
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

export function cameraCutawayQuadrant(azimuth = Math.PI / 4, previous = null, hysteresis = 0.08) {
    const x = Math.sin(azimuth);
    const z = Math.cos(azimuth);
    let zSide = z >= 0 ? 's' : 'n';
    let xSide = x >= 0 ? 'e' : 'w';
    if (previous && Math.abs(z) < hysteresis) zSide = previous[0];
    if (previous && Math.abs(x) < hysteresis) xSide = previous[1];
    return `${zSide}${xSide}`;
}

export function planRoomCutawayCells(room, grid, quadrant = 'se') {
    if (!room?.interior?.length || !grid) return [];
    const cells = new Map();
    const xStep = quadrant.includes('e') ? 1 : -1;
    const yStep = quadrant.includes('s') ? 1 : -1;
    for (const interior of room.interior) {
        for (const candidate of [
            { x: interior.x + xStep, y: interior.y },
            { x: interior.x, y: interior.y + yStep }
        ]) {
            if (grid[candidate.y]?.[candidate.x] === '#') {
                cells.set(`${candidate.x},${candidate.y}`, candidate);
            }
        }
    }
    return [...cells.values()];
}

export function planRoomBoundaryCells(room, grid) {
    if (!room?.interior?.length || !grid) return [];
    const cells = new Map();
    for (const quadrant of ['se', 'sw', 'ne', 'nw']) {
        for (const cell of planRoomCutawayCells(room, grid, quadrant)) {
            cells.set(`${cell.x},${cell.y}`, cell);
        }
    }
    return [...cells.values()];
}

export function planDefaultRoomCutawayCells(room, grid) {
    return planRoomCutawayCells(room, grid, 'se');
}

export const ROOM_CUTAWAY_HEIGHT = 0.82;
