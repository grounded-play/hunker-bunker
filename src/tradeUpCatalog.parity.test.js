import { describe, expect, it } from 'vitest';
import { TRADE_UP_ITEMS } from '../server/tradeUpCatalog.js';
import { DISPENSARY_COST_BY_RARITY as SERVER_COST, SHARD_ITEMDEFID as SERVER_SHARD, TRADE_UP_INPUT_COUNT } from '../server/steamTradeUp.js';
import { DISPENSARY_COST_BY_RARITY, SHARD_ITEMDEFID, SMELT_INPUT_COUNT } from './craftingMatrix.js';
import { deriveTradeUpItems } from './tradeUpCollection.js';
import { getItem } from './data/itemCatalog.js';

// The backend image carries only server/, so it has its own copy of the
// trade-up collection and prices. These must match the client exactly, or a
// trade the Vault offers would be refused (or priced differently) by Steam.
describe('trade-up rules, client and server', () => {
    it('server/tradeUpCatalog.js is current (node scripts/build-trade-up-catalog.js)', () => {
        expect({ ...TRADE_UP_ITEMS }).toEqual(deriveTradeUpItems());
    });

    it('agree on input count, shard item and dispensary prices', () => {
        expect(TRADE_UP_INPUT_COUNT).toBe(SMELT_INPUT_COUNT);
        expect(SERVER_SHARD).toBe(SHARD_ITEMDEFID);
        expect({ ...SERVER_COST }).toEqual({ ...DISPENSARY_COST_BY_RARITY });
    });

    it('every tier that can be traded up has an output, and every entry matches the shared catalog', () => {
        const tiers = new Set(Object.values(TRADE_UP_ITEMS));
        for (const tier of ['uncommon', 'rare', 'epic', 'legendary']) expect(tiers.has(tier)).toBe(true);
        for (const [id, rarity] of Object.entries(TRADE_UP_ITEMS)) expect(getItem(Number(id)).rarity).toBe(rarity);
    });
});
