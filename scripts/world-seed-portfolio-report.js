#!/usr/bin/env node
// Sprint 22 A1+A3 (docs/sprint-22-systems-breakdown/01-world-generation-and-wfc.md
// "Seed portfolio" and 06-engineering-wfc-chunk-math.md "Engineering
// Acceptance"). Both docs ask for two different things this one script
// produces from the same pure macro-plan API (src/mazeExpedition.js):
//
// 1. A small, named seed portfolio (ordinary / loop-heavy / long-spine /
//    dense-merged-room / worst-site-spacing) with recorded route length,
//    first-ring clarity, gate identity, and camp/hive placement per seed --
//    the numbers a human reads to make the "does this feel purposeful"
//    call. This script computes the numbers; it does not make that call.
// 2. A large-N structural/progression validation sweep (thousands of
//    seeds), reporting only anomalies.
//
// What this does NOT do: judge room/hallway *legibility* or "dead-looking
// space" in the rendered sense -- that requires the actual per-chunk WFC
// tile stamp (src/wfcGenerator.js), which src/mazeGenerationStress.test.js
// already exercises separately, and is still a human read at the end. The
// "avgRoomClusterSize"/"largeClusterRatio" fields below are the closest
// thing this macro-plan level can compute as a proxy signal, reported
// neutrally -- not a readability verdict.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    computeRingWalkDistances,
    findConflictingChunkReservations,
    generateRadialMazeExpedition,
    validateRadialMazeExpedition,
    validateRingProgression
} from '../src/mazeExpedition.js';

const DEFAULT_PORTFOLIO_SAMPLE = 500;
const DEFAULT_SWEEP_SAMPLE = 5000;

/**
 * All the numbers Sprint 22's world-gen acceptance work asks a human to
 * read for one seed: route length per ring, first-ring clarity, gate
 * identity, camp/hive placement, structural + progression validity, and
 * site-spacing conflicts.
 */
export function computeSeedMetrics(seed) {
    const plan = generateRadialMazeExpedition(seed);
    const structural = validateRadialMazeExpedition(plan);
    const progression = validateRingProgression(plan);
    const ringWalkDistances = computeRingWalkDistances(plan);
    const conflicts = findConflictingChunkReservations(plan);

    const routeChunkCount = plan.topology.routeChunks.length;
    const routeEdgeCount = plan.topology.routeEdges.length;
    const spineChunkCount = plan.topology.spineChunkKeys.length;
    // A tree over N chunks has N-1 edges; more edges per chunk than that
    // means the route topology folds back on itself -- the closest proxy
    // this macro plan has for "loop-heavy" versus "single corridor."
    const loopiness = routeChunkCount > 0 ? routeEdgeCount / routeChunkCount : 0;

    const clusterSizes = plan.roomClusters.map((cluster) => cluster.roomCount);
    const avgRoomClusterSize = clusterSizes.length > 0
        ? clusterSizes.reduce((sum, value) => sum + value, 0) / clusterSizes.length
        : 0;
    const largeClusterRatio = plan.roomClusters.length > 0
        ? plan.roomClusters.filter((cluster) => cluster.size === 'large').length / plan.roomClusters.length
        : 0;

    const gates = plan.blockers.map((blocker) => ({
        id: blocker.id,
        ring: blocker.ring,
        blocksRing: blocker.blocksRing,
        feature: blocker.feature,
        door: blocker.door,
        opensTraversal: blocker.opensTraversal,
        chunk: Number.isFinite(blocker.chunkX) ? `${blocker.chunkX},${blocker.chunkY}` : null
    }));

    const sites = plan.nodes
        .filter((node) => node.ring > 0)
        .map((node) => ({
            id: node.id,
            ring: node.ring,
            chunk: Number.isFinite(node.chunkX) ? `${node.chunkX},${node.chunkY}` : null
        }));

    const ring1Clusters = plan.roomClusters.filter((cluster) => cluster.ring === 1);

    return {
        seed,
        structural,
        progression,
        siteSpacingConflicts: conflicts,
        routeChunkCount,
        routeEdgeCount,
        spineChunkCount,
        loopiness,
        avgRoomClusterSize,
        largeClusterRatio,
        ringWalkDistances: Object.fromEntries(ringWalkDistances),
        firstRingClarity: {
            walkDistance: ringWalkDistances.get(1),
            roomClusterCount: ring1Clusters.length,
            largeClusterCount: ring1Clusters.filter((cluster) => cluster.size === 'large').length,
            gate: gates.find((gate) => gate.ring === 1) ?? null
        },
        gates,
        sites
    };
}

