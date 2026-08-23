import { describe, expect, it } from 'vitest';
import { buildEquipOptions } from './armoryOptions.js';
import { createOwnershipStore } from './itemOwnership.js';

function storeWith(ownedIds = [], { unlockAll = false } = {}) {
    const store = createOwnershipStore({ storage: null });
    for (const id of ownedIds) store.grantDev(id, 1);
    if (unlockAll) store.setUnlockAll(true);
    return store;
}

describe('buildEquipOptions', () => {
    it('lists every candidate, owned or not', () => {
        const opts = buildEquipOptions({
            ids: [4112, 4113, 4114],
            ownership: storeWith([4112])
        });
        expect(opts.map((o) => o.id)).toEqual([4112, 4113, 4114]);
    });

    it('disables and labels the unowned ones', () => {
        const opts = buildEquipOptions({
            ids: [4112, 4113],
            ownership: storeWith([4112])
        });
        const [owned, locked] = opts;
        expect(owned).toMatchObject({ owned: true, disabled: false });
        expect(owned.label).not.toMatch(/LOCKED/);
        expect(locked).toMatchObject({ owned: false, disabled: true });
        expect(locked.label).toMatch(/LOCKED/);
    });

    it('names items from the unified catalog, including ones the old armory subset dropped', () => {
        const [opt] = buildEquipOptions({ ids: [4110], ownership: storeWith([4110]) });
        // 4110 was absent from armoryUi's CATALOG_ITEMS, so it used to render
        // as the bare string "4110".
        expect(opt.label).toContain("Queen's Carapace Carbine");
        expect(opt.label).toContain('LEGENDARY');
    });

    it('marks the selected option', () => {
        const opts = buildEquipOptions({
            ids: [4112, 4113],
            selectedId: 4113,
            ownership: storeWith([4112, 4113])
        });
        expect(opts.find((o) => o.id === 4113).selected).toBe(true);
        expect(opts.find((o) => o.id === 4112).selected).toBe(false);
    });

    it('compares the selection by value so a string id still matches', () => {
        const opts = buildEquipOptions({
            ids: [4112],
            selectedId: '4112',
            ownership: storeWith([4112])
        });
        expect(opts[0].selected).toBe(true);
    });

    it('keeps an equipped-but-unowned item visible and selected rather than silently dropping it', () => {
        // Reconciliation should have cleared this, but if it is still equipped
        // the dropdown must show what is actually on the operator.
        const opts = buildEquipOptions({
            ids: [4112, 4113],
            selectedId: 4113,
            ownership: storeWith([4112])
        });
        const stale = opts.find((o) => o.id === 4113);
        expect(stale.selected).toBe(true);
        expect(stale.owned).toBe(false);
    });

    it('enables everything under UNLOCK ALL but still reports true ownership', () => {
        const opts = buildEquipOptions({
            ids: [4112, 4113],
            ownership: storeWith([4112], { unlockAll: true })
        });
        expect(opts.every((o) => o.disabled === false)).toBe(true);
        expect(opts.find((o) => o.id === 4113).owned).toBe(false);
        expect(opts.find((o) => o.id === 4113).label).toMatch(/DEV UNLOCK/);
    });

    it('skips ids that are not in the catalog', () => {
        const opts = buildEquipOptions({ ids: [4112, 999999], ownership: storeWith([4112]) });
        expect(opts.map((o) => o.id)).toEqual([4112]);
    });

    it('returns an empty list for empty input rather than throwing', () => {
        expect(buildEquipOptions({ ids: [], ownership: storeWith() })).toEqual([]);
        expect(buildEquipOptions({ ownership: storeWith() })).toEqual([]);
    });

    it('sorts locked items after owned ones when asked', () => {
        const opts = buildEquipOptions({
            ids: [4112, 4113, 4114],
            ownership: storeWith([4114]),
            ownedFirst: true
        });
        expect(opts.map((o) => o.id)).toEqual([4114, 4112, 4113]);
    });
});
