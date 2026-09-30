import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

beforeEach(() => {
    vi.stubGlobal('window', {
        dispatchEvent: vi.fn(),
        AudioManager: { play: vi.fn() }
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('In-Expedition Field Workbench at Safe Camps', () => {
    it('identifies field-workbench action at an active camp', () => {
        const camp = {
            id: 'camp_meridian',
            label: 'Camp Meridian',
            status: 'alive',
            hasWorkbench: true,
            isWithinInteractRange: () => true
        };

        const game = {
            camps: [camp],
            companions: [],
            getCampRecord: () => ({ id: 'camp_meridian', status: 'alive' }),
            isAct2Active: () => false,
            peekDialogueBeat: () => null,
            getActionableCampAt: ThreeGame.prototype.getActionableCampAt
        };

        const actionable = game.getActionableCampAt(0, 0, 'dormant');
        expect(actionable).not.toBeNull();
        expect(actionable.action).toBe('field-workbench');
        expect(actionable.label).toContain('FIELD WORKBENCH');
    });

    it('opens field workbench modal and emits available field recipes', () => {
        const camp = { id: 'camp_meridian', label: 'Camp Meridian' };
        const game = {
            showBunkerLine: vi.fn(),
            openFieldWorkbench: ThreeGame.prototype.openFieldWorkbench
        };

        const success = game.openFieldWorkbench(camp);
        expect(success).toBe(true);
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'open-field-workbench',
            detail: expect.objectContaining({
                campId: 'camp_meridian',
                campLabel: 'Camp Meridian',
                recipes: expect.arrayContaining([
                    expect.objectContaining({ id: 'ammo_pack' }),
                    expect.objectContaining({ id: 'med_patch' }),
                    expect.objectContaining({ id: 'suit_armor_plate' })
                ])
            })
        }));
    });

    it('crafts ammo pack and med patch deducting from bank inventory', () => {
        const bankState = { scrap: 30, med: 25, tech: 15 };
        const mockBank = {
            getState: () => bankState,
            spend: vi.fn((cost) => {
                for (const [k, v] of Object.entries(cost)) {
                    bankState[k] -= v;
                }
            })
        };

        const game = {
            bank: mockBank,
            maxClip: 12,
            currentClip: 2,
            maxTotalAmmo: 100,
            totalAmmo: 10,
            emitAmmoState: vi.fn(),
            healPlayer: vi.fn(),
            emitHealthState: vi.fn(),
            showBunkerLine: vi.fn(),
            playerShieldMax: 50,
            playerShieldHp: 10,
            craftFieldRecipe: ThreeGame.prototype.craftFieldRecipe
        };

        // Craft ammo pack (15 scrap)
        const ammoSuccess = game.craftFieldRecipe('ammo_pack');
        expect(ammoSuccess).toBe(true);
        expect(mockBank.spend).toHaveBeenCalledWith({ scrap: 15 });
        expect(game.currentClip).toBe(12);
        expect(game.totalAmmo).toBe(40);

        // Craft med patch (20 med)
        const medSuccess = game.craftFieldRecipe('med_patch');
        expect(medSuccess).toBe(true);
        expect(mockBank.spend).toHaveBeenCalledWith({ med: 20 });
        expect(game.healPlayer).toHaveBeenCalledWith(40);

        // Attempting to craft another med patch without enough med fails
        const failMed = game.craftFieldRecipe('med_patch');
        expect(failMed).toBe(false);
    });
});
