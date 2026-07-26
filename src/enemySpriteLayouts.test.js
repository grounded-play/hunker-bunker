import { describe, expect, it } from 'vitest';
import {
    ENEMY_SPRITE_LAYOUTS,
    getEnemyDirectionRow,
    getEnemySpriteLayout
} from './enemySpriteLayouts.js';

describe('enemy sprite layouts', () => {
    it('routes all accepted directional remasters through v2 assets', () => {
        expect(Object.keys(ENEMY_SPRITE_LAYOUTS)).toHaveLength(5);
        for (const layout of Object.values(ENEMY_SPRITE_LAYOUTS)) {
            expect(layout.path).toMatch(/_v2\.png$/);
            expect(layout).toMatchObject({
                columns: 4,
                rows: 4,
                walkFrames: 4
            });
        }
    });

    it('maps movement to the authored cardinal rows', () => {
        const layout = ENEMY_SPRITE_LAYOUTS.alien_proto_crawler;
        expect(getEnemyDirectionRow(layout, 1, 0)).toBe(2);
        expect(getEnemyDirectionRow(layout, -1, 0)).toBe(3);
        expect(getEnemyDirectionRow(layout, 0, 1)).toBe(0);
        expect(getEnemyDirectionRow(layout, 0, -1)).toBe(1);
    });

    it('does not treat unfinished assets as live layouts', () => {
        expect(getEnemySpriteLayout('cybersnail')).toBeNull();
        expect(getEnemySpriteLayout('boss_queen')).toBeNull();
    });
});
