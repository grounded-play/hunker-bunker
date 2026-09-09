import { describe, expect, it, vi, afterEach } from 'vitest';
import { ThreeGame } from './threeGame.js';

// docs/design/one-more-ring-design-pillars.md item 1 (Sprint 28 Lane A):
// the Depth Contract was fully coded and tested (depthContract.test.js)
// but had zero call sites anywhere in the runtime -- confirmed via repo-wide
// grep in the independent review at docs/sprint28plan.md. This tests the
// wiring: emitDepthTierChanged() now attaches a real before/after crossing
// summary (describeCrossing) to the depth-tier-changed event, but only on a
// genuine new-depth crossing (isCrossing: true) -- not on a forceEmit
// re-announce of the current tier (e.g. after a respawn), which would
// otherwise misrepresent an old crossing as happening again.
describe('ThreeGame.emitDepthTierChanged Depth Contract wiring', () => {
    let originalWindow;

    afterEach(() => {
        if (originalWindow) globalThis.window = originalWindow;
        originalWindow = undefined;
    });

    function buildFakeGameInstance() {
        return {
            maxDepthTierReached: 1,
            getDepthTierName: (tier) => ['SURFACE', 'SHALLOW', 'DEEP', 'ABYSS'][tier] ?? 'SURFACE'
        };
    }

    it('attaches a real crossing summary when isCrossing is true', () => {
        originalWindow = globalThis.window;
        const dispatchEvent = vi.fn();
        globalThis.window = { dispatchEvent, CustomEvent: globalThis.CustomEvent ?? class {
            constructor(type, init) { this.type = type; this.detail = init?.detail; }
        } };
        const fake = buildFakeGameInstance();

        ThreeGame.prototype.emitDepthTierChanged.call(fake, 2, { isCrossing: true });

        expect(dispatchEvent).toHaveBeenCalledTimes(1);
        const event = dispatchEvent.mock.calls[0][0];
        expect(event.detail.tier).toBe(2);
        expect(event.detail.crossing).toBeDefined();
        expect(event.detail.crossing.label).toBe('RING III');
        // Ring 2 -> Ring 3 (depthTier+1 mapping): salvage/danger both increase.
        expect(event.detail.crossing.salvageMultiplierDelta).toBeGreaterThan(0);
        expect(event.detail.crossing.o2EfficiencyPenaltyDelta).toBeGreaterThan(0);
    });

    it('does not attach a crossing summary when isCrossing is omitted (forceEmit re-announce)', () => {
        originalWindow = globalThis.window;
        const dispatchEvent = vi.fn();
        globalThis.window = { dispatchEvent, CustomEvent: globalThis.CustomEvent ?? class {
            constructor(type, init) { this.type = type; this.detail = init?.detail; }
        } };
        const fake = buildFakeGameInstance();

        ThreeGame.prototype.emitDepthTierChanged.call(fake, 1);

        const event = dispatchEvent.mock.calls[0][0];
        expect(event.detail.crossing).toBeUndefined();
    });

    it('clamps the ring mapping at the shallowest tier (no crossing "from" ring below 1)', () => {
        originalWindow = globalThis.window;
        const dispatchEvent = vi.fn();
        globalThis.window = { dispatchEvent, CustomEvent: globalThis.CustomEvent ?? class {
            constructor(type, init) { this.type = type; this.detail = init?.detail; }
        } };
        const fake = buildFakeGameInstance();

        expect(() => ThreeGame.prototype.emitDepthTierChanged.call(fake, 0, { isCrossing: true })).not.toThrow();
        const event = dispatchEvent.mock.calls[0][0];
        expect(event.detail.crossing).toBeDefined();
    });
});

// User report 2026-09-09: a brand-new profile showed "DEPTH ABYSS" beside
// zeroed run/death/time stats. getSpawnTile() deliberately parks the menu
// showcase in chunk (100, 100) to keep it blank, and getDepthTier() measures
// distance from chunk (0, 0) -- so the animation loop's chunk-visibility pass
// recorded tier 3 into the persistent arc signals while the player was still
// sitting on the title screen, before a run had ever started.
describe('ThreeGame.updateDepthTierProgress menu guard', () => {
    function fakeGame(performanceProfile) {
        return {
            performanceProfile,
            maxDepthTierReached: 0,
            getDepthTier: (x, z) => (Math.hypot(x, z) >= 9 ? 3 : 0),
            getDepthTierName: () => 'ABYSS',
            arcManager: { recordSignal: vi.fn(), evaluate: vi.fn() },
            emitDepthTierChanged: vi.fn()
        };
    }

    it('does not record depth progression from the menu showcase chunk', () => {
        const fake = fakeGame('menu');
        ThreeGame.prototype.updateDepthTierProgress.call(fake, 100, 100);
        expect(fake.arcManager.recordSignal).not.toHaveBeenCalled();
        expect(fake.maxDepthTierReached).toBe(0);
        expect(fake.emitDepthTierChanged).not.toHaveBeenCalled();
    });

    it('still records real gameplay depth', () => {
        const fake = fakeGame('gameplay');
        ThreeGame.prototype.updateDepthTierProgress.call(fake, 100, 100);
        expect(fake.arcManager.recordSignal).toHaveBeenCalledWith({ deepestDepthTier: 3 });
        expect(fake.maxDepthTierReached).toBe(3);
    });

    it('still tracks the current tier in the menu, it just does not persist it', () => {
        // currentDepthTier drives live systems (O2 drain, salvage, elite rolls)
        // and must stay truthful; only the persisted career signal is gated.
        const fake = fakeGame('menu');
        ThreeGame.prototype.updateDepthTierProgress.call(fake, 100, 100);
        expect(fake.currentDepthTier).toBe(3);
    });
});
