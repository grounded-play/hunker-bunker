// The Foundry hub (Sprint 48 P2, owner design 2026-09-24): one window with
// Stash / Loadout / Fabricate / Trade-up / Store tabs instead of two
// unconnected ones (the Steam Vault from the main menu, the Fab Bay in a run).
// Making things stays locked until the Foundry is activated in a playthrough;
// resources are always in the header.
//
// This is the skeleton: its tabs show the existing screens' panels, moved in
// while the hub is open and put back when it closes, so every renderer,
// listener and id keeps working. The Loadout tab draws the class's items with
// the shared item card. Behind `hb_foundry_hub=1` until the owner has seen it
// on hardware; the Vault and Fab Bay stay the default entry points meanwhile.
import { t } from './i18n.js';

export const FOUNDRY_HUB_FLAG = 'hb_foundry_hub';
export const HUB_TAB_IDS = Object.freeze(['stash', 'loadout', 'fabricate', 'tradeup', 'store']);

const TAB_LABEL_KEYS = Object.freeze({
    stash: 'ui.foundry_hub.tab_stash',
    loadout: 'ui.foundry_hub.tab_loadout',
    fabricate: 'ui.foundry_hub.tab_fabricate',
    tradeup: 'ui.foundry_hub.tab_tradeup',
    store: 'ui.foundry_hub.tab_store'
});

// Panels of the existing screens each tab shows, by element id.
export const HUB_TAB_PANELS = Object.freeze({
    stash: Object.freeze(['vault-inventory-layout']),
    loadout: Object.freeze([]),
    fabricate: Object.freeze(['fab-summary', 'fab-roll-panel', 'fab-recipe-grid']),
    tradeup: Object.freeze(['vault-smelter-layout']),
    store: Object.freeze(['vault-store-layout'])
});

export function isFoundryHubEnabled(storage = (typeof localStorage !== 'undefined' ? localStorage : null), search = (typeof location !== 'undefined' ? location.search : '')) {
    try {
        if (new URLSearchParams(search ?? '').get(FOUNDRY_HUB_FLAG) === '1') return true;
        return storage?.getItem?.(FOUNDRY_HUB_FLAG) === '1';
    } catch {
        return false;
    }
}

/**
 * The tab bar for the current state. Fabricate is shown but locked until the
 * Foundry is activated (its panel then shows what unlocks it and the progress
 * toward the cost); Store is hidden when purchases are unavailable, as the
 * Vault hides it.
 */
export function resolveHubTabs({ foundryActivated = false, storeAvailable = false } = {}) {
    return HUB_TAB_IDS.map((id) => ({
        id,
        labelKey: TAB_LABEL_KEYS[id],
        locked: id === 'fabricate' && !foundryActivated,
        hidden: id === 'store' && !storeAvailable
    }));
}

export function normalizeHubTab(tab, tabs) {
    const visible = tabs.filter((entry) => !entry.hidden).map((entry) => entry.id);
    return visible.includes(tab) ? tab : visible[0];
}

export function hubClassTheme(classId) {
    const id = String(classId ?? '').toLowerCase();
    return ['scout', 'tank', 'engineer'].includes(id) ? id : 'scout';
}

export function createFoundryHub({
    document: doc = (typeof document !== 'undefined' ? document : null),
    getBank = () => ({}),
    getClassId = () => 'scout',
    isFoundryActivated = () => false,
    isStoreAvailable = () => false,
    onTabShown = {},
    renderLoadout = () => {},
    onClose = () => {},
    log = () => {}
} = {}) {
    const modal = doc?.getElementById('foundry-hub-modal');
    const tabBar = doc?.getElementById('foundry-hub-tabs');
    const panel = doc?.getElementById('foundry-hub-panel');
    const loadoutPanel = doc?.getElementById('foundry-hub-loadout');
    const borrowed = [];
    let activeTab = null;
    let resourceTimer = null;

    function refreshResources() {
        const bank = getBank() ?? {};
        for (const key of ['tech', 'coin', 'med', 'shells']) {
            const el = doc?.getElementById(`foundry-hub-${key}`);
            if (el) el.textContent = String(bank[key] ?? 0);
        }
    }

    // Put every borrowed panel back exactly where it came from, in its
    // original visibility, so the Vault and Fab Bay open as before.
    function returnPanels() {
        while (borrowed.length) {
            const { element, marker, wasHidden } = borrowed.pop();
            marker.parentNode?.insertBefore(element, marker);
            marker.remove();
            element.classList.toggle('hidden', wasHidden);
        }
    }

    function borrowPanels(tab) {
        for (const id of HUB_TAB_PANELS[tab] ?? []) {
            const element = doc.getElementById(id);
            if (!element) continue;
            const marker = doc.createComment(`foundry-hub:${id}`);
            element.parentNode?.insertBefore(marker, element);
            borrowed.push({ element, marker, wasHidden: element.classList.contains('hidden') });
            panel.appendChild(element);
            element.classList.remove('hidden');
        }
    }

    function renderTabs(tabs) {
        if (!tabBar) return;
        tabBar.innerHTML = '';
        for (const tab of tabs) {
            if (tab.hidden) continue;
            const button = doc.createElement('button');
            button.type = 'button';
            button.className = 'foundry-hub__tab';
            button.dataset.tab = tab.id;
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-selected', String(tab.id === activeTab));
            button.classList.toggle('is-active', tab.id === activeTab);
            button.classList.toggle('is-locked', tab.locked);
            button.textContent = `${tab.locked ? '🔒 ' : ''}${t(tab.labelKey)}`;
            button.addEventListener('click', () => select(tab.id));
            tabBar.appendChild(button);
        }
    }

    function select(tab) {
        if (!modal || !panel) return null;
        const tabs = resolveHubTabs({ foundryActivated: isFoundryActivated(), storeAvailable: isStoreAvailable() });
        const next = normalizeHubTab(tab, tabs);
        returnPanels();
        activeTab = next;
        modal.dataset.hubTab = next;
        modal.dataset.hubClass = hubClassTheme(getClassId());
        renderTabs(tabs);
        loadoutPanel?.classList.toggle('hidden', next !== 'loadout');
        if (next === 'loadout') renderLoadout(loadoutPanel);
        else borrowPanels(next);
        onTabShown[next]?.();
        refreshResources();
        log('tab', { tab: next, locked: tabs.find((entry) => entry.id === next)?.locked ?? false });
        return next;
    }

    function open(tab = 'stash') {
        if (!modal) return null;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        const shown = select(tab);
        if (resourceTimer == null && typeof setInterval === 'function') resourceTimer = setInterval(refreshResources, 500);
        log('open', { tab: shown });
        return shown;
    }

    function close() {
        if (!modal || modal.classList.contains('hidden')) return;
        returnPanels();
        activeTab = null;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        if (resourceTimer != null) clearInterval(resourceTimer);
        resourceTimer = null;
        log('close', {});
        onClose();
    }

    return {
        open,
        close,
        select,
        refreshResources,
        isOpen: () => Boolean(modal) && !modal.classList.contains('hidden'),
        getActiveTab: () => activeTab
    };
}
