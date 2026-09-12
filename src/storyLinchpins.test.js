import { describe, expect, it } from 'vitest';
import {
    STORY_LINCHPINS,
    NEVER_LOCKED_ENDINGS,
    getResolution,
    collectLockedEndings,
    applyLinchpinResolution,
    normalizeLinchpins
} from './storyLinchpins.js';
import { ACT2_ENDINGS } from './act2Endings.js';

describe('STORY_LINCHPINS registry', () => {
    it('only ever locks endings that actually exist', () => {
        // A typo here silently does nothing, which is the worst failure mode:
        // the choice appears to matter and quietly does not.
        const valid = new Set(Object.values(ACT2_ENDINGS));
        for (const [id, def] of Object.entries(STORY_LINCHPINS)) {
            for (const [name, res] of Object.entries(def.resolutions)) {
                for (const ending of res.locksEndings ?? []) {
                    expect(valid.has(ending), `${id}.${name} locks unknown ending ${ending}`).toBe(true);
                }
            }
        }
    });

    it('never lets a linchpin lock the fallback ending', () => {
        for (const def of Object.values(STORY_LINCHPINS)) {
            for (const res of Object.values(def.resolutions)) {
                for (const ending of res.locksEndings ?? []) {
                    expect(NEVER_LOCKED_ENDINGS).not.toHaveLength(0);
                    expect(NEVER_LOCKED_ENDINGS.includes(ending)).toBe(false);
                }
            }
        }
    });

    it('leaves at least one ending reachable under every combination of locks', () => {
        // The soft-lock guard. A consequence system that can close every door
        // is a bug generator, not a narrative device.
        const ids = Object.keys(STORY_LINCHPINS);
        const optionsPer = ids.map((id) => [null, ...Object.keys(STORY_LINCHPINS[id].resolutions)]);
        const combos = optionsPer.reduce(
            (acc, opts) => acc.flatMap((prefix) => opts.map((o) => [...prefix, o])),
            [[]]
        );
        const allEndings = Object.values(ACT2_ENDINGS);
        for (const combo of combos) {
            const record = {};
            combo.forEach((choice, i) => { if (choice) record[ids[i]] = choice; });
            const locked = collectLockedEndings(record);
            const reachable = allEndings.filter((e) => !locked.includes(e));
            expect(reachable.length, `no ending reachable for ${JSON.stringify(record)}`).toBeGreaterThan(0);
        }
    });
});

describe('normalizeLinchpins', () => {
    it('defaults missing state to an empty record', () => {
        expect(normalizeLinchpins(undefined)).toEqual({});
        expect(normalizeLinchpins(null)).toEqual({});
    });

    it('drops unknown linchpin ids and unknown resolutions', () => {
        // A save written by a later build must not put an older build into a
        // state its cascade cannot interpret.
        const out = normalizeLinchpins({
            mayor_tina: 'killed',
            future_thing: 'whatever',
            mayor_tina_typo: 'killed'
        });
        expect(out).toEqual({ mayor_tina: 'killed' });
    });

    it('drops a known id carrying an invalid resolution', () => {
        expect(normalizeLinchpins({ mayor_tina: 'exploded' })).toEqual({});
    });
});

describe('collectLockedEndings', () => {
    it('is empty with no resolutions', () => {
        expect(collectLockedEndings({})).toEqual([]);
    });

    it('accumulates locks and never duplicates', () => {
        const locked = collectLockedEndings({ mayor_tina: 'killed' });
        expect(locked.length).toBeGreaterThan(0);
        expect(new Set(locked).size).toBe(locked.length);
    });

    it('reflects the resolution actually taken', () => {
        const killed = collectLockedEndings({ mayor_tina: 'killed' });
        const joined = collectLockedEndings({ mayor_tina: 'joined' });
        expect(killed).not.toEqual(joined);
        expect(joined).toContain(ACT2_ENDINGS.CLEAN_ESCAPE);
        expect(killed).toContain(ACT2_ENDINGS.ALIEN_EXODUS);
    });
});

describe('applyLinchpinResolution', () => {
    function fakeManager() {
        return {
            state: { linchpins: {} },
            humanity: 0,
            bonds: [],
            getState() { return this.state; },
            adjustHumanity(d) { this.humanity += d; },
            adjustCampBond(id, d) { this.bonds.push([id, d]); },
            campIds: ['camp_meridian', 'camp_tallow', 'camp_vesper'],
            save() { this.saved = (this.saved ?? 0) + 1; }
        };
    }

    it('records the resolution and applies its deltas', () => {
        const m = fakeManager();
        expect(applyLinchpinResolution(m, 'mayor_tina', 'killed')).toBe(true);
        expect(m.state.linchpins.mayor_tina).toBe('killed');
        expect(m.humanity).toBe(STORY_LINCHPINS.mayor_tina.resolutions.killed.humanity);
        expect(m.bonds).toHaveLength(3);
    });

    it('is write-once: a repeat is a no-op and does not double the deltas', () => {
        // Without this a re-triggered encounter silently drifts standing.
        const m = fakeManager();
        applyLinchpinResolution(m, 'mayor_tina', 'killed');
        const humanityAfterFirst = m.humanity;
        expect(applyLinchpinResolution(m, 'mayor_tina', 'killed')).toBe(false);
        expect(applyLinchpinResolution(m, 'mayor_tina', 'joined')).toBe(false);
        expect(m.humanity).toBe(humanityAfterFirst);
        expect(m.state.linchpins.mayor_tina).toBe('killed');
    });

    it('refuses unknown linchpins and unknown resolutions', () => {
        const m = fakeManager();
        expect(applyLinchpinResolution(m, 'nope', 'killed')).toBe(false);
        expect(applyLinchpinResolution(m, 'mayor_tina', 'nope')).toBe(false);
        expect(m.state.linchpins).toEqual({});
    });

    it('tolerates a manager missing optional mutators', () => {
        const bare = { state: { linchpins: {} }, getState() { return this.state; } };
        expect(() => applyLinchpinResolution(bare, 'mayor_tina', 'killed')).not.toThrow();
        expect(bare.state.linchpins.mayor_tina).toBe('killed');
    });
});

describe('getResolution', () => {
    it('returns null for anything unknown', () => {
        expect(getResolution('nope', 'killed')).toBeNull();
        expect(getResolution('mayor_tina', 'nope')).toBeNull();
    });
});