function scoreForCategory(metrics, category) {
    if (category === 'loopHeavy') return metrics.loopiness;
    if (category === 'longSpine') return metrics.spineChunkCount;
    if (category === 'denseMergedRoom') return metrics.avgRoomClusterSize;
    if (category === 'worstSiteSpacing') return metrics.siteSpacingConflicts.length;
    return 0;
}

/**
 * Picks one seed per named portfolio category by simple, transparent
 * criteria over a sampled range -- documented here rather than left
 * implicit, so a reviewer can see exactly why a seed was chosen:
 *   - loopHeavy / longSpine / denseMergedRoom / worstSiteSpacing: the seed
 *     that maximizes that one metric.
 *   - ordinary: the seed closest to the sample's median on all four
 *     metrics at once (smallest summed rank-distance from the median rank).
 */
export function selectPortfolioSeeds(sampleSize = DEFAULT_PORTFOLIO_SAMPLE) {
    const seeds = [];
    for (let seed = 1; seed <= sampleSize; seed += 1) {
        seeds.push({ seed, metrics: computeSeedMetrics(seed) });
    }

    const categories = ['loopHeavy', 'longSpine', 'denseMergedRoom', 'worstSiteSpacing'];
    const picks = {};
    for (const category of categories) {
        picks[category] = seeds.reduce((best, entry) => (
            scoreForCategory(entry.metrics, category) > scoreForCategory(best.metrics, category) ? entry : best
        ), seeds[0]);
    }

    // "Ordinary": rank every seed on each metric, then take the smallest
    // total distance from the median rank across all four -- a seed with
    // no metric standing out in either direction.
    const metricNames = ['loopiness', 'spineChunkCount', 'avgRoomClusterSize'];
    const ranks = new Map(seeds.map((entry) => [entry.seed, 0]));
    for (const metricName of metricNames) {
        const sorted = [...seeds].sort((a, b) => a.metrics[metricName] - b.metrics[metricName]);
        const medianRank = (sorted.length - 1) / 2;
        sorted.forEach((entry, index) => {
            ranks.set(entry.seed, ranks.get(entry.seed) + Math.abs(index - medianRank));
        });
    }
    const ordinary = seeds.reduce((best, entry) => (
        ranks.get(entry.seed) < ranks.get(best.seed) ? entry : best
    ), seeds[0]);

    return {
        ordinary,
        loopHeavy: picks.loopHeavy,
        longSpine: picks.longSpine,
        denseMergedRoom: picks.denseMergedRoom,
        worstSiteSpacing: picks.worstSiteSpacing
    };
}

export function buildPortfolioReport(sampleSize = DEFAULT_PORTFOLIO_SAMPLE) {
    const picks = selectPortfolioSeeds(sampleSize);
    return Object.entries(picks).map(([category, entry]) => ({ category, ...entry }));
}

/**
 * The large-N correctness sweep: thousands of seeds, structural +
 * progression validity and site-spacing conflicts only -- no per-seed
 * detail, just anomalies. Also checks determinism (same seed twice ->
 * identical plan) on a small subsample, since a non-deterministic seed
 * would invalidate every other invariant this whole module proves.
 */
