import { describe, expect, it, vi, afterEach } from 'vitest';
import { ThreeGame } from './threeGame.js';

// docs/perf-chunk-mount-plan-2026-08-20.md Track A: processPendingChunkMounts
// previously mounted a fixed count of chunks per call with no regard for
// how expensive any individual mountChunk() call turned out to be -- a
// real playtest (docs/logs/log8.json) showed up to 996ms long tasks tagged
// chunk-mount, consistent with several expensive chunks stacking
// back-to-back inside one batchSize=3 call with zero yield between them.
// maxDurationMs is the fix: an opt-in time budget that stops mounting
// further chunks in the same call once it's exceeded, while always
// mounting at least one (forward-progress guarantee). Uses the same
// Function.prototype.call() pattern as the other threeGame.*.test.js
// files (no live WebGL context here).
describe('ThreeGame.processPendingChunkMounts time budget', () => {
    function buildFakeGameInstance(mountChunkImpl) {
        return {
            pendingChunkMounts: [],
            pendingChunkMountKeys: new Set(),
            chunkMeshes: new Map(),
            mountChunk: mountChunkImpl ?? vi.fn()
        };
    }

    function makePendingEntries(count) {
        return Array.from({ length: count }, (_, i) => ({
            key: `${i},0`,
            chunkX: i,
            chunkY: 0,
            prefetch: false,
            priority: 0
        }));
    }

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('mounts up to `limit` chunks per call when no time budget is given (existing behavior unchanged)', () => {
        const fake = buildFakeGameInstance();
        fake.pendingChunkMounts = makePendingEntries(5);

        const mounted = ThreeGame.prototype.processPendingChunkMounts.call(fake, 3);

        expect(mounted).toBe(3);
        expect(fake.mountChunk).toHaveBeenCalledTimes(3);
        expect(fake.pendingChunkMounts).toHaveLength(2);
    });

    it('always mounts at least one chunk even if the budget is already exceeded before starting', () => {
        const fake = buildFakeGameInstance();
        fake.pendingChunkMounts = makePendingEntries(3);
        vi.spyOn(performance, 'now')
            .mockReturnValueOnce(0)    // budgetStart, captured once at call entry
            .mockReturnValueOnce(50);  // checked before considering a 2nd chunk -- already over an 8ms budget

        const mounted = ThreeGame.prototype.processPendingChunkMounts.call(fake, 3, { maxDurationMs: 8 });

        expect(mounted).toBe(1);
        expect(fake.mountChunk).toHaveBeenCalledTimes(1);
    });

    it('stops mounting further chunks in the same call once the time budget is exceeded, leaving the rest pending', () => {
        const fake = buildFakeGameInstance();
        fake.pendingChunkMounts = makePendingEntries(5);
        vi.spyOn(performance, 'now')
            .mockReturnValueOnce(0)     // budgetStart
            .mockReturnValueOnce(3)     // check before chunk 2: within budget
            .mockReturnValueOnce(20);   // check before chunk 3: over budget

        const mounted = ThreeGame.prototype.processPendingChunkMounts.call(fake, 5, { maxDurationMs: 8 });

        expect(mounted).toBe(2);
        expect(fake.pendingChunkMounts).toHaveLength(3);
    });

    it('mounts the full limit when every chunk completes well within the time budget', () => {
        const fake = buildFakeGameInstance();
        fake.pendingChunkMounts = makePendingEntries(3);
        vi.spyOn(performance, 'now').mockReturnValue(0); // no time ever elapses

        const mounted = ThreeGame.prototype.processPendingChunkMounts.call(fake, 3, { maxDurationMs: 8 });

        expect(mounted).toBe(3);
    });

    it('never lets the count-based limit be exceeded even with an unlimited time budget', () => {
        const fake = buildFakeGameInstance();
        fake.pendingChunkMounts = makePendingEntries(10);

        const mounted = ThreeGame.prototype.processPendingChunkMounts.call(fake, 4, { maxDurationMs: Infinity });

        expect(mounted).toBe(4);
    });

    it('skips already-mounted chunks without counting them against the budget-limited mount count', () => {
        const fake = buildFakeGameInstance();
        fake.pendingChunkMounts = makePendingEntries(3);
        fake.chunkMeshes.set('0,0', {}); // chunk 0 already mounted elsewhere

        const mounted = ThreeGame.prototype.processPendingChunkMounts.call(fake, 3);

        expect(mounted).toBe(2);
        expect(fake.mountChunk).toHaveBeenCalledTimes(2);
    });
});
