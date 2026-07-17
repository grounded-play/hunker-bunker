import { describe, it, expect } from 'vitest';
import { ENEMY_STATS, getEnemyStats } from './enemies.js';

describe('enemy stats', () => {
    const BASE = { maxHp: 2, speed: 1.2 }; // mirrors SNAIL_MAX_HP / SNAIL_MOVE_SPEED

    it('preserves the exact pre-extraction override values', () => {
        expect(ENEMY_STATS.cryosnail).toEqual({ maxHp: 4, speed: 0.9 });
        expect(ENEMY_STATS.sporesnail).toEqual({ maxHp: 3, speed: 1.4 });
        expect(ENEMY_STATS.boss_cybersnail).toEqual({ maxHp: 15, speed: 1.5 });
        expect(ENEMY_STATS.boss_cryosnail).toEqual({ maxHp: 40, speed: 1.1 });
        expect(ENEMY_STATS.boss_sporesnail).toEqual({ maxHp: 75, speed: 1.3 });
    });

    it('unknown / base types fall back to the passed base (cybersnail, sentinel, crawler)', () => {
        expect(getEnemyStats('cybersnail', BASE)).toEqual(BASE);
        expect(getEnemyStats('sentinel', BASE)).toEqual(BASE);
        expect(getEnemyStats('crawler', BASE)).toEqual(BASE);
    });

    it('resolves overrides through the helper', () => {
        expect(getEnemyStats('boss_sporesnail', BASE)).toEqual({ maxHp: 75, speed: 1.3 });
    });
});
