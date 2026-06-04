import { describe, it, expect, vi } from 'vitest';
import { TERMINAL_EVENTS, getTerminalEventById, pickTerminalEvent } from './terminalEvents.js';

describe('terminalEvents', () => {
    it('every event is well-formed (id, title, body, choices with effects)', () => {
        expect(TERMINAL_EVENTS.length).toBeGreaterThanOrEqual(3);
        for (const e of TERMINAL_EVENTS) {
            expect(typeof e.id).toBe('string');
            expect(typeof e.title).toBe('string');
            expect(typeof e.body).toBe('string');
            expect(e.choices.length).toBeGreaterThanOrEqual(2);
            for (const c of e.choices) {
                expect(typeof c.label).toBe('string');
                expect(typeof c.effect).toBe('function');
            }
        }
        // At least one choice per event is a risky-now/dangerous-later tradeoff.
        for (const e of TERMINAL_EVENTS) {
            expect(e.choices.some((c) => c.tone === 'risk')).toBe(true);
        }
    });

    it('getTerminalEventById finds and misses correctly', () => {
        expect(getTerminalEventById('o2_reroute')?.id).toBe('o2_reroute');
        expect(getTerminalEventById('nope')).toBeNull();
    });

    it('pickTerminalEvent is deterministic with an injected RNG', () => {
        const first = pickTerminalEvent(() => 0);
        expect(first).toBe(TERMINAL_EVENTS[0]);
        const last = pickTerminalEvent(() => 0.999);
        expect(last).toBe(TERMINAL_EVENTS[TERMINAL_EVENTS.length - 1]);
    });

    it('pickTerminalEvent respects biome filtering', () => {
        const none = pickTerminalEvent(() => 0, { biome: 'void-not-tagged' });
        expect(none).toBeNull();
        const active = pickTerminalEvent(() => 0, { biome: 'active' });
        expect(active?.biomeTags).toContain('active');
    });

    it('effects call guarded game methods and never throw on a bare game', () => {
        const game = {
            adjustOxygen: vi.fn(),
            spawnPatrolNearPlayer: vi.fn()
        };
        const restore = getTerminalEventById('o2_reroute').choices[0];
        expect(() => restore.effect(game)).not.toThrow();
        expect(game.adjustOxygen).toHaveBeenCalledWith(45);
        expect(game.spawnPatrolNearPlayer).toHaveBeenCalled();
        // A choice with missing methods must not throw (optional chaining).
        expect(() => getTerminalEventById('loot_cache').choices[0].effect({})).not.toThrow();
    });
});
