const LEGACY_DIRECTION_CELLS = Object.freeze([
    Object.freeze({ row: 1, baseColumn: 2 }),
    Object.freeze({ row: 3, baseColumn: 2 }),
    Object.freeze({ row: 3, baseColumn: 0 }),
    Object.freeze({ row: 2, baseColumn: 2 }),
    Object.freeze({ row: 2, baseColumn: 0 }),
    Object.freeze({ row: 1, baseColumn: 0 }),
    Object.freeze({ row: 0, baseColumn: 2 }),
    Object.freeze({ row: 0, baseColumn: 0 })
]);

const V4_DIRECTION_CELLS = Object.freeze(
    Array.from({ length: 8 }, (_, row) => Object.freeze({ row, baseColumn: 0 }))
);

export const PLAYER_SPRITE_LAYOUTS = Object.freeze({
    SCOUT: Object.freeze({
        name: 'SCOUT',
        path: '/Scout.full_v2.png',
        columns: 4,
        rows: 4,
        walkFrames: 2,
        directionCells: LEGACY_DIRECTION_CELLS,
        previewDirection: 2,
        footstepFrames: Object.freeze([1]),
        animationFps: 8
    }),
    TANK: Object.freeze({
        name: 'TANK',
        path: '/Tank.walk_v4.png',
        columns: 8,
        rows: 8,
        walkFrames: 8,
        directionCells: V4_DIRECTION_CELLS,
        previewDirection: 2,
        footstepFrames: Object.freeze([0, 4]),
        animationFps: 8,
        sourceColumns: 8,
        sourceRows: 8,
        repackFromTransparency: true
    }),
    ENGINEER: Object.freeze({
        name: 'ENGINEER',
        path: '/Eng.walk_v4.png',
        // This generated source contains 9 poses across 7 authored rows.
        // North-west temporarily shares the rear row until replacement art
        // supplies a distinct eighth direction.
        columns: 9,
        rows: 7,
        walkFrames: 9,
        directionCells: Object.freeze([
            Object.freeze({ row: 0, baseColumn: 0 }),
            Object.freeze({ row: 1, baseColumn: 0 }),
            Object.freeze({ row: 2, baseColumn: 0 }),
            Object.freeze({ row: 3, baseColumn: 0 }),
            Object.freeze({ row: 4, baseColumn: 0 }),
            Object.freeze({ row: 5, baseColumn: 0 }),
            Object.freeze({ row: 5, baseColumn: 0 }),
            Object.freeze({ row: 6, baseColumn: 0 })
        ]),
        previewDirection: 2,
        footstepFrames: Object.freeze([0, 5]),
        animationFps: 9,
        sourceColumns: 9,
        sourceRows: 7,
        repackFromTransparency: true
    })
});

export const PLAYER_DEFAULT_DIRECTION_INDEX = 2;

export function getPlayerSpriteLayout(type) {
    return PLAYER_SPRITE_LAYOUTS[type] ?? PLAYER_SPRITE_LAYOUTS.SCOUT;
}
