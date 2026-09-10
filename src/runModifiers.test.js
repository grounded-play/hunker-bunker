import { describe, expect, it } from 'vitest';
import {
    RUN_CARD_HISTORY_KEY,
    RUN_MODIFIER_CARDS,
    applyCampPayoutEffects,
    createRunCardState,
    drawRunCards,
    getRunCardByKey,
    mergeEffects,
    serializeRunCards
} from './runModifiers.js';

describe('run modifier cards', () => {
    it('defines the run pressure card set', () => {
        expect(RUN_MODIFIER_CARDS.map((card) => card.key)).toEqual([
            'relay_blackout',
            'spore_bloom',
            'patrol_surge',
            'ice_collapse',
            'camp_paranoia',
            'egg_instability',
            'hunter_pack',
            'sensor_ghosts',
            'grid_flicker'
        ]);
        for (const card of RUN_MODIFIER_CARDS) {
            expect(typeof card.label).toBe('string');
            expect(typeof card.blurb).toBe('string');
            expect(card.effects).toBeTruthy();
        }
    });

    it('draws 2-3 deterministic cards from a seed', () => {
        const first = drawRunCards('sprint-19-alpha').map((card) => card.key);
        const second = drawRunCards('sprint-19-alpha').map((card) => card.key);
        const other = drawRunCards('sprint-19-beta').map((card) => card.key);

        expect(first).toEqual(second);
        expect(first.length).toBeGreaterThanOrEqual(2);
        expect(first.length).toBeLessThanOrEqual(3);
        expect(other).not.toEqual(first);
    });

    it('caps world and faction pressure to one card each', () => {
        for (let i = 0; i < 40; i++) {
            const cards = drawRunCards(`cap-check-${i}`);
            expect(cards.filter((card) => card.type === 'world')).toHaveLength(cards.some((card) => card.type === 'world') ? 1 : 0);
            expect(cards.filter((card) => card.type === 'faction')).toHaveLength(cards.some((card) => card.type === 'faction') ? 1 : 0);
        }
    });

    // ROGUE-03: with world and faction capped at one each, a 3-card draw had to
    // fill its third slot from the THREAT pile -- and PATROL SURGE was the only
    // threat card in the deck. Measured before the fix: 206 of 206 three-card
    // runs contained it, and it appeared in 70.5% of all runs. No card should be
    // structurally forced.
    it('never forces a single card into every deep draw', () => {
        const appearances = new Map();
        const runs = 400;
        for (let i = 0; i < runs; i++) {
            for (const card of drawRunCards(`variety-${i}`)) {
                appearances.set(card.key, (appearances.get(card.key) ?? 0) + 1);
            }
        }
        for (const card of RUN_MODIFIER_CARDS) {
            const rate = (appearances.get(card.key) ?? 0) / runs;
            expect(rate).toBeLessThan(0.6);
            expect(rate).toBeGreaterThan(0.05);
        }
    });

    it('caps threat pressure so a run is never all threat', () => {
        for (let i = 0; i < 80; i++) {
            const cards = drawRunCards(`threat-cap-${i}`);
            expect(cards.filter((card) => card.type === 'threat').length).toBeLessThanOrEqual(2);
        }
    });

    // G10: every effect key any card promises must have a live runtime
    // consumer. Ten keys previously had none -- CAMP PARANOIA's "bond work pays
    // twice as much" and ICE COLLAPSE's "one camp needs a dig-out route" were
    // text only. Each was then either wired or removed with its blurb rewritten.
    // This guard covers the WHOLE deck, not just new cards, so the class of bug
    // cannot come back.
    //
    // A key earns its place here only with a named non-test consumer:
    //   spawnBias.patrolBias      -> director snapshot (threeGame updateBunkerDirector)
    //   spawnBias.proto           -> chunk scatter proto-spawn bias
    //   spawnBias.snailDensityMult-> snail spawn budget + roll chance
    //   spawnBias.snailSpeedMult  -> snail per-frame move step
    //   radar.rangeMult/cooldownMult -> radar pulse range and cooldown
    //   environment.blackout*     -> rolling-blackout runtime
    //   routeBlocks.landform/sealedGapCount -> applyCanyonCollapse
    //   suspicionMult             -> camp suspicion
    //   questPayMult              -> getCampQuestBondDelta (camp quest bond)
    //   biomeBias.bio             -> getBiomeKeyFromDistance BIO threshold
    //   economy.tallowMedPayMult / vesperAmmoPayMult -> applyCampPayoutEffects
    //   manifest.eggSeatRequiresNahl -> Act 2 manifest boarding check
    //   outing.propagationBlocked -> camp outing relay propagation (threeGame:12535)
    it('promises no effect key that lacks a live consumer', () => {
        const WIRED_KEYS = new Set([
            'spawnBias.patrolBias',
            'spawnBias.proto',
            'spawnBias.snailDensityMult',
            'spawnBias.snailSpeedMult',
            'radar.rangeMult',
            'radar.cooldownMult',
            'environment.blackoutPulseSeconds',
            'environment.blackoutDurationSeconds',
            'routeBlocks.landform',
            'routeBlocks.sealedGapCount',
            'suspicionMult',
            'questPayMult',
            'biomeBias.bio',
            'economy.tallowMedPayMult',
            'economy.vesperAmmoPayMult',
            'manifest.eggSeatRequiresNahl',
            'outing.propagationBlocked'
        ]);

        const promised = new Set();
        for (const card of RUN_MODIFIER_CARDS) {
            for (const [group, value] of Object.entries(card.effects)) {
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    for (const leaf of Object.keys(value)) promised.add(`${group}.${leaf}`);
                } else {
                    promised.add(group);
                }
            }
        }

        expect([...promised].filter((key) => !WIRED_KEYS.has(key))).toEqual([]);
    });

    // Each card is a bargain, not a punishment: something gets worse and
    // something gets better, so a run has a story rather than a difficulty dial.
    it('pairs a cost with a relief on every new card', () => {
        expect(getRunCardByKey('hunter_pack').effects.spawnBias.proto).toBeGreaterThan(1);
        expect(getRunCardByKey('hunter_pack').effects.radar.rangeMult).toBeGreaterThan(1);

        expect(getRunCardByKey('sensor_ghosts').effects.radar.rangeMult).toBeLessThan(1);
        expect(getRunCardByKey('sensor_ghosts').effects.spawnBias.proto).toBeLessThan(1);

        expect(getRunCardByKey('grid_flicker').effects.environment.blackoutPulseSeconds).toBeGreaterThan(0);
        expect(getRunCardByKey('grid_flicker').effects.suspicionMult).toBeLessThan(1);
    });

    it('merges nested effect objects into a consumer contract', () => {
        const effects = mergeEffects(
            { radar: { rangeMult: 0.65 }, spawnBias: { patrolBias: true } },
            { radar: { cooldownMult: 1.35 }, suspicionMult: 2 }
        );

        expect(effects).toEqual({
            radar: { rangeMult: 0.65, cooldownMult: 1.35 },
            spawnBias: { patrolBias: true },
            suspicionMult: 2
        });
    });

    it('builds a serializable run card state for UI seams', () => {
        const state = createRunCardState('ui-seed');

        expect(state.seed).toBe('ui-seed');
        expect(state.cards.length).toBeGreaterThanOrEqual(2);
        expect(serializeRunCards(state.cards)[0]).toEqual({
            key: state.cards[0].key,
            label: state.cards[0].label,
            blurb: state.cards[0].blurb
        });
    });

    it('looks up individual card definitions', () => {
        expect(getRunCardByKey('egg_instability')?.effects.manifest.eggSeatRequiresNahl).toBe(true);
        expect(getRunCardByKey('missing')).toBeNull();
    });

    it('applies spore bloom medical payout only at Tallow', () => {
        const effects = getRunCardByKey('spore_bloom')?.effects;

        expect(applyCampPayoutEffects({ med: 2, tech: 1 }, { campId: 'camp_tallow', effects })).toEqual({
            med: 4,
            tech: 1
        });
        expect(applyCampPayoutEffects({ med: 2, tech: 1 }, { campId: 'camp_vesper', effects })).toEqual({
            med: 2,
            tech: 1
        });
    });
});

