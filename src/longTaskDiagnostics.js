const primitiveEntries = (value, limit = 16) => {
    if (!value || typeof value !== 'object') return value ?? null;
    const result = {};
    for (const [key, entry] of Object.entries(value)) {
        if (Object.keys(result).length >= limit) break;
        if (entry == null || ['number', 'boolean'].includes(typeof entry)) result[key] = entry;
        else if (typeof entry === 'string') result[key] = entry.slice(0, 180);
    }
    return result;
};

export function compactPerformanceSnapshot(snapshot = null) {
    if (!snapshot || typeof snapshot !== 'object') return null;
    const profileFrames = snapshot.frameIntervals?.profiles?.[snapshot.profile] ?? null;
    return {
        ...primitiveEntries(snapshot, 24),
        frameIntervals: primitiveEntries(profileFrames, 12),
        gpuFrame: primitiveEntries(snapshot.gpuFrame, 12),
        gpuMemory: primitiveEntries(snapshot.gpuMemory, 12),
        hardware: primitiveEntries(snapshot.hardware, 10)
    };
}

export function compactPerfPhase(phase = null) {
    if (!phase || typeof phase !== 'object') return null;
    return {
        phase: typeof phase.phase === 'string' ? phase.phase.slice(0, 120) : null,
        startMs: phase.startMs ?? null,
        durationMs: phase.durationMs ?? null,
        context: primitiveEntries(phase.context, 10)
    };
}

export function createLongTaskReporter({ emit, now = () => performance.now(), intervalMs = 1000 } = {}) {
    let lastEmitAt = -Infinity;
    let pendingCount = 0;
    let pendingTotalMs = 0;
    let pendingMaxMs = 0;
    let pendingStartMs = null;

    return (task, getContext = () => ({})) => {
        const duration = Number.isFinite(task?.duration) ? task.duration : 0;
        pendingCount += 1;
        pendingTotalMs += duration;
        pendingMaxMs = Math.max(pendingMaxMs, duration);
        pendingStartMs ??= Number.isFinite(task?.startTime) ? task.startTime : null;

        const timestamp = now();
        if (timestamp - lastEmitAt < intervalMs) return false;
        emit?.(`Long task window: ${pendingCount} task(s), max ${Math.round(pendingMaxMs)}ms`, {
            taskCount: pendingCount,
            totalDurationMs: Math.round(pendingTotalMs),
            maxDurationMs: Math.round(pendingMaxMs),
            startMs: pendingStartMs == null ? null : Math.round(pendingStartMs),
            ...getContext()
        });
        lastEmitAt = timestamp;
        pendingCount = 0;
        pendingTotalMs = 0;
        pendingMaxMs = 0;
        pendingStartMs = null;
        return true;
    };
}
