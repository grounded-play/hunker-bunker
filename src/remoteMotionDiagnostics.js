// Packet-to-render error is not a teleport: ordinary interpolation has lag.
// Keep it separate from actual >6u hard snaps and from packet gaps. Fixed
// counters (no packet history) produce one report per 10 s, plus teardown.
export const REMOTE_MOTION_REPORT_MS = 10_000;
export const REMOTE_MOTION_SNAP_UNITS = 6;
export const REMOTE_MOTION_STALE_MS = 500;

const round = (value) => Math.round(value * 1000) / 1000;
const bucket = () => ({ samples: 0, targetErrorSum: 0, targetErrorMax: 0, packetGapMaxMs: 0, stalePacketGaps: 0, hardSnaps: 0, hardSnapMax: 0 });

export function createRemoteMotionDiagnostics() {
    let start = null;
    let player = bucket();
    let companion = bucket();

    function sample(kind, targetError, packetGapMs, now = Date.now()) {
        if (!['player', 'companion'].includes(kind) || !Number.isFinite(targetError) || targetError < 0) return;
        start ??= now;
        const state = kind === 'player' ? player : companion;
        state.samples += 1;
        state.targetErrorSum += targetError;
        state.targetErrorMax = Math.max(state.targetErrorMax, targetError);
        if (Number.isFinite(packetGapMs) && packetGapMs >= 0) {
            state.packetGapMaxMs = Math.max(state.packetGapMaxMs, packetGapMs);
            if (packetGapMs >= REMOTE_MOTION_STALE_MS) state.stalePacketGaps += 1;
        }
    }

    function snap(kind, distance, now = Date.now()) {
        if (!['player', 'companion'].includes(kind) || !Number.isFinite(distance) || distance <= REMOTE_MOTION_SNAP_UNITS) return;
        start ??= now;
        const state = kind === 'player' ? player : companion;
        state.hardSnaps += 1;
        state.hardSnapMax = Math.max(state.hardSnapMax, distance);
    }

    function flush(now = Date.now(), { force = false } = {}) {
        if (start === null || (!force && now - start < REMOTE_MOTION_REPORT_MS)) return null;
        const summarize = (state) => ({
            samples: state.samples,
            targetErrorMeanU: state.samples ? round(state.targetErrorSum / state.samples) : null,
            targetErrorMaxU: round(state.targetErrorMax),
            packetGapMaxMs: round(state.packetGapMaxMs),
            stalePacketGaps: state.stalePacketGaps,
            hardSnaps: state.hardSnaps,
            hardSnapMaxU: round(state.hardSnapMax)
        });
        const report = {
            intervalMs: Math.max(0, now - start),
            snapThresholdU: REMOTE_MOTION_SNAP_UNITS,
            staleThresholdMs: REMOTE_MOTION_STALE_MS,
            player: summarize(player),
            companion: summarize(companion)
        };
        start = null;
        player = bucket();
        companion = bucket();
        return report;
    }

    return { sample, snap, flush };
}
