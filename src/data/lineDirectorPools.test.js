import { describe, it, expect } from 'vitest';
import { DIRECTOR_AMBIENT_LINES, MOTHERSHIP_REACTIVE_LINES } from './lineDirectorPools.js';

function checkPoolIntegrity(pool) {
    const ids = new Set();
    for (const line of pool) {
        expect(typeof line.id).toBe('string');
        expect(line.id.length).toBeGreaterThan(0);
        expect(ids.has(line.id)).toBe(false);
        ids.add(line.id);
        expect(typeof line.text === 'string' || typeof line.template === 'function').toBe(true);
        expect(line.tags).toBeTruthy();
    }
}

describe('DIRECTOR_AMBIENT_LINES', () => {
    it('has no duplicate ids and every line has text or a template', () => {
        checkPoolIntegrity(DIRECTOR_AMBIENT_LINES);
    });

    it('covers all three registers with at least the original 8-line count per register', () => {
        for (const register of ['corporate', 'glitched', 'reverent']) {
            const count = DIRECTOR_AMBIENT_LINES.filter((l) => l.register === register).length;
            expect(count).toBeGreaterThanOrEqual(4);
        }
    });

    it('is ambient (eventTrigger null) for every line', () => {
        for (const line of DIRECTOR_AMBIENT_LINES) {
            expect(line.tags.eventTrigger ?? null).toBeNull();
            expect(line.tags.directorActions?.length).toBeGreaterThan(0);
        }
    });

    it('has reality-matched lines for every Director lever in every voice register', () => {
        for (const register of ['corporate', 'glitched', 'reverent']) {
            for (const action of ['patrol', 'lightsout', 'corrupt', 'taunt']) {
                expect(DIRECTOR_AMBIENT_LINES.some((line) => (
                    line.register === register && line.tags.directorActions.includes(action)
                ))).toBe(true);
            }
        }
    });

    it('tags the depth-callout line to only fire at depth tier 2+', () => {
        const line = DIRECTOR_AMBIENT_LINES.find((l) => l.id === 'director_depth_disapproval');
        expect(line).toBeTruthy();
        expect(line.tags.depthTier?.min).toBeGreaterThanOrEqual(2);
    });
});

describe('MOTHERSHIP_REACTIVE_LINES', () => {
    it('has no duplicate ids and every line has text or a template', () => {
        checkPoolIntegrity(MOTHERSHIP_REACTIVE_LINES);
    });

    it('tags every line with its matching mothership: eventTrigger and once:true', () => {
        for (const line of MOTHERSHIP_REACTIVE_LINES) {
            expect(line.tags.eventTrigger).toMatch(/^mothership:/);
            expect(line.tags.once).toBe(true);
            expect(line.tags.cooldownClass).toBe('mothership_reactive');
        }
    });

    it('marks the three critical triggers to bypass the shared cooldown', () => {
        const criticalIds = ['mothership_hp_critical', 'mothership_objective_found', 'mothership_first_boss'];
        for (const id of criticalIds) {
            const line = MOTHERSHIP_REACTIVE_LINES.find((l) => l.id === id);
            expect(line).toBeTruthy();
            expect(line.tags.bypassSharedCooldown).toBe(true);
        }
    });
});
