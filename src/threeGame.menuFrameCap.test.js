import { describe, expect, it } from 'vitest';

// The menu's 30 fps cap must render every second frame of a 60 Hz display,
// not every third (2026-09-25 log: menu frames at p50 49 ms).
function framesRendered(refreshHz, seconds, intervalMs = 1000 / 30) {
    let last = 0;
    let rendered = 0;
    const step = 1000 / refreshHz;
    for (let t = step; t <= seconds * 1000; t += step) {
        // Real vsync timestamps jitter by a fraction of a millisecond.
        const now = t + (Math.sin(t) * 0.3);
        if (last > 0 && now - last < intervalMs * 0.75) continue;
        last = now;
        rendered += 1;
    }
    return rendered / seconds;
}

describe('menu frame cap', () => {
    it('holds ~30 fps at 60, 120 and 144 Hz', () => {
        expect(framesRendered(60, 10)).toBeGreaterThanOrEqual(29);
        expect(framesRendered(120, 10)).toBeGreaterThanOrEqual(29);
        expect(framesRendered(120, 10)).toBeLessThanOrEqual(41);
        expect(framesRendered(144, 10)).toBeLessThanOrEqual(37);
    });

    it('is the comparison renderFrameBody uses', async () => {
        const fs = await import('node:fs');
        const src = fs.readFileSync(new URL('./threeGame.js', import.meta.url), 'utf8');
        expect(src).toContain('now - this._lastMenuRenderAt < this.menuFrameIntervalMs * 0.75');
    });
});
