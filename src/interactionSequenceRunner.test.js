import { describe, it, expect, vi } from 'vitest';
import { InteractionSequenceRunner, INTERACTION_SEQUENCES } from './interactionSequenceRunner.js';

describe('InteractionSequenceRunner', () => {
    it('defines initial P1 sequence specifications', () => {
        expect(INTERACTION_SEQUENCES.meridian_first_meeting).toBeDefined();
        expect(INTERACTION_SEQUENCES.meridian_grid_covenant).toBeDefined();
        expect(INTERACTION_SEQUENCES.base_cot_first_night).toBeDefined();

        expect(INTERACTION_SEQUENCES.meridian_first_meeting.steps.length).toBeGreaterThan(0);
        expect(INTERACTION_SEQUENCES.meridian_grid_covenant.endState.perk).toBe('meridian_neural_overclock');
    });

    it('executes sequence steps and completes successfully', async () => {
        const game = {
            setInputEnabled: vi.fn(),
            setCinematicLock: vi.fn(),
            transitionCamera: vi.fn().mockResolvedValue(true),
            walkActorToAnchor: vi.fn().mockResolvedValue(true),
            playActorGesture: vi.fn(),
            spawnPropFx: vi.fn(),
            displaySequenceSubtitle: vi.fn().mockResolvedValue(true),
            setWorldPropState: vi.fn(),
            resumeConversationAfterSequence: vi.fn(),
            grantSequenceReward: vi.fn()
        };

        const runner = new InteractionSequenceRunner(game);
        const result = await runner.runSequence('meridian_first_meeting');

        expect(result.ok).toBe(true);
        expect(result.completed).toBe(true);
        expect(game.setInputEnabled).toHaveBeenCalledWith(false);
        expect(game.setInputEnabled).toHaveBeenCalledWith(true);
        expect(game.setWorldPropState).toHaveBeenCalledWith('meridian_logic_core_drum', 'active');
        expect(game.resumeConversationAfterSequence).toHaveBeenCalledWith('lost_probe');
        expect(runner.isSequenceCompleted('meridian_first_meeting')).toBe(true);
    });

    it('does not re-run an already completed sequence', async () => {
        const game = {
            setInputEnabled: vi.fn(),
            setCinematicLock: vi.fn()
        };

        const runner = new InteractionSequenceRunner(game);
        runner.markSequenceCompleted('meridian_first_meeting');

        const result = await runner.runSequence('meridian_first_meeting');
        expect(result.ok).toBe(false);
        expect(result.reason).toContain('already completed');
    });

    it('falls back to placeholder card if prop anchor is missing', async () => {
        const game = {
            findPropAnchor: vi.fn().mockReturnValue(false),
            playInterstitialCard: vi.fn(),
            setWorldPropState: vi.fn(),
            resumeConversationAfterSequence: vi.fn(),
            clearCinematicCameraFocus: vi.fn(),
            setCinematicLock: vi.fn(),
            setInputEnabled: vi.fn()
        };

        const runner = new InteractionSequenceRunner(game);
        const result = await runner.runSequence('meridian_first_meeting');

        expect(result.ok).toBe(true);
        expect(result.fallback).toBe(true);
        expect(game.playInterstitialCard).toHaveBeenCalledWith('19');
        expect(game.setWorldPropState).toHaveBeenCalledWith('meridian_logic_core_drum', 'active');
        expect(runner.isSequenceCompleted('meridian_first_meeting')).toBe(true);
    });

    it('applies end state immediately on skip', async () => {
        let unlockTriggered = false;
        const game = {
            setInputEnabled: vi.fn((enabled) => { if (enabled) unlockTriggered = true; }),
            setCinematicLock: vi.fn(),
            transitionCamera: vi.fn(() => new Promise((resolve) => setTimeout(resolve, 50))),
            setWorldPropState: vi.fn(),
            grantSequenceReward: vi.fn(),
            clearCinematicCameraFocus: vi.fn()
        };

        const runner = new InteractionSequenceRunner(game);
        const promise = runner.runSequence('meridian_grid_covenant');

        // Trigger skip mid-flight
        const skipped = runner.skip();
        expect(skipped).toBe(true);

        const result = await promise;
        expect(result.ok).toBe(true);
        expect(game.setWorldPropState).toHaveBeenCalledWith('meridian_grid_covenant_seal', 'signed');
        expect(game.grantSequenceReward).toHaveBeenCalledWith({
            perk: 'meridian_neural_overclock',
            bondDelta: 2,
            toast: true
        });
        expect(unlockTriggered).toBe(true);
        expect(runner.isSequenceCompleted('meridian_grid_covenant')).toBe(true);
    });

    it('executes base_cot_first_night and verifies completion', async () => {
        const game = {
            setInputEnabled: vi.fn(),
            setCinematicLock: vi.fn(),
            transitionCamera: vi.fn().mockResolvedValue(true),
            walkActorToAnchor: vi.fn().mockResolvedValue(true),
            spawnPropFx: vi.fn(),
            displaySequenceSubtitle: vi.fn().mockResolvedValue(true),
            setWorldPropState: vi.fn(),
            clearCinematicCameraFocus: vi.fn()
        };

        const runner = new InteractionSequenceRunner(game);
        const result = await runner.runSequence('base_cot_first_night');

        expect(result.ok).toBe(true);
        expect(result.completed).toBe(true);
        expect(game.setWorldPropState).toHaveBeenCalledWith('base_cot_installed', 'ready');
        expect(runner.isSequenceCompleted('base_cot_first_night')).toBe(true);
    });
});
