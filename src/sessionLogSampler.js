// Keeps high-frequency telemetry from drowning a session log (GAP-TS-04).
//
// Held fire, reticle updates and audio plays were ~70% of a 12-minute Steam
// Deck capture. Live subscribers (the reticle reads `shot-blocked` entries)
// and the on-screen console still see every entry; only what the exported
// session retains changes. Each window keeps the first few examples of each
// event verbatim and folds the rest into one summary entry with counts,
// broken down by the field that matters (fire source, block reason, cue), so
// input provenance survives: "607 fire inputs, all pointer" is one line.

export const SAMPLED_SESSION_EVENTS = Object.freeze([
    Object.freeze({ category: 'WEAPON', event: 'fire-input', breakdown: 'source' }),
    Object.freeze({ category: 'WEAPON', event: 'shot-blocked', breakdown: 'reason' }),
    Object.freeze({ category: 'WEAPON', event: 'shot-accepted', breakdown: 'source' }),
    Object.freeze({ category: 'WEAPON', event: 'projectile', breakdown: null }),
    Object.freeze({ category: 'RETICLE', event: 'state', breakdown: 'state' }),
    Object.freeze({ category: 'RETICLE', event: 'screen-pos', breakdown: null }),
    Object.freeze({ category: 'RETICLE', event: 'target', breakdown: 'kind' }),
    Object.freeze({ category: 'AUDIO', event: 'play', breakdown: 'key' })
]);

export const SAMPLED_SUMMARY_CATEGORY = 'SAMPLED';

function matchRule(entry) {
    const message = String(entry?.message ?? '');
    return SAMPLED_SESSION_EVENTS.find((rule) => entry?.category === rule.category
        && (message === rule.event || message.startsWith(`${rule.event} `) || message.startsWith(`${rule.event}\n`))) ?? null;
}

function breakdownValue(message, field) {
    if (!field) return null;
    const match = String(message).match(new RegExp(`"${field}"\\s*:\\s*"([^"]{1,64})"`));
    return match?.[1] ?? 'unknown';
}

export function createSessionLogSampler({ windowMs = 10_000, keepPerWindow = 3 } = {}) {
    let windowStart = null;
    let counts = new Map();

    function bucketFor(rule) {
        const key = `${rule.category} ${rule.event}`;
        if (!counts.has(key)) counts.set(key, { total: 0, retained: 0, by: {} });
        return counts.get(key);
    }

    /** True when the entry should be kept in the exported session log. */
    function retain(entry, nowMs) {
        const rule = matchRule(entry);
        if (!rule) return true;
        if (windowStart === null) windowStart = nowMs;
        const bucket = bucketFor(rule);
        bucket.total += 1;
        const value = breakdownValue(entry.message, rule.breakdown);
        if (value !== null) bucket.by[value] = (bucket.by[value] ?? 0) + 1;
        if (bucket.retained < keepPerWindow) {
            bucket.retained += 1;
            return true;
        }
        return false;
    }

    /**
     * The summary for the window so far, or null when nothing was sampled.
     * `force` flushes a partial window (an export must not lose its tail).
     */
    function flush(nowMs, { force = false } = {}) {
        if (windowStart === null || counts.size === 0) return null;
        if (!force && nowMs - windowStart < windowMs) return null;
        const summary = {
            windowMs: Math.max(0, Math.round(nowMs - windowStart)),
            events: Object.fromEntries([...counts].map(([key, bucket]) => [key, bucket]))
        };
        windowStart = null;
        counts = new Map();
        return summary;
    }

    return { retain, flush };
}
