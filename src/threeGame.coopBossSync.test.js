import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { createBossFight, QUEEN_FIGHT_DEF } from './bossPhases.js';

// GAP-MP-01: a guest's hit on a boss used to land only on the guest's copy and
// was erased by the host's next snapshot, so a guest could never hurt a boss.
beforeEach(() => vi.stubGlobal('window', { dispatchEvent: vi.fn(), AudioManager: null }));
afterEach(() => vi.unstubAllGlobals());

function peer({ host }) {
    const emitted = [];
    const g = {
        isMultiplayer: true,
        isMultiplayerHost: host,
        multiplayerMode: 'coop',
        netSocket: { emit: (event, payload) => emitted.push({ event, payload }) },
        loadoutMods: { bossDamageMultiplier: 2, nonBossDamageMultiplier: 1 },
        damageSnail: vi.fn((sprite, amount) => { sprite.userData.hp -= amount; }),
        scatterSprites: []
    };
    for (const method of ['applyPlayerDamageToEnemy', 'handleEnemyStateSnapshot']) g[method] = ThreeGame.prototype[method];
    return { g, emitted };
}

function queen() {
    const fight = createBossFight(QUEEN_FIGHT_DEF);
    return { position: { x: 3, z: 4 }, userData: { type: 'boss_queen', scatterKey: 'queen-fight', isBoss: true, hp: fight.maxHp, queenFight: fight } };
}

describe('co-op boss fights are host-authoritative', () => {
    it('reports a guest\'s boss hit to the host instead of applying it locally', () => {
        const { g, emitted } = peer({ host: false });
        const boss = queen();
        g.applyPlayerDamageToEnemy(boss, 5);
        expect(emitted).toEqual([{ event: 'enemyHitReport', payload: expect.objectContaining({ enemyType: 'boss_queen', scatterKey: 'queen-fight', damage: 10 }) }]);
        expect(boss.userData.queenFight.hp).toBe(boss.userData.queenFight.maxHp);
        expect(g.damageSnail).not.toHaveBeenCalled();
    });

    it('resolves a reported hit against the host\'s own fight without rescaling it', () => {
        const { g, emitted } = peer({ host: true });
        const boss = queen();
        const before = boss.userData.queenFight.hp;
        g.applyPlayerDamageToEnemy(boss, 10, { reporterId: 'guest' });
        expect(emitted[0]).toMatchObject({ event: 'enemyDamage', payload: { damage: 10, reporterId: 'guest' } });
        const armour = QUEEN_FIGHT_DEF.armoredDamageMult ?? 1;
        expect(boss.userData.queenFight.hp).toBe(before - Math.max(1, Math.round(10 * armour)));
    });

    it('does not rescale a broadcast hit by the receiver\'s loadout', () => {
        const { g, emitted } = peer({ host: false });
        const snail = { position: { x: 0, z: 0 }, userData: { type: 'cybersnail', hp: 20 } };
        g.applyPlayerDamageToEnemy(snail, 3, { fromNetwork: true });
        expect(emitted).toEqual([]);
        expect(g.damageSnail).toHaveBeenCalledWith(snail, 3);
    });

    it('moves a peer\'s fight to the host\'s HP so its phase follows', () => {
        const { g } = peer({ host: false });
        const boss = queen();
        g.scatterSprites.push(boss);
        g.handleEnemyStateSnapshot({ enemies: [{ scatterKey: 'queen-fight', enemyType: 'boss_queen', x: 3, z: 4, hp: 40, isBoss: true }] });
        expect(boss.userData.hp).toBe(40);
        expect(boss.userData.queenFight.hp).toBe(40);
    });
});
