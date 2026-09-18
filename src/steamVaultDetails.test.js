import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { setLocale } from './i18n.js';
import { updateDetailsPanel } from './steamVaultUi.js';

/**
 * The Steam Vault's detail panel used to bail out on a missing item, leaving
 * whatever English was authored in index.html on screen. A player whose vault
 * is empty therefore read that panel in English in every locale, and it could
 * not be fixed with a data-i18n annotation: once an item IS selected the same
 * elements hold its catalog name, which a locale change would then overwrite
 * with the placeholder. JS owns both states instead.
 */
describe('vault details panel empty state', () => {
    let els;

    const el = (seed) => ({ textContent: seed, style: {}, classList: { add: vi.fn(), remove: vi.fn() } });

    beforeEach(() => {
        els = {
            'vault-details-name': el('SELECT AN ITEM'),
            'vault-details-rarity': el('—'),
            'vault-details-desc': el('Select an item to view Steam ownership and trade metadata.'),
            'vault-meta-tradable': el('TRADABLE'),
            'vault-meta-marketable': el('MARKETABLE'),
            'vault-equip-status': el('READ-ONLY STEAM INVENTORY'),
            'vault-btn-equip': el(''),
            'vault-btn-unequip': el(''),
            'vault-btn-view-market': el('')
        };
        vi.stubGlobal('document', { getElementById: (id) => els[id] ?? null });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        setLocale('en');
    });

    it('paints the placeholder in the active locale rather than leaving markup English', () => {
        setLocale('ja');
        updateDetailsPanel(null);
        expect(els['vault-details-name'].textContent).toBe('アイテムを選択');
        expect(els['vault-details-desc'].textContent).not.toContain('Select an item');
        expect(els['vault-equip-status'].textContent).not.toContain('READ-ONLY');
    });

    it('keeps English text when English is the active locale', () => {
        setLocale('en');
        updateDetailsPanel(null);
        expect(els['vault-details-name'].textContent).toBe('SELECT AN ITEM');
        expect(els['vault-equip-status'].textContent).toBe('READ-ONLY STEAM INVENTORY');
    });

    it('hides the item action buttons when nothing is selected', () => {
        updateDetailsPanel(null);
        for (const id of ['vault-btn-equip', 'vault-btn-unequip', 'vault-btn-view-market']) {
            expect(els[id].classList.add).toHaveBeenCalledWith('hidden');
        }
    });

    it('treats an item missing from the catalog as empty rather than blanking the panel', () => {
        setLocale('en');
        updateDetailsPanel({ itemdefid: 999999 });
        expect(els['vault-details-name'].textContent).toBe('SELECT AN ITEM');
    });
});
