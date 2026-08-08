import { describe, expect, it } from 'vitest';
import {
    DEATH_CINEMATICS,
    EVENT_CINEMATICS,
    getDeathCinematicSpec,
    getEventCinematicSpec,
    normalizeCinematicStillSpec,
    shouldPlayAuthoredEventCinematic
} from './cinematicFallback.js';

describe('cinematic still fallback specs', () => {
    it('normalizes one or two unique image frames', () => {
        const spec = normalizeCinematicStillSpec({
            firstImage: '/first.png',
            lastImage: '/last.png',
            images: ['/first.png', '/first.png', '/last.png', '/ignored.png']
        });

        expect(spec.images).toEqual(['/first.png', '/last.png']);
        expect(Object.isFrozen(spec.images)).toBe(true);
    });

    it('provides readable defaults and clamps timing', () => {
        const spec = normalizeCinematicStillSpec({ durationMs: 2, frameMs: 3 });

        expect(spec.title).toBe('SIGNAL RECOVERED');
        expect(spec.durationMs).toBe(1200);
        expect(spec.frameMs).toBe(600);
        expect(spec.allowSkip).toBe(true);
    });

    it('maps known death reasons and falls back for unknown hazards', () => {
        expect(getDeathCinematicSpec('abyss').images).toEqual(DEATH_CINEMATICS.abyss.images);
        expect(getDeathCinematicSpec('o2-depletion').images).toEqual(DEATH_CINEMATICS.oxygen.images);
        expect(getDeathCinematicSpec('queen-shockwave').images).toEqual(DEATH_CINEMATICS.queen.images);
        expect(getDeathCinematicSpec('enemy-projectile').images).toEqual(DEATH_CINEMATICS.combat.images);
        expect(getDeathCinematicSpec('something-new').images).toEqual(DEATH_CINEMATICS.hazard.images);
        expect(getDeathCinematicSpec('something-new').id).toBe('death-hazard');
    });

    it('returns authored event beats without inventing unknown ones', () => {
        expect(getEventCinematicSpec('cave_revealed').images).toEqual(EVENT_CINEMATICS.cave_revealed.images);
        expect(getEventCinematicSpec('not-authored')).toBeNull();
    });

    it('covers the O2 generator upgrade and each milestone boss encounter', () => {
        expect(getEventCinematicSpec('o2_generator_upgraded').images).toEqual(['/cutscenes/poster-art/event-o2-generator-upgraded.png']);
        expect(getEventCinematicSpec('boss_encounter_cryosnail').images).toEqual(['/cutscenes/poster-art/event-boss-cryosnail.png']);
        expect(getEventCinematicSpec('boss_encounter_cybersnail').images).toEqual(['/cutscenes/poster-art/event-boss-cybersnail.png']);
        expect(getEventCinematicSpec('boss_encounter_sporesnail').images).toEqual(['/cutscenes/poster-art/event-boss-sporesnail.png']);
    });

    it('suppresses cold-boot and instant state-restoration cinematics', () => {
        expect(shouldPlayAuthoredEventCinematic({ appPhase: 'loading' })).toBe(false);
        expect(shouldPlayAuthoredEventCinematic({ appPhase: 'menu' })).toBe(false);
        expect(shouldPlayAuthoredEventCinematic({ appPhase: 'gameplay', revealMode: 'instant' })).toBe(false);
        expect(shouldPlayAuthoredEventCinematic({ appPhase: 'gameplay', source: 'o2-bubble-state-restore' })).toBe(false);
        expect(shouldPlayAuthoredEventCinematic({ appPhase: 'gameplay', revealMode: 'animated' })).toBe(true);
    });
});
