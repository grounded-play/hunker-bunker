// Combat-economy acceptance checks (master-implementation-plan-2026-07-28.md
// Phase 10.2: "boss HP versus weapon DPS; ammunition availability;
// anti-softlock drops"). Floor case, no skill-tree tiers and no world
// ammo pickups collected en route -- just the starting loadout plus the
// game's own always-on passive clip regen (updateWeaponAmmoRefill,
// src/threeGame.js:13748), which never stops and never requires an
// upgrade to function (getAmmoRefillInterval floors at
// WEAPON_AMMO_REFILL_MIN_INTERVAL, never at Infinity/disabled).
import { describe, expect, it } from 'vitest';
import { ENEMY_STATS } from './data/enemies.js';
import { CLASS_STATS, WEAPON_AMMO_REFILL_INTERVAL, WEAPON_CLIP_SIZE } from './threeGame.js';
import { STARTING_RUN_AMMO, CLASS_AMMO_CAPACITY } from './data/ammoEconomy.js';

const BOSS_IDS = Object.keys(ENEMY_STATS).filter((id) => id.startsWith('boss_'));
const CLASS_NAMES = Object.keys(CLASS_STATS);

// Worst-case additional time a boss fight can demand once the starting
// ammo pool is spent dry, before passive clip regen alone (no ammoRefill
// skill investment, so the slowest available rate) finishes the kill. 10
// minutes is a deliberately generous ceiling for "ammo exhaustion is not a
// permanent wall", not a claim about intended total fight length.
const MAX_ACCEPTABLE_AMMO_EXHAUSTION_RECOVERY_SECONDS = 600;

function shotsToKill(bossId, className) {
    return Math.ceil(ENEMY_STATS[bossId].maxHp / CLASS_STATS[className].projectileDamage);
}

function startingAmmoPool(className) {
    // Reserve ammo is capped at the class's carry capacity; the loaded clip
    // is separate from reserve. main.js:1782 mirrors this cap at run start.
    return Math.min(STARTING_RUN_AMMO, CLASS_AMMO_CAPACITY[className]) + WEAPON_CLIP_SIZE;
}

function worstCaseAmmoExhaustionRecoverySeconds(bossId, className) {
    const deficit = Math.max(0, shotsToKill(bossId, className) - startingAmmoPool(className));
    return deficit * WEAPON_AMMO_REFILL_INTERVAL;
}

describe('combat economy: boss HP vs. ammo economy (starting pool + passive regen)', () => {
    it('covers every declared boss archetype', () => {
        expect(BOSS_IDS.length).toBeGreaterThanOrEqual(6);
    });

    for (const bossId of BOSS_IDS) {
        for (const className of CLASS_NAMES) {
            const shots = shotsToKill(bossId, className);
            const pool = startingAmmoPool(className);
            const recoverySeconds = worstCaseAmmoExhaustionRecoverySeconds(bossId, className);
            it(`${bossId} vs ${className}: ${shots} shots, ${pool}-shot starting pool, worst-case ${recoverySeconds}s of passive regen to finish`, () => {
                // No boss is a permanent ammo wall: even a fresh loadout with
                // zero world pickups and zero ammoRefill skill investment can
                // always finish the kill by waiting out passive clip regen
                // within a generous window.
                expect(recoverySeconds).toBeLessThanOrEqual(MAX_ACCEPTABLE_AMMO_EXHAUSTION_RECOVERY_SECONDS);
            });
        }
    }

    it('starting pool alone (no regen needed) covers most boss/class combos', () => {
        // Sanity check that regen-dependent cases are the minority (the
        // easier corrupted-operator bosses), not the norm -- only the two
        // toughest snail bosses (cryosnail, sporesnail) should ever need it.
        const allCombos = BOSS_IDS.flatMap((bossId) => CLASS_NAMES.map((className) => ({ bossId, className })));
        const regenDependent = allCombos.filter(({ bossId, className }) => worstCaseAmmoExhaustionRecoverySeconds(bossId, className) > 0);
        expect(regenDependent.every(({ bossId }) => ['boss_cryosnail', 'boss_sporesnail'].includes(bossId)), JSON.stringify(regenDependent)).toBe(true);
        expect(regenDependent.length).toBeLessThan(allCombos.length);
    });
});