describe('run-to-run repeat prevention', () => {
    function memoryStorage(initial = null) {
        const map = new Map();
        if (initial) map.set(RUN_CARD_HISTORY_KEY, JSON.stringify(initial));
        return {
            getItem: (k) => (map.has(k) ? map.get(k) : null),
            setItem: (k, v) => map.set(k, String(v)),
            removeItem: (k) => map.delete(k)
        };
    }

    // The roadmap names repeat prevention as a run-variety gap. Cards are
    // deprioritised rather than banned: banning starves a shallow deck and can
    // make a draw impossible, while deprioritising still lets a card return.
    it('pushes recently drawn cards to the back of the shuffle', () => {
        const baseline = drawRunCards('repeat-seed').map((c) => c.key);
        const avoided = drawRunCards('repeat-seed', { recentKeys: baseline }).map((c) => c.key);
        expect(avoided).not.toEqual(baseline);
    });

    it('records each draw so the next run sees different pressure', () => {
        const storage = memoryStorage();
        const first = createRunCardState('run-a', { storage });
        const stored = JSON.parse(storage.getItem(RUN_CARD_HISTORY_KEY));
        expect(stored).toEqual([first.cards.map((c) => c.key)]);

        const second = createRunCardState('run-b', { storage });
        expect(second.cards.map((c) => c.key)).not.toEqual(first.cards.map((c) => c.key));
    });

    it('keeps only the most recent draws', () => {
        const storage = memoryStorage();
        for (let i = 0; i < 6; i++) createRunCardState(`run-${i}`, { storage });
        expect(JSON.parse(storage.getItem(RUN_CARD_HISTORY_KEY)).length).toBeLessThanOrEqual(2);
    });

    // Seed reconstruction has to survive this: a bare drawRunCards(seed) and an
    // explicit empty history must both still reproduce a run exactly.
    it('keeps a seed reproducible when history is supplied explicitly', () => {
        const a = createRunCardState('fixed', { storage: memoryStorage(), recentKeys: [] });
        const b = createRunCardState('fixed', { storage: memoryStorage(), recentKeys: [] });
        expect(a.cards.map((c) => c.key)).toEqual(b.cards.map((c) => c.key));
        expect(a.cards.map((c) => c.key)).toEqual(drawRunCards('fixed').map((c) => c.key));
    });

    it('survives unreadable or absent storage', () => {
        const hostile = {
            getItem: () => { throw new Error('blocked'); },
            setItem: () => { throw new Error('blocked'); }
        };
        expect(() => createRunCardState('safe', { storage: hostile })).not.toThrow();
        expect(createRunCardState('safe', { storage: null }).cards.length).toBeGreaterThanOrEqual(2);
    });
});

