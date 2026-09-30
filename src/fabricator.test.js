import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FabricatorManager, FAB_RECIPES, RARITY_WEIGHTS, getRecipe, rollRarity, getFabricationOdds, FAB_SPIN_COST, getRecipesByRarity, FABRICATOR_SITE_MAX_USES, applyFabricatedRecipeOutput, getFabricatedOutputIds } from './fabricator.js';
import { getItem } from './data/itemCatalog.js';

function makeStorage() {
    const map = new Map();
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, v),
        removeItem: (k) => map.delete(k),
        _map: map
    };
}

// Minimal bank stand-in honoring the canAfford/spend contract.
function makeBank(initial = { tech: 100, coin: 100, med: 100 }) {
    const bal = { ...initial };
    return {
        bal,
        canAfford: (c = {}) => bal.tech >= (c.tech ?? 0) && bal.coin >= (c.coin ?? 0) && bal.med >= (c.med ?? 0),
        spend: (c = {}) => {
            if (bal.tech < (c.tech ?? 0) || bal.coin < (c.coin ?? 0) || bal.med < (c.med ?? 0)) return false;
            bal.tech -= c.tech ?? 0; bal.coin -= c.coin ?? 0; bal.med -= c.med ?? 0;
            return true;
        },
        deposit: (c = {}) => {
            bal.tech += c.tech ?? 0; bal.coin += c.coin ?? 0; bal.med += c.med ?? 0;
            return c;
        }
    };
}

