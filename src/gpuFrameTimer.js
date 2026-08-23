// Asynchronous GPU frame timing for WebGL2. CPU wall-clock render duration
// measures command submission, not when the GPU finishes that work; this uses
// EXT_disjoint_timer_query_webgl2 without ever blocking on a result.

export function createGpuFrameTimer(gl, {
    maxPendingQueries = 4,
    smoothingAlpha = 0.2
} = {}) {
    const ext = gl?.getExtension?.('EXT_disjoint_timer_query_webgl2') ?? null;
    const supported = Boolean(
        ext
        && gl?.createQuery
        && gl?.beginQuery
        && gl?.endQuery
        && gl?.getQueryParameter
    );
    const pending = [];
    let activeQuery = null;
    let latestMs = null;
    let averageMs = null;
    let maxMs = 0;
    let samples = 0;
    let droppedFrames = 0;
    let disjointEvents = 0;
    let disposed = false;

    function deleteQuery(query) {
        try {
            gl?.deleteQuery?.(query);
        } catch {
            // Context loss/driver teardown: query cleanup is best-effort.
        }
    }

    function discardPending() {
        while (pending.length) deleteQuery(pending.shift());
    }

    function poll() {
        if (!supported || disposed || pending.length === 0) return;
        let disjoint;
        try {
            disjoint = Boolean(gl.getParameter?.(ext.GPU_DISJOINT_EXT));
        } catch {
            disjoint = true;
        }
        if (disjoint) {
            disjointEvents += 1;
            discardPending();
            return;
        }

        while (pending.length) {
            const query = pending[0];
            let available;
            try {
                available = Boolean(gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE));
            } catch {
                deleteQuery(pending.shift());
                continue;
            }
            if (!available) break;

            pending.shift();
            try {
                const elapsedNs = Number(gl.getQueryParameter(query, gl.QUERY_RESULT));
                if (Number.isFinite(elapsedNs) && elapsedNs >= 0) {
                    latestMs = elapsedNs / 1_000_000;
                    averageMs = averageMs == null
                        ? latestMs
                        : averageMs + (latestMs - averageMs) * smoothingAlpha;
                    maxMs = Math.max(maxMs, latestMs);
                    samples += 1;
                }
            } finally {
                deleteQuery(query);
            }
        }
    }

    function beginFrame() {
        poll();
        if (!supported || disposed || activeQuery) return false;
        if (pending.length >= maxPendingQueries) {
            droppedFrames += 1;
            return false;
        }
        const query = gl.createQuery();
        if (!query) {
            droppedFrames += 1;
            return false;
        }
        try {
            gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
            activeQuery = query;
            return true;
        } catch {
            deleteQuery(query);
            droppedFrames += 1;
            return false;
        }
    }

    function endFrame() {
        if (!supported || disposed || !activeQuery) return false;
        const query = activeQuery;
        activeQuery = null;
        try {
            gl.endQuery(ext.TIME_ELAPSED_EXT);
            pending.push(query);
            return true;
        } catch {
            deleteQuery(query);
            droppedFrames += 1;
            return false;
        }
    }

    function snapshot() {
        poll();
        return {
            supported,
            latestMs: latestMs == null ? null : Math.round(latestMs * 100) / 100,
            averageMs: averageMs == null ? null : Math.round(averageMs * 100) / 100,
            maxMs: Math.round(maxMs * 100) / 100,
            samples,
            pendingQueries: pending.length + (activeQuery ? 1 : 0),
            droppedFrames,
            disjointEvents
        };
    }

    function reset() {
        latestMs = null;
        averageMs = null;
        maxMs = 0;
        samples = 0;
        droppedFrames = 0;
        disjointEvents = 0;
    }

    function dispose() {
        if (disposed) return;
        if (activeQuery) {
            try {
                gl.endQuery(ext.TIME_ELAPSED_EXT);
            } catch {
                // Ignore a context that vanished while a query was active.
            }
            deleteQuery(activeQuery);
            activeQuery = null;
        }
        discardPending();
        disposed = true;
    }

    return {
        beginFrame,
        endFrame,
        poll,
        snapshot,
        reset,
        dispose,
        get supported() { return supported; }
    };
}
