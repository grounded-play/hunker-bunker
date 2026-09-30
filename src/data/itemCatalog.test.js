import { afterEach, describe, expect, it } from 'vitest';
import { getItem, getItemIds, getItemView, ITEM_KIND, RARITY_ORDER, WEAPON_PROFILES } from './itemCatalog.js';
import { armoryItemView } from '../armoryUi.js';
import { buildEquipOptions } from '../armoryOptions.js';
import { getItemCatalogEntry } from '../steamVaultUi.js';
import { FAB_RECIPES, describeRecipe } from '../fabricator.js';
import { itemCardHtml, loadoutCardViews } from '../itemCard.js';
import { CLASS_ARCHETYPES } from './classArsenal.js';
import { setLocale } from '../i18n.js';

// Sprint 48 P2 acceptance: every id resolves to the same name, rarity and icon
// on all four surfaces (Armory, Foundry, hero screen, Vault).

const CLASSES = ['scout', 'tank', 'engineer'];
const same = (view) => ({ name: view?.name, rarity: view?.rarity, icon: view?.icon });

afterEach(() => setLocale('en'));

describe('the item catalog', () => {
    it('gives every item a name, a known rarity and an icon', () => {
        for (const id of getItemIds()) {
            for (const classId of CLASSES) {
                const view = getItemView(id, { classId });
                expect(view.name, `${id}`).toBeTruthy();
                expect(RARITY_ORDER, `${id}`).toContain(view.rarity);
                expect(view.icon, `${id} has no icon`).toBeTruthy();
            }
        }
    });

    it('fits a Foundry weapon to the class gun it is fired from', () => {
        for (const id of Object.keys(WEAPON_PROFILES)) {
            for (const classId of CLASSES) {
                const item = getItem(id, { classId });
                expect(item.kind).toBe(ITEM_KIND.WEAPON_PROFILE);
                expect(CLASS_ARCHETYPES[classId].map((a) => `frame:${a}`)).toContain(item.frameId);
                expect(item.iconUrl).toBe(getItem(item.frameId).iconUrl);
            }
            expect(getItem(id, { classId: 'scout', frameId: 'frame:talon_c' }).iconUrl).toBe(getItem('frame:talon_c').iconUrl);
        }
    });

    it('never points a surface at the retired schematic placeholders', () => {
        for (const id of getItemIds()) expect(String(getItem(id).iconUrl)).not.toMatch(/schematic/);
    });
});

describe('one item, one card, on every surface', () => {
    for (const locale of ['en', 'de', 'ja']) {
        it(`Armory, Vault and hero screen agree with the catalog (${locale})`, () => {
            setLocale(locale);
            for (const id of getItemIds()) {
                if (getItem(id).kind === ITEM_KIND.WEAPON_PROFILE) continue;
                const view = getItemView(id);
                expect(same(armoryItemView(id)), `Armory ${id}`).toEqual(same(view));
                expect(same(getItemCatalogEntry(id)), `Vault ${id}`).toEqual(same(view));
                const [hero] = loadoutCardViews({ weaponSkinId: id }, { classId: 'scout' });
                expect(same(hero.view), `hero ${id}`).toEqual(same(view));
            }
        });
    }

    it('Armory picker options carry the catalog name', () => {
        const ownership = { isOwned: () => true, canEquip: () => true };
        const ids = getItemIds().filter((id) => typeof id === 'number' || String(id).startsWith('comm_'));
        for (const option of buildEquipOptions({ ids, ownership })) {
            expect(option.name, `${option.id}`).toBe(getItemView(option.id).name);
        }
    });

    it('the Foundry shows the item it grants, at that item’s rarity', () => {
        for (const recipe of FAB_RECIPES) {
            for (const classId of CLASSES) {
                const shown = describeRecipe(recipe, { classId });
                expect(same(shown), recipe.id).toEqual(same(getItemView(recipe.item, { classId })));
                expect(recipe.rarity).toBe(shown.rarity.toUpperCase());
            }
            if (recipe.output.kind !== 'weapon') expect(recipe.output.itemdefid, recipe.id).toBe(recipe.item);
        }
    });

    it('the hero strip shows a fitted Foundry weapon as the class gun, named for the profile', () => {
        const [weapon] = loadoutCardViews({ archetypeId: 'siege_breaker', craftedWeaponId: 'rail_marksman' }, { classId: 'tank' });
        expect(weapon.view.name).toBe('Rail Marksman');
        expect(weapon.view.icon).toBe(getItem('frame:siege_breaker').iconUrl);
        expect(itemCardHtml(weapon.view, { slot: 'weapon' })).toContain('Rail Marksman');
    });

    it('the hero strip falls back from profile to finish to factory frame, and shows empty slots', () => {
        const views = loadoutCardViews({ archetypeId: 'talon', weaponSkinId: '4100', charmId: null }, { classId: 'scout' });
        expect(views.map((v) => v.slot)).toEqual(['weapon', 'charm', 'bay_a', 'bay_b', 'chassis']);
        expect(views[0].view.id).toBe(4100);
        expect(views[1].view).toBeNull();
        expect(itemCardHtml(null, { slot: 'charm' })).toContain('item-card--empty');
        expect(loadoutCardViews({ archetypeId: 'talon' })[0].view.id).toBe('frame:talon');
    });
});
