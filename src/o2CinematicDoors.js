/**
 * O2 Milestone Cinematic Doors & Video Choreography Orchestrator
 *
 * Implements the 8-9 beat sequence documented in:
 * docs/planning/o2-cinematic-doors-and-boss-destruction-plan-2026-09-10.md
 * and docs/planning/o2-generator-sequence-fix-2026-09-10.md (SEQ-01).
 *
 * Beats:
 * 1. Interaction complete: lock input & close console modal.
 * 2. Blast doors slam shut vertically (closing-v) with hydraulic slam SFX.
 * 3. Blast doors slide open horizontally (opening-h) revealing the action video
 *    (event-o2-generator-upgraded / int_04_warmth_beneath_the_ice).
 * 4. On finish/skip, blast doors slam shut vertically over the cutscene (closing-v).
 * 5. Blast doors slide open horizontally (opening-h) to reveal 3D game world.
 * 6. 3D generator rise animation (popup 1.2s -> bubble 1.8s) + base floodlights ignite.
 * 7. Screen rumble via camera shake (0.35, 0.7) & warning alert broadcast.
 * 8. Blast doors cycle to retaliatory boss video
 *    (event-boss-encounter-cybersnail / int_13_a_snail_blocks_the_hallway).
 * 9. Final door reveal into active 3D gameplay:
 *    - Cybersnail boss staged outside base ready to smash walls
 *    - Milestone boss warning event emitted
 *    - Input re-enabled.
 */

