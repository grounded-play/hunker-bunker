import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isWandererEligible, WandererManager } from './wandererSystem.js';

describe('ThreeGame Wanderer Integration & Gating', () => {
    let mockGame;

    beforeEach(() => {
        mockGame = {
            bank: {
                getState: vi.fn(() => ({
                    unlocks: { o2Bubble: false }
                })),
                deposit: vi.fn()
            },
            killedBosses: new Set(),
            defeatedMilestoneBosses: new Set(),
            player: { position: { x: 0, z: 0 } },
            isPlayerDead: false,
            activeWanderer: null,
            companions: [],
            wandererManager: new WandererManager({
                storage: {
                    getItem: () => null,
                    setItem: () => {},
                    removeItem: () => {},
                    clear: () => {}
                }
            }),
            showBunkerLine: vi.fn(),
            scene: {
                add: vi.fn(),
                remove: vi.fn()
            },
            scatterSprites: []
        };
    });

    it('does not spawn wanderer at the beginning of the run before O2 generator is built', () => {
        const eligible = isWandererEligible({
            bank: mockGame.bank,
            defeatedBosses: mockGame.defeatedMilestoneBosses,
            unlocks: mockGame.bank.getState().unlocks
        });
        expect(eligible).toBe(false);

        const rolled = mockGame.wandererManager.rollWanderer({
            bank: mockGame.bank,
            defeatedBosses: mockGame.defeatedMilestoneBosses,
            unlocks: mockGame.bank.getState().unlocks
        });
        expect(rolled).toBeNull();
    });

    it('does not spawn wanderer if O2 generator is built but no boss has been killed yet', () => {
        mockGame.bank.getState = vi.fn(() => ({
            unlocks: { o2Bubble: true }
        }));
        const eligible = isWandererEligible({
            bank: mockGame.bank,
            defeatedBosses: mockGame.defeatedMilestoneBosses,
            unlocks: mockGame.bank.getState().unlocks
        });
        expect(eligible).toBe(false);
    });

    it('spawns a wanderer with unique personality and quest once O2 is built AND boss is killed', () => {
        mockGame.bank.getState = vi.fn(() => ({
            unlocks: { o2Bubble: true }
        }));
        mockGame.killedBosses.add('cybersnail');
        mockGame.defeatedMilestoneBosses.add('o2Bubble');

        const eligible = isWandererEligible({
            bank: mockGame.bank,
            defeatedBosses: mockGame.defeatedMilestoneBosses,
            unlocks: mockGame.bank.getState().unlocks
        });
        expect(eligible).toBe(true);

        const wanderer = mockGame.wandererManager.rollWanderer({
            bank: mockGame.bank,
            defeatedBosses: mockGame.defeatedMilestoneBosses,
            unlocks: mockGame.bank.getState().unlocks
        });
        expect(wanderer).not.toBeNull();
        expect(wanderer.name).toBeTruthy();
        expect(wanderer.greeting).toBeTruthy();
        expect(wanderer.question).toBeTruthy();
        expect(wanderer.quest.id).toBeTruthy();
    });

    it('handles Befriend flow by recruiting active companion and tracking quest', () => {
        mockGame.bank.getState = vi.fn(() => ({
            unlocks: { o2Bubble: true }
        }));
        mockGame.defeatedMilestoneBosses.add('o2Bubble');

        const wanderer = mockGame.wandererManager.rollWanderer({
            bank: mockGame.bank,
            defeatedBosses: mockGame.defeatedMilestoneBosses,
            unlocks: mockGame.bank.getState().unlocks
        });

        const befriendResult = mockGame.wandererManager.befriend(wanderer);
        expect(befriendResult.success).toBe(true);
        expect(mockGame.wandererManager.getActiveCompanion()).not.toBeNull();
        expect(mockGame.wandererManager.state.activeQuest.id).toBe(wanderer.quest.id);
    });

    it('handles Chase Off flow by granting scrap loot', () => {
        mockGame.bank.getState = vi.fn(() => ({
            unlocks: { o2Bubble: true }
        }));
        mockGame.defeatedMilestoneBosses.add('o2Bubble');

        const wanderer = mockGame.wandererManager.rollWanderer({
            bank: mockGame.bank,
            defeatedBosses: mockGame.defeatedMilestoneBosses,
            unlocks: mockGame.bank.getState().unlocks
        });

        const chaseResult = mockGame.wandererManager.chaseOff(wanderer);
        expect(chaseResult.success).toBe(true);
        expect(chaseResult.lootGranted.scrap).toBeGreaterThanOrEqual(30);
        expect(mockGame.wandererManager.getActiveCompanion()).toBeNull();
    });
});
