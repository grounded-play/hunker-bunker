import { describe, expect, it } from 'vitest';
import {
    EMITTER_PHASE,
    PROP_EMITTER_PROFILES,
    applyWorldEmitterAction,
    createWorldEmitterState,
    destroyWorldEmitterState,
    getWorldEmitterProfile,
    tickWorldEmitterExposure,
    updateWorldEmitterState,
    validateWorldEmitterProfile
} from './worldEmitters.js';

function advance(state, seconds, context = {}) {
    const events = [];
    for (let elapsed = 0; elapsed < seconds; elapsed += 0.1) {
        events.push(...updateWorldEmitterState(state, 0.1, context));
    }
    return events;
}

describe('world emitter profiles and state', () => {
    it('keeps every authored profile valid and frozen', () => {
        expect(Object.isFrozen(PROP_EMITTER_PROFILES)).toBe(true);
        for (const [type, value] of Object.entries(PROP_EMITTER_PROFILES)) {
            expect(validateWorldEmitterProfile(value), type).toEqual([]);
            expect(Object.isFrozen(value.payload), type).toBe(true);
        }
        expect(getWorldEmitterProfile('prop_pipe_rupture')).toBeTruthy();
        expect(getWorldEmitterProfile('plain_crate')).toBeNull();
    });

    it('runs a deterministic cycle through telegraph, active, cooldown, and idle', () => {
        const state = createWorldEmitterState(getWorldEmitterProfile('prop_pipe_rupture'), { id: 'pipe:a' });
        advance(state, 10);
        expect(state.activationCount).toBeGreaterThan(0);
        expect(Object.values(EMITTER_PHASE)).toContain(state.phase);
        const twin = createWorldEmitterState(getWorldEmitterProfile('prop_pipe_rupture'), { id: 'pipe:a' });
        advance(twin, 10);
        expect(twin.phase).toBe(state.phase);
        expect(twin.phaseTime).toBeCloseTo(state.phaseTime, 6);
        expect(twin.activationCount).toBe(state.activationCount);
    });

    it('starts the next cyclic telegraph directly after cooldown', () => {
        const state = createWorldEmitterState(getWorldEmitterProfile('prop_pipe_rupture'), { id: 'pipe:repeat' });
        advance(state, 18);
        expect(state.activationCount).toBeGreaterThanOrEqual(2);
    });

    it('uses proximity hysteresis and does not chatter at the boundary', () => {
        const state = createWorldEmitterState(getWorldEmitterProfile('fungal_spore_vent'), { id: 'spore:a' });
        updateWorldEmitterState(state, 0.1, { distance: 3.2 });
        expect(state.proximityLatched).toBe(true);
        expect(state.phase).toBe(EMITTER_PHASE.TELEGRAPH);
        updateWorldEmitterState(state, 0.1, { distance: 3.6 });
        expect(state.proximityLatched).toBe(true);
        updateWorldEmitterState(state, 0.1, { distance: 4.1 });
        expect(state.proximityLatched).toBe(false);
    });

    it('throttles payload exposure independently per target', () => {
        const state = createWorldEmitterState(getWorldEmitterProfile('fungal_spore_vent'), { id: 'spore:b' });
        state.phase = EMITTER_PHASE.ACTIVE;
        expect(tickWorldEmitterExposure(state, 'player:a', 0.1)).toBe(true);
        expect(tickWorldEmitterExposure(state, 'player:a', 0.1)).toBe(false);
        expect(tickWorldEmitterExposure(state, 'player:b', 0.1)).toBe(true);
        expect(tickWorldEmitterExposure(state, 'player:a', 0.7)).toBe(true);
    });

    it('applies interaction actions and refuses actions after destruction', () => {
        const state = createWorldEmitterState(getWorldEmitterProfile('geo_steam_manifold_actuator'), { id: 'manifold:a' });
        expect(applyWorldEmitterAction(state, 'disable')).toBe(true);
        expect(state.enabled).toBe(false);
        expect(applyWorldEmitterAction(state, 'toggle')).toBe(true);
        expect(state.enabled).toBe(true);
        destroyWorldEmitterState(state);
        expect(applyWorldEmitterAction(state, 'enable')).toBe(false);
    });

    it('defines a finite interaction window for healing and cleansing foam', () => {
        const value = getWorldEmitterProfile('decon_exosuit_scrubber_station');
        expect(value.trigger).toMatchObject({ kind: 'interaction', startsEnabled: false });
        expect(value.payload).toEqual([
            expect.objectContaining({ kind: 'heal', amount: 15 }),
            expect.objectContaining({ kind: 'cleanse', amount: 10 })
        ]);
        const state = createWorldEmitterState(value, { id: 'decon:a' });
        expect(state.enabled).toBe(false);
        expect(applyWorldEmitterAction(state, 'pulse')).toBe(true);
        expect(state.phase).toBe(EMITTER_PHASE.TELEGRAPH);
        advance(state, 0.4);
        expect(state.phase).toBe(EMITTER_PHASE.ACTIVE);
        advance(state, 1);
        expect(state.phase).toBe(EMITTER_PHASE.IDLE);
    });

    it('creates stable, one-shot destruction children', () => {
        const rupture = createWorldEmitterState(getWorldEmitterProfile('prop_pipe_rupture'), { id: 'pipe:c' });
        expect(destroyWorldEmitterState(rupture)).toEqual([
            expect.objectContaining({ id: 'pipe:c:destroyed:jet:0', kind: 'jet' })
        ]);
        expect(destroyWorldEmitterState(rupture)).toEqual([]);

        const spore = createWorldEmitterState(getWorldEmitterProfile('fungal_spore_vent'), { id: 'spore:c' });
        expect(destroyWorldEmitterState(spore)).toEqual([
            expect.objectContaining({ id: 'spore:c:destroyed:pool:0', kind: 'pool', substance: 'bio_slime' })
        ]);
    });
});
