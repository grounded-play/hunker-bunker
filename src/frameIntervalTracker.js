const DEFAULT_MAX_SAMPLES_PER_PROFILE = 3600;
const DEFAULT_MAX_PROFILES = 8;

function round(value) {
    return Math.round(value * 100) / 100;
}

function percentile(sorted, fraction) {
    if (sorted.length === 0) return null;
    const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
    return round(sorted[index]);
}

// A presented-frame interval is cheaper and more useful to retain than a
// complete per-frame trace. Each profile owns a bounded rolling window so a
// long gameplay capture cannot grow the exported session forever, while menu
// stalls cannot be hidden inside an aggregate gameplay percentile.
export function createFrameIntervalTracker({
    now = () => performance.now(),
    maxSamplesPerProfile = DEFAULT_MAX_SAMPLES_PER_PROFILE,
    maxProfiles = DEFAULT_MAX_PROFILES
} = {}) {
    const profiles = new Map();
    let activeProfile = null;

    function getProfile(name) {
        let key = String(name || 'unknown');
        let state = profiles.get(key);
        if (state) return state;
        if (profiles.size >= Math.max(0, maxProfiles - 1)) key = 'other';
        state = profiles.get(key);
        if (state) return state;
        state = {
            samples: [],
            cursor: 0,
            observed: 0,
            segments: 0,
            firstPresentedAt: null,
            lastPresentedAt: null
        };
        profiles.set(key, state);
        return state;
    }

    function record(profile = 'unknown', presentedAt = now()) {
        const profileName = String(profile || 'unknown');
        const state = getProfile(profileName);
        if (!Number.isFinite(presentedAt)) return;
        if (activeProfile !== profileName) {
            activeProfile = profileName;
            state.lastPresentedAt = null;
            state.segments += 1;
        }
        if (state.lastPresentedAt !== null) {
            const interval = presentedAt - state.lastPresentedAt;
            if (Number.isFinite(interval) && interval >= 0) {
                state.observed += 1;
                if (state.samples.length < maxSamplesPerProfile) {
                    state.samples.push(interval);
                } else {
                    state.samples[state.cursor] = interval;
                    state.cursor = (state.cursor + 1) % maxSamplesPerProfile;
                }
            }
        } else {
            state.firstPresentedAt = presentedAt;
        }
        state.lastPresentedAt = presentedAt;
    }

    function snapshot() {
        const result = {};
        for (const [profile, state] of profiles) {
            const sorted = [...state.samples].sort((a, b) => a - b);
            const total = sorted.reduce((sum, value) => sum + value, 0);
            result[profile] = {
                observedIntervals: state.observed,
                retainedIntervals: sorted.length,
                overwrittenIntervals: Math.max(0, state.observed - sorted.length),
                segments: state.segments,
                averageMs: sorted.length > 0 ? round(total / sorted.length) : null,
                p50Ms: percentile(sorted, 0.50),
                p95Ms: percentile(sorted, 0.95),
                p99Ms: percentile(sorted, 0.99),
                maxMs: sorted.length > 0 ? round(sorted[sorted.length - 1]) : null
            };
        }
        return {
            measurement: 'presented-frame-start interval',
            maxSamplesPerProfile,
            profiles: result
        };
    }

    function reset(profile = null) {
        if (profile === null) {
            profiles.clear();
            activeProfile = null;
        } else {
            const key = String(profile || 'unknown');
            profiles.delete(key);
            if (activeProfile === key) activeProfile = null;
        }
    }

    return { record, snapshot, reset };
}
