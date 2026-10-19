import { addWallShell, carveDisk, carveLine, constrainBorderSockets } from './architecturalMaze.js';
import { CRASH_SITE_BUILD } from './data/crashSiteBuild.js';

const WALKABLE = new Set(['.', 'D', 'R', 'B', 'L']);

function fill(grid, value) {
    for (const row of grid ?? []) row.fill(value);
}

export function stampCrashSiteOrigin(grid, build = CRASH_SITE_BUILD, {
    exteriorTile = 'C',
    wallTile = '#',
    floorTile = '.'
} = {}) {
    if (!Array.isArray(grid) || grid.length === 0) return false;
    fill(grid, exteriorTile);
    const room = build.primaryChamber;
    for (let y = Math.max(0, room.top - 1); y <= Math.min(grid.length - 1, room.bottom + 1); y += 1) {
        for (let x = Math.max(0, room.left - 1); x <= Math.min(grid[y].length - 1, room.right + 1); x += 1) {
            const inside = x >= room.left && x <= room.right && y >= room.top && y <= room.bottom;
            grid[y][x] = inside ? floorTile : wallTile;
        }
    }
    const centerX = build.center.x;
    const preHall = build.northPreHall;
    for (let y = preHall.top; y <= preHall.bottom; y += 1) {
        const halfWidth = y === preHall.top
            ? (preHall.socketHalfWidth ?? preHall.halfWidth)
            : preHall.halfWidth;
        for (let x = centerX - halfWidth; x <= centerX + halfWidth; x += 1) {
            grid[y][x] = floorTile;
        }
        grid[y][centerX - halfWidth - 1] = wallTile;
        grid[y][centerX + halfWidth + 1] = wallTile;
    }
    for (const partition of build.sectorZero?.partitions ?? []) {
        const openings = new Set(partition.openings ?? []);
        for (let cursor = partition.from; cursor <= partition.to; cursor += 1) {
            if (openings.has(cursor)) continue;
            const x = partition.axis === 'vertical' ? partition.at : cursor;
            const y = partition.axis === 'horizontal' ? partition.at : cursor;
            if (grid[y]?.[x] !== undefined) grid[y][x] = wallTile;
        }
    }
    return true;
}

/**
 * Origin-chunk cells that dressing must leave walkable: the three-cell exit
 * hall behind the blast door, the door row, and the declared maneuver lane
 * down the room (data/crashSiteBuild.js). Local = world in the origin chunk.
 */
export function crashSiteClearCells(build = CRASH_SITE_BUILD) {
    const lane = build.clearManeuverLane;
    const cells = [];
    for (let y = build.northPreHall.top; y <= lane.toZ; y += 1) {
        const halfWidth = y === build.northPreHall.top
            ? (build.northPreHall.socketHalfWidth ?? build.northPreHall.halfWidth)
            : Math.max(build.northPreHall.halfWidth, lane.halfWidth);
        for (let x = lane.centerX - halfWidth; x <= lane.centerX + halfWidth; x += 1) cells.push({ x, y });
    }
    return cells;
}

function borderOpenings(grid) {
    const size = grid.length;
    const groups = [];
    const scan = (side, cells) => {
        let run = [];
        const flush = () => {
            if (run.length) groups.push({ side, cell: run[Math.floor(run.length / 2)] });
            run = [];
        };
        for (const cell of cells) {
            if (WALKABLE.has(grid[cell.y]?.[cell.x])) run.push(cell);
            else flush();
        }
        flush();
    };
    scan('north', Array.from({ length: size }, (_, x) => ({ x, y: 0 })));
    scan('south', Array.from({ length: size }, (_, x) => ({ x, y: size - 1 })));
    scan('west', Array.from({ length: size }, (_, y) => ({ x: 0, y })));
    scan('east', Array.from({ length: size }, (_, y) => ({ x: size - 1, y })));
    return groups;
}

function openingRecord(opening) {
    const coordinate = opening.side === 'north' || opening.side === 'south'
        ? opening.cell.x
        : opening.cell.y;
    return { open: true, offset: Math.max(0, Math.round((coordinate - 1) / 2)) };
}

function floodWalkable(grid, start) {
    if (!WALKABLE.has(grid[start.y]?.[start.x])) return new Set();
    const seen = new Set([`${start.x},${start.y}`]);
    const queue = [start];
    for (let index = 0; index < queue.length; index += 1) {
        const cell = queue[index];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const x = cell.x + dx;
            const y = cell.y + dy;
            const key = `${x},${y}`;
            if (seen.has(key) || !WALKABLE.has(grid[y]?.[x])) continue;
            seen.add(key);
            queue.push({ x, y });
        }
    }
    return seen;
}

/** Validate every named crash-site room and ship system against the same
 * connected floor component as the wreck. This turns layout connectivity
 * into a build invariant instead of relying on visual inspection. */
export function validateCrashSiteRooms(originGrid, build = CRASH_SITE_BUILD) {
    if (!Array.isArray(originGrid)) return { valid: false, reason: 'missing-grid' };
    const start = { x: Math.round(build.center.x), y: Math.round(build.center.z) };
    const reachable = floodWalkable(originGrid, start);
    const targets = (build.sectorZero?.rooms ?? []).map((room) => ({
        id: room.id,
        x: Math.round((room.left + room.right) / 2),
        y: Math.round((room.top + room.bottom) / 2)
    }));
    const o2Offset = build.shipSystems?.o2ModuleOffset;
    if (o2Offset) targets.push({
        id: 'ship-o2-module',
        x: Math.round(build.center.x + o2Offset.x),
        y: Math.round(build.center.z + o2Offset.z)
    });
    for (const target of targets) {
        if (!reachable.has(`${target.x},${target.y}`)) {
            return { valid: false, reason: 'authored-room-unreachable', targetId: target.id };
        }
    }
    return { valid: true, reason: null };
}

