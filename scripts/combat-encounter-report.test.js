import { describe, expect, it } from 'vitest';
import { ENEMY_STATS } from '../src/data/enemies.js';
import { CLASS_STATS } from '../src/threeGame.js';
import {
    buildEncounterTable,
    gatedBossPhaseExtensionCandidates,
    hasPhaseMechanic,
    idealizedTimeToKillSeconds,
    oxygenSpentPercent,
    phasedTimeToKillSeconds,
    shotsToKill,
    worstCaseAmmoExhaustionRecoverySeconds
} from './combat-encounter-report.js';

const CLASS_NAMES = Object.keys(CLASS_STATS);
const ENEMY_COUNT = Object.keys(ENEMY_STATS).length;

describe('buildEncounterTable', () => {
    it('covers every declared enemy plus the synthetic queen row, for every class', () => {
        const rows = buildEncounterTable();
        expect(rows).toHaveLength((ENEMY_COUNT + 1) * CLASS_NAMES.length);
        expect(rows.some((row) => row.encounterId === 'queen')).toBe(true);
        for (const enemyId of Object.keys(ENEMY_STATS)) {
            expect(rows.filter((row) => row.encounterId === enemyId)).toHaveLength(CLASS_NAMES.length);
        }
    });

    it('flags exactly the boss_* ids and queen as bosses', () => {
        const rows = buildEncounterTable();
        for (const row of rows) {
            expect(row.isBoss).toBe(row.encounterId === 'queen' || row.encounterId.startsWith('boss_'));
        }
    });

    it('every row is internally consistent with the individual pure functions', () => {
        const rows = buildEncounterTable();
        for (const row of rows) {
            expect(row.shots).toBe(shotsToKill(row.encounterId, row.className));
            expect(row.idealizedTtkSeconds).toBe(idealizedTimeToKillSeconds(row.encounterId, row.className));
            expect(row.oxygenSpentPercent).toBe(oxygenSpentPercent(row.encounterId, row.className));
            expect(row.worstCaseAmmoExhaustionRecoverySeconds)
                .toBe(worstCaseAmmoExhaustionRecoverySeconds(row.encounterId, row.className));
        }
    });
});

describe('idealizedTimeToKillSeconds', () => {
    it('a harder-hitting class kills faster (or at worst as fast) than a weaker one against the same target', () => {
        // TANK deals 2 damage/shot, SCOUT and ENGINEER deal 1 -- TANK should
        // never take longer to drop the same enemy.
        for (const enemyId of Object.keys(ENEMY_STATS)) {
            expect(idealizedTimeToKillSeconds(enemyId, 'TANK'))
                .toBeLessThanOrEqual(idealizedTimeToKillSeconds(enemyId, 'SCOUT'));
        }
    });

    it('the Queen baseline row takes longer than every ordinary boss at the same class (unarmored HP comparison)', () => {
        const nonQueenBosses = Object.keys(ENEMY_STATS).filter((id) => id.startsWith('boss_'));
        for (const className of CLASS_NAMES) {
            const queenTtk = idealizedTimeToKillSeconds('queen', className);
            for (const bossId of nonQueenBosses) {
                expect(queenTtk).toBeGreaterThan(idealizedTimeToKillSeconds(bossId, className));
            }
        }
    });
});

describe('hasPhaseMechanic / gatedBossPhaseExtensionCandidates (B1)', () => {
    it('the queen and the converted boss_sporesnail have a phase mechanic; every other enemy does not', () => {
        expect(hasPhaseMechanic('queen')).toBe(true);
        expect(hasPhaseMechanic('boss_sporesnail')).toBe(true);
        for (const enemyId of Object.keys(ENEMY_STATS)) {
            if (enemyId === 'boss_sporesnail') continue;
            expect(hasPhaseMechanic(enemyId)).toBe(false);
        }
    });

    it('reports the B1 gate as met, with boss_sporesnail as the only conversion this pass', () => {
        const gate = gatedBossPhaseExtensionCandidates();
        expect(gate.gateMet).toBe(true);
        expect(gate.convertedThisPass).toEqual(['boss_sporesnail']);
        expect(gate.phaselessBosses).not.toContain('boss_sporesnail');
        expect(gate.phaselessBosses.length).toBeGreaterThan(0);
        expect(gate.phaselessBosses.every((id) => id.startsWith('boss_'))).toBe(true);
    });
});

describe('phasedTimeToKillSeconds', () => {
    it('returns null for ids with no bossPhases.js entry', () => {
        expect(phasedTimeToKillSeconds('boss_cybersnail', 'SCOUT')).toBeNull();
    });

    it("TANK's phased fight takes meaningfully longer than the unarmored idealized baseline (armor has real bite at 2 damage/shot)", () => {
        // TANK deals 2 dmg/shot; applyBossDamage rounds 2*0.6=1.2 down to 1
        // outside weakpoint windows, a real reduction from the unarmored 2.
        // SCOUT/ENGINEER deal 1 dmg/shot, where round(1*0.6)=1 is the same
        // as unarmored (the "never fully negated" floor absorbs the armor
        // entirely for them) plus phase-two weakpoint windows can only help
        // -- so no directional guarantee holds for those two classes.
        const phased = phasedTimeToKillSeconds('boss_sporesnail', 'TANK');
        expect(phased).not.toBeNull();
        expect(phased).toBeGreaterThan(idealizedTimeToKillSeconds('boss_sporesnail', 'TANK'));
    });

    it('every class can still defeat the phased sporesnail fight within a generous ceiling', () => {
        for (const className of CLASS_NAMES) {
            const phased = phasedTimeToKillSeconds('boss_sporesnail', className, { maxSeconds: 300 });
            expect(phased, `${className} did not defeat boss_sporesnail within 300s`).not.toBeNull();
        }
    });
});
