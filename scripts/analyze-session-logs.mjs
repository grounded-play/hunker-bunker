#!/usr/bin/env node

// Summarize exported Hunker Bunker session captures without treating the
// presence of a log as acceptance proof. Usage:
//   npm run logs:analyze -- logs/*.json

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const files = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
if (!files.length) {
    console.error('Usage: node scripts/analyze-session-logs.mjs <capture.json> [...]');
    process.exit(1);
}

const signalPatterns = {
    steamActive: /Steamworks ACTIVE/i,
    cloudAvailable: /Cloud Sync: Available/i,
    relayJoin: /relay-join-sent/i,
    twoPlayerRoster: /"players"\s*:\s*\[[\s\S]*?\},\s*\{/i,
    ready: /relay-ready-(?:sent|received)/i,
    deployed: /armory -> gameplay|DEPLOYMENT — live simulation/i,
    remote3d: /remote-avatar-3d-ready/i,
    pvp: /\bPVP\b|SECTOR SKIRMISH/i,
    playerDamage: /player-damaged|player-damage/i,
    deathOrResults: /player-death|gameover|game-over|results/i,
    extraction: /extract(?:ion|ed)?/i,
    reconnect: /reconnect/i,
    suspendResume: /suspend|resume/i,
    settings: /settings-popup|Stage Resolution|UI Accessibility Scale|Text Speed/i,
    achievements: /achievement/i
};

function yes(value) {
    return value ? 'yes' : 'no';
}

function parseLongTask(entry) {
    const message = String(entry?.message ?? '');
    const legacy = /^Long task:\s*(\d+(?:\.\d+)?)ms/i.exec(message);
    if (legacy) return { count: 1, maxMs: Number(legacy[1]) };
    const window = /^Long task window:\s*(\d+) task\(s\), max (\d+(?:\.\d+)?)ms/i.exec(message);
    if (!window) return null;
    return { count: Number(window[1]), maxMs: Number(window[2]) };
}

for (const filename of files) {
    let capture;
    try {
        capture = JSON.parse(await readFile(filename, 'utf8'));
    } catch (error) {
        console.error(`${filename}: ${error.message}`);
        process.exitCode = 1;
        continue;
    }

    const entries = Array.isArray(capture.entries) ? capture.entries : [];
    const messages = entries.map((entry) => String(entry?.message ?? ''));
    const joined = messages.join('\n');
    const signals = Object.fromEntries(
        Object.entries(signalPatterns).map(([name, pattern]) => [name, pattern.test(joined)])
    );
    const longTaskWindows = entries.map(parseLongTask).filter(Boolean);
    const longTaskCount = longTaskWindows.reduce((sum, task) => sum + task.count, 0);
    const errors = entries.filter((entry) => String(entry?.level).toLowerCase() === 'error');
    const state = capture.state ?? {};
    const perf = state.performance ?? {};
    const gpu = perf.gpuFrame ?? {};
    const memory = perf.gpuMemory ?? {};
    const input = state.input ?? {};
    const steam = state.steam ?? {};
    const timeline = capture.performanceTimeline ?? {};
    const timelineSamples = Array.isArray(timeline.samples) ? timeline.samples : [];
    const worstTimelineSample = timelineSamples.reduce((worst, sample) => {
        const p95 = Number(sample?.frame?.p95Ms);
        return Number.isFinite(p95) && (!worst || p95 > worst.frame.p95Ms) ? sample : worst;
    }, null);
    const peakTimelineHeap = Math.max(0, ...timelineSamples.map((sample) => Number(sample?.memory?.jsHeapUsedBytes) || 0));
    const peakTimelineGpu = Math.max(0, ...timelineSamples.map((sample) => Number(sample?.memory?.gpu?.estimatedBytes) || 0));

    console.log(`\n${path.basename(filename)}`);
    console.log(`  session: ${capture.session?.startedAt ?? 'unknown'} -> ${capture.session?.exportedAt ?? 'unknown'} (${Math.round((capture.session?.durationMs ?? 0) / 1000)}s, ${entries.length} entries)`);
    console.log(`  package: ${capture.session?.userAgent ?? 'unknown'}`);
    console.log(`  steam: active=${yes(steam.active || signals.steamActive)} persona=${steam.persona ?? 'not captured'} appId=${steam.appId ?? 'not captured'}`);
    console.log(`  hardware: deck=${yes(perf.hardware?.isSteamDeck)} controller=${input.primaryControllerType ?? 'none'} controllers=${input.controllerCount ?? 0}`);
    console.log(`  stage: ${state.stage?.stageWidth ?? '?'}x${state.stage?.stageHeight ?? '?'} phase=${state.appPhase ?? 'unknown'} class=${state.playerType ?? 'unknown'}`);
    console.log(`  multiplayer: join=${yes(signals.relayJoin)} twoPlayerRoster=${yes(signals.twoPlayerRoster)} ready=${yes(signals.ready)} deployed=${yes(signals.deployed)} remote3d=${yes(signals.remote3d)} pvp=${yes(signals.pvp)}`);
    console.log(`  completion: playerDamage=${yes(signals.playerDamage)} pvpDamage=${yes(signals.pvp && signals.playerDamage)} death/results=${yes(signals.deathOrResults)} extraction=${yes(signals.extraction)} reconnect=${yes(signals.reconnect)} suspend/resume=${yes(signals.suspendResume)}`);
    console.log(`  coverage: settings=${yes(signals.settings)} achievements=${yes(signals.achievements)} cloudAvailable=${yes(signals.cloudAvailable)}`);
    console.log(`  performance: gpuAvg=${gpu.averageMs ?? '?'}ms gpuMax=${gpu.maxMs ?? '?'}ms samples=${gpu.samples ?? 0} dropped=${gpu.droppedFrames ?? 0} memory=${memory.estimatedBytes ? `${(memory.estimatedBytes / 1024 / 1024).toFixed(1)}MiB` : '?'} adaptive=${yes(perf.adaptiveGameplayPerformanceMode)}`);
    console.log(`  timeline: samples=${timelineSamples.length} dropped=${timeline.droppedSamples ?? 0} interval=${timeline.sampleIntervalMs ?? '?'}ms peakHeap=${peakTimelineHeap ? `${(peakTimelineHeap / 1024 / 1024).toFixed(1)}MiB` : '?'} peakGpu=${peakTimelineGpu ? `${(peakTimelineGpu / 1024 / 1024).toFixed(1)}MiB` : '?'}`);
    if (worstTimelineSample) {
        const place = worstTimelineSample.place ?? {};
        console.log(`  worst timeline frame: p95=${worstTimelineSample.frame.p95Ms}ms at=${worstTimelineSample.at ?? '?'} elapsed=${worstTimelineSample.elapsedMs ?? '?'}ms position=(${place.x ?? '?'},${place.z ?? '?'}) chunk=(${place.chunkX ?? '?'},${place.chunkZ ?? '?'}) reason=${worstTimelineSample.reason ?? '?'}`);
    }
    console.log(`  longTasks: count=${longTaskCount} windows>=100ms=${longTaskWindows.filter((task) => task.maxMs >= 100).length} max=${longTaskWindows.length ? Math.max(...longTaskWindows.map((task) => task.maxMs)) : 0}ms errors=${errors.length}`);
}
