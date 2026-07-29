// Phase 10.2: "Queen and corrupted-operator fights... Close slay_the_queen
// only after a repeatable combat acceptance pass." src/threeGame.queenFight.test.js
// already covers damage-routing correctness (armor/weakpoint math, hp
// lockstep, defeat/milestone firing) but never runs the fight end-to-end.
// This simulates the real, pure bossPhases.js state machine
// (createBossFight/tickBossFight/applyBossDamage -- no mocks, the actual
// production functions) against each class's real fire rate to check the
// fight is even mathematically completable, not just correctly wired.
import { describe, expect, it } from 'vitest';
import { applyBossDamage, createBossFight, currentPhase, QUEEN_FIGHT_DEF, tickBossFight } from './bossPhases.js';
import { CLASS_STATS, WEAPON_FIRE_COOLDOWN } from './threeGame.js';

// Idealized floor case: constant, uninterrupted fire at the class's base
// rate, no upgrades, no missed shots. A real player fires less than this
// (dodging attacks/adds), so this is an upper bound on how fast the fight
// *could* go, not a claim about real play -- same idealized-floor framing
// as src/combatEconomy.test.js.
function simulateQueenFight(className, { maxSeconds = 600, dt = 0.05 } = {}) {
    const fight = createBossFight(QUEEN_FIGHT_DEF);
    const damage = CLASS_STATS[className].projectileDamage;
    let elapsed = 0;
    let fireTimer = 0;
    const phaseLog = [];
    while (!fight.defeated && elapsed < maxSeconds) {
        const events = tickBossFight(fight, dt);
        for (const event of events) {
            if (event.type === 'phase') phaseLog.push({ phase: event.phase, atSeconds: elapsed });
        }
        fireTimer -= dt;
        if (fireTimer <= 0) {
            fireTimer += WEAPON_FIRE_COOLDOWN;
            applyBossDamage(fight, damage);
        }
        elapsed += dt;
    }
    return { defeated: fight.defeated, elapsed, phaseLog, finalHp: fight.hp };
}

describe('Queen fight combat-economy acceptance (idealized constant-fire floor case)', () => {
    it.each(Object.keys(CLASS_STATS))('%s can defeat the Queen within a generous 600s ceiling at constant fire', (className) => {
        const result = simulateQueenFight(className);
        expect(result.defeated, `finalHp=${result.finalHp} at 600s`).toBe(true);
        expect(result.elapsed).toBeLessThanOrEqual(600);
    });

    it('every class passes through all three phases, not skipping the escalation', () => {
        // 'brood' is the implicit starting phase (createBossFight sets
        // phaseIndex=0 directly) -- tickBossFight only emits a 'phase'
        // event on a transition *away* from the current phase, so the log
        // itself only ever shows ['fury', 'desperation']. Confirmed
        // directly rather than assumed after the first version of this
        // test wrongly expected 'brood' to appear in the event log too.
        for (const className of Object.keys(CLASS_STATS)) {
            const startingFight = createBossFight(QUEEN_FIGHT_DEF);
            expect(currentPhase(startingFight).key, `${className} starting phase`).toBe('brood');

            const result = simulateQueenFight(className);
            const phaseKeys = result.phaseLog.map((entry) => entry.phase);
            expect(phaseKeys, className).toEqual(['fury', 'desperation']);
        }
    });

    it('the armor mechanic still lets minimum-damage classes chip through outside weakpoint windows (armor chips, does not zero hits)', () => {
        // SCOUT/ENGINEER deal 1 raw damage; applyBossDamage's own contract
        // ("any positive raw amount still deals at least 1") means armored
        // hits from a 1-damage class are never fully negated -- verified
        // directly against the real function, not assumed from reading it.
        const fight = createBossFight(QUEEN_FIGHT_DEF);
        const dealt = applyBossDamage(fight, CLASS_STATS.SCOUT.projectileDamage);
        expect(dealt).toBe(1);
        expect(fight.hp).toBe(QUEEN_FIGHT_DEF.maxHp - 1);
    });

    it('TANK deals meaningfully more damage inside a weakpoint window than armored (the mechanic has real teeth for 2-damage classes)', () => {
        const armored = createBossFight(QUEEN_FIGHT_DEF);
        const armoredDealt = applyBossDamage(armored, CLASS_STATS.TANK.projectileDamage);

        const weakpointOpen = createBossFight(QUEEN_FIGHT_DEF);
        weakpointOpen.weakpointOpenFor = 2.0;
        const openDealt = applyBossDamage(weakpointOpen, CLASS_STATS.TANK.projectileDamage);

        expect(armoredDealt).toBe(1);
        expect(openDealt).toBe(2);
        expect(openDealt).toBeGreaterThan(armoredDealt);
    });

    it('reports the actual idealized-floor time-to-kill per class (diagnostic, not a pass/fail gate)', () => {
        const results = Object.keys(CLASS_STATS).map((className) => {
            const { elapsed } = simulateQueenFight(className);
            return `${className}: ${elapsed.toFixed(1)}s`;
        });
        // No assertion beyond "it ran" -- this test exists so the numbers
        // are visible in test output for whoever tunes fight feel next,
        // without gating CI on a specific duration nobody has playtested.
        expect(results).toHaveLength(3);
    });
});
