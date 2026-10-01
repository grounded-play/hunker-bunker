import { describe, expect, it } from 'vitest';
import {
    EQUIPMENT_DEFINITIONS,
    composeEquipmentModifiers,
    getEquipmentDefinition,
    getEquipmentStatus
} from './data/equipmentDefinitions.js';
import { STEAM_ITEM_CATALOG } from './data/steamItemCatalog.js';
import { createOwnershipStore, DEV_GRANTS_STORAGE_KEY } from './itemOwnership.js';
import { DEEP_RELIC_CACHE_DROP_TABLE } from '../server/lootTables.js';
import { LoadoutManager } from './loadout.js';

describe('S49-23: Enforce earned power, trusted ownership, and fairness gates', () => {
    describe('Catalog and drop-table power audit', () => {
        it('ensures no non-charm marketable item has combat modifiers', () => {
            for (const [id, entry] of Object.entries(STEAM_ITEM_CATALOG)) {
                if (!entry.marketable) continue;
                const definition = getEquipmentDefinition(id);
                if (definition) {
                    // Only charms may have definitions, and they MUST be gated by attunement rank
                    expect(definition.family).toBe('charm');
                    expect(definition.attunement).toBe(true);
                    expect(typeof definition.attunementRank).toBe('number');
                    expect(definition.modePolicy?.pvp).toBe('disabled');
                }
            }
        });

        it('ensures all paid cache drop table items have zero combat modifiers', () => {
            for (const drop of DEEP_RELIC_CACHE_DROP_TABLE) {
                const def = getEquipmentDefinition(drop.itemdefid);
                expect(def).toBeNull();
            }
        });

        it('ensures all overclock items with direct combat modifiers are non-marketable and non-tradable', () => {
            const definitions = Object.values(EQUIPMENT_DEFINITIONS);
            const overclocks = definitions.filter((d) => d.family === 'overclock');
            expect(overclocks.length).toBeGreaterThanOrEqual(16);

            for (const mod of overclocks) {
                const catalogEntry = STEAM_ITEM_CATALOG[String(mod.id)];
                if (catalogEntry) {
                    expect(catalogEntry.marketable).toBe(false);
                    expect(catalogEntry.tradable).toBe(false);
                }
            }
        });
    });

    describe('Cosmetic charm ownership vs earned attunement split', () => {
        it('buying/owning a cosmetic charm alone without attunement rank grants zero combat advantage in solo or co-op', () => {
            let playerRank = 0;
            const lo = new LoadoutManager({
                storage: null,
                attunementTierProvider: () => playerRank
            });

            // Player equips Mini Cryo-Core (4130, requires Rank 3)
            lo.equipCharm('scout', '4130');
            expect(lo.getEquippedCharmId('scout')).toBe('4130');

            // At rank 0, charm is not attuned
            expect(lo.isCharmAttuned('4130')).toBe(false);
            const soloModifiers = lo.getActiveModifiers('scout', 'solo');
            expect(soloModifiers.cryoDurationMultiplier).toBe(1.0);

            const coOpModifiers = lo.getActiveModifiers('scout', 'co-op');
            expect(coOpModifiers.cryoDurationMultiplier).toBe(1.0);

            const status = getEquipmentStatus('4130', { attuned: false });
            expect(status).toMatchObject({
                active: false,
                modeStatus: 'ATTUNEMENT UNLOCKS AT RANK 3'
            });
        });

        it('earning attunement rank in gameplay unlocks the combat attunement for free', () => {
            let playerRank = 3;
            const lo = new LoadoutManager({
                storage: null,
                attunementTierProvider: () => playerRank
            });

            lo.equipCharm('scout', '4130');
            expect(lo.isCharmAttuned('4130')).toBe(true);

            // Attuned charm applies its authored modifier in solo and co-op
            const soloModifiers = lo.getActiveModifiers('scout', 'solo');
            expect(soloModifiers.cryoDurationMultiplier).toBeCloseTo(1.05);

            // Reconciling ownership without a Steam inventory copy does NOT strip the earned attunement
            lo.reconcileOwnership([]);
            expect(lo.getEquippedCharmId('scout')).toBe('4130');
        });

        it('disables all equipment modifiers in competitive PvP mode', () => {
            let playerRank = 30;
            const lo = new LoadoutManager({
                storage: null,
                attunementTierProvider: () => playerRank
            });

            // Equip fully attuned charm and overclocks
            lo.equipCharm('scout', '4139'); // Golden Sub-Bunker Key (Rank 30)
            lo.equipRigModule('scout', 1, '4140'); // Cryo-Capacitor
            lo.equipRigModule('scout', 2, '4160'); // Ballast Plating

            // In solo, modifiers are active
            const solo = lo.getActiveModifiers('scout', 'solo');
            expect(solo.salvageValueMultiplier).toBeCloseTo(1.10);
            expect(solo.maxHealthBonus).toBe(2);

            // In competitive PvP, ALL modifiers are normalized/disabled
            const pvp = lo.getActiveModifiers('scout', 'pvp');
            expect(pvp.salvageValueMultiplier).toBe(1.0);
            expect(pvp.maxHealthBonus).toBe(0);
            expect(pvp.cryoDurationMultiplier).toBe(1.0);
            expect(pvp.moveSpeedMultiplier).toBe(1.0);

            // Direct composer confirms empty modifier dict in PvP
            expect(composeEquipmentModifiers(['4139', '4140', '4160'], { mode: 'pvp' })).toEqual({});
        });
    });

    describe('Local and forged inventory cannot unlock backend-owned value', () => {
        it('rejects local dev grants and storage forgery when local inventory is disallowed (live mode)', () => {
            const fakeStorage = {
                data: {
                    [DEV_GRANTS_STORAGE_KEY]: JSON.stringify({ 4001: 50, 4000: 20 })
                },
                getItem(k) { return this.data[k] ?? null; },
                setItem(k, v) { this.data[k] = v; },
                removeItem(k) { delete this.data[k]; }
            };

            const liveStore = createOwnershipStore({
                storage: fakeStorage,
                allowLocalInventory: false
            });

            // Live store disallows local inventory and ignores forged storage
            expect(liveStore.isLocalInventoryAllowed()).toBe(false);
            expect(liveStore.isOwned(4001)).toBe(false);
            expect(liveStore.getQuantity(4001)).toBe(0);
            expect(liveStore.isOwned(4000)).toBe(false);

            // Attempting to grant via client dev methods fails
            const grantResult = liveStore.grantDev(4001, 10);
            expect(grantResult).toBe(false);
            expect(liveStore.getQuantity(4001)).toBe(0);

            const setDevResult = liveStore.setDevInventory([{ itemdefid: 4001, quantity: 10 }]);
            expect(setDevResult).toBe(false);
            expect(liveStore.getQuantity(4001)).toBe(0);
        });

        it('requires valid backend steam inventory for paid items', () => {
            const store = createOwnershipStore({ allowLocalInventory: false });

            // Only genuine setSteamInventory accepts entitlements
            store.setSteamInventory([{ itemdefid: 4001, quantity: 3 }]);
            expect(store.isOwned(4001)).toBe(true);
            expect(store.getQuantity(4001)).toBe(3);

            // Consuming or updating inventory resets it correctly
            store.setSteamInventory([]);
            expect(store.isOwned(4001)).toBe(false);
            expect(store.getQuantity(4001)).toBe(0);
        });
    });
});
