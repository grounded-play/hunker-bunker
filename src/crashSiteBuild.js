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
        for (let x = centerX - preHall.halfWidth; x <= centerX + preHall.halfWidth; x += 1) {
            grid[y][x] = floorTile;
        }
    }
    for (let y = preHall.top; y < preHall.bottom; y += 1) {
        grid[y][centerX - preHall.halfWidth - 1] = wallTile;
        grid[y][centerX + preHall.halfWidth + 1] = wallTile;
    }
    return true;
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

export function stampCrashSiteApproach(grid, build = CRASH_SITE_BUILD, {
    solidTile = 'X',
    floorTile = '.'
} = {}) {
    if (!Array.isArray(grid) || grid.length < 15) return null;
    const captured = borderOpenings(grid);
    const requiredSouth = { side: 'south', cell: { x: build.center.x, y: grid.length - 1 } };
    if (!captured.some(({ side }) => side === 'south')) captured.push(requiredSouth);

    fill(grid, solidTile);
    const approach = build.serviceApproach;
    const hub = approach.hub;
    const release = approach.releaseBounds;
    for (let y = release.top; y <= release.bottom; y += 1) {
        for (let x = release.left; x <= release.right; x += 1) grid[y][x] = floorTile;
    }
    carveDisk(grid, hub.x, hub.y, approach.halfWidth);
    for (const opening of captured) carveLine(grid, opening.cell, hub, approach.halfWidth);
    addWallShell(grid);

    const openings = Object.fromEntries(['north', 'south', 'west', 'east'].map((side) => [side, { open: false, offset: 0 }]));
    for (const opening of captured) openings[opening.side] = openingRecord(opening);
    constrainBorderSockets(grid, openings);

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
        width: approach.halfWidth * 2 + 1,
        hub: { ...hub },
        openings,
        wayfindingMarkers,
        roomInstances: [],
        doors: []
    };
}
