import { describe, expect, it } from 'vitest';
import {
    DISPENSARY_COST_BY_RARITY,
    DUPLICATE_SHARD_BONUS,
    SHARD_ITEMDEFID,
    canSmelt,
    countByRarity,
    getShardBalance,
    planDispensaryRedeem,
    planSmelt,
    resolveDuplicateGrant
} from './craftingMatrix.js';

const CATALOG = {
    100: { rarity: 'uncommon' },
    101: { rarity: 'uncommon' },
    200: { rarity: 'rare' },
    201: { rarity: 'rare' },
    300: { rarity: 'epic' },
    400: { rarity: 'legendary' }
};
const lookup = (id) => CATALOG[id] ?? null;

describe('craftingMatrix: countByRarity / canSmelt', () => {
    it('sums quantities per rarity across multiple stacks', () => {
        const items = [
            { itemdefid: 100, quantity: 3 },
            { itemdefid: 101, quantity: 2 },
            { itemdefid: 200, quantity: 1 }
        ];
        expect(countByRarity(items, lookup)).toEqual({ uncommon: 5, rare: 1 });
    });

    it('requires at least 5 items of a rarity to smelt', () => {
        expect(canSmelt([{ itemdefid: 100, quantity: 4 }], 'uncommon', lookup)).toBe(false);
        expect(canSmelt([{ itemdefid: 100, quantity: 5 }], 'uncommon', lookup)).toBe(true);
    });

    it('legendary has no next tier', () => {
        expect(canSmelt([{ itemdefid: 400, quantity: 10 }], 'legendary', lookup)).toBe(false);
    });
});

describe('craftingMatrix: planSmelt', () => {
    it('consumes exactly 5 items of the input rarity and outputs the next tier', () => {
        const vaultItems = [
            { itemdefid: 100, quantity: 3 },
            { itemdefid: 101, quantity: 3 }
        ];
        const plan = planSmelt({ vaultItems, rarity: 'uncommon', catalogLookup: lookup, outputPool: [200, 201], rng: () => 0 });
        expect(plan.ok).toBe(true);
        expect(plan.outputRarity).toBe('rare');
        expect(plan.outputItemdefid).toBe(200);
        const totalConsumed = plan.consumed.reduce((sum, c) => sum + c.quantity, 0);
        expect(totalConsumed).toBe(5);
    });

    it('fails with insufficient_items when fewer than 5 are owned', () => {
        const plan = planSmelt({ vaultItems: [{ itemdefid: 100, quantity: 2 }], rarity: 'uncommon', catalogLookup: lookup, outputPool: [200] });
        expect(plan).toEqual({ ok: false, reason: 'insufficient_items' });
    });

    it('fails with max_tier for legendary input', () => {
        const plan = planSmelt({ vaultItems: [{ itemdefid: 400, quantity: 10 }], rarity: 'legendary', catalogLookup: lookup, outputPool: [] });
        expect(plan).toEqual({ ok: false, reason: 'max_tier' });
    });

    it('fails with no_output_pool when no catalog items exist at the target tier', () => {
        const plan = planSmelt({ vaultItems: [{ itemdefid: 100, quantity: 5 }], rarity: 'uncommon', catalogLookup: lookup, outputPool: [] });
        expect(plan).toEqual({ ok: false, reason: 'no_output_pool' });
    });

    it('selects among eligible outputs using the provided rng', () => {
        const vaultItems = [{ itemdefid: 100, quantity: 5 }];
        const plan = planSmelt({ vaultItems, rarity: 'uncommon', catalogLookup: lookup, outputPool: [200, 201], rng: () => 0.999999 });
        expect(plan.outputItemdefid).toBe(201);
    });
});

describe('craftingMatrix: duplicate-protection dispensary', () => {
    it('grants no bonus shards when the item is not already owned', () => {
        expect(resolveDuplicateGrant(200, [], lookup)).toEqual({ isDuplicate: false, bonusShards: 0 });
    });

    it('grants rarity-scaled bonus shards on a confirmed duplicate', () => {
        const owned = [{ itemdefid: 300, quantity: 1 }];
        expect(resolveDuplicateGrant(300, owned, lookup)).toEqual({ isDuplicate: true, bonusShards: DUPLICATE_SHARD_BONUS.epic });
    });

    it('reads the shard balance from the SHARD_ITEMDEFID stack', () => {
        expect(getShardBalance([{ itemdefid: SHARD_ITEMDEFID, quantity: 42 }])).toBe(42);
        expect(getShardBalance([])).toBe(0);
    });

    it('plans a redemption when shards cover the rarity cost', () => {
        const vaultItems = [{ itemdefid: SHARD_ITEMDEFID, quantity: DISPENSARY_COST_BY_RARITY.rare }];
        const plan = planDispensaryRedeem(vaultItems, 200, lookup);
        expect(plan).toEqual({ ok: true, cost: DISPENSARY_COST_BY_RARITY.rare, targetItemdefid: 200, rarity: 'rare' });
    });

    it('rejects a redemption when shards are short', () => {
        const vaultItems = [{ itemdefid: SHARD_ITEMDEFID, quantity: 1 }];
        expect(planDispensaryRedeem(vaultItems, 200, lookup)).toEqual({ ok: false, reason: 'insufficient_shards' });
    });

    it('rejects an unknown item id', () => {
        expect(planDispensaryRedeem([], 99999, lookup)).toEqual({ ok: false, reason: 'unknown_item' });
    });
});