describe('newly wired effect consumers', () => {
    // G10 fix: these keys previously had no runtime consumer. Each now has one,
    // and each is proven here at the seam that actually applies it.
    it('doubles Vesper ammunition payouts under PATROL SURGE', () => {
        const effects = getRunCardByKey('patrol_surge').effects;

        expect(applyCampPayoutEffects({ ammo: 5, tech: 2 }, { campId: 'camp_vesper', effects }))
            .toEqual({ ammo: 10, tech: 2 });
        // Other camps are untouched -- the card names Vesper specifically.
        expect(applyCampPayoutEffects({ ammo: 5, tech: 2 }, { campId: 'camp_tallow', effects }))
            .toEqual({ ammo: 5, tech: 2 });
    });

    it('keeps Tallow and Vesper payout levers independent', () => {
        const tallow = getRunCardByKey('spore_bloom').effects;
        expect(applyCampPayoutEffects({ med: 3, ammo: 4 }, { campId: 'camp_tallow', effects: tallow }))
            .toEqual({ med: 6, ammo: 4 });
        expect(applyCampPayoutEffects({ med: 3, ammo: 4 }, { campId: 'camp_vesper', effects: tallow }))
            .toEqual({ med: 3, ammo: 4 });
    });

    it('leaves payouts alone when no economy card is active', () => {
        expect(applyCampPayoutEffects({ med: 3, ammo: 4 }, { campId: 'camp_vesper', effects: {} }))
            .toEqual({ med: 3, ammo: 4 });
    });
});
