// Bounded synchronous spans for the long-task observer in main.js. Do not
// keep a span open across an await: elapsed loading time is not CPU occupancy.
function tagPerfPhase(phase) {
    if (typeof window === 'undefined') return;
    window.__hbLastPerfPhase = phase;
    window.__hbLastPerfPhaseAt = performance.now();
}

export function beginPerfPhase(phase, context = {}) {
    if (typeof window === 'undefined' || typeof performance === 'undefined') {
        return { end: () => null };
    }
    const startMs = performance.now();
    const stack = window.__hbPerfPhaseStack ?? (window.__hbPerfPhaseStack = []);
    const span = { phase, startMs, context };
    stack.push(span);
    tagPerfPhase(phase);
    let ended = false;
    return {
        end: (result = null) => {
            if (ended) return result;
            ended = true;
            const endMs = performance.now();
            const index = stack.lastIndexOf(span);
            if (index >= 0) stack.splice(index, 1);
            const history = window.__hbPerfPhaseHistory ?? (window.__hbPerfPhaseHistory = []);
            history.push({
                phase,
                startMs: Math.round(startMs * 10) / 10,
                durationMs: Math.round((endMs - startMs) * 10) / 10,
                context
            });
            if (history.length > 64) history.splice(0, history.length - 64);
            const parent = stack[stack.length - 1];
            if (parent) tagPerfPhase(parent.phase);
            return result;
        }
    };
}

export function measurePerfPhase(phase, context, operation) {
    const span = beginPerfPhase(phase, context);
    try {
        return operation();
    } finally {
        span.end();
    }
}
