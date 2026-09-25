import { describe, expect, it, beforeEach } from 'vitest';
import {
    FabricatorManager,
    FAB_RECIPES,
    applyFabricatedRecipeOutput,
    getFabricatedOutputIds
} from './fabricator.js';
import { BankManager, FOUNDRY_ACTIVATION_COST } from './bank.js';
import { LoadoutManager } from './loadout.js';

class MemoryStorage {
    constructor() {
        this.store = new Map();
    }
    getItem(key) { return this.store.has(key) ? this.store.get(key) : null; }
    setItem(key, value) { this.store.set(key, String(value)); }
    removeItem(key) { this.store.delete(key); }
    clear() { this.store.clear(); }
    get length() { return this.store.size; }
    key(i) { return Array.from(this.store.keys())[i] ?? null; }
}

describe('Ticket #80 — Fabrication Bay & 13 Recipes Verification', () => {
    let storage;

    beforeEach(() => {
        storage = new MemoryStorage();
    });

    it('proves exactly thirteen curated recipes are defined with valid properties', () => {
        expect(FAB_RECIPES).toHaveLength(13);
        const expectedIds = [
            'mk1_sidearm', 'pulse_carbine', 'scatter_rep', 'rail_marksman', 'neon_smg', 'cryo_lance',
            'salvage_drill', 'exo_plating', 'tallow_thermal_wrap', 'vesper_vanguard_rig',
            'meridian_frequency_scanner', 'brood_chitin_plating', 'nahl_resonant_chitin'
        ];
        expect(FAB_RECIPES.map((r) => r.id)).toEqual(expectedIds);

        for (const recipe of FAB_RECIPES) {
            expect(recipe.id).toBeTruthy();
            expect(recipe.name).toBeTruthy();
            expect(['WEAPON', 'CHARM', 'MODULE']).toContain(recipe.klass);
            expect(recipe.cost).toBeDefined();
            expect(Number.isFinite(recipe.cost.tech)).toBe(true);
            expect(Number.isFinite(recipe.cost.coin)).toBe(true);
            expect(Number.isFinite(recipe.cost.med)).toBe(true);
            expect(recipe.printSeconds).toBeGreaterThan(0);
            expect(recipe.art.startsWith('/schematics/')).toBe(true);
        }
    });

    it('proves every recipe output (weapons, charms, modules) equips cleanly to loadout', () => {
        const fab = new FabricatorManager({ storage });
        const loadout = new LoadoutManager({ storage });

        // Mark all 13 recipes as fabricated
        for (const recipe of FAB_RECIPES) {
            fab.state.fabricated[recipe.id] = true;
        }
        fab.save();

        const fabricatedIds = getFabricatedOutputIds(fab);
        expect(fabricatedIds.length).toBeGreaterThanOrEqual(7); // Charms and modules with itemdefids

        // Test each category of output
        for (const recipe of FAB_RECIPES) {
            const res = applyFabricatedRecipeOutput(recipe, {
                fabricator: fab,
                loadout,
                classId: 'scout',
                replaceSlot: 1
            });
            expect(res.ok).toBe(true);
            if (recipe.output?.kind === 'weapon' || recipe.klass === 'WEAPON') {
                expect(res.kind).toBe('weapon');
            } else if (recipe.output?.kind === 'charm') {
                expect(res.kind).toBe('charm');
                expect(res.itemdefid).toBe(recipe.output.itemdefid);
            } else if (recipe.output?.kind === 'mod') {
                expect(res.kind).toBe('mod');
                expect(res.itemdefid).toBe(recipe.output.itemdefid);
            }
        }
    });

    it('proves mid-print save and reload survives process restart without losing queued state', () => {
        let currentTime = 1000;
        const bank1 = new BankManager({ storage });
        bank1.deposit({ tech: 100, coin: 100, med: 100 });

        const fab1 = new FabricatorManager({ storage, bank: bank1, now: () => currentTime });
        const recipe = FAB_RECIPES[0]; // mk1_sidearm, 6 seconds

        const started = fab1.startPrint(recipe.id, bank1);
        expect(started).not.toBeNull();
        expect(started.id).toBe(recipe.id);
        expect(fab1.isPrinting(recipe.id)).toBe(true);
        expect(fab1.getPrintCompleteAt(recipe.id)).toBe(1000 + recipe.printSeconds * 1000);

        // Reload fabricator & bank from storage at timestamp 3000 (mid-print: 2s elapsed out of 6s)
        currentTime = 3000;
        const bank2 = new BankManager({ storage });
        const fab2 = new FabricatorManager({ storage, bank: bank2, now: () => currentTime });
        expect(fab2.isPrinting(recipe.id)).toBe(true);
        expect(fab2.isFabricated(recipe.id)).toBe(false);
        expect(fab2.getPrintProgress(recipe.id)).toBeCloseTo(2 / 6, 1);

        // Complete the print at timestamp 8000 (> 6s elapsed)
        currentTime = 8000;
        const finished = fab2.tickPrints();
        expect(finished).toContain(recipe.id);
        expect(fab2.isPrinting(recipe.id)).toBe(false);
        expect(fab2.isFabricated(recipe.id)).toBe(true);
    });

    it('proves correct resource deductions and rejection when salvage is insufficient', () => {
        const bank = new BankManager({ storage });
        const recipe = FAB_RECIPES.find((r) => r.id === 'rail_marksman'); // cost: tech 20, coin 12, med 0

        // Bank starts empty
        expect(bank.canAfford(recipe.cost)).toBe(false);

        // Deposit exact cost
        bank.deposit({ tech: 20, coin: 12, med: 0 });
        expect(bank.canAfford(recipe.cost)).toBe(true);

        // Spend for print
        const paid = bank.spend(recipe.cost);
        expect(paid).toBe(true);
        expect(bank.getState().tech).toBe(0);
        expect(bank.getState().coin).toBe(0);

        // Second withdrawal rejected
        expect(bank.spend(recipe.cost)).toBe(false);
    });

    it('proves QA Foundry activation and retail debug restrictions', () => {
        const bank = new BankManager({ storage });

        // Retail check: Cannot activate Foundry without required salvage
        expect(bank.isFoundryActivated()).toBe(false);
        expect(bank.canActivateFoundry()).toBe(false);
        expect(bank.activateFoundry()).toBe(false);

        // Deposit required cost (tech: 25, coin: 10, med: 5)
        bank.deposit(FOUNDRY_ACTIVATION_COST);
        expect(bank.canActivateFoundry()).toBe(true);
        expect(bank.activateFoundry()).toBe(true);
        expect(bank.isFoundryActivated()).toBe(true);

        // Reset and test QA debug toggle
        const qaBank = new BankManager({ storage: new MemoryStorage() });
        expect(qaBank.isFoundryActivated()).toBe(false);

        // QA override forces activation directly without currency deduction
        qaBank.setFoundryActivated(true);
        expect(qaBank.isFoundryActivated()).toBe(true);

        // QA debug salvage grant
        qaBank.grantDebugSalvage({ tech: 100, coin: 100, med: 100 });
        expect(qaBank.getState().tech).toBe(100);
    });
});
