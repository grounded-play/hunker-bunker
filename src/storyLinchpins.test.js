import { describe, expect, it } from 'vitest';
import {
    STORY_LINCHPINS,
    NEVER_LOCKED_ENDINGS,
    getResolution,
    collectLockedEndings,
    applyLinchpinResolution,
    normalizeLinchpins,
    resolveCampLeaderLinchpin,
    resolveHiveAllyLinchpin
} from './storyLinchpins.js';
import { ACT2_ENDINGS } from './act2Endings.js';
import { Act2Manager } from './act2.js';

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

    it('persists against the real manager whose getState returns a snapshot', () => {
        const values = new Map();
        const storage = {
            getItem: (key) => values.get(key) ?? null,
            setItem: (key, value) => values.set(key, value)
        };
        const manager = new Act2Manager({ storage });
        expect(applyLinchpinResolution(manager, 'mayor_tina', 'killed')).toBe(true);
        expect(manager.getState().linchpins).toEqual({ mayor_tina: 'killed' });

        const reloaded = new Act2Manager({ storage });
        expect(reloaded.getState().linchpins).toEqual({ mayor_tina: 'killed' });
    });
});

describe('getResolution', () => {
    it('returns null for anything unknown', () => {
        expect(getResolution('nope', 'killed')).toBeNull();
        expect(getResolution('mayor_tina', 'nope')).toBeNull();
    });
});

describe('resolveCampLeaderLinchpin', () => {
    it.each([
        ['TANK', 'recruit', 'briggs_oath', 'honored'],
        ['SCOUT', 'cull', 'martha_beacon', 'silenced'],
        ['ENGINEER', 'warn', 'kaelen_manifest', 'disclosed'],
        ['ENGINEER', 'latent', 'kaelen_manifest', 'falsified']
    ])('turns %s %s into a persistent leader outcome', (classId, action, id, resolution) => {
        const manager = {
            state: { linchpins: {}, camps: [] },
            getState() { return this.state; },
            adjustHumanity() {},
            adjustCampBond() {},
            save() {}
        };
        expect(resolveCampLeaderLinchpin(manager, classId, action)).toBe(true);
        expect(manager.state.linchpins[id]).toBe(resolution);
    });

    it('ignores non-terminal conversation and unknown leaders', () => {
        const manager = { state: { linchpins: {} }, getState() { return this.state; } };
        expect(resolveCampLeaderLinchpin(manager, 'SCOUT', 'talk')).toBe(false);
        expect(resolveCampLeaderLinchpin(manager, 'MEDIC', 'recruit')).toBe(false);
        expect(manager.state.linchpins).toEqual({});
    });
});

describe('resolveHiveAllyLinchpin', () => {
    it.each([
        ['hive_suture', 'cure', 'suture_host_mercy', 'cured_human'],
        ['hive_suture', 'symbiosis', 'suture_host_mercy', 'symbiotic_carrier'],
        ['hive_relay', 'jam', 'relay_chorus', 'jammed_camps'],
        ['hive_relay', 'bridge', 'relay_chorus', 'bridge_synapse'],
        ['hive_carapace', 'queen', 'carapace_oath', 'shield_queen'],
        ['hive_carapace', 'operator', 'carapace_oath', 'shield_operator']
    ])('resolves %s %s to %s:%s', (hiveId, choice, linchpinId, resolution) => {
        const manager = {
            state: { linchpins: {}, camps: [] },
            getState() { return this.state; },
            adjustHumanity() {},
            adjustCampBond() {},
            save() {}
        };
        expect(resolveHiveAllyLinchpin(manager, hiveId, choice)).toBe(true);
        expect(manager.state.linchpins[linchpinId]).toBe(resolution);
    });

    it('rejects invalid hives or unknown choices', () => {
        const manager = { state: { linchpins: {} }, getState() { return this.state; } };
        expect(resolveHiveAllyLinchpin(manager, 'hive_unknown', 'cure')).toBe(false);
        expect(resolveHiveAllyLinchpin(manager, 'hive_suture', 'invalid_choice')).toBe(false);
        expect(manager.state.linchpins).toEqual({});
    });
});


describe('ending reachability under a full playthrough', () => {
    /**
     * The exhaustive test above proves at least one ending always survives.
     * That is the soft-lock guard, and it is not the same question as "can a
     * player still get this ending".
     *
     * A player who meets every linchpin resolves all of them. If an ending is
     * locked by one side of enough separate linchpins, threading the needle on
     * every single one becomes the only path to it -- reachable on paper,
     * unreachable in practice, and the game says nothing.
     */
    const ids = Object.keys(STORY_LINCHPINS);
    const fullPlaythroughs = ids
        .map((id) => Object.keys(STORY_LINCHPINS[id].resolutions))
        .reduce((acc, opts) => acc.flatMap((p) => opts.map((o) => [...p, o])), [[]]);

    function survivalRates() {
        const all = Object.values(ACT2_ENDINGS);
        const open = Object.fromEntries(all.map((e) => [e, 0]));
        for (const combo of fullPlaythroughs) {
            const record = Object.fromEntries(combo.map((r, i) => [ids[i], r]));
            const locked = collectLockedEndings(record);
            for (const e of all) if (!locked.includes(e)) open[e] += 1;
        }
        return Object.fromEntries(
            Object.entries(open).map(([e, n]) => [e, n / fullPlaythroughs.length])
        );
    }

    it('never leaves a full playthrough with only the fallback', () => {
        const all = Object.values(ACT2_ENDINGS);
        for (const combo of fullPlaythroughs) {
            const record = Object.fromEntries(combo.map((r, i) => [ids[i], r]));
            const open = all.filter((e) => !collectLockedEndings(record).includes(e));
            expect(open.length, `only ${open} left for ${JSON.stringify(record)}`).toBeGreaterThan(1);
        }
    });

    it('keeps every ending reachable by some full playthrough', () => {
        const rates = survivalRates();
        const dead = Object.entries(rates).filter(([, r]) => r === 0).map(([e]) => e);
        expect(dead, `unreachable after every linchpin is resolved: ${dead}`).toEqual([]);
    });

    /**
     * Recorded survival counts, as of 9 linchpins / 512 full playthroughs.
     *
     * This is a snapshot, not a target. It exists so that adding or retuning a
     * linchpin cannot quietly change how findable an ending is: if these move,
     * the test fails and whoever moved them has to decide on purpose.
     *
     * The number worth arguing about is clean_escape at 2/512. Eight of the
     * nine linchpins lock it on one side each, so reaching it means threading
     * every one of them correctly. That may well be right -- a clean escape
     * from this game should be close to impossible -- but at 0.4% with no
     * in-game signposting, effectively no player will ever see it, and none
     * will understand why. Documented in
     * docs/design/arching-storyline-and-endings.md.
     */
    const SURVIVAL_BASELINE = {
        clean_escape: 2,
        full_brood: 16,
        mothership_infection: 16,
        alien_exodus: 16,
        scorched_sky: 128,
        carriers_bargain: 256,
        outed_escape: 256,
        mixed_crew: 512,
        failed_carrier: 512,
        empty_husk: 512
    };

    it('matches the recorded reachability baseline', () => {
        const rates = survivalRates();
        const actual = Object.fromEntries(
            Object.entries(rates).map(([e, r]) => [e, Math.round(r * fullPlaythroughs.length)])
        );
        expect(actual).toEqual(SURVIVAL_BASELINE);
    });
});
