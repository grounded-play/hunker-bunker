const records = new Map();

export function recordAssetLoad(url, { group = 'unknown', status = 'loaded', durationMs = 0, cacheHit = false, error = null } = {}) {
    const key = String(url ?? 'unknown');
    const previous = records.get(key) ?? { url: key, group, attempts: 0, cacheHits: 0, failures: 0, totalMs: 0, lastStatus: status, lastError: null };
    previous.group = group;
    previous.attempts += cacheHit ? 0 : 1;
    previous.cacheHits += cacheHit ? 1 : 0;
    previous.failures += status === 'failed' ? 1 : 0;
    previous.totalMs += Number.isFinite(durationMs) ? durationMs : 0;
    previous.lastStatus = status;
    previous.lastError = error ? String(error.message ?? error) : null;
    records.set(key, previous);
    return previous;
}

export function getAssetLoadReport() {
    return [...records.values()].map((entry) => ({ ...entry }));
}

export function resetAssetLoadTelemetry() {
    records.clear();
}

if (typeof window !== 'undefined') {
    window.__HB_ASSET_LOAD_REPORT__ = getAssetLoadReport;
}
