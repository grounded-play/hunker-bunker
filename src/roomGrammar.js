import { INDUSTRIAL_ROOM_PROFILE } from './data/roomGrammarProfiles.js';
import { measureRoomLayout } from './roomLayoutMetrics.js';

export const ROOM_GRAMMAR_VERSION = 1;
const SIDES = ['n', 'e', 's', 'w'];
const key = (x, y) => `${x},${y}`;

function randomStream(parts) {
    let state = 2166136261;
    for (const char of JSON.stringify(parts)) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let value = Math.imul(state ^ (state >>> 15), state | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function reachable(start, allowed) {
    const seen = new Set();
    if (!allowed(start.x, start.y)) return seen;
    const queue = [start];
    seen.add(key(start.x, start.y));
    for (let index = 0; index < queue.length; index += 1) {
        const { x, y } = queue[index];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (!seen.has(key(nx, ny)) && allowed(nx, ny)) {
                seen.add(key(nx, ny));
                queue.push({ x: nx, y: ny });
            }
        }
    }
    return seen;
}

// Pilot contract: room-local dimensions; fixed three-cell doorway sockets.
// Pure bounded motif solver, not a claim of a complete WFC implementation.
// Caller must integrate chunk portals, runtime damage and persisted versions.
export function planInterior({ seed, areaId = 'industrial', roomId = 'room',
    generatorVersion = ROOM_GRAMMAR_VERSION, tier = 'standard', sockets = [], reservations = [] } = {}) {
    if (!Number.isSafeInteger(seed) || generatorVersion !== ROOM_GRAMMAR_VERSION) throw new Error('Unsupported room seed/version');
    const profile = INDUSTRIAL_ROOM_PROFILE;
    if (!Object.hasOwn(profile.tiers, tier)) throw new Error('Unsupported room tier');
    if (!Array.isArray(sockets) || sockets.length < 1 || sockets.length > 4) throw new Error('Expected one to four sockets');
    const identity = [generatorVersion, seed, areaId, roomId];
    const sizeRandom = randomStream([...identity, 'envelope']);
    const [width, height] = profile.tiers[tier][Math.floor(sizeRandom() * profile.tiers[tier].length)];
    const orderedSockets = sockets.map(socket => ({ ...socket })).sort((a, b) => SIDES.indexOf(a.side) - SIDES.indexOf(b.side));
    const sides = new Set();
    for (const socket of orderedSockets) {
        const length = socket.side === 'n' || socket.side === 's' ? width : height;
        if (!SIDES.includes(socket.side) || sides.has(socket.side) || socket.width !== 3
            || !Number.isInteger(socket.offset) || socket.offset < 3 || socket.offset > length - 4) {
            throw new Error('Invalid or duplicate three-cell doorway socket');
        }
        sides.add(socket.side);
    }
    for (const point of reservations) {
        if (!Number.isInteger(point.x) || !Number.isInteger(point.y)
            || point.x < 2 || point.y < 2 || point.x > width - 3 || point.y > height - 3) {
            throw new Error('Reservation requires an interior approach envelope');
        }
    }
    const protectedCells = new Set();
    const protect = (x, y) => {
        for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
            if (x + dx > 0 && x + dx < width - 1 && y + dy > 0 && y + dy < height - 1) protectedCells.add(key(x + dx, y + dy));
        }
    };
    const line = (from, to) => {
        let { x, y } = from;
        protect(x, y);
        while (x !== to.x || y !== to.y) {
            if (x !== to.x) x += Math.sign(to.x - x);
            else y += Math.sign(to.y - y);
            protect(x, y);
        }
    };
    // A three-wide perimeter circulation loop, independent of motif selection.
    const corners = [{ x: 3, y: 3 }, { x: width - 4, y: 3 },
        { x: width - 4, y: height - 4 }, { x: 3, y: height - 4 }];
    corners.forEach((p, i) => line(p, corners[(i + 1) % 4]));
    const anchors = ['arrival', 'work-access', 'storage', 'quiet-corner'].map((role, i) => ({ ...corners[i], role }));
    const doors = orderedSockets.map(socket => {
        const vertical = socket.side === 'e' || socket.side === 'w';
        const center = vertical ? { x: socket.side === 'w' ? 0 : width - 1, y: socket.offset }
            : { x: socket.offset, y: socket.side === 'n' ? 0 : height - 1 };
        const approach = { x: Math.max(2, Math.min(width - 3, center.x)), y: Math.max(2, Math.min(height - 3, center.y)) };
        const ring = { x: Math.max(3, Math.min(width - 4, center.x)), y: Math.max(3, Math.min(height - 4, center.y)) };
        line(center, ring);
        return { ...socket, approach, cells: [-1, 0, 1].map(delta => ({ x: center.x + (vertical ? 0 : delta), y: center.y + (vertical ? delta : 0) })) };
    });
    for (const p of reservations) line(p, { x: 3, y: p.y });
    const start = corners[0];
    const fits = grid => {
        const floor = (x, y) => grid[y]?.[x] === '.' || grid[y]?.[x] === 'D';
        const clear = (x, y) => [-1, 0, 1].every(dy => [-1, 0, 1].every(dx => floor(x + dx, y + dy)));
        const wideReach = reachable(start, clear);
        const targets = [...anchors, ...reservations, ...doors.map(d => d.approach)];
        return targets.every(p => wideReach.has(key(p.x, p.y)))
            && reachable(start, floor).size === grid.flat().filter(c => c === '.' || c === 'D').length;
    };
    const motifRandom = randomStream([...identity, 'motif']);
    const first = Math.floor(motifRandom() * profile.motifs.length);
    // Try one bounded asymmetric rewrite and the canonical form of each motif.
    // These streams cannot change the envelope, sockets or another room.
    const candidateCount = profile.motifs.length * 2;
    for (let attempt = 0; attempt <= candidateCount; attempt += 1) {
        const fallback = attempt === candidateCount;
        const motif = fallback ? { id: 'open-service-court', blocks: [] } : profile.motifs[(first + Math.floor(attempt / 2)) % profile.motifs.length];
        const detailRandom = randomStream([...identity, motif.id, 'module-offsets']);
        const grid = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) =>
            x === 0 || y === 0 || x === width - 1 || y === height - 1 ? '#' : '.'));
        const modules = [];
        for (const [slot, block] of motif.blocks.entries()) {
            const shiftX = attempt % 2 === 0 ? Math.floor(detailRandom() * 3) - 1 : 0;
            const shiftY = attempt % 2 === 0 ? Math.floor(detailRandom() * 3) - 1 : 0;
            const x = 5 + Math.floor(block.x * (width - 10)) + shiftX;
            const y = 5 + Math.floor(block.y * (height - 10)) + shiftY;
            const w = Math.max(2, Math.floor(block.w * (width - 10))), h = Math.max(2, Math.floor(block.h * (height - 10)));
            const cells = Array.from({ length: h }, (_, dy) => Array.from({ length: w }, (_, dx) => ({ x: x + dx, y: y + dy }))).flat();
            if (cells.some(p => p.x >= width - 1 || p.y >= height - 1 || grid[p.y]?.[p.x] !== '.' || protectedCells.has(key(p.x, p.y)))) continue;
            for (const p of cells) grid[p.y][p.x] = '#';
            modules.push({ id: JSON.stringify([...identity, motif.id, slot]), role: block.role, x, y, w, h });
        }
        for (const door of doors) for (const p of door.cells) grid[p.y][p.x] = 'D';
        if ((!fallback && modules.length !== motif.blocks.length) || !fits(grid)) continue;
        return { generatorVersion, profile: profile.id, tier, width, height, grid, doors, anchors,
            modules, reservedCells: [...protectedCells].sort(),
            metrics: measureRoomLayout(grid, { left: 1, top: 1, right: width - 2, bottom: height - 2 }),
            diagnostics: { motif: motif.id, attempts: attempt + 1, fallback,
                fallbackReason: fallback ? 'motifs-conflict-with-reservations-or-clearance' : null } };
    }
    throw new Error('Unable to preserve required room approach clearance');
}
