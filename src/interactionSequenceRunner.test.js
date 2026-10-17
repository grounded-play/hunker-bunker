import { describe, it, expect, vi } from 'vitest';
import { InteractionSequenceRunner, INTERACTION_SEQUENCES } from './interactionSequenceRunner.js';

// Anchors resolve to world positions (the camp's own dressing, or the
// installed cot); steps act on those positions. Audit 2026-10-16 §13.4.
function fakeGame(overrides = {}) {
    return {
        resolveSequenceAnchor: vi.fn((name) => ({ meridian_logic_core_drum: { x: 10, z: 20 }, meridian_grid_covenant_seal: { x: 12, z: 16 }, base_cot_installed: { x: 2, z: 3 } })[name] ?? null),
        getSequenceActorPosition: vi.fn((actor) => (actor === 'leader' ? { x: 9, z: 18 } : { x: 0, z: 0 })),
        waitForClearStage: vi.fn().mockResolvedValue(true),
        setInputEnabled: vi.fn(),
        setCinematicLock: vi.fn(),
        transitionCamera: vi.fn().mockResolvedValue(true),
        walkActorTo: vi.fn().mockResolvedValue(true),
        playActorGesture: vi.fn(),
        spawnPropFx: vi.fn(),
        displaySequenceSubtitle: vi.fn().mockResolvedValue(true),
        setWorldPropState: vi.fn(),
        resumeConversationAfterSequence: vi.fn(),
        grantSequenceReward: vi.fn(),
        clearCinematicCameraFocus: vi.fn(),
        ...overrides
    };
}

describe('InteractionSequenceRunner', () => {
    it('defines the three first sequences with their camp', () => {
        expect(INTERACTION_SEQUENCES.meridian_first_meeting.campId).toBe('camp_meridian');
        expect(INTERACTION_SEQUENCES.meridian_grid_covenant.campId).toBe('camp_meridian');
        expect(INTERACTION_SEQUENCES.base_cot_first_night.steps.length).toBeGreaterThan(0);
    });

    it('acts on the real anchor positions: camera, walk offset, fx, prop state', async () => {
        const game = fakeGame();
        const runner = new InteractionSequenceRunner(game, { storage: null });
        const result = await runner.runSequence('meridian_first_meeting');
        expect(result).toMatchObject({ ok: true, completed: true });
        expect(game.waitForClearStage).toHaveBeenCalled();
        expect(game.transitionCamera).toHaveBeenCalledWith('two-shot', { x: 9, z: 18 }, 600);
        expect(game.walkActorTo).toHaveBeenCalledWith('player', { x: 9.1, z: 20 }, INTERACTION_SEQUENCES.meridian_first_meeting);
        expect(game.spawnPropFx).toHaveBeenCalledWith(expect.objectContaining({ name: 'meridian_logic_core_drum', x: 10, z: 20 }), 'grid_steady', '#22d3ee');
        expect(game.displaySequenceSubtitle).toHaveBeenCalledWith('leader', expect.any(String), expect.any(String), { campId: 'camp_meridian' });
        expect(game.resumeConversationAfterSequence).toHaveBeenCalledWith('lost_probe', INTERACTION_SEQUENCES.meridian_first_meeting);
        expect(game.setInputEnabled).toHaveBeenLastCalledWith(true);
        expect(runner.isSequenceCompleted('meridian_first_meeting')).toBe(true);
    });

    it('pays Grid Covenant\'s reward once, with its camp', async () => {
        const game = fakeGame();
        const runner = new InteractionSequenceRunner(game, { storage: null });
        await runner.runSequence('meridian_grid_covenant');
        expect(game.grantSequenceReward).toHaveBeenCalledTimes(1);
        expect(game.grantSequenceReward).toHaveBeenCalledWith(expect.objectContaining({ bondDelta: 2, perk: 'meridian_neural_overclock', campId: 'camp_meridian' }));
    });

    it('does not re-run a completed sequence, nor start one while another plays', async () => {
        const game = fakeGame({ transitionCamera: vi.fn(() => new Promise((r) => setTimeout(r, 20))) });
        const runner = new InteractionSequenceRunner(game, { storage: null });
        const first = runner.runSequence('meridian_first_meeting');
        expect((await runner.runSequence('base_cot_first_night')).reason).toMatch(/Another sequence/);
        await first;
        expect((await runner.runSequence('meridian_first_meeting')).reason).toMatch(/already completed/);
    });

    it('a missing anchor applies the end state without a card or any staging', async () => {
        const game = fakeGame({ resolveSequenceAnchor: vi.fn(() => null), playInterstitialCard: vi.fn() });
        const runner = new InteractionSequenceRunner(game, { storage: null });
        expect(runner.canRun('meridian_first_meeting')).toBe(false);
        for (const id of Object.keys(INTERACTION_SEQUENCES)) {
            expect(await runner.runSequence(id)).toMatchObject({ ok: true, fallback: true });
        }
        expect(game.playInterstitialCard).not.toHaveBeenCalled();
        expect(game.transitionCamera).not.toHaveBeenCalled();
        expect(game.setWorldPropState).toHaveBeenCalledWith('meridian_logic_core_drum', 'active', null);
    });

    it('plays a sequence\'s own placeholder card if an anchor is missing', async () => {
        const game = fakeGame({ resolveSequenceAnchor: vi.fn(() => null), playInterstitialCard: vi.fn() });
        const runner = new InteractionSequenceRunner(game, { storage: null });
        await runner.runSequence({ ...INTERACTION_SEQUENCES.meridian_first_meeting, placeholder: { card: 'kaelen_diagnostic_cradle' } });
        expect(game.playInterstitialCard).toHaveBeenCalledWith('kaelen_diagnostic_cradle');
    });

    it('Esc skips a playing sequence and still lands its end state', async () => {
        const listeners = [];
        globalThis.window = {
            addEventListener: (type, fn, opts) => listeners.push({ type, fn, opts }),
            removeEventListener: (type, fn) => { const i = listeners.findIndex((l) => l.fn === fn); if (i >= 0) listeners.splice(i, 1); }
        };
        try {
            const game = fakeGame({ transitionCamera: vi.fn(() => new Promise((r) => setTimeout(r, 30))) });
            const runner = new InteractionSequenceRunner(game, { storage: null });
            const run = runner.runSequence('meridian_grid_covenant');
            await new Promise((r) => setTimeout(r, 5));
            const key = listeners.find((l) => l.type === 'keydown');
            expect(key.opts?.capture).toBe(true);
            const esc = { code: 'Escape', preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() };
            key.fn(esc);
            expect(esc.stopImmediatePropagation).toHaveBeenCalled();
            await run;
            expect(game.setWorldPropState).toHaveBeenCalledWith('meridian_grid_covenant_seal', 'signed', null);
            expect(game.grantSequenceReward).toHaveBeenCalledTimes(1);
            expect(listeners).toHaveLength(0);
        } finally {
            delete globalThis.window;
        }
    });

    it('remembers completed sequences across a reload', async () => {
        const store = new Map();
        const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
        const game = fakeGame({ resolveSequenceAnchor: () => null });
        await new InteractionSequenceRunner(game, { storage }).runSequence('base_cot_first_night');
        const later = new InteractionSequenceRunner(game, { storage });
        expect(later.isSequenceCompleted('base_cot_first_night')).toBe(true);
    });
});
