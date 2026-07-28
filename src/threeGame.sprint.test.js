import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('updateSprintState', () => {
    function makeFakeThis(overrides = {}) {
        return {
            sprinting: false,
            playerVitals: { o2: 100 },
            isGameplayInputActive: () => true,
            ...overrides
        };
    }

    it('applies 1.6x move / 2.5x O2-drain multipliers while sprinting with O2 available', () => {
        const fakeThis = makeFakeThis({ sprinting: true });
        ThreeGame.prototype.updateSprintState.call(fakeThis, 0.016);
        expect(fakeThis._sprintMoveSpeedMult).toBeCloseTo(1.6);
        expect(fakeThis._sprintO2DrainMult).toBeCloseTo(2.5);
    });

    it('applies no multiplier when not sprinting', () => {
        const fakeThis = makeFakeThis({ sprinting: false });
        ThreeGame.prototype.updateSprintState.call(fakeThis, 0.016);
        expect(fakeThis._sprintMoveSpeedMult).toBe(1.0);
        expect(fakeThis._sprintO2DrainMult).toBe(1.0);
    });

    it('stops applying the multiplier once O2 hits 0', () => {
        const fakeThis = makeFakeThis({ sprinting: true, playerVitals: { o2: 0 } });
        ThreeGame.prototype.updateSprintState.call(fakeThis, 0.016);
        expect(fakeThis._sprintMoveSpeedMult).toBe(1.0);
    });

    it('does not apply the multiplier while gameplay input is inactive', () => {
        const fakeThis = makeFakeThis({ sprinting: true, isGameplayInputActive: () => false });
        ThreeGame.prototype.updateSprintState.call(fakeThis, 0.016);
        expect(fakeThis._sprintMoveSpeedMult).toBe(1.0);
    });
});

describe('setKeyState — sprint is hold-based, not a one-shot trigger', () => {
    function makeFakeThis() {
        return {
            keys: { up: false, down: false, left: false, right: false },
            sprinting: false,
            isGameplayInputActive: () => true,
            codeMatchesAction: ThreeGame.prototype.codeMatchesAction,
            bank: null
        };
    }

    it('sets sprinting true on press and false on release', () => {
        const fakeThis = makeFakeThis();
        ThreeGame.prototype.setKeyState.call(fakeThis, 'ShiftLeft', true);
        expect(fakeThis.sprinting).toBe(true);
        ThreeGame.prototype.setKeyState.call(fakeThis, 'ShiftLeft', false);
        expect(fakeThis.sprinting).toBe(false);
    });
});

describe('setVirtualInputSprint — gamepad/touch hold state', () => {
    it('mirrors the active flag while gameplay input is active', () => {
        const fakeThis = { isGameplayInputActive: () => true };
        expect(ThreeGame.prototype.setVirtualInputSprint.call(fakeThis, true)).toBe(true);
        expect(fakeThis.sprinting).toBe(true);
        expect(ThreeGame.prototype.setVirtualInputSprint.call(fakeThis, false)).toBe(false);
        expect(fakeThis.sprinting).toBe(false);
    });

    it('forces sprinting false when gameplay input is inactive', () => {
        const fakeThis = { isGameplayInputActive: () => false };
        ThreeGame.prototype.setVirtualInputSprint.call(fakeThis, true);
        expect(fakeThis.sprinting).toBe(false);
    });
});
