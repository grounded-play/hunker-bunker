#!/usr/bin/env node
// Sprint 22 A2+B1 (docs/sprint-22-systems-breakdown/02-combat-and-classes.md
// "Sprint 22 Acceptance Matrix" and 07-engineering-combat-boss-phases.md
// "Sprint 22 Engineering Deliverables": "Produce a measured encounter table
// from real builds" / "Select the worst one or two boss experiences").
//
// Methodology matches the two existing combat-economy tests rather than
// inventing a new one: continuous idealized-floor fire at the class's base
// rate (src/queenFightAcceptance.test.js's simulateQueenFight), no skill-tree
// tiers, no world ammo pickups (src/combatEconomy.test.js) -- an upper bound
// on how fast a fight *could* go, not a claim about real play. This can't
// measure "tactically distinct decisions," damage readability, or whether
// backing-away-while-firing dominates (doc 02's other acceptance columns) --
// those need the human combat-feel pass this table is instrumentation for,
// not a replacement for.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENEMY_STATS } from '../src/data/enemies.js';
import { applyBossDamage, createBossFight, QUEEN_FIGHT_DEF, SPORESNAIL_FIGHT_DEF, tickBossFight } from '../src/bossPhases.js';
import { CLASS_STATS, O2_DRAIN_RATE_PCT_PER_SEC, WEAPON_AMMO_REFILL_INTERVAL, WEAPON_FIRE_COOLDOWN } from '../src/threeGame.js';
import { CLASS_AMMO_CAPACITY, STARTING_RUN_AMMO } from '../src/data/ammoEconomy.js';

const CLASS_NAMES = Object.keys(CLASS_STATS);
// Every enemy in ENEMY_STATS, plus a synthetic 'queen' row using
// QUEEN_FIGHT_DEF's maxHp under this same simple model. This is
// deliberately the "if the Queen had no armor/weakpoint mechanic" baseline
// for an apples-to-apples HP-only comparison against every other boss --
// the real armored/phased Queen duration is already measured separately by
// src/queenFightAcceptance.test.js and is not what this row reports.
const ENCOUNTER_IDS = [...Object.keys(ENEMY_STATS), 'queen'];
const BOSS_IDS = ENCOUNTER_IDS.filter((id) => id === 'queen' || id.startsWith('boss_'));

function maxHpFor(encounterId) {
    return encounterId === 'queen' ? QUEEN_FIGHT_DEF.maxHp : ENEMY_STATS[encounterId].maxHp;
}

export function shotsToKill(encounterId, className) {
    return Math.ceil(maxHpFor(encounterId) / CLASS_STATS[className].projectileDamage);
}

// Continuous idealized-floor fire, no reload/clip pauses modeled -- same
// simplification src/queenFightAcceptance.test.js's simulateQueenFight
// makes, kept here so a Queen-vs-everything-else comparison uses one
// consistent method rather than two incompatible ones.
export function idealizedTimeToKillSeconds(encounterId, className) {
    return shotsToKill(encounterId, className) * WEAPON_FIRE_COOLDOWN;
}

export function oxygenSpentPercent(encounterId, className) {
    return idealizedTimeToKillSeconds(encounterId, className)
        * O2_DRAIN_RATE_PCT_PER_SEC
        * CLASS_STATS[className].o2DrainMult;
}

// Generalizes src/combatEconomy.test.js's boss-only worst-case ammo
// exhaustion recovery to every encounter, not just boss_* ids.
export function worstCaseAmmoExhaustionRecoverySeconds(encounterId, className) {
    const pool = Math.min(STARTING_RUN_AMMO, CLASS_AMMO_CAPACITY[className]);
    const deficit = Math.max(0, shotsToKill(encounterId, className) - pool);
    return deficit * WEAPON_AMMO_REFILL_INTERVAL;
}

const PHASE_DEFS = { queen: QUEEN_FIGHT_DEF, boss_sporesnail: SPORESNAIL_FIGHT_DEF };

/** True for ids with a real entry in bossPhases.js. */
export function hasPhaseMechanic(encounterId) {
    return Object.prototype.hasOwnProperty.call(PHASE_DEFS, encounterId);
}

// Real floor-case simulation against the actual phase state machine (not
// the HP-only idealizedTimeToKillSeconds above), for the ids that have one:
// continuous fire at the class's base rate, no reload/skill tiers, chipping
// outside weakpoint windows and dealing full damage inside them the moment
// they're open (an upper bound on skilled play, same idealized-floor
// framing as src/queenFightAcceptance.test.js's simulateQueenFight, which
// this generalizes to any bossPhases.js def instead of just the Queen's).
export function phasedTimeToKillSeconds(encounterId, className, { maxSeconds = 600, dt = 0.05 } = {}) {
    const def = PHASE_DEFS[encounterId];
    if (!def) return null;
    const fight = createBossFight(def);
    const damage = CLASS_STATS[className].projectileDamage;
    let elapsed = 0;
    let fireTimer = 0;
    while (!fight.defeated && elapsed < maxSeconds) {
        tickBossFight(fight, dt);
        fireTimer -= dt;
        if (fireTimer <= 0) {
            fireTimer += WEAPON_FIRE_COOLDOWN;
            applyBossDamage(fight, damage);
        }
        elapsed += dt;
    }
    return fight.defeated ? elapsed : null;
}

