import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BaseLights } from './baseLights.js';
import { runO2MilestoneChoreography, O2_CHOREOGRAPHY_PHASES } from './o2CinematicDoors.js';

// LAG-01 regression guard.
//
// Repairing the O2 generator used to freeze the game for ~10.5 seconds
// (docs/logs/log20.json, long task at elapsed 221,986 ms). Cause: BaseLights
// only called build() from ignite(), so eight PointLights entered the scene in
// the middle of the milestone beat. three.js bakes light count and type into
// its program cache key, so every lit material in the scene needed a fresh
// program -- with ~2,100 unique materials, that is a multi-second synchronous
// compile on a visible frame.
//
// The fix builds the dormant grid during world setup (threeGame.setupCrashedShips)
// so the light SET is final before gameplay starts and ignition only ramps
// intensities. These lock the properties that fix depends on, because the
// symptom is a frame-time cliff that no unit test can observe directly.
//
// Runtime power/reset coverage lives in threeGame.o2LightLifecycle.test.js;
// director ownership/cancellation coverage lives in milestonePresentation.test.js.
describe('LAG-01 — base light grid must not change the scene light set at ignition', () => {
    const countLights = (scene) => {
        let n = 0;
        scene.traverse((child) => { if (child?.isLight) n += 1; });
        return n;
    };

    it('adds every fixture to the scene at build time, before ignition', () => {
        const scene = new THREE.Scene();
        const lights = new BaseLights(scene);
        expect(countLights(scene)).toBe(0);

        lights.build(0, 0);
        const afterBuild = countLights(scene);
        expect(afterBuild).toBeGreaterThan(0);
        expect(lights.built).toBe(true);
    });

    it('keeps fixtures present-but-dark so the grid is invisible until ignited', () => {
        const scene = new THREE.Scene();
        const lights = new BaseLights(scene);
        lights.build(0, 0);

        const fixtures = [];
        scene.traverse((child) => { if (child?.isLight) fixtures.push(child); });
        for (const light of fixtures) {
            // Visible keeps the light in the program cache key; zero intensity
            // keeps it from lighting anything yet. Both matter.
            expect(light.visible).toBe(true);
            expect(light.intensity).toBe(0);
        }
    });

    // The actual regression: if the grid is already built, igniting must not
    // introduce a single new light, because that is what forces the recompile.
    it('ignites a pre-built grid without changing the scene light count', () => {
        const scene = new THREE.Scene();
        const lights = new BaseLights(scene);
        lights.build(0, 0);
        const before = countLights(scene);

        lights.ignite(0, 0);
        expect(countLights(scene)).toBe(before);

        lights.update(10);
        expect(countLights(scene)).toBe(before);
    });

    it('ignites instantly without changing the light count either', () => {
        const scene = new THREE.Scene();
        const lights = new BaseLights(scene);
        lights.build(0, 0);
        const before = countLights(scene);

        lights.igniteInstant(0, 0);
        expect(countLights(scene)).toBe(before);
    });

    // Documents the hazard the fix exists to avoid: ignite() still builds on
    // demand as a safety net, and that path DOES add lights mid-run. If this
    // ever becomes the normal path again, the stall is back.
    it('shows why pre-building matters: a cold ignite adds the whole grid at once', () => {
        const scene = new THREE.Scene();
        const lights = new BaseLights(scene);
        expect(countLights(scene)).toBe(0);

        lights.ignite(0, 0);
        expect(countLights(scene)).toBeGreaterThan(0);
    });

    it('recentres an already-built grid instead of adding a second one', () => {
        const scene = new THREE.Scene();
        const lights = new BaseLights(scene);
        lights.build(0, 0);
        const before = countLights(scene);

        lights.ignite(40, -25, 6);
        expect(countLights(scene)).toBe(before);
    });
});

