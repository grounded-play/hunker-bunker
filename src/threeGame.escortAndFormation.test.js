import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame, computeFormationCombatMultiplier } from './threeGame.js';

beforeEach(() => {
    vi.stubGlobal('window', {
        dispatchEvent: vi.fn(),
        AudioManager: { play: vi.fn() }
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('Formation Combat Multiplier (Flanking & Pincers)', () => {
    it('returns 1.0 when there are no companions or no target', () => {
        expect(computeFormationCombatMultiplier({ x: 0, z: 0 }, [], { x: 10, z: 0 })).toBe(1.0);
        expect(computeFormationCombatMultiplier({ x: 0, z: 0 }, [{ x: 5, z: 5 }], null)).toBe(1.0);
    });

    it('returns 1.25 flanking multiplier when companion pincers enemy from perpendicular angle', () => {
        // Player at (0, 0), Target at (10, 0)
        // Companion at (10, 10) -> vector to target is (0, -10), perpendicular to player's vector (10, 0)
        const playerPos = { x: 0, z: 0 };
        const targetPos = { x: 10, z: 0 };
        const companionPositions = [{ x: 10, z: 10 }];

        const mult = computeFormationCombatMultiplier(playerPos, companionPositions, targetPos);
        expect(mult).toBe(1.25);
    });

    it('returns 1.0 when companion is directly behind the player on the same axis', () => {
        // Player at (0, 0), Companion at (-5, 0), Target at (10, 0)
        const playerPos = { x: 0, z: 0 };
        const targetPos = { x: 10, z: 0 };
        const companionPositions = [{ x: -5, z: 0 }];

        const mult = computeFormationCombatMultiplier(playerPos, companionPositions, targetPos);
        expect(mult).toBe(1.0);
    });
});

describe('Escort-to-Camp Safe Haven Delivery', () => {
    it('settles active companion at safe camp, awarding bond and medical reward', () => {
        const camp = { id: 'camp_meridian', label: 'Camp Meridian', status: 'alive' };
        const campRecord = { id: 'camp_meridian', status: 'alive', settlers: [] };

        const mockAct2 = {
            adjustCampBond: vi.fn(),
            getPhase: () => 'dormant'
        };

        const mockDispose = vi.fn();
        const mockRemove = vi.fn();
        const companion = {
            isWanderer: true,
            wanderer: { name: 'Elena Vance' },
            instance3d: { root: { removeFromParent: mockRemove }, dispose: mockDispose }
        };

        const game = {
            act2: mockAct2,
            companions: [companion],
            healPlayer: vi.fn(),
            addSalvageReward: vi.fn(),
            getCampRecord: () => campRecord,
            showBunkerLine: vi.fn(),
            isMultiplayer: false,
            settleCompanionAtCamp: ThreeGame.prototype.settleCompanionAtCamp
        };

        const success = game.settleCompanionAtCamp(camp);
        expect(success).toBe(true);
        expect(game.companions).toHaveLength(0);
        expect(mockRemove).toHaveBeenCalled();
        expect(mockDispose).toHaveBeenCalled();
        expect(mockAct2.adjustCampBond).toHaveBeenCalledWith('camp_meridian', 1);
        expect(game.healPlayer).toHaveBeenCalledWith(50);
        expect(game.addSalvageReward).toHaveBeenCalledWith(expect.objectContaining({ med: 25 }));
        expect(campRecord.settlers).toHaveLength(1);
        expect(campRecord.settlers[0].name).toBe('Elena Vance');
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'camp-settler-delivered',
            detail: expect.objectContaining({ campId: 'camp_meridian', wandererName: 'Elena Vance' })
        }));
        expect(window.AudioManager.play).toHaveBeenCalledWith('fx_level_up', expect.objectContaining({ playbackRate: 1.1 }));
    });

    it('identifies settle-companion action in getActionableCampAt when accompanied', () => {
        const camp = {
            id: 'camp_iron',
            label: 'Iron Outpost',
            status: 'alive',
            isWithinInteractRange: () => true
        };

        const game = {
            camps: [camp],
            companions: [{ isWanderer: true, wanderer: { name: 'Dr. Thorne' } }],
            getCampRecord: () => ({ id: 'camp_iron', status: 'alive' }),
            isAct2Active: () => false,
            getActionableCampAt: ThreeGame.prototype.getActionableCampAt
        };

        const actionable = game.getActionableCampAt(0, 0, 'dormant');
        expect(actionable).not.toBeNull();
        expect(actionable.action).toBe('settle-companion');
        expect(actionable.label).toContain('SETTLE SURVIVOR AT IRON OUTPOST');
    });
});
