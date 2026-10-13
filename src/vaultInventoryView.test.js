import { describe, expect, it } from 'vitest';
import {
    buildVaultStacks,
    filterVaultStacks,
    isVaultViewFiltered,
    kindGroupOf,
    normalizeItemdefid,
    normalizeVaultViewState,
    projectVaultInventory,
    reconcileVaultSelection,
    sortVaultStacks
} from './vaultInventoryView.js';
import { getItemCatalogEntry } from './steamVaultUi.js';

const CATALOG = {
    4100: { name: 'Frostbite Sidearm', rarity: 'uncommon', kind: 'skin' },
    4101: { name: 'Arc Decal', rarity: 'legendary', kind: 'decal' },
    4000: { name: 'Deep Relic Cache', rarity: 'common', kind: 'container' },
    4001: { name: 'Relic Key', rarity: 'common', kind: 'key' },
    7000: { name: 'Core Shard', rarity: 'rare', kind: 'shard' },
    6000: { name: 'Overclock Mod', rarity: 'epic', kind: 'mod' }
};
const lookup = (id) => CATALOG[Number(id)] ?? null;
const row = (itemId, itemdefid, quantity = 1, extra = {}) => ({ itemId, itemdefid, quantity, ...extra });

describe('buildVaultStacks', () => {
    it('renders five one-quantity rows of one definition as a single x5 stack', () => {
        const rows = [1, 2, 3, 4, 5].map((n) => row(`i${n}`, 4100));
        const { stacks } = buildVaultStacks(rows, lookup);
        expect(stacks).toHaveLength(1);
        expect(stacks[0]).toMatchObject({ key: '4100', itemdefid: '4100', quantity: 5 });
        expect(stacks[0].instances.map((r) => r.itemId)).toEqual(['i1', 'i2', 'i3', 'i4', 'i5']);
    });

    it('sums a quantity-three row with two quantity-one rows to x5', () => {
        const { stacks } = buildVaultStacks([row('a', 4100, 3), row('b', '4100', 1), row('c', 4100, 1)], lookup);
        expect(stacks).toHaveLength(1);
        expect(stacks[0].quantity).toBe(5);
    });

    it('leaves raw rows, instance ids and quantities untouched', () => {
        const rows = [row('a', 4100, 3), row('b', 4100, 2)];
        const snapshot = structuredClone(rows);
        const { stacks } = buildVaultStacks(rows, lookup);
        expect(rows).toEqual(snapshot);
        expect(stacks[0].instances[0]).toBe(rows[0]);
    });

    it('never merges rows whose actionable state differs', () => {
        const { stacks } = buildVaultStacks([row('a', 4100, 1), row('b', 4100, 1, { state: 'trade_hold' })], lookup);
        expect(stacks.map((s) => s.key)).toEqual(['4100', '4100|trade_hold']);
    });

    it('counts unknown definitions for diagnostics without breaking rendering', () => {
        const result = buildVaultStacks([row('a', 99999, 2), row('b', 99999), row('c', 4100)], lookup);
        expect(result.stacks.map((s) => s.itemdefid)).toEqual(['4100']);
        expect(result.unknown).toEqual([{ itemdefid: '99999', quantity: 3 }]);
    });

    it('skips empty or malformed rows', () => {
        const result = buildVaultStacks([row('a', 4100, 0), { itemId: 'x' }, null, row('b', 4100)], lookup);
        expect(result.stacks[0].quantity).toBe(1);
        expect(result.skippedRows).toBe(3);
    });

    it('treats a missing quantity as one instance', () => {
        expect(buildVaultStacks([{ itemId: 'a', itemdefid: 4100 }], lookup).stacks[0].quantity).toBe(1);
    });

    it('stacks the production catalog lookup without throwing', () => {
        const rows = Array.from({ length: 73 }, (_, i) => row(`r${i}`, [4100, 4000, 4001][i % 3]));
        const { stacks, unknown } = buildVaultStacks(rows, getItemCatalogEntry);
        expect(stacks).toHaveLength(3);
        expect(unknown).toEqual([]);
        expect(stacks.reduce((sum, s) => sum + s.quantity, 0)).toBe(73);
    });
});