describe('FabricatorManager', () => {
    let storage, clock, fab, bank;
    beforeEach(() => {
        storage = makeStorage();
        clock = { t: 1_000_000 };
        fab = new FabricatorManager({ storage, now: () => clock.t });
        bank = makeBank();
    });

    it('exposes recipes each printing a catalog item, with a cost', () => {
        expect(FAB_RECIPES.length).toBe(13);
        for (const r of FAB_RECIPES) {
            const item = getItem(r.item, { classId: 'scout' });
            expect(item, r.id).not.toBeNull();
            expect(r.name).toBe(item.name);
            expect(r.rarity).toBe(item.rarity.toUpperCase());
            expect(item.iconUrl, r.id).toMatch(/^\/(economy|ach_)/);
            expect(r).not.toHaveProperty('art');
            expect(r.printSeconds).toBeGreaterThan(0);
            expect(typeof r.cost.tech).toBe('number');
            expect(['weapon', 'mod', 'charm']).toContain(r.output.kind);
        }
    });

    it('applies fabricated weapons, mods and charms to the current run', () => {
        const loadout = {
            activeClassId: 'scout',
            state: { mod1Id: null, mod2Id: null, charmId: null },
            equip: vi.fn(() => true),
            equipCharm: vi.fn(),
            equipRigModule: vi.fn((_cls, slot, id) => { loadout.state[`mod${slot}Id`] = String(id); }),
            getClassLoadout: () => loadout.state,
            getActiveModifiers: vi.fn(() => ({ kineticPierceBonus: 1 }))
        };
        const game = { applyWeaponUpgrades: vi.fn(), setupPlayer3dCosmeticOverlay: vi.fn() };
        for (const id of ['scatter_rep', 'vesper_vanguard_rig', 'salvage_drill']) fab.state.fabricated[id] = true;

        expect(applyFabricatedRecipeOutput(getRecipe('scatter_rep'), { fabricator: fab, loadout, game }).ok).toBe(true);
        expect(game.applyWeaponUpgrades).toHaveBeenCalled();
        expect(applyFabricatedRecipeOutput(getRecipe('vesper_vanguard_rig'), { fabricator: fab, loadout, game })).toMatchObject({ ok: true, kind: 'mod', itemdefid: 4143 });
        expect(game.loadoutMods).toEqual({ kineticPierceBonus: 1 });
        expect(applyFabricatedRecipeOutput(getRecipe('salvage_drill'), { fabricator: fab, loadout, game })).toMatchObject({ ok: true, kind: 'charm', itemdefid: 4135 });
        expect(game.setupPlayer3dCosmeticOverlay).toHaveBeenCalled();
        expect(getFabricatedOutputIds(fab)).toEqual(expect.arrayContaining([4143, 4135]));
    });

    it('requires an explicit bay replacement when both module slots are occupied', () => {
        fab.state.fabricated.vesper_vanguard_rig = true;
        const state = { mod1Id: '4140', mod2Id: '4142' };
        const loadout = {
            activeClassId: 'scout', getClassLoadout: () => state,
            equipRigModule: vi.fn((_cls, slot, id) => { state[`mod${slot}Id`] = String(id); }),
            getActiveModifiers: () => ({ kineticPierceBonus: 1 })
        };
        const recipe = getRecipe('vesper_vanguard_rig');
        expect(applyFabricatedRecipeOutput(recipe, { fabricator: fab, loadout })).toMatchObject({ ok: false, reason: 'slot_conflict' });
        expect(loadout.equipRigModule).not.toHaveBeenCalled();
        expect(applyFabricatedRecipeOutput(recipe, { fabricator: fab, loadout, replaceSlot: 2 })).toMatchObject({ ok: true, slot: 2 });
        expect(state.mod2Id).toBe('4143');
    });

    it('starting a print spends salvage and queues it', () => {
        const recipe = getRecipe('mk1_sidearm');
        const ok = fab.startPrint('mk1_sidearm', bank);
        expect(ok).toBe(recipe);
        expect(bank.bal.tech).toBe(100 - recipe.cost.tech);
        expect(fab.isPrinting('mk1_sidearm')).toBe(true);
        expect(fab.isFabricated('mk1_sidearm')).toBe(false);
    });

    it('cannot afford -> no print, no spend', () => {
        const poor = makeBank({ tech: 0, coin: 0, med: 0 });
        expect(fab.canFabricate('mk1_sidearm', poor)).toBe(false);
        expect(fab.startPrint('mk1_sidearm', poor)).toBeNull();
        expect(fab.isPrinting('mk1_sidearm')).toBe(false);
    });

    it('progress advances and completes after printSeconds', () => {
        const recipe = getRecipe('pulse_carbine');
        fab.startPrint('pulse_carbine', bank);
        expect(fab.getPrintProgress('pulse_carbine')).toBeCloseTo(0, 1);

        clock.t += (recipe.printSeconds * 1000) / 2;
        expect(fab.getPrintProgress('pulse_carbine')).toBeGreaterThan(0.4);
        expect(fab.getPrintProgress('pulse_carbine')).toBeLessThan(0.6);

        clock.t += recipe.printSeconds * 1000; // well past completion
        const finished = fab.tickPrints();
        expect(finished).toContain('pulse_carbine');
        expect(fab.isFabricated('pulse_carbine')).toBe(true);
        expect(fab.isPrinting('pulse_carbine')).toBe(false);
        expect(fab.getFabricatedCount()).toBe(1);
    });

    it('cannot re-fabricate or double-queue the same recipe', () => {
        fab.startPrint('scatter_rep', bank);
        clock.t += 1_000_000;
        fab.tickPrints();
        expect(fab.isFabricated('scatter_rep')).toBe(true);
        expect(fab.canFabricate('scatter_rep', bank)).toBe(false);
        expect(fab.startPrint('scatter_rep', bank)).toBeNull();
    });

    it('can start a random affordable unfinished print', () => {
        const rolled = fab.startRandomPrint(bank, () => 0.999);
        expect(rolled).toBe(FAB_RECIPES[FAB_RECIPES.length - 1]);
        expect(fab.isPrinting(rolled.id)).toBe(true);
    });

    it('random print returns null when no candidates are affordable', () => {
        const poor = makeBank({ tech: 0, coin: 0, med: 0 });
        expect(fab.getRandomFabricationCandidates(poor)).toEqual([]);
        expect(fab.startRandomPrint(poor, () => 0)).toBeNull();
    });

    it('every recipe has a valid rarity tier', () => {
        const tiers = new Set(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']);
        for (const r of FAB_RECIPES) expect(tiers.has(r.rarity)).toBe(true);
        // At least one of each of the lower tiers exists so rolls have a pool.
        expect(getRecipesByRarity('COMMON').length).toBeGreaterThan(0);
        expect(getRecipesByRarity('RARE').length).toBeGreaterThan(0);
    });

    it('rollRarity uses the live odds: 30/24/32/11 over the tiers that have recipes', () => {
        // LEGENDARY has no recipe, so its 3% is not rolled; the rest normalize
        // over 0.97: COMMON < .309, UNCOMMON < .557, RARE < .887, EPIC < 1.
        expect(RARITY_WEIGHTS.reduce((sum, r) => sum + r.weight, 0)).toBeCloseTo(1, 10);
        expect(rollRarity(() => 0.0)).toBe('COMMON');
        expect(rollRarity(() => 0.30)).toBe('COMMON');
        expect(rollRarity(() => 0.32)).toBe('UNCOMMON');
        expect(rollRarity(() => 0.55)).toBe('UNCOMMON');
        expect(rollRarity(() => 0.60)).toBe('RARE');
        expect(rollRarity(() => 0.88)).toBe('RARE');
        expect(rollRarity(() => 0.95)).toBe('EPIC');
        expect(rollRarity(() => 0.9999)).toBe('EPIC');
    });

    it('never gives weight to a tier with no recipe, and the odds sum to 1', () => {
        const odds = getFabricationOdds();
        expect(odds.map((o) => o.rarity)).not.toContain('LEGENDARY');
        for (const tier of odds) expect(getRecipesByRarity(tier.rarity).length).toBeGreaterThan(0);
        expect(odds.reduce((sum, o) => sum + o.chance, 0)).toBeCloseTo(1, 10);
    });

    it('makes each recipe rarer as its tier rises', () => {
        const perRecipe = getFabricationOdds().map((o) => o.perRecipe);
        for (let i = 1; i < perRecipe.length; i += 1) expect(perRecipe[i]).toBeLessThan(perRecipe[i - 1]);
    });

    it('a legendary recipe, once one exists, gets its tier back', () => {
        const withLegendary = [...FAB_RECIPES, { id: 'x', rarity: 'LEGENDARY' }];
        const legendary = getFabricationOdds(withLegendary).find((o) => o.rarity === 'LEGENDARY');
        expect(legendary.chance).toBeCloseTo(0.03, 10);
    });

    it('rollFabrication spends the spin cost and reveals an owned schematic', () => {
        const before = { ...bank.bal };
        const result = fab.rollFabrication(bank, () => 0); // COMMON tier, first of pool
        expect(result).not.toBeNull();
        expect(result.rarity).toBe('COMMON');
        expect(bank.bal.tech).toBe(before.tech - FAB_SPIN_COST.tech);
        expect(bank.bal.coin).toBe(before.coin - FAB_SPIN_COST.coin);
        expect(fab.isFabricated(result.recipe.id)).toBe(true);
    });



    it('tracks fabricator objective targets and raises odds after misses', () => {
        expect(fab.getObjectiveState()).toMatchObject({ targetId: 'mk1_sidearm', siteUsesRemaining: FABRICATOR_SITE_MAX_USES });
        const miss = fab.rollFabrication(bank, () => 0.99); // miss objective chance, then high pool index
        expect(miss).not.toBeNull();
        expect(miss.objective.targetId).toBe('mk1_sidearm');
        expect(miss.objective.attempts).toBe(1);
        expect(miss.objective.chance).toBeGreaterThan(0.25);
    });

    it('advances the objective when the target schematic is fabricated', () => {
        const hit = fab.rollFabrication(bank, () => 0); // COMMON + objective chance hit
        expect(hit.objectiveHit).toBe(true);
        expect(hit.recipe.id).toBe('mk1_sidearm');
        expect(fab.getObjectiveState()).toMatchObject({ targetId: 'pulse_carbine', attempts: 0, siteUsesRemaining: FABRICATOR_SITE_MAX_USES });
    });

    it('breaks a site after too many objective misses and refunds some salvage', () => {
        const before = { ...bank.bal };
        let result = null;
        for (let i = 0; i < FABRICATOR_SITE_MAX_USES; i++) {
            result = fab.rollFabrication(bank, () => 0.99);
        }
        expect(result.broken).toBe(true);
        expect(fab.getObjectiveState().siteUsesRemaining).toBe(0);
        expect(bank.bal.tech).toBeGreaterThan(before.tech - FAB_SPIN_COST.tech * FABRICATOR_SITE_MAX_USES);
        fab.resetSiteUses();
        expect(fab.getObjectiveState().siteUsesRemaining).toBe(FABRICATOR_SITE_MAX_USES);
    });

    it('rollFabrication returns null and spends nothing when broke', () => {
        const poor = makeBank({ tech: 0, coin: 0, med: 0 });
        expect(fab.rollFabrication(poor, () => 0)).toBeNull();
        expect(fab.getFabricatedCount()).toBe(0);
    });

    it('persists prints and fabricated state across reloads', () => {
        fab.startPrint('neon_smg', bank);
        // New manager over the same storage + clock = a "reload".
        const reloaded = new FabricatorManager({ storage, now: () => clock.t });
        expect(reloaded.isPrinting('neon_smg')).toBe(true);
        clock.t += 1_000_000;
        reloaded.tickPrints();
        const reloaded2 = new FabricatorManager({ storage, now: () => clock.t });
        expect(reloaded2.isFabricated('neon_smg')).toBe(true);
    });
});
