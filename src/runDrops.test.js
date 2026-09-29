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
    getVesperDoctrineReloadEffect,
    getQueensMilkAlienContactHeal,
    getQueensMilkHumanHealPenalty,
    applyIncomingDamageModifiers,
    resolveCryoShatterNova,
    resolveBioVampirismKill,
    getTurretElementalInheritance
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
            // Same filter the live roll applies: unimplemented entries are not
            // reward candidates. The assertion is still about relic-narrowing.
            const unbiasedPool = [...WEAPON_OVERCLOCKS, ...SUIT_RELICS]
                .filter((i) => i.implemented !== false && i.rarity === DROP_RARITIES.RARE);
            expect(drop?.id).toBe(unbiasedPool[0].id);
        });
    });

    it('does not claim an unimplemented elemental synergy', () => {
        const cryoItem = WEAPON_OVERCLOCKS.find((item) => item.element === 'cryo');
        const teslaItem = SUIT_RELICS.find((item) => item.element === 'tesla');
        const synergies = computeActiveSynergies([cryoItem, teslaItem]);
        expect(synergies).toEqual([]);
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

    // docs/planning/depth-01-elite-and-relic-lane-2026-09-09.md D6: the O2
    // penalty must be charged only by the relic that actually refunds the
    // round. maxO2PenaltyPercent is a shared stat key, and Punctured Lung
    // carries it as a ONE-TIME equip cost (applyPuncturedLungCapacity) --
    // reading it here re-charged that 40% on every single kill.
    it('does not re-charge a one-time capacity cost from another relic on each kill', () => {
        const lung = SUIT_RELICS.find((r) => r.id === 'punctured_lung');
        expect(applyParasiticMagazineKill({ clipAmmo: 2, clipSize: 6, maxO2: 60 }, [lung]))
            .toEqual({ clipAmmo: 2, maxO2: 60 });
    });

    it('charges the Parasitic Magazine cost once per kill and nothing more', () => {
        const para = SUIT_RELICS.find((r) => r.id === 'parasitic_magazine');
        const lung = SUIT_RELICS.find((r) => r.id === 'punctured_lung');
        // Both equipped: only the magazine's own 5% applies per kill.
        expect(applyParasiticMagazineKill({ clipAmmo: 0, clipSize: 6, maxO2: 60 }, [para, lung]))
            .toEqual({ clipAmmo: 1, maxO2: 57 });
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

    describe("Queen's Milk", () => {
        const relic = SUIT_RELICS.find((r) => r.id === 'queens_milk');

        it('heals on a genuine alien-contact reason when equipped', () => {
            expect(getQueensMilkAlienContactHeal('crawler', [relic])).toBe(5);
            expect(getQueensMilkAlienContactHeal('mycelium_stalker', [relic])).toBe(5);
            expect(getQueensMilkAlienContactHeal('bio_charger', [relic])).toBe(5);
        });

        it('does not heal on non-contact or non-alien reasons, even when equipped', () => {
            expect(getQueensMilkAlienContactHeal('enemy-projectile', [relic])).toBeNull();
            expect(getQueensMilkAlienContactHeal('ground-slam', [relic])).toBeNull();
            expect(getQueensMilkAlienContactHeal('hazard-zone', [relic])).toBeNull();
            expect(getQueensMilkAlienContactHeal('pvp-rival', [relic])).toBeNull();
        });

        it('does nothing on a contact reason when not equipped', () => {
            expect(getQueensMilkAlienContactHeal('crawler', [])).toBeNull();
        });

        it('flips a human heal into a smaller damage amount when equipped', () => {
            expect(getQueensMilkHumanHealPenalty(1, [relic])).toBe(1);
            expect(getQueensMilkHumanHealPenalty(10, [relic])).toBe(5);
        });

        it('does nothing to a heal when not equipped, or for a non-positive heal', () => {
            expect(getQueensMilkHumanHealPenalty(10, [])).toBeNull();
            expect(getQueensMilkHumanHealPenalty(0, [relic])).toBeNull();
        });
    });

    describe('applyIncomingDamageModifiers (Glass Cannon Core / takenDamageMult)', () => {
        const glassCannon = WEAPON_OVERCLOCKS.find((o) => o.id === 'glass_cannon_core');

        it('returns original damage when no modifiers are equipped', () => {
            expect(applyIncomingDamageModifiers(20, [], [])).toBe(20);
            expect(applyIncomingDamageModifiers(0, [glassCannon], [])).toBe(0);
        });

        it('multiplies incoming damage by takenDamageMult when glass_cannon_core is equipped', () => {
            expect(glassCannon).toBeDefined();
            expect(glassCannon.stats.takenDamageMult).toBe(1.5);
            // 20 * 1.5 = 30
            expect(applyIncomingDamageModifiers(20, [glassCannon], [])).toBe(30);
        });

        it('ignores invalid, non-finite, or non-positive multipliers', () => {
            const badMod = { stats: { takenDamageMult: -1 } };
            const zeroMod = { stats: { takenDamageMult: 0 } };
            const nanMod = { stats: { takenDamageMult: NaN } };
            expect(applyIncomingDamageModifiers(20, [badMod, zeroMod, nanMod], [])).toBe(20);
        });
    });

    // docs/planning/depth-01-elite-and-relic-lane-2026-09-09.md D6 /
    // Astra plan section 23: "existing incomplete promises are connected
    // through gameplay or removed from player-facing claims until ready".
    //
    // Nine of the nineteen catalog entries declare an effect nothing reads --
    // three carry stat keys with no consumer anywhere (slowMult, maxBounces,
    // poisonDuration/tickDamage) and six carry no stats at all. Granting one as
    // a reward hands the player an item that does literally nothing. They stay
    // in the catalog so the Vault and the debug museum can still show them; the
    // live drop roll skips them until their effect exists.
    it('never rolls an unimplemented item as a reward', () => {
        const always = () => 0; // pass every chance gate, take the first pool entry
        for (let i = 0; i < 200; i++) {
            const drop = rollEnemyLootDrop(() => (i % 97) / 97, { isElite: true, ring: 5 });
            if (drop) expect(drop.implemented, `${drop.id} is not implemented`).not.toBe(false);
        }
        expect(rollEnemyLootDrop(always, { isBoss: true })?.implemented).not.toBe(false);
    });

    it('marks exactly the entries with no runtime consumer', () => {
        const inert = [...WEAPON_OVERCLOCKS, ...SUIT_RELICS]
            .filter((item) => item.implemented === false)
            .map((item) => item.id)
            .sort();
        // Sprint 47 Lane 3: cryo_rime, caustic_payload, shatter_engine, bio_vampirism flipped to implemented: true
        expect(inert).toEqual([
            'pheromone_aura', 'plasma_bounce', 'synapse_pulse', 'tesla_thrusters'
        ]);
    });

    it('still leaves a usable reward pool at every rarity it can roll', () => {
        const live = [...WEAPON_OVERCLOCKS, ...SUIT_RELICS].filter((i) => i.implemented !== false);
        expect(live.length).toBe(15);
        for (const rarity of ['common', 'rare', 'mythic', 'corrupted']) {
            expect(live.some((i) => i.rarity === rarity), `no live ${rarity} reward`).toBe(true);
        }
    });

    it('computes active synergies for Cryo Shatter and Bio Predator', () => {
        expect(computeActiveSynergies([])).toEqual([]);
        expect(computeActiveSynergies([{ id: 'cryo_rime' }])).toEqual([]);

        const cryoShatter = computeActiveSynergies([{ id: 'cryo_rime' }, { id: 'shatter_engine' }]);
        expect(cryoShatter).toHaveLength(1);
        expect(cryoShatter[0].id).toBe('cryo_shatter');
        expect(cryoShatter[0].element).toBe('cryo');

        const bioPredator = computeActiveSynergies([{ id: 'caustic_payload' }, { id: 'bio_vampirism' }]);
        expect(bioPredator).toHaveLength(1);
        expect(bioPredator[0].id).toBe('bio_predator');
        expect(bioPredator[0].element).toBe('bio');

        const both = computeActiveSynergies([
            { id: 'cryo_rime' },
            { id: 'shatter_engine' },
            { id: 'caustic_payload' },
            { id: 'bio_vampirism' }
        ]);
        expect(both).toHaveLength(2);
    });

    it('resolves Cryo Shatter nova within radius and damages adjacent hostiles', () => {
        const sprites = [
            { parent: {}, position: { x: 1, z: 0 }, userData: { hp: 10 } },
            { parent: {}, position: { x: 3, z: 0 }, userData: { hp: 10 } },
            { parent: {}, position: { x: 10, z: 0 }, userData: { hp: 10 } } // out of range
        ];

        const affected = resolveCryoShatterNova({
            originX: 0,
            originZ: 0,
            scatterSprites: sprites,
            shatterRadius: 4.0,
            shatterDamage: 25
        });

        expect(affected).toHaveLength(2);
        expect(affected[0].damage).toBe(25);
        expect(affected[0].distance).toBe(1);
        expect(affected[1].distance).toBe(3);
    });

    it('resolves Bio Vampirism kill rewards on corroded bio enemies only', () => {
        const vitals = { hp: 2, maxHp: 4, o2: 50, maxO2: 100 };

        // Non-corroded bio enemy -> no refund
        const nonCorroded = resolveBioVampirismKill({
            playerVitals: vitals,
            enemyType: 'crawler',
            isCorroded: false
        });
        expect(nonCorroded.o2Restored).toBe(0);
        expect(nonCorroded.heartRestored).toBe(0);

        // Corroded non-bio enemy (e.g. cybersnail) -> no refund
        const nonBio = resolveBioVampirismKill({
            playerVitals: vitals,
            enemyType: 'cybersnail',
            isCorroded: true
        });
        expect(nonBio.o2Restored).toBe(0);

        // Corroded bio enemy (crawler) -> restores 8 O2 and 1 heart
        const bioKill = resolveBioVampirismKill({
            playerVitals: vitals,
            enemyType: 'crawler',
            isCorroded: true
        });
        expect(bioKill.o2Restored).toBe(8);
        expect(bioKill.heartRestored).toBe(1);
        expect(bioKill.batteryRestored).toBe(15);
    });

    it('resolves turret elemental inheritance at 50% potency', () => {
        expect(getTurretElementalInheritance([])).toBeNull();

        const cryoTurret = getTurretElementalInheritance([{ id: 'cryo_rime' }]);
        expect(cryoTurret).not.toBeNull();
        expect(cryoTurret.element).toBe('cryo');
        expect(cryoTurret.potency).toBe(0.5);
        expect(cryoTurret.freezePerHit).toBe(17);

        const bioTurret = getTurretElementalInheritance([{ id: 'caustic_payload' }]);
        expect(bioTurret).not.toBeNull();
        expect(bioTurret.element).toBe('bio');
        expect(bioTurret.potency).toBe(0.5);
        expect(bioTurret.tickDamage).toBe(1);
    });
});
