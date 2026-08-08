import { describe, it, expect } from 'vitest';
import { LineDirector } from './lineDirector.js';

describe('LineDirector', () => {
    it('returns null for an empty pool', () => {
        const d = new LineDirector();
        expect(d.requestLine('ambient', {}, [])).toBeNull();
    });

    it('filters by register', () => {
        const d = new LineDirector();
        const pool = [
            { id: 'a', register: 'corporate', text: 'corp line', tags: {} },
            { id: 'b', register: 'glitched', text: 'glitch line', tags: {} }
        ];
        expect(d.requestLine('ambient', { register: 'glitched' }, pool).id).toBe('b');
    });

    it('separates ambient lines from event-triggered lines', () => {
        const d = new LineDirector();
        const pool = [
            { id: 'ambient1', text: 'ambient', tags: { eventTrigger: null } },
            { id: 'evt1', text: 'event', tags: { eventTrigger: 'mothership:first_kill' } }
        ];
        expect(d.requestLine('mothership:first_kill', {}, pool).id).toBe('evt1');
        expect(d.requestLine('ambient', {}, pool).id).toBe('ambient1');
    });

    it('filters by depth tier range', () => {
        const d = new LineDirector();
        const pool = [{ id: 'deep', text: 'deep line', tags: { depthTier: { min: 2 } } }];
        expect(d.requestLine('ambient', { depthTier: 1 }, pool)).toBeNull();
        expect(d.requestLine('ambient', { depthTier: 2 }, pool).id).toBe('deep');
    });

    it('filters by danger range', () => {
        const d = new LineDirector();
        const pool = [{ id: 'calm', text: 'calm line', tags: { danger: { max: 0.6 } } }];
        expect(d.requestLine('ambient', { danger: 0.9 }, pool)).toBeNull();
        expect(d.requestLine('ambient', { danger: 0.1 }, pool).id).toBe('calm');
    });

    it('fires a "once" line exactly one time ever', () => {
        const d = new LineDirector();
        const pool = [{ id: 'once1', text: 'once line', tags: { once: true } }];
        expect(d.requestLine('ambient', {}, pool).id).toBe('once1');
        expect(d.requestLine('ambient', {}, pool)).toBeNull();
    });

    it('gates a shared cooldown class across different line ids, until the class cooldown elapses', () => {
        const d = new LineDirector();
        const x = { id: 'x', text: 'x', tags: { cooldownClass: 'shared', cooldownSeconds: 45 } };
        const y = { id: 'y', text: 'y', tags: { cooldownClass: 'shared', cooldownSeconds: 45 } };
        expect(d.requestLine('ambient', {}, [x]).id).toBe('x');
        expect(d.requestLine('ambient', {}, [y])).toBeNull();
        d.tick(46);
        expect(d.requestLine('ambient', {}, [y]).id).toBe('y');
    });

    it('lets bypassSharedCooldown lines ignore their class cooldown (critical events)', () => {
        const d = new LineDirector();
        const shared = { id: 'x', text: 'x', tags: { cooldownClass: 'shared', cooldownSeconds: 45 } };
        const critical = { id: 'crit', text: 'crit', tags: { cooldownClass: 'shared', cooldownSeconds: 45, bypassSharedCooldown: true } };
        expect(d.requestLine('ambient', {}, [shared]).id).toBe('x');
        expect(d.requestLine('ambient', {}, [critical]).id).toBe('crit');
    });

    it('suppresses the same line from repeating within minRepeatSeconds, but allows a different eligible line', () => {
        const d = new LineDirector();
        const pool = [
            { id: 'a', text: 'a', tags: { minRepeatSeconds: 100 } },
            { id: 'b', text: 'b', tags: { minRepeatSeconds: 100 } }
        ];
        expect(d.requestLine('ambient', {}, pool, () => 0).id).toBe('a');
        expect(d.requestLine('ambient', {}, pool, () => 0).id).toBe('b');
        expect(d.requestLine('ambient', {}, pool)).toBeNull();
        d.tick(101);
        expect(d.requestLine('ambient', {}, pool, () => 0).id).toBe('a');
    });

    it('scores an objective-matched line above a generic same-weight line', () => {
        const d = new LineDirector();
        const pool = [
            { id: 'generic', text: 'generic', tags: {} },
            { id: 'onTopic', text: 'on topic', tags: { objectiveSources: ['black-box'] } }
        ];
        expect(d.requestLine('ambient', { objectiveSource: 'black-box' }, pool).id).toBe('onTopic');
    });

    it('excludes an objective-tagged line entirely when the objective does not match', () => {
        const d = new LineDirector();
        const pool = [{ id: 'onTopic', text: 'on topic', tags: { objectiveSources: ['black-box'] } }];
        expect(d.requestLine('ambient', { objectiveSource: 'camp-quest' }, pool)).toBeNull();
    });

    it('only selects announcements that match the Director action that happened', () => {
        const d = new LineDirector();
        const pool = [
            { id: 'patrol', text: 'hostiles inbound', tags: { directorActions: ['patrol'] } },
            { id: 'lights', text: 'lights disabled', tags: { directorActions: ['lightsout'] } }
        ];

        expect(d.requestLine('ambient', { directorAction: 'patrol' }, pool).id).toBe('patrol');
        expect(d.requestLine('ambient', { directorAction: 'corrupt' }, pool)).toBeNull();
    });

    it('evaluates a template function against context instead of using a static text field', () => {
        const d = new LineDirector();
        const pool = [{ id: 'tmpl', template: (ctx) => `depth is ${ctx.depthTier}`, tags: {} }];
        expect(d.requestLine('ambient', { depthTier: 3 }, pool).text).toBe('depth is 3');
    });

    it('reset() clears history and cooldowns so a line can fire again', () => {
        const d = new LineDirector();
        const pool = [{ id: 'once1', text: 'once', tags: { once: true } }];
        expect(d.requestLine('ambient', {}, pool)).not.toBeNull();
        d.reset();
        expect(d.requestLine('ambient', {}, pool)).not.toBeNull();
    });

    it('enforces a global minimum gap between ANY two lines regardless of cooldownClass, unless bypassed', () => {
        const d = new LineDirector({ globalMinGapSeconds: 8 });
        const poolA = [{ id: 'a', text: 'a', tags: { cooldownClass: 'classA' } }];
        const poolB = [{ id: 'b', text: 'b', tags: { cooldownClass: 'classB' } }];
        const critical = [{ id: 'crit', text: 'crit', tags: { cooldownClass: 'classB', bypassSharedCooldown: true } }];

        expect(d.requestLine('ambient', {}, poolA).id).toBe('a');
        // different pool, different class, but within the global gap -> blocked
        expect(d.requestLine('ambient', {}, poolB)).toBeNull();
        // a bypassSharedCooldown line still gets through the global gap
        expect(d.requestLine('ambient', {}, critical).id).toBe('crit');

        d.tick(9);
        expect(d.requestLine('ambient', {}, poolB).id).toBe('b');
    });

    it('defaults globalMinGapSeconds to 0 (disabled) when not configured', () => {
        const d = new LineDirector();
        const poolA = [{ id: 'a', text: 'a', tags: {} }];
        const poolB = [{ id: 'b', text: 'b', tags: {} }];
        expect(d.requestLine('ambient', {}, poolA).id).toBe('a');
        expect(d.requestLine('ambient', {}, poolB).id).toBe('b');
    });
});