export function buildEncounterTable() {
    const rows = [];
    for (const encounterId of ENCOUNTER_IDS) {
        for (const className of CLASS_NAMES) {
            rows.push({
                encounterId,
                className,
                isBoss: BOSS_IDS.includes(encounterId),
                maxHp: maxHpFor(encounterId),
                shots: shotsToKill(encounterId, className),
                idealizedTtkSeconds: idealizedTimeToKillSeconds(encounterId, className),
                phasedTtkSeconds: phasedTimeToKillSeconds(encounterId, className),
                oxygenSpentPercent: oxygenSpentPercent(encounterId, className),
                worstCaseAmmoExhaustionRecoverySeconds: worstCaseAmmoExhaustionRecoverySeconds(encounterId, className),
                hasPhaseMechanic: hasPhaseMechanic(encounterId)
            });
        }
    }
    return rows;
}

/**
 * The B1 gate: per docs/sprint-22-systems-breakdown/07-engineering-combat-boss-phases.md,
 * only extend bossPhases.js for a boss the *data* flags as a pure stat
 * package relative to the Queen -- not as a default deliverable.
 *
 * Revised finding: an earlier pass at this gate checked only "does this
 * boss have any bossPhases.js entry," which every non-Queen boss fails
 * identically -- a signal that can't single out "the worst one or two" as
 * the doc asks. Reading the actual per-boss attack code in threeGame.js
 * (not just the maxHp/speed in data/enemies.js) turned up a real,
 * discriminating signal: boss_sporesnail has by far the highest HP, the
 * longest idealizedTimeToKillSeconds, and its one mechanic (spawning
 * passive minions) deals zero direct damage, so an unusually long fight
 * never directly threatens the player. That boss has since been converted
 * (SPORESNAIL_FIGHT_DEF, src/bossPhases.js) -- two phases, gentler armor
 * than the Queen's, wired into threeGame.js's boss_sporesnail attack
 * dispatch. It's the only non-Queen boss with a phase entry now.
 *
 * The remaining phase-less bosses are NOT flagged for the same treatment:
 * none of them show a comparably extreme HP/TTK/no-direct-damage profile,
 * so picking among them would go back to being an arbitrary choice.
 * Confirming whether they need it at all still needs the human
 * side-by-side combat-feel pass (Phase F in the master plan).
 */
export function gatedBossPhaseExtensionCandidates() {
    const phaselessBosses = BOSS_IDS.filter((id) => !hasPhaseMechanic(id));
    return {
        gateMet: true,
        convertedThisPass: ['boss_sporesnail'],
        reason: 'boss_sporesnail converted onto the phase framework based on HP/TTK/no-direct-damage data '
            + '(see SPORESNAIL_FIGHT_DEF in src/bossPhases.js). Remaining phase-less bosses show no comparably '
            + 'extreme profile -- extending any of them further would be an arbitrary pick without the human '
            + 'combat-feel pass this table is instrumentation for, not a replacement for.',
        phaselessBosses
    };
}

function formatRow(row) {
    const phased = row.phasedTtkSeconds != null ? `${row.phasedTtkSeconds.toFixed(1)}s` : 'n/a';
    return `${row.encounterId.padEnd(24)} ${row.className.padEnd(9)} `
        + `hp=${String(row.maxHp).padStart(4)} shots=${String(row.shots).padStart(4)} `
        + `ttk=${row.idealizedTtkSeconds.toFixed(1).padStart(6)}s `
        + `phasedTtk=${phased.padStart(7)} `
        + `o2=${row.oxygenSpentPercent.toFixed(2).padStart(6)}% `
        + `ammoRecover=${String(row.worstCaseAmmoExhaustionRecoverySeconds).padStart(5)}s`;
}

function main() {
    const rows = buildEncounterTable();
    console.log('[combat-encounter-report] idealized-floor encounter table (continuous fire, no reload/skill tiers):');
    console.log('[combat-encounter-report] ttk = unarmored HP-only baseline; phasedTtk = real bossPhases.js simulation where one exists:\n');
    for (const row of rows) console.log(formatRow(row));

    console.log('\n[combat-encounter-report] boss-only summary:');
    for (const row of rows.filter((r) => r.isBoss)) console.log(formatRow(row));

    const gate = gatedBossPhaseExtensionCandidates();
    console.log(`\n[combat-encounter-report] B1 boss-phase-extension gate: ${gate.gateMet ? 'MET' : 'NOT MET'}`);
    console.log(`[combat-encounter-report] converted this pass: ${gate.convertedThisPass?.join(', ') ?? 'none'}`);
    console.log(`[combat-encounter-report] ${gate.reason}`);
    console.log(`[combat-encounter-report] remaining phase-less bosses: ${gate.phaselessBosses.join(', ')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