describe('O2 Milestone Cinematic Doors and Video Choreography (SEQ-01)', () => {
    it('defines all required progression phases in chronological sequence', () => {
        expect(O2_CHOREOGRAPHY_PHASES).toMatchObject({
            INIT: 'init',
            LOCK: 'lock',
            DOORS_CLOSE_GENERATOR: 'doors_close_generator',
            VIDEO_GENERATOR: 'video_generator',
            DOORS_CLOSE_REVEAL: 'doors_close_reveal',
            DOORS_OPEN_3D: 'doors_open_3d',
            GENERATOR_RISE_3D: 'generator_rise_3d',
            SCREEN_SHAKE_WARNING: 'screen_shake_warning',
            DOORS_CLOSE_BOSS: 'doors_close_boss',
            VIDEO_BOSS: 'video_boss',
            DOORS_OPEN_COMBAT: 'doors_open_combat',
            COMPLETE: 'complete'
        });
    });

    it('executes the complete 8-beat sequence in strict non-overlapping order', async () => {
        const events = [];
        const phases = [];

        const fakeGame = {
            closeConsoleModal: () => events.push('closeConsoleModal'),
            setInputEnabled: (enabled) => events.push(`setInputEnabled:${enabled}`),
            setCinematicLock: (locked) => events.push(`setCinematicLock:${locked}`),
            ensureO2Generator3dReady: async () => events.push('ensureO2Generator3dReady'),
            getActiveO2GeneratorPosition: () => ({ x: 10, z: 20 }),
            cameraTarget: { x: 0, z: 0 },
            focusCinematicCamera: (position) => {
                fakeGame.cameraTarget = { ...position };
                events.push(`focusCamera:${position.x}:${position.z}`);
            },
            clearCinematicCameraFocus: () => events.push('clearCameraFocus'),
            startO2StartupSequence: (bossType, { onComplete, skipDialogue }) => {
                events.push(`startO2StartupSequence:${bossType}:skipDialogue=${skipDialogue}`);
                if (onComplete) onComplete();
            },
            triggerCameraShake: (intensity, duration) => {
                events.push(`triggerCameraShake:${intensity}:${duration}`);
            },
            spawnMilestoneBoss: (bossType, meta) => {
                events.push(`spawnMilestoneBoss:${bossType}:${meta.sourceGoalKey}`);
            }
        };

        const fakeTriggerDoorTransition = (onClosed, onOpened, key, options) => {
            events.push(`doorTransition:close:${key}`);
            if (onClosed) onClosed();
            if (options?.onOpeningStart) options.onOpeningStart();
            events.push(`doorTransition:open:${key}`);
            if (onOpened) onOpened();
        };

        const fakePlayCutsceneVideo = (video, options) => {
            events.push(`playCutsceneVideo:${video}`);
            if (options?.onDoorCutoff) options.onDoorCutoff();
            return Promise.resolve({ played: true });
        };

        const fakeShowTacticalOverlay = (spec) => {
            events.push(`showTacticalOverlay:${spec.title}`);
        };

        const result = await runO2MilestoneChoreography({
            game: fakeGame,
            triggerDoorTransition: fakeTriggerDoorTransition,
            playCutsceneVideo: fakePlayCutsceneVideo,
            showTacticalOverlay: fakeShowTacticalOverlay,
            shakePauseMs: 0,
            onPhaseChange: (phase) => phases.push(phase)
        });

        expect(result).toEqual({ ok: true });

        // Verify phase flow
        expect(phases).toEqual([
            'init',
            'lock',
            'doors_close_generator',
            'video_generator',
            'doors_close_reveal',
            'doors_open_3d',
            'generator_rise_3d',
            'screen_shake_warning',
            'doors_close_boss',
            'video_boss',
            'doors_open_combat',
            'complete'
        ]);

        // Verify beat order:
        // 1. Lock and close modal
        expect(events[0]).toBe('closeConsoleModal');
        expect(events[1]).toBe('setInputEnabled:false');
        expect(events[2]).toBe('setCinematicLock:true');

        // 2 & 3. Door closes and opens to upgrade video
        expect(events).toContain('playCutsceneVideo:event-o2-generator-upgraded');
        expect(events.indexOf('ensureO2Generator3dReady')).toBeLessThan(events.indexOf('focusCamera:10:20'));

        // 4 & 5. Camera recenters onto generator position
        expect(events).toContain('focusCamera:10:20');
        expect(events).toContain('clearCameraFocus');

        // 6. 3D generator rise
        expect(events).toContain('startO2StartupSequence:boss_cybersnail:skipDialogue=true');

        // 7. Screen rumble & tactical warning
        expect(events).toContain('triggerCameraShake:0.35:0.7');
        expect(events).toContain('showTacticalOverlay:SEISMIC ANOMALY');

        // 8. Boss cutscene video
        expect(events).toContain('playCutsceneVideo:event-boss-encounter-cybersnail');

        // 9. Boss spawns in 3D, unlocks input
        expect(events).toContain('spawnMilestoneBoss:boss_cybersnail:o2Bubble');
        expect(events[events.length - 2]).toBe('setCinematicLock:false');
        expect(events[events.length - 1]).toBe('setInputEnabled:true');
    });

    it('handles headless execution gracefully without game, DOM, or video player', async () => {
        const result = await runO2MilestoneChoreography({
            game: null,
            triggerDoorTransition: null,
            playCutsceneVideo: null,
            showTacticalOverlay: null,
            shakePauseMs: 0
        });
        expect(result).toEqual({ ok: true });
    });
});
