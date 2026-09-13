import { CHUNK_SIZE } from './tileCatalog.js';
import { CHUNK_STRUCTURE_VERSION } from './chunkStructure.js';
import { SETPIECE_BUILD_CATALOG, SETPIECE_BUILD_VERSION } from './data/setpieceBuilds.js';

export const SETPIECE_CLAIM_VERSION = 1;
export const SETPIECE_STRUCTURE_GENERATOR = 'authored-setpiece';

const SIDES = Object.freeze(['n', 'e', 's', 'w']);

function rotateOffset({ dx, dy }, steps) {
    let x = dx;
    let y = dy;
    for (let index = 0; index < steps; index += 1) [x, y] = [-y, x];
    return { dx: x, dy: y };
}

function rotateSide(side, steps) {
    const index = SIDES.indexOf(side);
    return index < 0 ? side : SIDES[(index + steps) % SIDES.length];
}

function key(x, y) {
    return `${x},${y}`;
}

export function validateSetpieceBlueprint(blueprint) {
    const errors = [];
    if (blueprint?.version !== SETPIECE_BUILD_VERSION) errors.push('unsupported version');
    if (!blueprint?.id) errors.push('missing id');
    if (!Array.isArray(blueprint?.footprint) || blueprint.footprint.length === 0) errors.push('empty footprint');
    if (!Array.isArray(blueprint?.modules) || blueprint.modules.length !== blueprint?.footprint?.length) errors.push('module coverage mismatch');
    const footprint = new Set((blueprint?.footprint ?? []).map(({ dx, dy }) => key(dx, dy)));
    if (footprint.size !== (blueprint?.footprint ?? []).length) errors.push('duplicate footprint cell');
    for (const module of blueprint?.modules ?? []) {
        if (!module?.id || !footprint.has(key(module?.at?.dx, module?.at?.dy))) errors.push(`invalid module ${module?.id ?? '<missing>'}`);
    }
    if (!footprint.has(key(blueprint?.pivot?.dx, blueprint?.pivot?.dy))) errors.push('pivot outside footprint');
    if (!Array.isArray(blueprint?.stages) || !blueprint.stages.includes(blueprint?.initialStage)) errors.push('invalid initial stage');
    return { valid: errors.length === 0, errors };
}

export function validateSetpieceCatalog(catalog = SETPIECE_BUILD_CATALOG) {
    const errors = [];
    const ids = new Set();
    for (const blueprint of catalog) {
        if (ids.has(blueprint?.id)) errors.push(`duplicate id ${blueprint.id}`);
        ids.add(blueprint?.id);
        const result = validateSetpieceBlueprint(blueprint);
        errors.push(...result.errors.map((error) => `${blueprint?.id ?? '<missing>'}: ${error}`));
    }
    return { valid: errors.length === 0, errors };
}

function isEligible(blueprint, reservation) {
    const eligibility = blueprint.eligibility ?? {};
    return (!eligibility.roles?.length || eligibility.roles.includes(reservation.role))
        && (!eligibility.rings?.length || eligibility.rings.includes(reservation.ring));
}

export function allocateSetpieceClaim(reservation, {
    catalog = SETPIECE_BUILD_CATALOG,
    availableChunkKeys = [],
    occupiedChunkKeys = [],
    roll = 0
} = {}) {
    if (!Number.isInteger(reservation?.chunkX) || !Number.isInteger(reservation?.chunkY)) return null;
    const available = new Set(availableChunkKeys);
    const occupied = new Set(occupiedChunkKeys);
    const eligible = catalog.filter((blueprint) => validateSetpieceBlueprint(blueprint).valid && isEligible(blueprint, reservation));
    if (eligible.length === 0) return null;
    const start = Math.floor(Math.abs(Number(roll) || 0) * eligible.length) % eligible.length;
    const ordered = [...eligible.slice(start), ...eligible.slice(0, start)];

    for (const blueprint of ordered) {
        for (const rotation of blueprint.transformPolicy?.rotations ?? [0]) {
            const pivot = rotateOffset(blueprint.pivot, rotation);
            const originX = reservation.chunkX - pivot.dx;
            const originY = reservation.chunkY - pivot.dy;
            const modules = blueprint.modules.map((module) => {
                const offset = rotateOffset(module.at, rotation);
                return {
                    moduleId: module.id,
                    chunkX: originX + offset.dx,
                    chunkY: originY + offset.dy,
                    chunkKey: key(originX + offset.dx, originY + offset.dy),
                    routeAxis: rotation % 2 === 0 ? module.routeAxis : module.routeAxis === 'ns' ? 'ew' : 'ns'
                };
            });
            if (modules.some((module) => !available.has(module.chunkKey) || occupied.has(module.chunkKey))) continue;
            return {
                version: SETPIECE_CLAIM_VERSION,
                id: `setpiece:${reservation.id}:${blueprint.id}`,
                reservationId: reservation.id,
                setpieceId: blueprint.id,
                family: blueprint.family,
                ring: reservation.ring,
                rotation,
                stage: blueprint.initialStage,
                chunkKeys: modules.map((module) => module.chunkKey),
                modules,
                externalSockets: blueprint.sockets.map((socket) => {
                    const offset = rotateOffset(socket.at, rotation);
                    return { ...socket, at: offset, side: rotateSide(socket.side, rotation) };
                })
            };
        }
    }
    return null;
}

function makeModuleGrid(size, axis) {
    const grid = Array.from({ length: size }, () => Array(size).fill('X'));
    const center = Math.floor(size / 2);
    for (let offset = -1; offset <= 1; offset += 1) {
        if (axis === 'ew') {
            for (let x = 0; x < size; x += 1) grid[center + offset][x] = '.';
        } else {
            for (let y = 0; y < size; y += 1) grid[y][center + offset] = '.';
        }
    }
    return grid;
}

export function resolveSetpieceChunkStructure(claim, chunkX, chunkY, { chunkSize = CHUNK_SIZE } = {}) {
    const module = claim?.modules?.find((entry) => entry.chunkX === chunkX && entry.chunkY === chunkY);
    if (!module) return null;
    return {
        version: CHUNK_STRUCTURE_VERSION,
        chunkKey: module.chunkKey,
        generatorId: SETPIECE_STRUCTURE_GENERATOR,
        grid: makeModuleGrid(chunkSize, module.routeAxis),
        rooms: [],
        anchors: [],
        zones: [],
        sockets: module.routeAxis === 'ew' ? { e: true, w: true } : { n: true, s: true },
        wayfindingMarkers: [],
        setpieceId: claim.setpieceId,
        moduleId: module.moduleId,
        stage: claim.stage,
        diagnostics: {
            discardedGeneration: 'none',
            discardedGenerationCount: 0,
            claimId: claim.id,
            rotation: claim.rotation
        }
    };
}
