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
import { QUEEN_FIGHT_DEF } from '../src/bossPhases.js';
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

/** True only for 'queen' -- the sole id with any entry in bossPhases.js. */
export function hasPhaseMechanic(encounterId) {
    return encounterId === 'queen';
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
 * package relative to the Queen -- not as a default deliverable. The only
 * computable signal available (enemy data is just maxHp/speed; there is no
 * per-boss attack-pattern, telegraph, or decision-point data to compare) is
 * "does this boss have any phase/weakpoint mechanic at all," and every
 * non-Queen boss is equally phase-less by that measure. A binary signal
 * that flags all of them identically cannot single out "the worst one or
 * two" the doc asks to extend -- doing so anyway would be an arbitrary
 * pick, not an evidence-based one. Distinguishing which specific boss reads
 * as monotonous needs the human side-by-side encounter audit doc 02 and 07
 * both call for (Phase F in the master plan), not more simulation.
 */
export function gatedBossPhaseExtensionCandidates() {
    const phaselessBosses = BOSS_IDS.filter((id) => !hasPhaseMechanic(id));
    return {
        gateMet: false,
        reason: phaselessBosses.length > 1
            ? `${phaselessBosses.length} non-Queen bosses are all equally phase-less by computable data alone `
                + '(no per-boss decision-point/telegraph data exists to rank them) -- extending any one of them '
                + 'without a human side-by-side comparison would be an arbitrary pick, not evidence-based.'
            : 'no non-Queen boss data available to compare',
        phaselessBosses
    };
}

function formatRow(row) {
    return `${row.encounterId.padEnd(24)} ${row.className.padEnd(9)} `
        + `hp=${String(row.maxHp).padStart(4)} shots=${String(row.shots).padStart(4)} `
        + `ttk=${row.idealizedTtkSeconds.toFixed(1).padStart(6)}s `
        + `o2=${row.oxygenSpentPercent.toFixed(2).padStart(6)}% `
        + `ammoRecover=${String(row.worstCaseAmmoExhaustionRecoverySeconds).padStart(5)}s`;
}

function main() {
    const rows = buildEncounterTable();
    console.log('[combat-encounter-report] idealized-floor encounter table (continuous fire, no reload/skill tiers):\n');
    for (const row of rows) console.log(formatRow(row));

    console.log('\n[combat-encounter-report] boss-only summary:');
    for (const row of rows.filter((r) => r.isBoss)) console.log(formatRow(row));

    const gate = gatedBossPhaseExtensionCandidates();
    console.log(`\n[combat-encounter-report] B1 boss-phase-extension gate: ${gate.gateMet ? 'MET' : 'NOT MET'}`);
    console.log(`[combat-encounter-report] ${gate.reason}`);
    console.log(`[combat-encounter-report] phase-less bosses: ${gate.phaselessBosses.join(', ')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
