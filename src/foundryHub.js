// The Foundry hub (Sprint 48 P2, owner design 2026-09-24): one window with
// Stash / Loadout / Fabricate / Trade-up / Store tabs instead of two
// unconnected ones (the Steam Vault from the main menu, the Fab Bay in a run).
// Making things stays locked until the Foundry is activated in a playthrough;
// resources are always in the header.
//
// This is the skeleton: its tabs show the existing screens' panels, moved in
// while the hub is open and put back when it closes, so every renderer,
// listener and id keeps working. The Loadout tab draws the class's items with
// the shared item card. On by default; `hb_foundry_hub=0` (storage or URL)
// falls back to the separate Vault and Fab Bay windows.
import { t, onLocaleChange } from './i18n.js';

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
        const fromUrl = new URLSearchParams(search ?? '').get(FOUNDRY_HUB_FLAG);
        if (fromUrl === '0' || fromUrl === '1') return fromUrl === '1';
        return storage?.getItem?.(FOUNDRY_HUB_FLAG) !== '0';
    } catch {
        return true;
    }
}

/**
 * The tab bar for the current state. Fabricate is shown but locked until the
 * Foundry is activated (its panel then shows what unlocks it and the progress
 * toward the cost); Store is hidden when purchases are unavailable, as the
 * Vault hides it.
 */
export function resolveHubTabs({ foundryActivated = false, storeAvailable = false, tradeUpAvailable = true } = {}) {
    return HUB_TAB_IDS.map((id) => ({
        id,
        labelKey: TAB_LABEL_KEYS[id],
        locked: (id === 'fabricate' && !foundryActivated) || (id === 'tradeup' && !tradeUpAvailable),
        hidden: id === 'store' && !storeAvailable
    }));
}

