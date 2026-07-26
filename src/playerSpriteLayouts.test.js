import { describe, expect, it } from 'vitest';
import {
    PLAYER_DEFAULT_DIRECTION_INDEX,
    PLAYER_SPRITE_LAYOUTS,
    getPlayerSpriteLayout
} from './playerSpriteLayouts.js';

describe('player sprite layouts', () => {
    it('keeps legacy Scout packing separate from generated atlases', () => {
        expect(PLAYER_SPRITE_LAYOUTS.SCOUT).toMatchObject({
            columns: 4,
            rows: 4,
            walkFrames: 2
        });
        expect(PLAYER_SPRITE_LAYOUTS.SCOUT.directionCells).toHaveLength(8);
    });

    it('describes the real Tank and Engineer source grids', () => {
        expect(PLAYER_SPRITE_LAYOUTS.TANK).toMatchObject({
            columns: 8,
            rows: 8,
            sourceColumns: 8,
            sourceRows: 8,
            repackFromTransparency: true
        });
        expect(PLAYER_SPRITE_LAYOUTS.ENGINEER).toMatchObject({
            columns: 9,
            rows: 7,
            sourceColumns: 9,
            sourceRows: 7,
            repackFromTransparency: true
        });
        expect(PLAYER_SPRITE_LAYOUTS.ENGINEER.directionCells).toHaveLength(8);
    });

    it('uses Scout as the safe fallback', () => {
        expect(getPlayerSpriteLayout('UNKNOWN')).toBe(PLAYER_SPRITE_LAYOUTS.SCOUT);
        expect(PLAYER_DEFAULT_DIRECTION_INDEX).toBe(2);
    });
});
