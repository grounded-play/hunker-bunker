// Sprint 28 low-FPS investigation
// (docs/log13-gameplay-fps-findings-and-fix-plan-2026-08-20.md).
//
// `renderWithPerf`'s `frame:render` span only ever covered the GPU submit
// (`composer.render()`), so `docs/logs/log13.json` could prove a 52ms median
// frame contained 13ms of rendering, but had no way to say where the other
// ~39ms went -- every long task in that log came back tagged
// `lastPhase: "frame:render"` with `activePhases: []`, i.e. "the stall was
// somewhere in the ~50 uninstrumented per-frame update calls". This closes
// that blind spot.
//
// Deliberately NOT built on beginPerfPhase(): that allocates a span object,
// a context snapshot and a history entry per call, which is fine a handful of
// times per frame but not ~50 times. This accumulates into a plain Map and,
// while disabled (the shipping default), costs one property read per call.
export function createFrameProfiler({ now = () => performance.now() } = {}) {
    const sections = new Map();
    let enabled = false;
    let frames = 0;
    let totalMs = 0;
    let frameStart = 0;

    function record(name, elapsed) {
        let entry = sections.get(name);
        if (!entry) {
            entry = { name, calls: 0, totalMs: 0, maxMs: 0 };
            sections.set(name, entry);
        }
        entry.calls += 1;
        entry.totalMs += elapsed;
        if (elapsed > entry.maxMs) entry.maxMs = elapsed;
    }

    return {
        enable() { enabled = true; },
        disable() { enabled = false; },
        get enabled() { return enabled; },

        // The hot path. When disabled this is a single boolean test plus the
        // call itself, so the wiring can stay permanently in render().
        measure(name, fn) {
            if (!enabled) return fn();
            const start = now();
            try {
                return fn();
            } finally {
                record(name, now() - start);
            }
        },

        beginFrame() {
            if (!enabled) return;
            frameStart = now();
        },

        endFrame() {
            if (!enabled) return;
            frames += 1;
            totalMs += now() - frameStart;
        },

        reset() {
            sections.clear();
            frames = 0;
            totalMs = 0;
        },

        // Sorted worst-first: the point of reading this is to find the one
        // subsystem worth fixing, not to browse fifty of them.
        snapshot() {
            if (!enabled) return null;
            return {
                frames,
                totalMs: Math.round(totalMs * 100) / 100,
                sections: [...sections.values()]
                    .sort((a, b) => b.totalMs - a.totalMs)
                    .map((entry) => ({
                        name: entry.name,
                        calls: entry.calls,
                        totalMs: Math.round(entry.totalMs * 100) / 100,
                        maxMs: Math.round(entry.maxMs * 100) / 100,
                        avgMsPerFrame: frames > 0
                            ? Math.round((entry.totalMs / frames) * 100) / 100
                            : 0
                    }))
            };
        }
    };
}
