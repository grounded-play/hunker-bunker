import { describe, expect, it } from 'vitest';
import {
    buildPortfolioReport,
    computeSeedMetrics,
    runValidationSweep,
    selectPortfolioSeeds,
    worldSeedSweepIsValid
} from './world-seed-portfolio-report.js';

describe('computeSeedMetrics', () => {
    it('reports the full set of metrics doc 01/06 asks a human to read per seed', () => {
        const metrics = computeSeedMetrics(1);
        expect(metrics.seed).toBe(1);
        expect(metrics.structural.valid).toBe(true);
        expect(metrics.progression.valid).toBe(true);
        expect(Array.isArray(metrics.siteSpacingConflicts)).toBe(true);
        expect(metrics.ringWalkDistances[0]).toBe(0);
        // Ring walk distance must strictly increase ring-over-ring (this is
        // also asserted inside validateRingProgression, but pinning it here
        // too documents *why* ringWalkDistances is the "route length" field).
        for (let ring = 1; ring <= 5; ring += 1) {
            expect(metrics.ringWalkDistances[ring]).toBeGreaterThan(metrics.ringWalkDistances[ring - 1]);
        }
        expect(metrics.gates).toHaveLength(4);
        expect(metrics.sites.length).toBeGreaterThan(0);
        expect(metrics.firstRingClarity.gate).toMatchObject({ ring: 1 });
        expect(metrics.firstRingClarity.roomClusterCount).toBeGreaterThanOrEqual(8);
        expect(metrics.coordinateContract).toEqual({
            tileSize: 17,
            stride: 16,
            bandThickness: 5,
            lattice: 3,
            chunkSize: 49
        });
        expect(metrics.worldPlan).toMatchObject({
            version: 1,
            valid: true,
            manifestCount: 5,
            reservationCount: 90,
            projectedReservationCount: 90,
            territoryCount: 6,
            territoryBeatCount: 36,
            reciprocalSocketEndpointCount: 60,
            questDestinationCount: 9,
            viableFallbackCount: 4,
            crossingCount: 4,
            conflicts: []
        });
    });

    it('is deterministic for a fixed seed', () => {
        const a = computeSeedMetrics(42);
        const b = computeSeedMetrics(42);
        expect(a).toEqual(b);
    });

    it('varies with the seed', () => {
        const a = computeSeedMetrics(1);
        const b = computeSeedMetrics(2);
        expect(a.sites).not.toEqual(b.sites);
    });
});

describe('selectPortfolioSeeds', () => {
    it('picks one seed per named category, each internally valid', () => {
        const picks = selectPortfolioSeeds(50);
        for (const category of ['ordinary', 'loopHeavy', 'longSpine', 'denseMergedRoom', 'worstSiteSpacing']) {
            expect(picks[category]).toBeTruthy();
            expect(picks[category].metrics.structural.valid).toBe(true);
            expect(picks[category].metrics.progression.valid).toBe(true);
        }
    });

    it('picks the seed that actually maximizes each named metric within the sample', () => {
        const sampleSize = 50;
        const picks = selectPortfolioSeeds(sampleSize);
        const allMetrics = [];
        for (let seed = 1; seed <= sampleSize; seed += 1) allMetrics.push(computeSeedMetrics(seed));

        const maxLoopiness = Math.max(...allMetrics.map((m) => m.loopiness));
        expect(picks.loopHeavy.metrics.loopiness).toBe(maxLoopiness);

        const maxSpine = Math.max(...allMetrics.map((m) => m.spineChunkCount));
        expect(picks.longSpine.metrics.spineChunkCount).toBe(maxSpine);

        const maxAvgRoomClusterSize = Math.max(...allMetrics.map((m) => m.avgRoomClusterSize));
        expect(picks.denseMergedRoom.metrics.avgRoomClusterSize).toBe(maxAvgRoomClusterSize);
    });
});

describe('buildPortfolioReport', () => {
    it('produces one labeled entry per portfolio category', () => {
        const report = buildPortfolioReport(30);
        expect(report.map((entry) => entry.category)).toEqual([
            'ordinary', 'loopHeavy', 'longSpine', 'denseMergedRoom', 'worstSiteSpacing'
        ]);
        for (const entry of report) {
            expect(entry.seed).toBeGreaterThanOrEqual(1);
            expect(entry.metrics).toBeTruthy();
        }
    });
});

describe('runValidationSweep', () => {
    // A 300-seed sweep takes ~3.1-3.2s locally — comfortably under vitest's 5000ms default,
    // but close enough to the edge that slower/shared CI runners tip over it (seen failing in
    // CI with the default timeout). Explicit generous timeout rather than shrinking the sweep,
    // since the whole point of these tests is validating at real portfolio-report scale.
    it('reports no failures across a sweep and confirms determinism', () => {
        const sweep = runValidationSweep(300);
        expect(sweep.seedCount).toBe(300);
        expect(sweep.failures).toEqual([]);
        expect(sweep.determinismFailures).toEqual([]);
        expect(sweep.conflictSeedCount).toBe(0);
        expect(sweep.manifestConflictSeedCount).toBe(0);
        expect(sweep.allValid).toBe(true);
    }, 30000);

    it('counts seeds with site-spacing conflicts separately from validity failures', () => {
        const sweep = runValidationSweep(300);
        expect(sweep.conflictSeedCount).toBeGreaterThanOrEqual(0);
        expect(sweep.conflictSeedCount).toBeLessThanOrEqual(sweep.seedCount);
    }, 30000);

    it('treats legacy spacing and new manifest/territory conflicts as fatal audit failures', () => {
        const base = { failures: [], conflictSeedCount: 0, manifestConflictSeedCount: 0, determinismFailures: [] };
        expect(worldSeedSweepIsValid(base)).toBe(true);
        expect(worldSeedSweepIsValid({ ...base, conflictSeedCount: 1 })).toBe(false);
        expect(worldSeedSweepIsValid({ ...base, manifestConflictSeedCount: 1 })).toBe(false);
        expect(worldSeedSweepIsValid({ ...base, failures: [{ seed: 1 }] })).toBe(false);
        expect(worldSeedSweepIsValid({ ...base, determinismFailures: [1] })).toBe(false);
    });
});
