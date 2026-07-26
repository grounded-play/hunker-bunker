import { describe, expect, it } from 'vitest';
import {
    ENEMY_SPRITE_LAYOUTS,
    getEnemyDirectionRow,
    getEnemySpriteLayout
} from './enemySpriteLayouts.js';

describe('enemy sprite layouts', () => {
    it('routes every accepted living enemy remaster through directional sheets', () => {
        expect(Object.keys(ENEMY_SPRITE_LAYOUTS)).toHaveLength(11);
        for (const layout of Object.values(ENEMY_SPRITE_LAYOUTS)) {
            expect(layout.path).toMatch(/(?:_v2|-v5)\.png$/);
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

    it('wires all living snail variants but rejects genuinely unfinished assets', () => {
        for (const type of [
            'cybersnail',
            'cryosnail',
            'sporesnail',
            'boss_cybersnail',
            'boss_cryosnail',
            'boss_sporesnail'
        ]) {
            expect(getEnemySpriteLayout(type)).toMatchObject({
                columns: 4,
                rows: 4,
                repackFromTransparency: true,
                hasAlpha: true
            });
        }
        expect(getEnemySpriteLayout('boss_queen')).toBeNull();
    });
});