export const O2_CHOREOGRAPHY_PHASES = Object.freeze({
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

const presentations = new WeakMap();

export function runO2MilestoneChoreography(options = {}) {
    const { game = typeof window !== 'undefined' ? window.game : null } = options;
    if (!game) return executeO2MilestoneChoreography(options);
    const runId = game.runStartTime;
    const previous = presentations.get(game);
    if (previous && previous.runId === runId) return previous.promise;
    const entry = { runId };
    presentations.set(game, entry);
    // Hide the newly purchased structure synchronously. The purchase event is
    // dispatched before persistent unlock synchronization; without this latch,
    // that synchronization exposed the completed generator behind movie one.
    game.prepareO2StartupReveal?.();
    const isCurrent = () => presentations.get(game) === entry && game.runStartTime === runId
        && !game.isPlayerDead && game.performanceProfile !== 'menu';
    entry.promise = Promise.resolve()
        .then(() => executeO2MilestoneChoreography({ ...options, game, isCurrent }))
        .finally(() => {
            // An old cinematic must never unlock or mutate a new expedition.
            if (presentations.get(game) === entry && game.runStartTime === runId) {
                game.clearCinematicCameraFocus?.();
                game.setCinematicLock?.(false);
                game.setInputEnabled?.(!game.isPlayerDead && game.performanceProfile !== 'menu');
            }
        })
        .catch(error => {
            if (presentations.get(game) === entry && game.runStartTime === runId) {
                game.cancelO2StartupSequence?.();
            }
            if (presentations.get(game) === entry) presentations.delete(game);
            if (error.name !== 'AbortError') console.warn('[o2CinematicDoors] sequence interrupted', error);
            return { ok: false, reason: error.message };
        });
    return entry.promise;
}

async function executeO2MilestoneChoreography(options = {}) {
    const {
        game = typeof window !== 'undefined' ? window.game : null,
        triggerDoorTransition: injectedDoorTransition = typeof window !== 'undefined' ? window.triggerDoorTransition : null,
        playCutsceneVideo: injectedPlayCutscene = typeof window !== 'undefined' ? window.playCutsceneVideo : null,
        showTacticalOverlay: injectedShowTacticalOverlay = typeof window !== 'undefined' ? window.showTacticalOverlay : null,
        bossType = 'boss_cybersnail',
        upgradeVideo = 'event-o2-generator-upgraded',
        bossVideo = 'event-boss-encounter-cybersnail',
        onPhaseChange = null,
        shakePauseMs = 800,
        timeoutMs = 10000,
        isCurrent = () => true
    } = options;

    const setPhase = (phase) => {
        if (!isCurrent()) {
            const error = new Error('O2 presentation cancelled after leaving its run');
            error.name = 'AbortError';
            throw error;
        }
        if (typeof onPhaseChange === 'function') {
            try {
                onPhaseChange(phase);
            } catch (err) {
                console.error('[o2CinematicDoors] onPhaseChange error:', err);
            }
        }
    };

    const doorTransition = (onClosed, onOpened, key = 'base', opts = {}) => {
        if (typeof injectedDoorTransition === 'function') {
            return new Promise((resolve) => {
                injectedDoorTransition(
                    () => { if (isCurrent()) onClosed?.(); },
                    () => {
                        if (isCurrent()) onOpened?.();
                        resolve();
                    },
                    key,
                    opts
                );
            });
        }
        if (onClosed) onClosed();
        if (onOpened) onOpened();
        return Promise.resolve();
    };

    const playVideo = async (videoName, videoOpts = {}) => {
        if (typeof injectedPlayCutscene === 'function') {
            return injectedPlayCutscene(videoName, videoOpts);
        }
        return Promise.resolve({ played: true });
    };

    setPhase(O2_CHOREOGRAPHY_PHASES.INIT);

    // ── Beat 1: Interaction complete — Lock input & close modals ──
    setPhase(O2_CHOREOGRAPHY_PHASES.LOCK);
    game?.closeConsoleModal?.();
    game?.setInputEnabled?.(false);
    game?.setCinematicLock?.(true);

    // ── Beat 2 & 3: Doors close then open to O2 upgrade video ──
    setPhase(O2_CHOREOGRAPHY_PHASES.DOORS_CLOSE_GENERATOR);

    await doorTransition(
        () => {},
        () => {},
        'base',
        {
            onOpeningStart: () => {
                setPhase(O2_CHOREOGRAPHY_PHASES.VIDEO_GENERATOR);
            }
        }
    );

    // Play action video
    await playVideo(upgradeVideo, {
        kicker: 'TACTICAL RESTORATION',
        title: 'O2 LIFE SUPPORT ONLINE',
        body: 'ATMOSPHERIC SCRUBBER ENGAGED — BUNKER SECURED',
        tone: 'event',
        onDoorCutoff: () => {
            setPhase(O2_CHOREOGRAPHY_PHASES.DOORS_CLOSE_REVEAL);
        }
    });

    // ── Beat 4 & 5: Blast doors cycle over video and open to 3D reveal ──
    setPhase(O2_CHOREOGRAPHY_PHASES.DOORS_OPEN_3D);
    const generatorPosition = game?.getActiveO2GeneratorPosition?.();
    if (generatorPosition) game?.focusCinematicCamera?.(generatorPosition, { immediate: true });
    await doorTransition(
        () => {
            if (generatorPosition) game?.focusCinematicCamera?.(generatorPosition, { immediate: true });
        },
        () => {},
        'base'
    );

    // ── Beat 6: 3D generator rise animation & base floodlights ignite ──
    setPhase(O2_CHOREOGRAPHY_PHASES.GENERATOR_RISE_3D);
    if (game?.startO2StartupSequence) {
        await new Promise((resolve, reject) => {
            let settled = false;
            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                reject(new Error('O2 structure rise did not complete'));
            }, timeoutMs ?? 10000);
            const complete = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve();
            };

            try {
                game.startO2StartupSequence(bossType, {
                    skipDialogue: true,
                    onComplete: complete
                });
            } catch (error) {
                settled = true;
                clearTimeout(timer);
                reject(error);
            }
        });
    }
    // Hold the completed structure in frame through the end of the rise; the
    // next door-covered beat can safely restore normal player tracking.
    game?.clearCinematicCameraFocus?.();

    // ── Beat 7: Screen rumble & warning alert broadcast ──
    setPhase(O2_CHOREOGRAPHY_PHASES.SCREEN_SHAKE_WARNING);
    game?.triggerCameraShake?.(0.35, 0.7);
    if (typeof window !== 'undefined' && window.AudioManager?.play) {
        window.AudioManager.play('alert_high_priority', { volume: 0.7 });
    }
    if (typeof injectedShowTacticalOverlay === 'function') {
        injectedShowTacticalOverlay({
            title: 'SEISMIC ANOMALY',
            status: '> SEISMIC IMPACT DETECTED<br>> BIOMECHANICAL RETALIATION CLOSING IN',
            progress: 100,
            duration: 2500
        });
    }
    await new Promise((resolve) => setTimeout(resolve, shakePauseMs));

    // ── Beat 8: Blast doors cycle to retaliatory boss video ──
    setPhase(O2_CHOREOGRAPHY_PHASES.DOORS_CLOSE_BOSS);
    await doorTransition(
        () => {},
        () => {},
        'base',
        {
            onOpeningStart: () => {
                setPhase(O2_CHOREOGRAPHY_PHASES.VIDEO_BOSS);
            }
        }
    );

    await playVideo(bossVideo, {
        kicker: 'HOSTILE DETECTED',
        title: 'CYBERNETIC BIO-ANOMALY',
        body: 'APEX THREAT APPROACHING THE BUNKER PERIMETER',
        tone: 'danger',
        onDoorCutoff: () => {
            setPhase(O2_CHOREOGRAPHY_PHASES.DOORS_OPEN_COMBAT);
        }
    });

    // ── Beat 9: Final door reveal into active 3D gameplay ──
    await doorTransition(
        () => {
            const boss = game?.spawnMilestoneBoss?.(bossType, { sourceGoalKey: 'o2Bubble' });
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('milestone-boss-warning', {
                    detail: {
                        type: bossType, goalKey: 'o2Bubble',
                        encounterId: boss?.userData?.milestoneEncounterId,
                        milestoneId: boss?.userData?.milestoneId,
                        presentationHandled: true
                    }
                }));
            }
        },
        () => {},
        'base'
    );

    // The owning run wrapper releases input and the cinematic lock.
    setPhase(O2_CHOREOGRAPHY_PHASES.COMPLETE);
    return { ok: true };
}
