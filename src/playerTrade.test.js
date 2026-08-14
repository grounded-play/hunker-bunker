import { describe, expect, it, vi } from 'vitest';
import {
    canAffordTradeOffer,
    executeTradeExchange,
    PlayerTradeManager,
    TRADEABLE_RESOURCES
} from './playerTrade.js';

describe('PlayerTrade System', () => {
    describe('canAffordTradeOffer', () => {
        it('returns true when inventory meets or exceeds offered amounts', () => {
            const offer = { shells: 50, ammo: 20, medkits: 1, o2Canisters: 1 };
            const inv = { shells: 100, ammo: 40, medkits: 2, o2Canisters: 2 };
            expect(canAffordTradeOffer(offer, inv)).toBe(true);
        });

        it('returns false when inventory is insufficient for any item', () => {
            const offer = { shells: 150, ammo: 20 };
            const inv = { shells: 100, ammo: 40 };
            expect(canAffordTradeOffer(offer, inv)).toBe(false);
        });

        it('handles null/empty offer gracefully', () => {
            expect(canAffordTradeOffer(null, { shells: 10 })).toBe(true);
            expect(canAffordTradeOffer({}, {})).toBe(true);
        });
    });

    describe('executeTradeExchange', () => {
        it('deducts offered items and adds received items correctly', () => {
            const inventory = { shells: 100, ammo: 50, medkits: 2, o2Canisters: 1 };
            const myOffer = { shells: 40, ammo: 10 };
            const peerOffer = { medkits: 1, o2Canisters: 2 };

            const result = executeTradeExchange({ myOffer, peerOffer, inventory });
            expect(result.success).toBe(true);
            expect(result.inventory.shells).toBe(60);
            expect(result.inventory.ammo).toBe(40);
            expect(result.inventory.medkits).toBe(3);
            expect(result.inventory.o2Canisters).toBe(3);
        });

        it('fails execution if local inventory cannot afford offer', () => {
            const inventory = { shells: 10 };
            const myOffer = { shells: 50 };
            const peerOffer = { ammo: 100 };

            const result = executeTradeExchange({ myOffer, peerOffer, inventory });
            expect(result.success).toBe(false);
            expect(result.reason).toBe('insufficient_funds');
        });
    });

    describe('PlayerTradeManager lifecycle', () => {
        it('opens, updates offer, and closes cleanly', () => {
            const stateCallback = vi.fn();
            const manager = new PlayerTradeManager({ onStateChanged: stateCallback });

            manager.openTrade({ id: 'p2', callsign: 'TITAN-1', opClass: 'TANK' });
            expect(manager.isOpen).toBe(true);
            expect(manager.partner.callsign).toBe('TITAN-1');
            expect(stateCallback).toHaveBeenCalled();

            manager.setOfferItem(TRADEABLE_RESOURCES.SHELLS, 25);
            expect(manager.myOffer.shells).toBe(25);

            manager.handlePeerOffer({ ammo: 30 });
            expect(manager.peerOffer.ammo).toBe(30);

            manager.closeTrade();
            expect(manager.isOpen).toBe(false);
            expect(manager.partner).toBe(null);
        });

        it('requires mutual acceptance before completing trade', () => {
            const manager = new PlayerTradeManager();
            manager.openTrade({ id: 'p2', callsign: 'VIPER', opClass: 'SCOUT' });
            manager.setOfferItem('shells', 20);
            manager.handlePeerOffer({ ammo: 50 });

            const inv = { shells: 100, ammo: 0 };
            const step1 = manager.acceptTrade(inv);
            expect(manager.myAccepted).toBe(true);
            expect(manager.peerAccepted).toBe(false);
            expect(step1).toBe(true);

            manager.handlePeerAccepted();
            expect(manager.peerAccepted).toBe(true);

            const finalized = manager.finalizeExchange(inv);
            expect(finalized.success).toBe(true);
            expect(finalized.inventory.shells).toBe(80);
            expect(finalized.inventory.ammo).toBe(50);

            expect(manager.getTradeStats()).toEqual({
                completedCount: 1,
                shellsTraded: 20,
                ammoTraded: 50,
                medkitsTraded: 0,
                o2Traded: 0
            });
        });
    });
});
