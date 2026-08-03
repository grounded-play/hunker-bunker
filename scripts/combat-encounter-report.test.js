import { describe, expect, it } from 'vitest';
import { ENEMY_STATS } from '../src/data/enemies.js';
import { CLASS_STATS } from '../src/threeGame.js';
import {
    buildEncounterTable,
    gatedBossPhaseExtensionCandidates,
    hasPhaseMechanic,
    idealizedTimeToKillSeconds,
    oxygenSpentPercent,
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
    it('only the queen has a phase mechanic in the current data', () => {
        expect(hasPhaseMechanic('queen')).toBe(true);
        for (const enemyId of Object.keys(ENEMY_STATS)) {
            expect(hasPhaseMechanic(enemyId)).toBe(false);
        }
    });

    it('reports the B1 gate as not met, since every non-Queen boss is equally phase-less', () => {
        const gate = gatedBossPhaseExtensionCandidates();
        expect(gate.gateMet).toBe(false);
        expect(gate.phaselessBosses.length).toBeGreaterThan(1);
        expect(gate.phaselessBosses.every((id) => id.startsWith('boss_'))).toBe(true);
    });
});
