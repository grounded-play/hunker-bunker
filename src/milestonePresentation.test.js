import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMilestonePresentationGate } from './milestonePresentation.js';
import { runO2MilestoneChoreography } from './o2CinematicDoors.js';

describe('DP-03 milestone presentation ownership', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('claims once per encounter but permits retries with a new identity and a new run', () => {
        const gate = createMilestonePresentationGate();
        const event = { type: 'boss_cybersnail', goalKey: 'o2Bubble', encounterId: 'o2:1' };
        expect(gate.claim(event, 1)?.videoBase).toBe('int_13_a_snail_blocks_the_hallway');
        expect(gate.claim(event, 1)).toBeNull();
        expect(gate.claim({ type: event.type, goalKey: event.goalKey }, 1)).toBeNull();
        expect(gate.claim({ ...event, encounterId: 'o2:2' }, 1)).not.toBeNull();
        expect(gate.claim(event, 2)).not.toBeNull();
    });

    it('does not suppress a different goal just because it uses the same boss species', () => {
        const gate = createMilestonePresentationGate();
        for (const goalKey of ['radarNode', 'reactorCompressor']) {
            expect(gate.claim({ type: 'boss_sporesnail', goalKey }, 1)).not.toBeNull();
            expect(gate.claim({ type: 'boss_sporesnail', goalKey }, 1)).toBeNull();
        }
        expect(gate.claim({ type: 'unknown' }, 1)).toBeNull();
    });

    it('records externally presented encounters so a repeated warning cannot replay them', () => {
        const gate = createMilestonePresentationGate();
        const event = { type: 'boss_cybersnail', encounterId: 'o2:1' };
        expect(gate.claim({ ...event, presentationHandled: true }, 1)).toBeNull();
        expect(gate.claim(event, 1)).toBeNull();
    });

    it('runs the actual O2 director with a warning consumer without a second boss film', async () => {
        const gate = createMilestonePresentationGate();
        const warnings = [];
        const films = [];
        vi.stubGlobal('window', {
            dispatchEvent(event) {
                if (event.type !== 'milestone-boss-warning') return;
                warnings.push(event.detail);
                const replay = gate.claim(event.detail, 1);
                if (replay) films.push(replay.videoBase);
            }
        });
        const game = {
            startO2StartupSequence: (_type, { onComplete }) => onComplete(),
            spawnMilestoneBoss: () => ({ userData: { milestoneEncounterId: 'o2:1', milestoneId: 'o2' } })
        };
        await runO2MilestoneChoreography({
            game, shakePauseMs: 0,
            triggerDoorTransition: (closed, opened) => { closed?.(); opened?.(); },
            playCutsceneVideo: async name => { films.push(name); return { played: true }; }
        });
        expect(films).toEqual(['event-o2-generator-upgraded', 'event-boss-encounter-cybersnail']);
        expect(warnings).toEqual([{
            type: 'boss_cybersnail', goalKey: 'o2Bubble',
            encounterId: 'o2:1', milestoneId: 'o2', presentationHandled: true
        }]);
        expect(gate.claim({ ...warnings[0], presentationHandled: false }, 1)).toBeNull();
    });

    it('holds the generator in camera focus for the full rise and restores tracking afterward', async () => {
        const focusCinematicCamera = vi.fn();
        const clearCinematicCameraFocus = vi.fn();
        const game = {
            getActiveO2GeneratorPosition: () => ({ x: 7, z: 9 }),
            focusCinematicCamera,
            clearCinematicCameraFocus,
            startO2StartupSequence: (_type, { onComplete }) => {
                expect(focusCinematicCamera).toHaveBeenCalledWith({ x: 7, z: 9 }, { immediate: true });
                expect(clearCinematicCameraFocus).not.toHaveBeenCalled();
                onComplete();
            },
            spawnMilestoneBoss: () => null
        };
        await runO2MilestoneChoreography({ ...sequenceOptions(game), shakePauseMs: 0 });
        expect(clearCinematicCameraFocus).toHaveBeenCalled();
    });

    function sequenceOptions(game = {}) {
        return {
            game, shakePauseMs: 0,
            triggerDoorTransition: (closed, opened) => { closed?.(); opened?.(); },
            playCutsceneVideo: vi.fn(async () => ({ played: true }))
        };
    }

    it('shares concurrent and completed O2 requests, but allows a new run', async () => {
        const options = sequenceOptions({ runStartTime: 1 });
        const first = runO2MilestoneChoreography(options);
        expect(runO2MilestoneChoreography(options)).toBe(first);
        expect(await first).toEqual({ ok: true });
        expect(await runO2MilestoneChoreography(options)).toEqual({ ok: true });
        expect(options.playCutsceneVideo).toHaveBeenCalledTimes(2);
        options.game.runStartTime = 2;
        await runO2MilestoneChoreography(options);
        expect(options.playCutsceneVideo).toHaveBeenCalledTimes(4);
    });

    it('unlocks after a media error and permits an explicit retry', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const game = { setInputEnabled: vi.fn(), setCinematicLock: vi.fn() };
        const options = sequenceOptions(game);
        options.playCutsceneVideo.mockRejectedValueOnce(new Error('decode failed'));
        expect(await runO2MilestoneChoreography(options)).toEqual({ ok: false, reason: 'decode failed' });
        expect(game.setInputEnabled).toHaveBeenLastCalledWith(true);
        expect(game.setCinematicLock).toHaveBeenLastCalledWith(false);
        expect(await runO2MilestoneChoreography(options)).toEqual({ ok: true });
    });

    it('does not spawn or unlock a different run after a stale video completes', async () => {
        let releaseVideo;
        const game = { runStartTime: 1, spawnMilestoneBoss: vi.fn(), setCinematicLock: vi.fn() };
        const options = sequenceOptions(game);
        options.playCutsceneVideo.mockImplementationOnce(() => new Promise(resolve => { releaseVideo = resolve; }));
        const pending = runO2MilestoneChoreography(options);
        await vi.waitFor(() => expect(releaseVideo).toBeTypeOf('function'));
        game.runStartTime = 2;
        releaseVideo({ skipped: true });
        expect((await pending).ok).toBe(false);
        expect(game.spawnMilestoneBoss).not.toHaveBeenCalled();
        expect(game.setCinematicLock).toHaveBeenLastCalledWith(true);
    });

    it('times out a lost rise callback without starting a boss or leaving input locked', async () => {
        vi.useFakeTimers();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const game = { startO2StartupSequence: vi.fn(), spawnMilestoneBoss: vi.fn(), setInputEnabled: vi.fn() };
        const pending = runO2MilestoneChoreography({ ...sequenceOptions(game), timeoutMs: 20 });
        await vi.advanceTimersByTimeAsync(30);
        expect(await pending).toEqual({ ok: false, reason: 'O2 structure rise did not complete' });
        expect(game.spawnMilestoneBoss).not.toHaveBeenCalled();
        expect(game.setInputEnabled).toHaveBeenLastCalledWith(true);
    });
});
