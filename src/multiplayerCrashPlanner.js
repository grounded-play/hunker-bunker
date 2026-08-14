/**
 * Multiplayer Crash Site & Connected Sector Planner
 * Deterministically computes multi-pod crash spawn coordinates and connecting
 * breach corridors across Ring 1 for Co-Op Expedition and PvP Skirmish matches.
 */

import { CHUNK_SIZE } from './tileCatalog.js';

export const MULTIPLAYER_SPAWN_MODES = Object.freeze({
    COOP: 'coop',
    PVP: 'pvp'
});

export const DEFAULT_BASE_SPAWN = Object.freeze({ x: 9, z: 9 });

/**
 * Derives an integer hash from any string or number seed.
 */
export function hashSeed(seed) {
    if (typeof seed === 'number' && Number.isFinite(seed)) return Math.floor(seed);
    const str = String(seed ?? 'DEFAULT-SECTOR');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return hash >>> 0;
}

/**
 * Computes deterministic multi-player crash site locations and breach corridor routes.
 *
 * @param {Object} options
 * @param {string|number} options.seed - Master room or expedition seed
 * @param {number} [options.playerCount=2] - Number of participating operatives (2 to 4)
 * @param {string} [options.mode='coop'] - 'coop' or 'pvp'
 * @param {Array<Object>} [options.playerRoster=[]] - Connected player info [{ id, callsign, opClass }]
 * @returns {Object} Crash plan containing player spawn points, crash pod wrecks, and connecting breach route.
 */
export function planMultiplayerCrashSites({
    seed = 'SECTOR-7',
    playerCount = 2,
    mode = MULTIPLAYER_SPAWN_MODES.COOP,
    playerRoster = []
} = {}) {
    const seedHash = hashSeed(seed);
    const count = Math.max(1, Math.min(4, playerCount));

    // Base Sector Alpha (Host / Player 0)
    const baseSpawn = { x: DEFAULT_BASE_SPAWN.x, z: DEFAULT_BASE_SPAWN.y ?? DEFAULT_BASE_SPAWN.z };

    // Offsets for subsequent crash pods
    // In Co-Op: pods crash in adjacent rooms (~28-36m away) for collaborative linkup
    // In PvP: pods crash on opposite sides of the contested breach sector
    const coopOffsets = [
        { x: 0, z: 0 },
        { x: 28, z: 0 },
        { x: 0, z: 28 },
        { x: 28, z: 28 }
    ];

    const pvpOffsets = [
        { x: 0, z: 0 },
        { x: 38, z: 38 },
        { x: 38, z: 0 },
        { x: 0, z: 38 }
    ];

    const offsets = mode === MULTIPLAYER_SPAWN_MODES.PVP ? pvpOffsets : coopOffsets;

    const classCycle = ['SCOUT', 'TANK', 'ENGINEER'];
    const players = [];

    for (let i = 0; i < count; i++) {
        const rosterInfo = playerRoster[i] ?? {};
        const offset = offsets[i % offsets.length];
        const spawnX = baseSpawn.x + offset.x;
        const spawnZ = baseSpawn.z + offset.z;
        const opClass = rosterInfo.opClass || classCycle[i % classCycle.length];
        const callsign = rosterInfo.callsign || (i === 0 ? 'HOST' : `OPERATIVE-${i + 1}`);

        players.push({
            index: i,
            id: rosterInfo.id || (i === 0 ? 'local-host' : `peer-${i}`),
            isHost: i === 0,
            callsign,
            opClass,
            spawnX,
            spawnZ,
            chunkX: Math.floor(spawnX / CHUNK_SIZE),
            chunkZ: Math.floor(spawnZ / CHUNK_SIZE),
            wreckType: opClass,
            color: opClass === 'SCOUT' ? 0x7dff5a : (opClass === 'TANK' ? 0xffb700 : 0x00e5ff)
        });
    }

    // Connecting corridor between crash pods
    const breachCorridors = [];
    for (let i = 1; i < players.length; i++) {
        const pA = players[0];
        const pB = players[i];
        const midX = (pA.spawnX + pB.spawnX) * 0.5;
        const midZ = (pA.spawnZ + pB.spawnZ) * 0.5;

        breachCorridors.push({
            id: `breach-${pA.index}-${pB.index}`,
            fromPlayer: pA.index,
            toPlayer: pB.index,
            from: { x: pA.spawnX, z: pA.spawnZ },
            to: { x: pB.spawnX, z: pB.spawnZ },
            midPoint: { x: midX, z: midZ },
            corridorArchetype: mode === MULTIPLAYER_SPAWN_MODES.PVP ? 'contested_breach' : 'distress_conduit',
            label: mode === MULTIPLAYER_SPAWN_MODES.PVP ? 'CONTESTED ZONE' : 'DISTRESS LINK'
        });
    }

    return {
        seed: String(seed),
        seedHash,
        mode,
        playerCount: count,
        players,
        breachCorridors
    };
}
