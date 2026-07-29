// Combat-economy acceptance checks (master-implementation-plan-2026-07-28.md
// Phase 10.2: "boss HP versus weapon DPS; ammunition availability"). These
// use only the base starting loadout -- no skill-tree ammo-capacity tiers,
// no world pickups collected en route -- as the floor case: can a fresh
// class kill a boss on the ammo it starts a run with, before any upgrades?
import { describe, expect, it } from 'vitest';
import { ENEMY_STATS } from './data/enemies.js';
import { CLASS_STATS, WEAPON_CLIP_SIZE } from './threeGame.js';
import { STARTING_RUN_AMMO, CLASS_AMMO_CAPACITY } from './data/ammoEconomy.js';

const BOSS_IDS = Object.keys(ENEMY_STATS).filter((id) => id.startsWith('boss_'));
const CLASS_NAMES = Object.keys(CLASS_STATS);

// Known, currently-unresolved gaps as of 2026-07-28 -- hardcoded, not
// derived from live numbers, so that fixing (or breaking) the balance flips
// the wrapped assertion and it.fails loudly reports "remove/extend this
// list" instead of silently going green or silently staying broken.
const KNOWN_AMMO_GAP_COMBOS = new Set([
    'boss_sporesnail:SCOUT',
    'boss_sporesnail:TANK',
    'boss_sporesnail:ENGINEER',
    'boss_cryosnail:SCOUT',
    'boss_cryosnail:ENGINEER'
]);

function shotsToKill(bossId, className) {
    return Math.ceil(ENEMY_STATS[bossId].maxHp / CLASS_STATS[className].projectileDamage);
}

function startingAmmoPool(className) {
    // Reserve ammo is capped at the class's carry capacity; the loaded clip
    // is separate from reserve. main.js:1782 mirrors this cap at run start.
    return Math.min(STARTING_RUN_AMMO, CLASS_AMMO_CAPACITY[className]) + WEAPON_CLIP_SIZE;
}

describe('combat economy: boss HP vs. starting ammo pool', () => {
    it('covers every declared boss archetype', () => {
        expect(BOSS_IDS.length).toBeGreaterThanOrEqual(6);
    });

    for (const bossId of BOSS_IDS) {
        for (const className of CLASS_NAMES) {
            const shots = shotsToKill(bossId, className);
            const pool = startingAmmoPool(className);
            // sporesnail (75 HP) and cryosnail (40 HP, for 1-damage classes)
            // are known, currently-unresolved gaps: a fresh loadout with zero
            // world pickups cannot kill them. Tracked since
            // docs/sprint-19-wave6-punch-list-lane-split.md; still true here.
            // it.fails keeps this loud (fails the meta-test) the moment the
            // gap is silently closed or reopens elsewhere, instead of lying
            // green or blocking CI on a known, undecided balance question.
            const runner = KNOWN_AMMO_GAP_COMBOS.has(`${bossId}:${className}`) ? it.fails : it;
            runner(`${bossId} vs ${className}: ${shots} shots <= ${pool}-shot starting pool`, () => {
                expect(shots).toBeLessThanOrEqual(pool);
            });
        }
    }
});