export function cycleHubTab(current, direction, tabs) {
    const visible = tabs.filter((entry) => !entry.hidden).map((entry) => entry.id);
    if (!visible.length) return null;
    const index = Math.max(0, visible.indexOf(current));
    return visible[(index + direction + visible.length) % visible.length];
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
    isTradeUpAvailable = () => true,
    onTabShown = {},
    renderLoadout = () => {},
    focus = (element) => element?.focus?.({ preventScroll: true }),
    onClose = () => {},
    log = () => {}
} = {}) {
    const modal = doc?.getElementById('foundry-hub-modal');
    const tabBar = doc?.getElementById('foundry-hub-tabs');
    const panel = doc?.getElementById('foundry-hub-panel');
    const loadoutPanel = doc?.getElementById('foundry-hub-loadout');
    const borrowed = [];
    const buttons = new Map();
    let activeTab = null;
    let refreshTimer = null;

    const isOpen = () => Boolean(modal) && !modal.classList.contains('hidden');
    const currentTabs = () => resolveHubTabs({
        foundryActivated: Boolean(isFoundryActivated()),
        storeAvailable: Boolean(isStoreAvailable()),
        tradeUpAvailable: Boolean(isTradeUpAvailable())
    });

    function refreshResources() {
        const bank = getBank() ?? {};
        for (const key of ['tech', 'coin', 'med', 'shells']) {
            const el = doc?.getElementById(`foundry-hub-${key}`);
            if (el) el.textContent = String(bank[key] ?? 0);
        }
    }

    // Put every borrowed panel back exactly where it came from, in its
    // original visibility, so the Vault and Fab Bay open as before. If the
    // marker was lost with a re-rendered parent, the panel goes back to the
    // end of that parent rather than staying stranded in the hub.
    function returnPanels() {
        while (borrowed.length) {
            const { element, marker, parent, wasHidden } = borrowed.pop();
            if (marker.parentNode) marker.parentNode.insertBefore(element, marker);
            else parent?.appendChild(element);
            marker.remove();
            element.classList.toggle('hidden', wasHidden);
        }
    }

    function borrowPanels(tab) {
        for (const id of HUB_TAB_PANELS[tab] ?? []) {
            const element = doc.getElementById(id);
            if (!element || element.closest?.('#foundry-hub-panel')) continue;
            const parent = element.parentNode;
            const marker = doc.createComment(`foundry-hub:${id}`);
            parent?.insertBefore(marker, element);
            borrowed.push({ element, marker, parent, wasHidden: element.classList.contains('hidden') });
            panel.appendChild(element);
            element.classList.remove('hidden');
        }
    }

    // Buttons are kept and updated in place, so the controller's LB/RB
    // handler (which clicks a tab, then focuses it) never focuses a node
    // this re-render just threw away.
    function renderTabs(tabs = currentTabs()) {
        if (!tabBar) return;
        for (const tab of tabs) {
            let button = buttons.get(tab.id);
            if (!button) {
                button = doc.createElement('button');
                button.type = 'button';
                button.className = 'foundry-hub__tab';
                button.dataset.tab = tab.id;
                button.setAttribute('role', 'tab');
                button.addEventListener('click', () => select(tab.id));
                buttons.set(tab.id, button);
                tabBar.appendChild(button);
            }
            button.hidden = tab.hidden;
            button.classList.toggle('hidden', tab.hidden);
            button.classList.toggle('is-active', tab.id === activeTab);
            button.classList.toggle('is-locked', tab.locked);
            button.setAttribute('aria-selected', String(tab.id === activeTab));
            const label = `${tab.locked ? '🔒 ' : ''}${t(tab.labelKey)}`;
            if (button.textContent !== label) button.textContent = label;
        }
    }

    function select(tab) {
        if (!modal || !panel) return null;
        const tabs = currentTabs();
        const next = normalizeHubTab(tab, tabs);
        returnPanels();
        activeTab = next;
        modal.dataset.hubTab = next;
        modal.dataset.hubClass = hubClassTheme(getClassId());
        renderTabs(tabs);
        loadoutPanel?.classList.toggle('hidden', next !== 'loadout');
        try {
            if (next === 'loadout') renderLoadout(loadoutPanel);
            else borrowPanels(next);
            onTabShown[next]?.();
        } catch (error) {
            // One tab failing must not strand the others' panels or the hub.
            log('tab-error', { tab: next, message: String(error?.message ?? error) });
        }
        refreshResources();
        log('tab', { tab: next, locked: tabs.find((entry) => entry.id === next)?.locked ?? false });
        return next;
    }

    function refresh() {
        if (!isOpen()) return;
        refreshResources();
        renderTabs();
    }

    // Whatever had focus when the hub opened (the Vault or Foundry button)
    // gets it back on close, so a controller player is not left on nothing.
    let opener = null;

    function open(tab = 'stash') {
        if (!modal) return null;
        if (!isOpen()) opener = doc?.activeElement ?? null;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        const shown = select(tab);
        focus(buttons.get(shown));
        if (refreshTimer == null && typeof setInterval === 'function') refreshTimer = setInterval(refresh, 500);
        log('open', { tab: shown });
        return shown;
    }

    function close() {
        if (!isOpen()) return;
        returnPanels();
        activeTab = null;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        if (refreshTimer != null) clearInterval(refreshTimer);
        refreshTimer = null;
        log('close', {});
        onClose();
        const returnTo = opener;
        opener = null;
        if (returnTo?.isConnected && returnTo !== doc?.body) focus(returnTo);
    }

    function cycle(direction) {
        const next = cycleHubTab(activeTab, direction, currentTabs());
        if (!next || next === activeTab) return null;
        select(next);
        focus(buttons.get(next));
        return next;
    }

    // Q / E step through the tabs, as they do in the Vault. Ignored while
    // typing, so a text field inside a tab keeps its letters.
    if (typeof window !== 'undefined' && modal) {
        window.addEventListener('keydown', (event) => {
            if (!isOpen() || event.repeat) return;
            const target = event.target;
            if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;
            if (event.code !== 'KeyQ' && event.code !== 'KeyE') return;
            event.preventDefault();
            event.stopPropagation();
            cycle(event.code === 'KeyQ' ? -1 : 1);
        }, true);
        onLocaleChange(() => {
            renderTabs();
            if (activeTab === 'loadout') renderLoadout(loadoutPanel);
        }, isOpen);
    }

    return {
        open,
        close,
        select,
        cycle,
        refresh,
        refreshResources,
        isOpen,
        getActiveTab: () => activeTab
    };
}
