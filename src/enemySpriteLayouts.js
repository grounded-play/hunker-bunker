const FOUR_DIRECTION_ROWS = Object.freeze({
    south: 0,
    north: 1,
    east: 2,
    west: 3
});

const directionalSheet = (path) => Object.freeze({
    path,
    columns: 4,
    rows: 4,
    walkFrames: 4,
    animationFps: 6,
    directionRows: FOUR_DIRECTION_ROWS
});

export const ENEMY_SPRITE_LAYOUTS = Object.freeze({
    alien_proto_crawler: directionalSheet('/alien_proto_crawler_walk_v2.png'),
    alien_proto_spitter: directionalSheet('/alien_proto_spitter_walk_v2.png'),
    boss_corrupted_scout: directionalSheet('/boss_corrupted_scout_v2.png'),
    boss_corrupted_tank: directionalSheet('/boss_corrupted_tank_v2.png'),
    boss_corrupted_engineer: directionalSheet('/boss_corrupted_engineer_v2.png')
});

export const STATIC_ENEMY_SPRITE_PATHS = Object.freeze({
    cybersnail: '/cybersnail.png',
    cryosnail: '/cryosnail.png',
    sporesnail: '/sporesnail.png',
    boss_cybersnail: '/boss_cybersnail.png',
    boss_cryosnail: '/boss_cryosnail.png',
    boss_sporesnail: '/boss_sporesnail.png'
});

export function getEnemySpriteLayout(type) {
    return ENEMY_SPRITE_LAYOUTS[type] ?? null;
}

export function getEnemyDirectionRow(layout, dirX, dirZ, fallback = 0) {
    if (!layout?.directionRows) return fallback;
    if (Math.abs(dirX) > Math.abs(dirZ)) {
        return dirX > 0 ? layout.directionRows.east : layout.directionRows.west;
    }
    if (Math.abs(dirZ) > 0.001) {
        return dirZ > 0 ? layout.directionRows.south : layout.directionRows.north;
    }
    return fallback;
}
