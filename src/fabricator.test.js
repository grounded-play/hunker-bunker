import { describe, it, expect, beforeEach } from 'vitest';
import { FabricatorManager, FAB_RECIPES, getRecipe, rollRarity, FAB_SPIN_COST, getRecipesByRarity } from './fabricator.js';

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

    it('exposes 8 recipes each with art and a cost', () => {
        expect(FAB_RECIPES.length).toBe(8);
        for (const r of FAB_RECIPES) {
            expect(r.art).toMatch(/^\/schematics\/schematic_\d\d\.webp$/);
            expect(r.printSeconds).toBeGreaterThan(0);
            expect(typeof r.cost.tech).toBe('number');
        }
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
        const tiers = new Set(['COMMON', 'RARE', 'EPIC', 'LEGENDARY']);
        for (const r of FAB_RECIPES) expect(tiers.has(r.rarity)).toBe(true);
        // At least one of each of the lower tiers exists so rolls have a pool.
        expect(getRecipesByRarity('COMMON').length).toBeGreaterThan(0);
        expect(getRecipesByRarity('RARE').length).toBeGreaterThan(0);
    });

    it('rollRarity maps the weighted bands deterministically (40/40/17/3)', () => {
        expect(rollRarity(() => 0.0)).toBe('COMMON');     // 0.00 < 0.40
        expect(rollRarity(() => 0.39)).toBe('COMMON');
        expect(rollRarity(() => 0.50)).toBe('RARE');      // 0.40..0.80
        expect(rollRarity(() => 0.79)).toBe('RARE');
        expect(rollRarity(() => 0.90)).toBe('EPIC');      // 0.80..0.97
        expect(rollRarity(() => 0.99)).toBe('LEGENDARY'); // 0.97..1.00
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
