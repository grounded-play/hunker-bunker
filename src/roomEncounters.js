export const ROOM_ENCOUNTER_PROFILES = Object.freeze({
    safe: Object.freeze({ enemies: [], minDepthTier: 0 }),
    sterile: Object.freeze({ enemies: [], minDepthTier: 0 }),
    utility: Object.freeze({
        minDepthTier: 1,
        enemies: [{ type: 'cybersnail', min: 0, max: 1, weight: 1 }]
    }),
    security: Object.freeze({
        minDepthTier: 2,
        enemies: [{ type: 'sentinel', min: 1, max: 1, weight: 1 }]
    }),
    standard: Object.freeze({
        minDepthTier: 1,
        enemies: [{ type: 'cybersnail', min: 0, max: 2, weight: 1 }]
    }),
    'cryo-standard': Object.freeze({
        minDepthTier: 1,
        enemies: [{ type: 'cryosnail', min: 0, max: 2, weight: 1 }]
    }),
    'bio-standard': Object.freeze({
        minDepthTier: 2,
        enemies: [
            { type: 'sporesnail', min: 0, max: 2, weight: 1 },
            { type: 'crawler', min: 0, max: 1, weight: 0.28 }
        ]
    }),
    'bio-nest-guard': Object.freeze({
        minDepthTier: 2,
        enemies: [
            { type: 'sporesnail', min: 1, max: 2, weight: 1 },
            { type: 'crawler', min: 0, max: 1, weight: 0.4 }
        ]
    })
});

function chooseCount(config, random) {
    const min = Math.max(0, Number(config.min) || 0);
    const max = Math.max(min, Number(config.max) || min);
    return min + Math.floor(random() * (max - min + 1));
}

export function planRoomEncounter(room, grid, random, { depthTier = 0 } = {}) {
    const profileId = room.themeConfig?.encounterProfile ?? 'standard';
    const profile = ROOM_ENCOUNTER_PROFILES[profileId] ?? ROOM_ENCOUNTER_PROFILES.standard;
    if (depthTier < (profile.minDepthTier ?? 0) || profile.enemies.length === 0) {
        return { roomId: room.id, profileId, spawns: [], cleared: false };
    }
    const reserved = new Set(room.populationPlan?.reserved ?? []);
    const doorCells = room.navigation?.doorLanes ?? [];
    const candidates = (room.interior ?? []).filter(({ x, y }) => (
        grid?.[y]?.[x] === '.'
        && !reserved.has(`${x},${y}`)
        && doorCells.every((door) => Math.hypot(door.x - x, door.y - y) >= 2)
    ));
    const spawns = [];
    for (const enemy of profile.enemies) {
        const count = chooseCount(enemy, random);
        for (let index = 0; index < count && candidates.length > 0; index += 1) {
            const candidateIndex = Math.floor(random() * candidates.length);
            const [cell] = candidates.splice(candidateIndex, 1);
            spawns.push({
                id: `${room.id}:encounter:${spawns.length}`,
                roomId: room.id,
                x: cell.x,
                y: cell.y,
                type: enemy.type
            });
        }
    }
    return { roomId: room.id, profileId, spawns, cleared: false };
}

export function planChunkRoomEncounters(rooms, grid, random, options = {}) {
    return (rooms ?? []).map((room) => planRoomEncounter(room, grid, random, options));
}
