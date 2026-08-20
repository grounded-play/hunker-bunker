import { describe, expect, it } from 'vitest';
import {
    DROP_RARITIES,
    SUIT_RELICS,
    WEAPON_OVERCLOCKS,
    TRANSFORMATIVE_RELIC_IDS,
    computeActiveSynergies,
    rollEnemyLootDrop,
    applyLastBreathDamage,
    applyPuncturedLungCapacity,
    applyPuncturedLungKillO2,
    applyParasiticMagazineKill,
    applyFalseTelemetryAggroDrop,
    getCryoBreachChainFreezeRadius,
    getScrapCyclerReloadEffect,
    getVesperDoctrineReloadEffect
} from './runDrops.js';

describe('runDrops', () => {
    it('returns null when random roll exceeds drop chance for standard enemy', () => {
        const mockRandom = () => 0.95;
        const drop = rollEnemyLootDrop(mockRandom, { isElite: false, isBoss: false });
        expect(drop).toBeNull();
    });

    it('always drops item for bosses with mythic/corrupted bias', () => {
        const mockRandomHigh = () => 0.1;
        const dropHigh = rollEnemyLootDrop(mockRandomHigh, { isBoss: true });
        expect(dropHigh).not.toBeNull();
        expect([DROP_RARITIES.MYTHIC, DROP_RARITIES.CORRUPTED]).toContain(dropHigh.rarity);
    });

    // docs/design/one-more-ring-design-pillars.md item 1 (Sprint 28 Lane A):
    // rareRelicChance biases this roll toward the relic half of the pool at
    // a given rarity, not just a higher rarity floor -- rarity and item-type
    // (overclock vs relic) were previously unrelated axes.
    describe('rollEnemyLootDrop ring bias (Depth Contract wiring)', () => {
        function sequence(values) {
            let i = 0;
            return () => values[Math.min(i++, values.length - 1)];
        }

        it('defaults to ring 1 (no bias) when ring is omitted -- identical to pre-wiring behavior', () => {
            // roll1: chance, roll2: rarity->RARE, roll3: would-be rareRelic
            // roll (irrelevant at ring 1, rollsRareRelic always false), roll4: pool index
            const withoutRing = rollEnemyLootDrop(sequence([0.05, 0.05, 0.5, 0.5]));
            const withRing1 = rollEnemyLootDrop(sequence([0.05, 0.05, 0.5, 0.5]), { ring: 1 });
            expect(withoutRing?.id).toBe(withRing1?.id);
        });

        it('narrows the pool to relics only when rollsRareRelic hits and a relic exists at this rarity', () => {
            const relicIds = new Set(SUIT_RELICS.filter((i) => i.rarity === DROP_RARITIES.RARE).map((i) => i.id));
            expect(relicIds.size).toBeGreaterThan(0); // sanity: fixture assumption holds
            // roll1: chance (0.05 < 0.12), roll2: rarity roll 0.05 < 0.1 -> RARE,
            // roll3: rareRelic roll 0.01 < ring 3's 0.12 rareRelicChance -> true,
            // roll4: pool index 0 (first item in the narrowed relics-only pool)
            const drop = rollEnemyLootDrop(sequence([0.05, 0.05, 0.01, 0]), { ring: 3 });
            expect(drop).not.toBeNull();
            expect(drop.rarity).toBe(DROP_RARITIES.RARE);
            expect(relicIds.has(drop.id)).toBe(true);
        });

        it('does not narrow the pool when rollsRareRelic misses, even at a deep ring', () => {
            // roll3 (0.99) is well above ring 5's 0.3 rareRelicChance -> rollsRareRelic
            // false -> pool stays the full RARE-tier mix (overclocks + relics), so the
            // pool-index roll (0, first item) should be a WEAPON_OVERCLOCKS entry, the
            // same as it would be without any Depth Contract involvement at all.
            const drop = rollEnemyLootDrop(sequence([0.05, 0.05, 0.99, 0]), { ring: 5 });
            const unbiasedPool = [...WEAPON_OVERCLOCKS, ...SUIT_RELICS].filter((i) => i.rarity === DROP_RARITIES.RARE);
            expect(drop?.id).toBe(unbiasedPool[0].id);
        });
    });

    it('computes superconductor arc synergy when cryo and tesla items are equipped', () => {
        const cryoItem = WEAPON_OVERCLOCKS.find((item) => item.element === 'cryo');
        const teslaItem = SUIT_RELICS.find((item) => item.element === 'tesla');
        const synergies = computeActiveSynergies([cryoItem, teslaItem]);
        expect(synergies).toHaveLength(1);
        expect(synergies[0].id).toBe('superconductor');
    });

    it('returns empty synergies if elements do not match combination criteria', () => {
        const synergies = computeActiveSynergies([]);
        expect(synergies).toHaveLength(0);
    });

    it('contains alien bio-relics (pheromone_aura, chitin_membrane, synapse_pulse)', () => {
        const ids = SUIT_RELICS.map((r) => r.id);
        expect(ids).toContain('pheromone_aura');
        expect(ids).toContain('chitin_membrane');
        expect(ids).toContain('synapse_pulse');
    });

    // docs/design/one-more-ring-design-pillars.md item 2: transformative
    // relics that change a rule instead of adding a flat stat bonus.
    it('every declared transformative relic id actually exists in the catalog and is marked transformative', () => {
        const allItems = [...WEAPON_OVERCLOCKS, ...SUIT_RELICS];
        for (const id of TRANSFORMATIVE_RELIC_IDS) {
            const item = allItems.find((entry) => entry.id === id);
            expect(item, `expected catalog entry for ${id}`).toBeTruthy();
            expect(item.transformative).toBe(true);
        }
    });

    describe('applyLastBreathDamage', () => {
        const lastBreath = SUIT_RELICS.find((r) => r.id === 'last_breath');

        it('is a no-op with no relics equipped', () => {
            expect(applyLastBreathDamage(10, [], 5)).toBe(10);
        });

        it('doubles damage when O2 is below the relic threshold', () => {
            expect(applyLastBreathDamage(10, [lastBreath], 15)).toBe(20);
        });

        it('leaves damage unchanged when O2 is at or above the threshold', () => {
            expect(applyLastBreathDamage(10, [lastBreath], 20)).toBe(10);
            expect(applyLastBreathDamage(10, [lastBreath], 100)).toBe(10);
        });

        it('ignores equipped relics/overclocks that have no lowO2DamageMult stat', () => {
            const splitShot = WEAPON_OVERCLOCKS.find((o) => o.id === 'split_shot');
            expect(applyLastBreathDamage(10, [splitShot], 5)).toBe(10);
        });
    });

    it('reduces O2 capacity and restores O2 on a kill with Punctured Lung', () => {
        const relic = SUIT_RELICS.find((r) => r.id === 'punctured_lung');
        const maxO2 = applyPuncturedLungCapacity(100, [relic]);
        expect(maxO2).toBe(60);
        expect(applyPuncturedLungKillO2(55, [relic], maxO2)).toBe(60);
    });

    it('refunds a magazine round while shrinking O2 with Parasitic Magazine', () => {
        const relic = SUIT_RELICS.find((r) => r.id === 'parasitic_magazine');
        expect(applyParasiticMagazineKill({ clipAmmo: 2, clipSize: 6, maxO2: 100 }, [relic]))
            .toEqual({ clipAmmo: 3, maxO2: 95 });
    });

    it('drops enemy aggro only when False Telemetry is critical and proc succeeds', () => {
        const relic = SUIT_RELICS.find((r) => r.id === 'false_telemetry');
        expect(applyFalseTelemetryAggroDrop(1, 10, [relic], () => 0.1)).toBe(2.5);
        expect(applyFalseTelemetryAggroDrop(2, 10, [relic], () => 0.1)).toBe(0);
    });

    it('exposes Cryo Breach chain-freeze radius only when equipped', () => {
        const relic = SUIT_RELICS.find((r) => r.id === 'cryo_breach');
        expect(getCryoBreachChainFreezeRadius([relic])).toBe(3);
        expect(getCryoBreachChainFreezeRadius([])).toBe(0);
    });

    it('Scrap Cycler returns the real reload effect only when equipped', () => {
        const relic = SUIT_RELICS.find((r) => r.id === 'scrap_cycler');
        expect(getScrapCyclerReloadEffect([relic])).toEqual({
            salvageCost: 3,
            shrapnelDamage: 15,
            shrapnelRadius: 3
        });
        expect(getScrapCyclerReloadEffect([])).toBeNull();
    });

    it('Vesper Doctrine only ejects on an EMPTY reload, and reads from overclocks not relics', () => {
        // Vesper Doctrine's catalog entry lives in SUIT_RELICS physically
        // (a pre-existing data-organization quirk, not something this pass
        // introduced or should silently "fix" by moving it) but carries
        // type: DROP_TYPES.OVERCLOCK -- equipRunDrop (threeGame.js) sorts by
        // that field, not by which array an entry came from, so it still
        // correctly ends up in runOverclocks at runtime. Reading it from
        // SUIT_RELICS here to build the test fixture, not WEAPON_OVERCLOCKS.
        const overclock = SUIT_RELICS.find((o) => o.id === 'vesper_doctrine');
        expect(getVesperDoctrineReloadEffect(true, [overclock])).toEqual({
            explosionDamage: 20,
            explosionRadius: 3
        });
        // Non-empty reload: no explosion, even with the overclock equipped.
        expect(getVesperDoctrineReloadEffect(false, [overclock])).toBeNull();
        // Empty reload, but overclock not equipped: still nothing.
        expect(getVesperDoctrineReloadEffect(true, [])).toBeNull();
    });
});
