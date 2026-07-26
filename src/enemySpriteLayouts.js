const FOUR_DIRECTION_ROWS = Object.freeze({
    south: 0,
    north: 1,
    east: 2,
    west: 3
});

const directionalSheet = (path, options = {}) => Object.freeze({
    name: options.name ?? path,
    path,
    columns: 4,
    rows: 4,
    sourceColumns: 4,
    sourceRows: 4,
    walkFrames: 4,
    animationFps: options.animationFps ?? 6,
    directionRows: FOUR_DIRECTION_ROWS,
    repackFromTransparency: Boolean(options.repackFromTransparency),
    cellWidth: 256,
    cellHeight: 256,
    hasAlpha: Boolean(options.hasAlpha)
});

export const ENEMY_SPRITE_LAYOUTS = Object.freeze({
    alien_proto_crawler: directionalSheet('/alien_proto_crawler_walk_v2.png'),
    alien_proto_spitter: directionalSheet('/alien_proto_spitter_walk_v2.png'),
    boss_corrupted_scout: directionalSheet('/boss_corrupted_scout_v2.png'),
    boss_corrupted_tank: directionalSheet('/boss_corrupted_tank_v2.png'),
    boss_corrupted_engineer: directionalSheet('/boss_corrupted_engineer_v2.png'),
    cybersnail: directionalSheet('/art-remaster/enemy-v5/snails/final/cybersnail-walk-v5.png', {
        name: 'Cybersnail v5',
        repackFromTransparency: true,
        hasAlpha: true
    }),
    cryosnail: directionalSheet('/art-remaster/enemy-v5/snails/final/cryosnail-walk-v5.png', {
        name: 'Cryosnail v5',
        repackFromTransparency: true,
        hasAlpha: true
    }),
    sporesnail: directionalSheet('/art-remaster/enemy-v5/snails/final/sporesnail-walk-v5.png', {
        name: 'Sporesnail v5',
        repackFromTransparency: true,
        hasAlpha: true
    }),
    boss_cybersnail: directionalSheet('/art-remaster/enemy-v5/snails/final/boss-cybersnail-walk-v5.png', {
        name: 'Cyber Snail boss v5',
        animationFps: 4,
        repackFromTransparency: true,
        hasAlpha: true
    }),
    boss_cryosnail: directionalSheet('/art-remaster/enemy-v5/snails/final/boss-cryosnail-walk-v5.png', {
        name: 'Cryosnail boss v5',
        animationFps: 4,
        repackFromTransparency: true,
        hasAlpha: true
    }),
    boss_sporesnail: directionalSheet('/art-remaster/enemy-v5/snails/final/boss-sporesnail-walk-v5.png', {
        name: 'Spore Snail boss v5',
        animationFps: 4,
        repackFromTransparency: true,
        hasAlpha: true
    })
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