export function runValidationSweep(seedCount = DEFAULT_SWEEP_SAMPLE) {
    const failures = [];
    let conflictSeedCount = 0;
    for (let seed = 1; seed <= seedCount; seed += 1) {
        const plan = generateRadialMazeExpedition(seed);
        const structural = validateRadialMazeExpedition(plan);
        const progression = validateRingProgression(plan);
        const conflicts = findConflictingChunkReservations(plan);
        if (!structural.valid) failures.push({ seed, kind: 'structural', errors: structural.errors });
        if (!progression.valid) failures.push({ seed, kind: 'progression', errors: progression.errors });
        if (conflicts.length > 0) conflictSeedCount += 1;
    }

    const determinismSampleSeeds = [1, 2, 3, 17, 101, seedCount];
    const determinismFailures = determinismSampleSeeds
        .filter((seed) => seed >= 1 && seed <= seedCount)
        .filter((seed) => (
            JSON.stringify(generateRadialMazeExpedition(seed)) !== JSON.stringify(generateRadialMazeExpedition(seed))
        ));

    return {
        seedCount,
        failures,
        conflictSeedCount,
        determinismFailures,
        allValid: failures.length === 0 && determinismFailures.length === 0
    };
}

function formatCategoryLine({ category, seed, metrics }) {
    const gate = metrics.firstRingClarity.gate;
    return [
        `[${category}] seed ${seed}`,
        `  route (ring walk distances): ${JSON.stringify(metrics.ringWalkDistances)}`,
        `  first-ring clarity: walk=${metrics.firstRingClarity.walkDistance}, `
            + `clusters=${metrics.firstRingClarity.roomClusterCount} `
            + `(${metrics.firstRingClarity.largeClusterCount} large), `
            + `gate=${gate ? `${gate.feature} (${gate.door})` : 'none'}`,
        `  gates: ${metrics.gates.map((g) => `ring${g.ring}->${g.blocksRing}:${g.feature}@${g.chunk}`).join('; ')}`,
        `  camp/hive placement: ${metrics.sites.map((s) => `${s.id}@ring${s.ring}(${s.chunk})`).join('; ')}`,
        `  site-spacing conflicts: ${metrics.siteSpacingConflicts.length}`,
        `  loopiness=${metrics.loopiness.toFixed(3)} spine=${metrics.spineChunkCount} `
            + `avgRoomClusterSize=${metrics.avgRoomClusterSize.toFixed(2)} largeClusterRatio=${metrics.largeClusterRatio.toFixed(2)}`,
        `  structural valid=${metrics.structural.valid} progression valid=${metrics.progression.valid}`
    ].join('\n');
}

function main() {
    const args = process.argv.slice(2);
    const sweepOnly = args.includes('--sweep-only');
    const sweepArg = args.find((a) => a.startsWith('--sweep='));
    const seedCount = sweepArg ? Number(sweepArg.split('=')[1]) : DEFAULT_SWEEP_SAMPLE;

    if (!sweepOnly) {
        console.log(`[world-seed-portfolio] sampling ${DEFAULT_PORTFOLIO_SAMPLE} seeds for the named portfolio...\n`);
        const portfolio = buildPortfolioReport();
        for (const entry of portfolio) {
            console.log(formatCategoryLine(entry));
            console.log('');
        }
    }

    console.log(`[world-seed-portfolio] running large-N validation sweep across ${seedCount} seeds...`);
    const sweep = runValidationSweep(seedCount);
    if (sweep.failures.length > 0) {
        for (const failure of sweep.failures.slice(0, 20)) {
            console.error(`[world-seed-portfolio] seed ${failure.seed} failed ${failure.kind}: ${failure.errors.join('; ')}`);
        }
        if (sweep.failures.length > 20) {
            console.error(`[world-seed-portfolio] ...and ${sweep.failures.length - 20} more failures`);
        }
    }
    if (sweep.determinismFailures.length > 0) {
        console.error(`[world-seed-portfolio] non-deterministic seeds: ${sweep.determinismFailures.join(', ')}`);
    }
    console.log(
        `[world-seed-portfolio] swept ${sweep.seedCount} seeds: `
        + `${sweep.failures.length} validity failures, `
        + `${sweep.conflictSeedCount} seeds with site-spacing conflicts, `
        + `${sweep.determinismFailures.length} determinism failures.`
    );
    if (!sweep.allValid) {
        process.exitCode = 1;
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
