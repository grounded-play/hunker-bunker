import { describe, expect, it } from 'vitest';
import { FOUNDRY_HUB_FLAG, HUB_TAB_IDS, HUB_TAB_PANELS, cycleHubTab, hubClassTheme, isFoundryHubEnabled, normalizeHubTab, resolveHubTabs } from './foundryHub.js';

const storage = (value) => ({ getItem: (key) => (key === FOUNDRY_HUB_FLAG ? value : null) });

describe('Foundry hub tabs', () => {
    it('always offers Stash, Loadout, Fabricate and Trade-up, in the owner’s order', () => {
        expect(HUB_TAB_IDS).toEqual(['stash', 'loadout', 'fabricate', 'tradeup', 'store']);
        const visible = resolveHubTabs().filter((tab) => !tab.hidden).map((tab) => tab.id);
        expect(visible).toEqual(['stash', 'loadout', 'fabricate', 'tradeup']);
    });

    it('locks Fabricate until the Foundry is activated in a playthrough, and only Fabricate', () => {
        expect(resolveHubTabs({ foundryActivated: false }).filter((tab) => tab.locked).map((tab) => tab.id)).toEqual(['fabricate']);
        expect(resolveHubTabs({ foundryActivated: true }).some((tab) => tab.locked)).toBe(false);
    });

    it('hides Store when purchases are unavailable, as the Vault does, and falls back to Stash', () => {
        const tabs = resolveHubTabs({ storeAvailable: false });
        expect(normalizeHubTab('store', tabs)).toBe('stash');
        expect(normalizeHubTab('store', resolveHubTabs({ storeAvailable: true }))).toBe('store');
        expect(normalizeHubTab('nonsense', tabs)).toBe('stash');
        expect(normalizeHubTab('fabricate', tabs)).toBe('fabricate');
    });

    it('shows the Vault’s and Fab Bay’s own panels, so their renderers keep working', () => {
        expect(HUB_TAB_PANELS.stash).toEqual(['vault-inventory-layout']);
        expect(HUB_TAB_PANELS.tradeup).toEqual(['vault-smelter-layout']);
        expect(HUB_TAB_PANELS.store).toEqual(['vault-store-layout']);
        expect(HUB_TAB_PANELS.fabricate).toContain('fab-recipe-grid');
    });

    it('themes by class and falls back to Scout', () => {
        expect(hubClassTheme('TANK')).toBe('tank');
        expect(hubClassTheme('engineer')).toBe('engineer');
        expect(hubClassTheme(undefined)).toBe('scout');
    });

    it('is on unless opted out in storage or the URL; the URL wins', () => {
        expect(isFoundryHubEnabled(storage(null), '')).toBe(true);
        expect(isFoundryHubEnabled(storage('0'), '')).toBe(false);
        expect(isFoundryHubEnabled(storage('0'), `?${FOUNDRY_HUB_FLAG}=1`)).toBe(true);
        expect(isFoundryHubEnabled(storage(null), `?${FOUNDRY_HUB_FLAG}=0`)).toBe(false);
        expect(isFoundryHubEnabled({ getItem: () => { throw new Error('blocked'); } }, '')).toBe(true);
    });

    it('locks Trade-up where trades cannot run, but keeps it visible to explain why', () => {
        const tradeup = resolveHubTabs({ tradeUpAvailable: false }).find((tab) => tab.id === 'tradeup');
        expect(tradeup).toMatchObject({ locked: true, hidden: false });
    });

    it('steps through visible tabs and wraps, skipping a hidden Store', () => {
        const tabs = resolveHubTabs({ storeAvailable: false });
        expect(cycleHubTab('stash', 1, tabs)).toBe('loadout');
        expect(cycleHubTab('tradeup', 1, tabs)).toBe('stash');
        expect(cycleHubTab('stash', -1, tabs)).toBe('tradeup');
        expect(cycleHubTab(null, 1, tabs)).toBe('loadout');
    });
});

// QA 2026-10-01 (S49-10): closing the hub left the controller focused on a
// bare <div>, so the player had to hunt for focus on the main menu. The hub
// hands focus back to whatever opened it.
describe('Foundry hub focus', () => {
    function fakeElement(id = null) {
        const classes = new Set(id === 'foundry-hub-modal' ? ['hidden'] : []);
        return {
            id, dataset: {}, hidden: false, textContent: '', isConnected: true,
            classList: {
                add: (c) => classes.add(c), remove: (c) => classes.delete(c),
                contains: (c) => classes.has(c),
                toggle: (c, on) => (on ? classes.add(c) : classes.delete(c))
            },
            setAttribute() {}, addEventListener() {}, appendChild() {}, insertBefore() {}, closest: () => null
        };
    }
    function fakeDocument(opener) {
        const els = new Map(['foundry-hub-modal', 'foundry-hub-tabs', 'foundry-hub-panel', 'foundry-hub-loadout'].map((id) => [id, fakeElement(id)]));
        return {
            activeElement: opener,
            getElementById: (id) => els.get(id) ?? null,
            createElement: () => fakeElement(),
            createComment: () => fakeElement()
        };
    }

    it('returns focus to the button that opened it', async () => {
        const { createFoundryHub } = await import('./foundryHub.js');
        const opener = fakeElement('steam-vault-btn');
        const doc = fakeDocument(opener);
        const focused = [];
        const hub = createFoundryHub({ document: doc, focus: (el) => focused.push(el) });
        hub.open('stash');
        hub.close();
        expect(focused.at(-1)).toBe(opener);
    });

    it('does not focus an opener that has left the page', async () => {
        const { createFoundryHub } = await import('./foundryHub.js');
        const opener = fakeElement('steam-vault-btn');
        const doc = fakeDocument(opener);
        const focused = [];
        const hub = createFoundryHub({ document: doc, focus: (el) => focused.push(el) });
        hub.open('stash');
        opener.isConnected = false;
        hub.close();
        expect(focused).not.toContain(opener);
    });
});
