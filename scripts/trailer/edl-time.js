// Time references for trailer EDLs (docs/planning/trailer-v4-capture-edit-and-sound-plan-2026-10-14.md §6.1).
//
// A time is seconds (number), "<n>f" frames, or a beat reference that resolves
// against the music grid placed on the trailer timeline:
//   "beat:drop"        the drop
//   "beat:drop+8"      8 beats after it ("beat:drop-2" before)
//   "bar:drop+2"       2 bars (4 beats each) after it
//   "beat:drop+8+0.1"  plus a seconds offset
// A duration is seconds, "<n>f", "<n>beats" or "<n>bars".

export function placeGrid(grid, music) {
    // Trailer time of the drop, and of any source-track time.
    const dropAt = music.anchor?.at ?? 0;
    const offset = dropAt - grid.drop.t; // trailer = source + offset
    return {
        bpm: grid.bpm,
        period: grid.period,
        dropAt,
        offset,
        sourceIn: (music.start ?? 0) - offset, // track position at the music's start
        beat: (n) => dropAt + n * grid.period
    };
}

export function resolveTime(value, ctx) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') throw new Error(`bad time ${JSON.stringify(value)}`);
    const frames = value.match(/^(-?[\d.]+)f$/);
    if (frames) return Number(frames[1]) / ctx.fps;
    const ref = value.match(/^(beat|bar):drop([+-][\d.]+)?([+-][\d.]+)?$/);
    if (ref) {
        if (!ctx.grid) throw new Error(`beat reference ${value} without a music grid`);
        const count = Number(ref[2] ?? 0) * (ref[1] === 'bar' ? 4 : 1);
        return ctx.grid.beat(count) + Number(ref[3] ?? 0);
    }
    if (/^-?[\d.]+$/.test(value)) return Number(value);
    throw new Error(`bad time ${value}`);
}

export function resolveDuration(value, ctx) {
    if (typeof value === 'number') return value;
    const m = String(value).match(/^([\d.]+)(f|beats?|bars?)$/);
    if (!m) throw new Error(`bad duration ${value}`);
    const n = Number(m[1]);
    if (m[2] === 'f') return n / ctx.fps;
    if (!ctx.grid) throw new Error(`beat duration ${value} without a music grid`);
    return n * ctx.grid.period * (m[2].startsWith('bar') ? 4 : 1);
}

// Snap a time to the nearest output frame boundary.
export const snap = (t, fps) => Math.round(t * fps) / fps;
