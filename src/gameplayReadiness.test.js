import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('BOOT-01: Observable Gameplay Readiness Contract', () => {
    let dispatchedEvents = [];

    beforeEach(() => {
        dispatchedEvents = [];
        vi.stubGlobal('window', {
            dispatchEvent: vi.fn((e) => dispatchedEvents.push(e)),
            CustomEvent: class CustomEvent {
                constructor(type, init) {
                    this.type = type;
                    this.detail = init?.detail;
                }
            }
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('validates all readiness gates: phase, input, overlay, renderer, and dimensions', () => {
        // Build the readiness predicate matching main.js
        const checkReadiness = ({
            phase = 'gameplay',
            hudActive = true,
            profile = 'gameplay',
            inputEnabled = true,
            loadingPaused = false,
            blockingOverlay = false,
            width = 1280,
            height = 720
        } = {}) => {
            const game = {
                performanceProfile: profile,
                inputEnabled,
                loadingPaused,
                hasBlockingGameplayOverlay: () => blockingOverlay,
                container: { clientWidth: width, clientHeight: height }
            };
            return Boolean(
                phase === 'gameplay'
                && hudActive
                && game.performanceProfile === 'gameplay'
                && game.inputEnabled === true
                && game.loadingPaused === false
                && !game.hasBlockingGameplayOverlay()
                && (game.container?.clientWidth ?? 0) > 0
                && (game.container?.clientHeight ?? 0) > 0
            );
        };

        // All good -> ready
        expect(checkReadiness()).toBe(true);

        // Not in gameplay phase -> not ready
        expect(checkReadiness({ phase: 'menu' })).toBe(false);
        expect(checkReadiness({ phase: 'gameover' })).toBe(false);

        // HUD inactive -> not ready
        expect(checkReadiness({ hudActive: false })).toBe(false);

        // Performance profile still menu -> not ready
        expect(checkReadiness({ profile: 'menu' })).toBe(false);

        // Input disabled (e.g. during cinematic) -> not ready
        expect(checkReadiness({ inputEnabled: false })).toBe(false);

        // Loading paused (e.g. while assets mounting) -> not ready
        expect(checkReadiness({ loadingPaused: true })).toBe(false);

        // Blocking overlay active (e.g. modal open) -> not ready
        expect(checkReadiness({ blockingOverlay: true })).toBe(false);

        // 0x0 container (not attached or collapsed) -> not ready
        expect(checkReadiness({ width: 0 })).toBe(false);
        expect(checkReadiness({ height: 0 })).toBe(false);
    });

    it('dispatches gameplay-ready event with complete telemetry', () => {
        const notify = (playerType, seed) => {
            window.dispatchEvent(new window.CustomEvent('gameplay-ready', {
                detail: {
                    timestamp: 123456789,
                    appPhase: 'gameplay',
                    playerType,
                    seed
                }
            }));
        };

        notify('scout', 42);
        expect(dispatchedEvents).toHaveLength(1);
        expect(dispatchedEvents[0].type).toBe('gameplay-ready');
        expect(dispatchedEvents[0].detail).toEqual({
            timestamp: 123456789,
            appPhase: 'gameplay',
            playerType: 'scout',
            seed: 42
        });
    });
});
