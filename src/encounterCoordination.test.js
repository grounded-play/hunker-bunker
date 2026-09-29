import { describe, expect, it, vi } from 'vitest';
import {
    CLASS_ROLE_COUNTERPLAY,
    ENCOUNTER_ROLES,
    FORMATION_STATES,
    ROLE_TELEGRAPHS,
    coordinateEncounter,
    counterplayFor,
    createEncounterCoordinator,
    encounterDamageMultiplier,
    encounterHasOrphanedTimers,
    reconcileEncounterStatuses
} from './encounterCoordination.js';

const MEMBERS = [
    { id: 'a', type: 'cybersnail', role: 'anchor' },
    { id: 's', type: 'sentinel', role: 'suppressor' },
    { id: 'f', type: 'crawler', role: 'flanker' },
    { id: 'c', type: 'cryosnail', role: 'controller' },
    { id: 'u', type: 'sporesnail', role: 'support' }
];

const fresh = (seed = 17) => createEncounterCoordinator({
    encounterId: 'test-encounter', recipeId: 'test-recipe', seed, members: MEMBERS
});

describe('pure encounter coordination', () => {
    it('is deterministic and gives every role an audio-plus-visual telegraph before attack', () => {
        let left = fresh(991);
        let right = fresh(991);
        const leftEvents = [];
        const rightEvents = [];
        for (let index = 0; index < 160; index += 1) {
            const a = coordinateEncounter(left, { type: 'TICK', delta: 0.1 });
            const b = coordinateEncounter(right, { type: 'TICK', delta: 0.1 });
            left = a.state;
            right = b.state;
            leftEvents.push(...a.events);
            rightEvents.push(...b.events);
        }
        expect(left).toEqual(right);
        expect(leftEvents).toEqual(rightEvents);
        for (const role of ENCOUNTER_ROLES) {
            const telegraph = leftEvents.find((event) => event.type === 'role-telegraph' && event.role === role);
            const attack = leftEvents.find((event) => event.type === 'role-attack' && event.role === role);
            expect(telegraph, role).toMatchObject({ audio: expect.any(Object), visual: expect.any(Object) });
            expect(telegraph.audio.cue, role).toBeTruthy();
            expect(telegraph.visual.kind, role).toBeTruthy();
            expect(attack.sequence, role).toBeGreaterThan(telegraph.sequence);
            expect(ROLE_TELEGRAPHS[role].windup, role).toBeGreaterThan(0);
        }
    });

    it('moves monotonically intact -> staggered -> broken -> cleared and drops all timers', () => {
        let state = fresh();
        let result = coordinateEncounter(state, { type: 'MEMBER_STAGGERED', memberId: 'a' });
        state = result.state;
        expect(state.formationState).toBe(FORMATION_STATES.STAGGERED);

        result = coordinateEncounter(state, { type: 'MEMBER_DEFEATED', memberId: 's' });
        state = result.state;
        expect(state.formationState).toBe(FORMATION_STATES.BROKEN);
        expect(state.roleTimers).toEqual({});
        expect(encounterHasOrphanedTimers(state)).toBe(false);

        result = coordinateEncounter(state, { type: 'CLEAR' });
        state = result.state;
        expect(state.formationState).toBe(FORMATION_STATES.CLEARED);
        expect(state.roleTimers).toEqual({});
        expect(encounterHasOrphanedTimers(state)).toBe(false);
        expect(coordinateEncounter(state, { type: 'TICK', delta: 999 })).toEqual({ state, events: [] });
    });

    it('does not skip states when a critical member dies before a stagger', () => {
        const result = coordinateEncounter(fresh(), { type: 'MEMBER_DEFEATED', memberId: 'a' });
        expect(result.events.map((event) => event.formationState)).toEqual(['staggered', 'broken']);
        expect(result.state.formationState).toBe('broken');
    });

    it('reads Lane 3 statuses, weakens protection, and never writes status state', () => {
        const targets = new Map(MEMBERS.map((member) => [member.id, { id: member.id }]));
        const getStatus = vi.fn((target, statusId) => ({
            active: target.id === 'a' && statusId === 'freeze',
            stacks: target.id === 'a' && statusId === 'freeze' ? 100 : 0
        }));
        const before = structuredClone([...targets.values()]);
        const result = reconcileEncounterStatuses(fresh(), targets, getStatus);
        expect(result.state.formationState).toBe('staggered');
        expect(result.state.members.find((member) => member.id === 'a').frozen).toBe(true);
        expect([...targets.values()]).toEqual(before);
        expect(getStatus).toHaveBeenCalled();
        expect(encounterDamageMultiplier(result.state, 's')).toBe(1);
    });

    it('does not break formation for partial chill stacks', () => {
        const targets = new Map(MEMBERS.map((member) => [member.id, { id: member.id }]));
        const result = reconcileEncounterStatuses(fresh(), targets, (_target, statusId) => (
            statusId === 'freeze'
                ? { active: true, stacks: 34, isFrozen: false }
                : { active: false }
        ));
        expect(result.state.formationState).toBe(FORMATION_STATES.INTACT);
        expect(result.events).toEqual([]);
    });

    it('documents a counterplay for every class against every role', () => {
        for (const playerClass of ['SCOUT', 'TANK', 'ENGINEER']) {
            expect(Object.keys(CLASS_ROLE_COUNTERPLAY[playerClass]).sort()).toEqual([...ENCOUNTER_ROLES].sort());
            for (const role of ENCOUNTER_ROLES) expect(counterplayFor(playerClass, role), `${playerClass}/${role}`).toBeTruthy();
        }
    });
});