describe('normalizers', () => {
    it('normalizes itemdefids', () => {
        expect(normalizeItemdefid(' 4100 ')).toBe('4100');
        expect(normalizeItemdefid(4100)).toBe('4100');
        expect(normalizeItemdefid('frame:talon')).toBe('frame:talon');
        expect(normalizeItemdefid('')).toBeNull();
    });

    it('maps catalog kinds to player-facing groups', () => {
        expect(kindGroupOf('skin')).toBe('cosmetic');
        expect(kindGroupOf('mod')).toBe('mod');
        expect(kindGroupOf('reagent')).toBe('material');
        expect(kindGroupOf('key')).toBe('cache');
        expect(kindGroupOf('mystery')).toBeNull();
    });

    it('rejects unknown view state', () => {
        expect(normalizeVaultViewState({ group: 'nope', rarity: 'mythic', sort: 'random' }))
            .toEqual({ query: '', group: 'all', rarity: 'all', sort: 'recent' });
        expect(isVaultViewFiltered({ query: '  ' })).toBe(false);
        expect(isVaultViewFiltered({ rarity: 'epic' })).toBe(true);
    });
});

describe('filters and sorting operate on stacks', () => {
    const rows = [
        row('a', 4001, 4), row('b', 4100), row('c', 4101), row('d', 4100), row('e', 7000, 9), row('f', 6000), row('g', 4000)
    ];
    const { stacks } = buildVaultStacks(rows, lookup);

    it('searches by display name and by item definition id', () => {
        expect(filterVaultStacks(stacks, { query: 'frost' }).map((s) => s.itemdefid)).toEqual(['4100']);
        expect(filterVaultStacks(stacks, { query: '4101' }).map((s) => s.itemdefid)).toEqual(['4101']);
    });

    it('composes group and rarity so every visible stack satisfies both', () => {
        const visible = filterVaultStacks(stacks, { group: 'cosmetic', rarity: 'legendary' });
        expect(visible.map((s) => s.itemdefid)).toEqual(['4101']);
        for (const stack of filterVaultStacks(stacks, { group: 'cache' })) expect(stack.group).toBe('cache');
    });

    it('sorts by service order, name, rarity and quantity', () => {
        expect(sortVaultStacks(stacks, 'recent').map((s) => s.itemdefid)).toEqual(['4001', '4100', '4101', '7000', '6000', '4000']);
        expect(sortVaultStacks(stacks, 'name')[0].catalog.name).toBe('Arc Decal');
        expect(sortVaultStacks(stacks, 'rarity').map((s) => s.catalog.rarity).slice(0, 3)).toEqual(['legendary', 'epic', 'rare']);
        expect(sortVaultStacks(stacks, 'quantity').map((s) => s.quantity).slice(0, 3)).toEqual([9, 4, 2]);
    });

    it('reports type and item totals, filtered and unfiltered', () => {
        const all = projectVaultInventory(rows, {}, lookup);
        expect(all).toMatchObject({ totalTypes: 6, totalItems: 18, filtered: false });
        const some = projectVaultInventory(rows, { group: 'cache' }, lookup);
        expect(some.visible).toHaveLength(2);
        expect(some.visibleItems).toBe(5);
        expect(some.filtered).toBe(true);
    });
});

describe('reconcileVaultSelection', () => {
    const stacks = [{ key: '4100' }, { key: '4001' }];

    it('keeps the selected definition across a refresh', () => {
        expect(reconcileVaultSelection('4001', stacks)).toBe('4001');
    });

    it('falls back to the first visible stack, or clears', () => {
        expect(reconcileVaultSelection('9999', stacks)).toBe('4100');
        expect(reconcileVaultSelection(null, stacks)).toBe('4100');
        expect(reconcileVaultSelection('4100', [])).toBeNull();
    });
});
