import { describe, expect, it } from 'vitest';
import {
    ENGINEER_GESTURES,
    INJURED_LOCOMOTION_VARIANTS,
    computeOperatorPolishMaterialState,
    computeLocomotionWeights,
    computeLocomotionTimeScale,
    resolveGameplayCharmSocket,
    computeOverlayYaw,
    computeUpperBodyAimOffset,
    selectLocomotionActionName,
    selectOverlayAnimation
} from './player3dOverlay.js';

describe('player 3D cosmetic overlay', () => {
    it('exposes the Engineer gesture pack for showroom pose cycling', () => {
        expect(ENGINEER_GESTURES).toContain('engineerThoughtful');
        expect(ENGINEER_GESTURES).toContain('engineerAcknowledge');
        expect(ENGINEER_GESTURES).toContain('engineerNo');
        expect(ENGINEER_GESTURES).toHaveLength(15);
    });

    it('applies unlocked polish color and shine without losing the base material', () => {
        const polished = computeOperatorPolishMaterialState(0x808080, 0.72, 0.08, 0x58efff);
        expect(polished.color.getHex()).not.toBe(0x808080);
        expect(polished.roughness).toBe(0.36);
        expect(polished.metalness).toBe(0.2);

        const standard = computeOperatorPolishMaterialState(0x808080, 0.72, 0.08, 0xffffff);
        expect(standard.color.getHex()).toBe(0x808080);
        expect(standard.roughness).toBe(0.72);
        expect(standard.metalness).toBe(0.08);
    });

    it('maps world directions to continuous Mixamo yaw', () => {
        expect(computeOverlayYaw(0, 1)).toBeCloseTo(0);
        expect(computeOverlayYaw(1, 0)).toBeCloseTo(Math.PI / 2);
        expect(computeOverlayYaw(-1, 0)).toBeCloseTo(-Math.PI / 2);
    });

    it('selects locomotion relative to aim', () => {
        const base = { isMoving: true, hasAim: true, aimX: 0, aimZ: 1 };
        expect(selectOverlayAnimation({ ...base, moveX: 0, moveZ: -1 })).toBe('backward');
        expect(selectOverlayAnimation({ ...base, moveX: -1, moveZ: 0 })).toBe('strafeLeft');
        expect(selectOverlayAnimation({ ...base, moveX: 1, moveZ: 0 })).toBe('strafeRight');
    });

    it('keeps sprint locomotion aligned to travel while aiming elsewhere', () => {
        const sprinting = {
            isMoving: true,
            isSprinting: true,
            hasAim: true,
            moveX: 0,
            moveZ: -1,
            aimX: 0,
            aimZ: 1
        };
        expect(selectOverlayAnimation(sprinting)).toBe('run');
        expect(computeLocomotionWeights(sprinting)).toEqual({ run: 1 });
    });

    it('prioritizes fall and reload over locomotion', () => {
        expect(selectOverlayAnimation({ isFalling: true, isReloading: true, isMoving: true })).toBe('fall');
        expect(selectOverlayAnimation({ isReloading: true, isMoving: true })).toBe('reload');
    });

    it('continuously blends diagonal aim-relative movement', () => {
        const weights = computeLocomotionWeights({
            isMoving: true,
            hasAim: true,
            moveX: -1,
            moveZ: 1,
            aimX: 0,
            aimZ: 1
        });
        expect(weights.idle).toBeUndefined();
        expect(weights.walk).toBeCloseTo(0.5);
        expect(weights.strafeLeft).toBeCloseTo(0.5);
        expect(Object.values(weights).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
    });

    it('lets the upper body track aim independently through a full turn', () => {
        expect(computeUpperBodyAimOffset(0, 1, 0)).toBeCloseTo(Math.PI / 2);
        expect(computeUpperBodyAimOffset(0, -1, 0)).toBeCloseTo(-Math.PI / 2);
        expect(computeUpperBodyAimOffset(0, 0, -1)).toBeCloseTo(Math.PI);
        expect(computeUpperBodyAimOffset(0, 0, -1, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    });

    it('redirects idle/walk/run to their injured counterpart only when hurt and the clip exists', () => {
        expect(selectLocomotionActionName('walk', true, true)).toBe('injuredWalk');
        expect(selectLocomotionActionName('walk', false, true)).toBe('walk');
        expect(selectLocomotionActionName('walk', true, false)).toBe('walk');
        expect(selectLocomotionActionName('run', true, true)).toBe('injuredRun');
        expect(selectLocomotionActionName('idle', true, true)).toBe('injuredIdle');
    });

    it('does not redirect directions the injured pack has no clip for', () => {
        expect(selectLocomotionActionName('backward', true, false)).toBe('backward');
        expect(selectLocomotionActionName('strafeLeft', true, false)).toBe('strafeLeft');
        expect(INJURED_LOCOMOTION_VARIANTS.backward).toBeUndefined();
        expect(INJURED_LOCOMOTION_VARIANTS.strafeLeft).toBeUndefined();
    });
});

describe('computeLocomotionTimeScale', () => {
    // Sprint 29 §10. Class move speeds differ by nearly 2x (SCOUT 4.8, ENGINEER
    // 3.6, TANK 2.6) but every class played the same walk clip at a fixed rate,
    // so the feet could not match the ground for two of the three. TANK -- the
    // class in log16 -- slid worst.
    it('plays the clip at authored rate when the walk matches the reference speed', () => {
        expect(computeLocomotionTimeScale({ speed: 3.6, referenceSpeed: 3.6 })).toBeCloseTo(1, 5);
    });

    it('slows the cadence for a slower class', () => {
        expect(computeLocomotionTimeScale({ speed: 2.6, referenceSpeed: 3.6 })).toBeLessThan(1);
    });

    it('quickens the cadence for a faster class', () => {
        expect(computeLocomotionTimeScale({ speed: 4.8, referenceSpeed: 3.6 })).toBeGreaterThan(1);
    });

    it('adds sprint cadence on top of the ground speed', () => {
        const walk = computeLocomotionTimeScale({ speed: 3.6, referenceSpeed: 3.6 });
        const sprint = computeLocomotionTimeScale({ speed: 3.6, referenceSpeed: 3.6, isSprinting: true });

        expect(sprint).toBeGreaterThan(walk);
    });

    it('clamps so an extreme speed cannot shred or freeze the clip', () => {
        expect(computeLocomotionTimeScale({ speed: 40, referenceSpeed: 3.6 })).toBeLessThanOrEqual(1.6);
        expect(computeLocomotionTimeScale({ speed: 0.01, referenceSpeed: 3.6 })).toBeGreaterThanOrEqual(0.6);
    });

    it('falls back to the authored rate when speed is unknown', () => {
        expect(computeLocomotionTimeScale({})).toBeCloseTo(1, 5);
    });
});

describe('resolveGameplayCharmSocket', () => {
    // The armory hangs the socket off an unscaled pivot, so its transform is in
    // pivot space. In gameplay the socket is a child of the weapon, which has
    // already been scaled to fit the hand -- so the same numbers would land
    // somewhere else unless the weapon's scale is divided back out.
    it('matches the armory placement when the weapon is unscaled', () => {
        const socket = resolveGameplayCharmSocket('gg1', 1);

        expect(socket.position).toEqual([0.18, -0.05, 0.06]);
        expect(socket.scale).toBeCloseTo(1, 5);
    });

    it('divides the weapon scale back out so world placement is unchanged', () => {
        const socket = resolveGameplayCharmSocket('gg1', 2);

        expect(socket.position[0]).toBeCloseTo(0.09, 5);
        expect(socket.scale).toBeCloseTo(0.5, 5);
    });

    it('uses the archetype own socket, not a shared one', () => {
        expect(resolveGameplayCharmSocket('siege_breaker', 1).position)
            .not.toEqual(resolveGameplayCharmSocket('gg1', 1).position);
    });

    it('falls back to a known archetype rather than throwing', () => {
        expect(resolveGameplayCharmSocket('not-a-gun', 1).archetype).toBe('gg1');
    });

    it('treats a nonsense weapon scale as unscaled instead of dividing by zero', () => {
        const socket = resolveGameplayCharmSocket('gg1', 0);

        expect(Number.isFinite(socket.position[0])).toBe(true);
        expect(socket.position).toEqual([0.18, -0.05, 0.06]);
    });
});
