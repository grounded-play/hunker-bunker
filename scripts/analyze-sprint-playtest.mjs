#!/usr/bin/env node
// Read-only, compact evidence extraction. Entry IDs, not array offsets, are cited.
// Usage: node scripts/analyze-sprint-playtest.mjs <capture.json> [...]
import fs from 'node:fs';
import crypto from 'node:crypto';

function details(entry) {
    const start = entry.message.indexOf('{');
    if (start < 0) return {};
    try { return JSON.parse(entry.message.slice(start)); } catch { return {}; }
}

const reports = process.argv.slice(2).map((file) => {
    const bytes = fs.readFileSync(file);
    const capture = JSON.parse(bytes);
    const entries = capture.entries ?? [];
    const ref = (e) => ({ id: e.id, elapsedMs: e.elapsedMs, message: e.message.split('\n')[0] });
    const tasks = entries.filter(e => /^Long task:/.test(e.message)).map(e => ({
        ...ref(e), durationMs: details(e).durationMs,
        phases: (details(e).recentPhases ?? []).filter(p => p.durationMs >= 100)
            .map(p => ({ phase: p.phase, durationMs: p.durationMs, type: p.context?.type }))
    }));
    const missing = {};
    for (const e of entries.filter(e => /^play-missing/.test(e.message))) {
        const key = details(e).key ?? 'unknown';
        missing[key] ??= { count: 0, first: ref(e) };
        missing[key].count++;
    }
    const performance = capture.state?.performance ?? {};
    return {
        file, sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        startedAt: capture.session?.startedAt, exportedAt: capture.session?.exportedAt,
        userAgent: capture.session?.userAgent,
        durationMs: capture.session?.durationMs, entryCount: entries.length,
        steamActive: capture.state?.steam?.active,
        environment: entries.find(e => /Environment:/.test(e.message))?.message,
        playerType: capture.state?.playerType, runStats: capture.state?.runStats,
        position: capture.state?.position,
        finalPerformance: {
            wallInstances: performance.wallInstances, wallMeshes: performance.wallMeshes,
            jsHeapUsed: performance.jsHeapUsed, gpuFrame: performance.gpuFrame,
            gpuMemory: performance.gpuMemory,
            adaptiveGameplayPerformanceMode: performance.adaptiveGameplayPerformanceMode
        },
        longTasks: { count: tasks.length, totalMs: tasks.reduce((sum, t) => sum + (t.durationMs ?? 0), 0),
            slowest: tasks.sort((a, b) => b.durationMs - a.durationMs).slice(0, 8) },
        missingAudio: missing,
        milestones: entries.filter(e => /Playing cutscene|foundry-discovered|REPAIR GENERATOR|INITIATE BUILD|ACTIVATE FOUNDRY|RECRUIT COMPANION|depenetrated|portal-plane|player-death|reset.*achiev|achievement.*unlock|o2-bubble-activated/i.test(e.message.split('\n')[0])).map(ref),
        phases: entries.filter(e => e.category === 'PHASE').map(ref)
    };
});
console.log(JSON.stringify(reports, null, 2));