export function stampCrashSiteApproach(grid, build = CRASH_SITE_BUILD, {
    solidTile = 'X',
    floorTile = '.',
    variant = 0
} = {}) {
    if (!Array.isArray(grid) || grid.length < 15) return null;
    let captured = borderOpenings(grid);
    const requiredSouth = { side: 'south', cell: { x: build.center.x, y: grid.length - 1 } };
    // The origin does not connect to an arbitrary south portal: it connects
    // to this exact three-cell socket. Preserve the other sides, but replace
    // any generated south opening with the authored shared boundary.
    captured = [...captured.filter(({ side }) => side !== 'south'), requiredSouth];

    fill(grid, solidTile);
    const approach = build.serviceApproach;
    const hub = approach.hub;
    const release = approach.releaseBounds;
    const layoutVariant = Math.abs(Math.trunc(variant)) % 4;
    // Every variant shares one concrete, readable staging room. Variants add
    // side pockets without replacing the room, so a seed can no longer turn
    // the first destination into what looks like disconnected cave fragments.
    for (let y = release.top; y <= release.bottom; y += 1) {
        for (let x = release.left; x <= release.right; x += 1) grid[y][x] = floorTile;
    }
    if (layoutVariant !== 0) {
        const satellites = layoutVariant === 1
            ? [{ x: hub.x + 10, y: hub.y + 3 }]
            : layoutVariant === 2
                ? [{ x: hub.x - 8, y: hub.y - 7 }, { x: hub.x + 10, y: hub.y - 7 }]
                : [{ x: hub.x + 11, y: hub.y - 3 }];
        for (const satellite of satellites) {
            carveDisk(grid, satellite.x, satellite.y, 2);
            carveLine(grid, satellite, hub, 1);
        }
    }
    carveDisk(grid, hub.x, hub.y, approach.halfWidth);
    for (const opening of captured) carveLine(grid, opening.cell, hub, approach.halfWidth);

    const openings = Object.fromEntries(['north', 'south', 'west', 'east'].map((side) => [side, { open: false, offset: 0 }]));
    for (const opening of captured) openings[opening.side] = openingRecord(opening);
    constrainBorderSockets(grid, openings);
    // Shell last, like every other chunk generator: constrainBorderSockets
    // re-solidifies the two border rows, so a shell built before it left the
    // shared socket running between bare border cells (later turned into
    // walkable ledge) instead of walls.
    addWallShell(grid);

    const markerYs = [];
    for (let y = grid.length - 2; y > hub.y + 1; y -= 6) markerYs.push(y);
    markerYs.push(hub.y);
    const wayfindingMarkers = [...new Set(markerYs)]
        .filter((y) => grid[y]?.[build.center.x] === floorTile)
        .map((y, cadence, all) => ({
            x: build.center.x,
            y,
            width: approach.halfWidth,
            cadence,
            landmark: y === hub.y,
            archetypeId: 'crash_service_approach',
            dressingKit: y === hub.y ? 'airlock_threshold' : 'bunker_utility',
            lightingRhythm: y === hub.y ? 'pulsing' : 'even',
            routeMarkerCount: all.length
        }));
    return {
        generatorId: 'crash-site-approach',
        buildId: build.id,
        variant: layoutVariant,
        architectural: {
            mode: 'crash-approach',
            variant: layoutVariant
        },
        stagingRoom: { ...release },
        width: approach.halfWidth * 2 + 1,
        hub: { ...hub },
        openings,
        wayfindingMarkers,
        roomInstances: [],
        doors: [],
        sharedPortals: [{
            id: `portal:${build.originChunk.x},${build.originChunk.y}:${build.approachChunk.x},${build.approachChunk.y}:x${build.center.x}`,
            side: 'south',
            center: { ...requiredSouth.cell },
            cells: [-1, 0, 1].map((dx) => ({ x: build.center.x + dx, y: grid.length - 1 }))
        }]
    };
}

export function validateCrashSiteConnection(originGrid, approachGrid, build = CRASH_SITE_BUILD) {
    if (!Array.isArray(originGrid) || !Array.isArray(approachGrid)) return { valid: false, reason: 'missing-grid' };
    const originRooms = validateCrashSiteRooms(originGrid, build);
    if (!originRooms.valid) return originRooms;
    const centerX = build.center.x;
    const approachEdgeY = approachGrid.length - 1;
    const socketClear = [-1, 0, 1].every((dx) => (
        WALKABLE.has(originGrid[0]?.[centerX + dx])
        && WALKABLE.has(approachGrid[approachEdgeY]?.[centerX + dx])
    ));
    if (!socketClear) return { valid: false, reason: 'shared-socket-blocked' };

    const seen = floodWalkable(approachGrid, { x: centerX, y: approachEdgeY });
    const approachTargets = [
        { id: 'approach-hub', x: build.serviceApproach.hub.x, y: build.serviceApproach.hub.y },
        { id: 'approach-encounter', x: build.serviceApproach.encounter.localX, y: build.serviceApproach.encounter.localY },
        ...(build.serviceApproach.supplies ?? []).map((supply) => ({
            id: `approach-supply:${supply.id}`,
            x: supply.localX,
            y: supply.localY
        }))
    ];
    for (const target of approachTargets) {
        if (!seen.has(`${target.x},${target.y}`)) {
            return { valid: false, reason: 'approach-target-unreachable', targetId: target.id };
        }
    }
    return { valid: true, reason: null };
}
