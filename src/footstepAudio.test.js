import { describe, expect, it, vi } from 'vitest';
import { CHASSIS_STEP, FOOTSTEP_BASE_VOLUME, planFootstep, playFootstepPlan } from './footstepAudio.js';

const concrete = { key: 'footstep_concrete', splash: false };

describe('footstep layers', () => {
    it('weights the step by chassis: the Tank heavier and lower than the Scout', () => {
        const [tank] = planFootstep({ surface: concrete, playerType: 'TANK' });
        const [scout] = planFootstep({ surface: concrete, playerType: 'SCOUT' });
        expect(tank.volume).toBeGreaterThan(scout.volume);
        expect(tank.playbackRate).toBeLessThan(scout.playbackRate);
    });

    it('lands harder when sprinting and alternates the feet', () => {
        const [walk] = planFootstep({ surface: concrete, foot: 0 });
        const [run] = planFootstep({ surface: concrete, foot: 0, sprinting: true });
        const [other] = planFootstep({ surface: concrete, foot: 1 });
        expect(run.volume).toBeGreaterThan(walk.volume);
        expect(other.playbackRate).not.toBe(walk.playbackRate);
    });

    it('adds a splash on wet floors and the kit rattle at the chassis rate', () => {
        const wet = planFootstep({ surface: { key: 'footstep_concrete', splash: true }, playerType: 'TANK' });
        expect(wet.map((l) => l.key)).toEqual(['footstep_concrete', 'footstep_wet_puddle', 'footstep_gear_rattle']);
        expect(planFootstep({ surface: concrete, playerType: 'SCOUT', stepIndex: 1 }).map((l) => l.key)).toEqual(['footstep_concrete']);
        expect(planFootstep({ surface: concrete, playerType: 'SCOUT', stepIndex: 2 }).at(-1)).toMatchObject({ key: 'footstep_gear_rattle', volume: FOOTSTEP_BASE_VOLUME * CHASSIS_STEP.SCOUT.gear });
    });

    it('plays every layer and reports whether the surface itself played', () => {
        const audio = { play: vi.fn((key) => (key === 'footstep_concrete' ? {} : null)) };
        const layers = planFootstep({ surface: concrete, playerType: 'TANK' });
        expect(playFootstepPlan(audio, layers, (volume) => ({ volume: volume * 0.5, pan: 0.2 }))).toBe(true);
        expect(audio.play).toHaveBeenCalledWith('footstep_concrete', expect.objectContaining({ pan: 0.2, playbackRate: layers[0].playbackRate }));
        expect(playFootstepPlan({ play: () => null }, layers)).toBe(false);
    });
});
