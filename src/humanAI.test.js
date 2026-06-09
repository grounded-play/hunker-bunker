import { describe, expect, it } from 'vitest';
import { HUMAN_AI_ENABLED, HUMAN_STIMULI, nextHumanState } from './humanAI.js';

describe('nextHumanState', () => {
    it('ships disabled for Sprint 18', () => {
        expect(HUMAN_AI_ENABLED).toBe(false);
    });

    it('raises unaware humans into alert states', () => {
        expect(nextHumanState('unaware', HUMAN_STIMULI.NOISE_HEARD)).toBe('alerted');
        expect(nextHumanState('unaware', { type: HUMAN_STIMULI.THREAT_SEEN, armed: true })).toBe('armed');
    });

    it('models panic, fleeing, and infection as pure transitions', () => {
        expect(nextHumanState('alerted', HUMAN_STIMULI.DAMAGE_TAKEN)).toBe('panicked');
        expect(nextHumanState('panicked', HUMAN_STIMULI.LOW_MORALE)).toBe('fleeing');
        expect(nextHumanState('fleeing', HUMAN_STIMULI.LATCH_EVENT)).toBe('infected');
        expect(nextHumanState('infected', HUMAN_STIMULI.WEAPON_FOUND)).toBe('infected');
    });
});
