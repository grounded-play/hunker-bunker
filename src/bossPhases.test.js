import { describe, it, expect } from 'vitest';
import {
    createBossFight,
    tickBossFight,
    applyBossDamage,
    isWeakpointOpen,
    currentPhase,
    QUEEN_FIGHT_DEF,
    QUEEN_PHASE_LINES
} from './bossPhases.js';

const SIMPLE_DEF = {
    key: 'test',
    maxHp: 100,
    armoredDamageMult: 0.25,
    phases: [
        { key: 'p1', until: 0.5, attackCooldown: 2, attack: 'poke', weakpoint: { every: 5, duration: 2 } },
        { key: 'p2', until: 0, attackCooldown: 1, attack: 'slam', addWave: { every: 3, type: 'add', count: 2, max: 3 } }
    ]
};

function drain(fight, seconds, step = 0.1, ctx = {}) {
    const events = [];
    for (let t = 0; t < seconds; t += step) {
        events.push(...tickBossFight(fight, step, ctx));
    }
    return events;
}

describe('createBossFight / damage gating', () => {
    it('starts in phase 1 with full hp and armored damage', () => {
        const fight = createBossFight(SIMPLE_DEF);
        expect(currentPhase(fight).key).toBe('p1');
        expect(fight.hp).toBe(100);

        const dealt = applyBossDamage(fight, 8);
        expect(dealt).toBe(2); // armored: 25%
        expect(fight.hp).toBe(98);
    });

    it('takes full damage only while a weakpoint window is open', () => {
        const fight = createBossFight(SIMPLE_DEF);
        const events = drain(fight, 5.05);
        expect(events.some((e) => e.type === 'weakpoint-open')).toBe(true);
        expect(isWeakpointOpen(fight)).toBe(true);

        const dealt = applyBossDamage(fight, 8);
        expect(dealt).toBe(8);

        drain(fight, 2.05);
        expect(isWeakpointOpen(fight)).toBe(false);
        expect(applyBossDamage(fight, 8)).toBe(2);
    });

    it('rejects malformed defs', () => {
        expect(createBossFight(null)).toBeNull();
        expect(createBossFight({ phases: [] })).toBeNull();
    });
});

describe('phase transitions', () => {
    it('advances phases from hp, resets cadences, and closes open windows', () => {
        const fight = createBossFight(SIMPLE_DEF);
        drain(fight, 5.05); // open the weakpoint
        expect(isWeakpointOpen(fight)).toBe(true);

        fight.hp = 40; // cross the 0.5 threshold
        const events = tickBossFight(fight, 0.1);
        const types = events.map((e) => e.type);
        expect(types).toContain('phase');
        expect(types).toContain('weakpoint-close'); // new stance slams it shut
        expect(currentPhase(fight).key).toBe('p2');
        expect(isWeakpointOpen(fight)).toBe(false);
    });

    it('never skips backward when hp only goes down', () => {
        const fight = createBossFight(SIMPLE_DEF);
        fight.hp = 10;
        tickBossFight(fight, 0.1);
        expect(currentPhase(fight).key).toBe('p2');
        fight.hp = 5;
        tickBossFight(fight, 0.1);
        expect(currentPhase(fight).key).toBe('p2');
    });
});

describe('attack and add cadences', () => {
    it('emits attacks on the phase cooldown', () => {
        const fight = createBossFight(SIMPLE_DEF);
        const events = drain(fight, 4.25);
        const attacks = events.filter((e) => e.type === 'attack');
        expect(attacks.length).toBe(2);
        expect(attacks[0].attack).toBe('poke');
    });

    it('caps add waves at the phase max', () => {
        const fight = createBossFight(SIMPLE_DEF);
        fight.hp = 40;
        tickBossFight(fight, 0.1); // enter p2
        const full = drain(fight, 3.2, 0.1, { activeAdds: 0 });
        const wave = full.find((e) => e.type === 'adds');
        expect(wave).toMatchObject({ addType: 'add', count: 2 });

        const capped = drain(fight, 3.2, 0.1, { activeAdds: 2 });
        const cappedWave = capped.find((e) => e.type === 'adds');
        expect(cappedWave?.count ?? 0).toBeLessThanOrEqual(1);
    });
});

describe('defeat', () => {
    it('emits defeated exactly once and ignores further damage', () => {
        const fight = createBossFight(SIMPLE_DEF);
        fight.hp = 1;
        drain(fight, 5.05); // open a window somewhere in here
        applyBossDamage(fight, 50);
        expect(fight.defeated).toBe(true);

        const first = tickBossFight(fight, 0.1);
        expect(first).toEqual([{ type: 'defeated' }]);
        expect(tickBossFight(fight, 0.1)).toEqual([]);
        expect(applyBossDamage(fight, 10)).toBe(0);
    });
});

describe('the queen def', () => {
    it('is three escalating phases with lines for each', () => {
        expect(QUEEN_FIGHT_DEF.phases.map((p) => p.key)).toEqual(['brood', 'fury', 'desperation']);
        for (const phase of QUEEN_FIGHT_DEF.phases) {
            expect(QUEEN_PHASE_LINES[phase.key]).toBeTruthy();
            expect(phase.weakpoint.duration).toBeGreaterThan(0);
        }
        // Escalation: attacks speed up phase over phase.
        const cds = QUEEN_FIGHT_DEF.phases.map((p) => p.attackCooldown);
        expect(cds[0]).toBeGreaterThan(cds[1]);
        expect(cds[1]).toBeGreaterThan(cds[2]);
    });

    it('plays out to a defeat under sustained weakpoint discipline', () => {
        const fight = createBossFight(QUEEN_FIGHT_DEF);
        let guard = 0;
        while (!fight.defeated && guard < 10000) {
            guard += 1;
            tickBossFight(fight, 0.1);
            // A disciplined player: full damage in windows, chip otherwise.
            applyBossDamage(fight, isWeakpointOpen(fight) ? 1.2 : 0.2);
        }
        expect(fight.defeated).toBe(true);
        expect(guard).toBeLessThan(10000);
    });
});
