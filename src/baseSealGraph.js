/**
 * Pure sealed-room oxygen model and base enclosure graph.
 *
 * Evaluates snapped construction modules (floors, walls, doors, ceilings, beds, O2 regulators)
 * to determine room enclosure integrity, leak perimeters, oxygenation, and sleep safety.
 */

import { getBaseModuleDefinition } from './data/baseModules.js';

export const SEAL_LEAK_TYPES = Object.freeze({
    MISSING_WALL: 'missing_wall',
    OPEN_DOOR: 'open_door',
    DESTROYED_WALL: 'destroyed_wall',
    MISSING_CEILING: 'missing_ceiling',
    NO_O2_PRODUCER: 'no_o2_producer',
    NO_BED: 'no_bed'
});

const DEFAULT_CEILING_HEIGHT = 2.8;

const cellKey = (x, z) => `${Math.round(x)},${Math.round(z)}`;

/**
 * Evaluates base modules to compute enclosed rooms and oxygenation state.
 */
export function evaluateRoomSealGraph({
    modules = [],
    defaultSafeBubble = { x: 0, z: 0, radius: 6.0 }
} = {}) {
    const floorCells = new Map();
    const ceilingCells = new Set();
    const wallsByEdge = new Map(); // key: "x,z:side" -> wall module
    const doorsByEdge = new Map(); // key: "x,z:side" -> door module
    const o2Producers = [];
    const beds = [];

    // 1. Index installed modules
    modules.forEach((mod) => {
        const def = getBaseModuleDefinition(mod.definitionId) ?? {};
        const x = Math.round(mod.x ?? mod.worldPosition?.x ?? 0);
        const z = Math.round(mod.z ?? mod.worldPosition?.z ?? 0);
        const key = cellKey(x, z);

        if (def.buildTags?.includes('floor')) {
            floorCells.set(key, { x, z, module: mod });
        } else if (def.buildTags?.includes('ceiling')) {
            ceilingCells.add(key);
        } else if (def.buildTags?.includes('wall')) {
            const side = mod.side ?? 'edge';
            wallsByEdge.set(`${key}:${side}`, mod);
            // Also store cell presence
            wallsByEdge.set(key, mod);
        } else if (def.buildTags?.includes('door')) {
            const side = mod.side ?? 'edge';
            doorsByEdge.set(`${key}:${side}`, mod);
            doorsByEdge.set(key, mod);
        }

        if (def.buildTags?.includes('o2_producer')) {
            o2Producers.push({ module: mod, rate: def.o2OutputRate ?? 25 });
        }

        if (def.buildTags?.includes('bed') || def.buildTags?.includes('sleep_anchor')) {
            beds.push({ module: mod, x, z });
        }
    });

    // 2. Evaluate enclosure if floor cells exist
    const leaks = [];
    const DIRECTIONS = [
        { side: 'north', dx: 0, dz: -1 },
        { side: 'south', dx: 0, dz: 1 },
        { side: 'east', dx: 1, dz: 0 },
        { side: 'west', dx: -1, dz: 0 }
    ];

    if (floorCells.size === 0) {
        leaks.push({ type: SEAL_LEAK_TYPES.MISSING_WALL, message: 'No floor foundations installed' });
    }

    for (const [key, cell] of floorCells.entries()) {
        // Ceiling check
        if (!ceilingCells.has(key)) {
            leaks.push({
                type: SEAL_LEAK_TYPES.MISSING_CEILING,
                x: cell.x,
                z: cell.z,
                message: `Missing ceiling panel above (${cell.x}, ${cell.z})`
            });
        }

        // Perimeter wall checks
        for (const dir of DIRECTIONS) {
            const neighborKey = cellKey(cell.x + dir.dx, cell.z + dir.dz);
            if (!floorCells.has(neighborKey)) {
                // This is a boundary perimeter edge! Must have a wall or a sealed door.
                const edgeKey = `${key}:${dir.side}`;
                const neighborEdgeKey = `${neighborKey}:${getOppositeSide(dir.side)}`;
                const wall = wallsByEdge.get(edgeKey) ?? wallsByEdge.get(neighborEdgeKey) ?? wallsByEdge.get(key) ?? wallsByEdge.get(neighborKey);
                const door = doorsByEdge.get(edgeKey) ?? doorsByEdge.get(neighborEdgeKey) ?? doorsByEdge.get(key) ?? doorsByEdge.get(neighborKey);

                if (door) {
                    if (door.isOpen || door.state?.isOpen) {
                        leaks.push({
                            type: SEAL_LEAK_TYPES.OPEN_DOOR,
                            x: cell.x,
                            z: cell.z,
                            side: dir.side,
                            doorId: door.instanceId,
                            message: `Door at (${cell.x}, ${cell.z}) is unsealed`
                        });
                    } else if (door.isDestroyed || door.state?.isDestroyed) {
                        leaks.push({
                            type: SEAL_LEAK_TYPES.DESTROYED_WALL,
                            x: cell.x,
                            z: cell.z,
                            side: dir.side,
                            message: `Breached door at (${cell.x}, ${cell.z})`
                        });
                    }
                } else if (!wall) {
                    leaks.push({
                        type: SEAL_LEAK_TYPES.MISSING_WALL,
                        x: cell.x,
                        z: cell.z,
                        side: dir.side,
                        message: `Open perimeter breach at (${cell.x}, ${cell.z}) facing ${dir.side}`
                    });
                } else if (wall.isDestroyed || wall.state?.isDestroyed) {
                    leaks.push({
                        type: SEAL_LEAK_TYPES.DESTROYED_WALL,
                        x: cell.x,
                        z: cell.z,
                        side: dir.side,
                        message: `Breached wall at (${cell.x}, ${cell.z})`
                    });
                }
            }
        }
    }

    const isEnclosed = floorCells.size > 0 && leaks.length === 0;
    const totalO2Rate = o2Producers.reduce((sum, p) => sum + p.rate, 0);
    const isOxygenated = isEnclosed && totalO2Rate > 0;
    const isSleepSafe = isOxygenated && beds.length > 0;

    return {
        isEnclosed,
        isOxygenated,
        isSleepSafe,
        floorCellCount: floorCells.size,
        cubicVolume: floorCells.size * DEFAULT_CEILING_HEIGHT,
        leaks,
        o2OutputRate: totalO2Rate,
        bedCount: beds.length,
        defaultSafeBubble,
        floorCells: [...floorCells.values()]
    };
}

function getOppositeSide(side) {
    if (side === 'north') return 'south';
    if (side === 'south') return 'north';
    if (side === 'east') return 'west';
    return 'east';
}

/**
 * Checks if a world position is safe for resting / sleeping.
 */
export function isPositionSafeForRest(sealResult, position) {
    if (!sealResult) return { safe: false, reason: 'uninitialized-seal-graph' };

    // Emergency fail-safe: crash ship default safe bubble always allows rest
    if (sealResult.defaultSafeBubble) {
        const dx = (position?.x ?? 0) - sealResult.defaultSafeBubble.x;
        const dz = (position?.z ?? 0) - sealResult.defaultSafeBubble.z;
        const distSq = dx * dx + dz * dz;
        if (distSq <= (sealResult.defaultSafeBubble.radius * sealResult.defaultSafeBubble.radius)) {
            return { safe: true, isEmergencyBubble: true, reason: 'ship-emergency-bubble' };
        }
    }

    if (!sealResult.isEnclosed) {
        const primaryLeak = sealResult.leaks[0];
        return {
            safe: false,
            reason: primaryLeak ? `unsealed:${primaryLeak.type}` : 'room-not-enclosed',
            leakDetails: primaryLeak
        };
    }

    if (!sealResult.isOxygenated) {
        return { safe: false, reason: 'lacks-oxygen-production' };
    }

    if (sealResult.bedCount <= 0) {
        return { safe: false, reason: 'lacks-installed-bed' };
    }

    return { safe: true, reason: 'sealed-and-oxygenated' };
}
