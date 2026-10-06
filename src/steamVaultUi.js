import { LocalVaultLedger } from './localVaultLedger.js';
/**
 * Steam Vault & Store UI Frontend Implementation
 * Extracted from main.js for modular UI architecture.
 */
import { STEAM_ITEM_CATALOG } from './data/steamItemCatalog.js';
import { getItemView } from './data/itemCatalog.js';
import { TRADE_UP_ITEMS } from '../server/tradeUpCatalog.js';
import { CATALOG_ITEMS } from './armoryUi.js';
import {
    DETERMINISTIC_RECIPES,
    DISPENSARY_COST_BY_RARITY,
    INGOT_PACK_COST,
    INGOT_PACK_QUANTITY,
    SHARD_ITEMDEFID,
    canSmelt,
    getShardBalance,
    planDispensaryRedeem,
    planIngotPackPurchase,
    planSmelt
} from './craftingMatrix.js';

import { COMMUNITY_SKINS } from './data/communitySkins.js';
import { ACHIEVEMENT_COSMETICS } from './data/achievementCosmetics.js';
import {
    adaptSteamCacheResult,
    createCacheOpeningResult,
    CACHE_ITEMDEFID,
    CACHE_KEY_ITEMDEFID
} from './cacheOpening.js';
import { t, getLocale, onLocaleChange } from './i18n.js';
import { adaptStoreCatalogResponse, formatStorePrice } from './steamStoreCatalog.js';
import { finishPendingPurchases, runSteamKeyPurchase } from './steamStorePurchase.js';

export { STEAM_ITEM_CATALOG };

// The Vault's view of an item: the Steam/legacy record (description, trade
// flags, the economy art that decals and the Steam side use) with the name,
// rarity and icon every other surface shows (src/data/itemCatalog.js).
export function getItemCatalogEntry(itemdefid) {
    if (!itemdefid) return null;
    const legacy = legacyCatalogEntry(itemdefid);
    const view = getItemView(itemdefid);
    if (!view) return legacy;
    return {
        ...(legacy ?? { itemdefid: view.id, desc: view.name, tradable: false, marketable: false }),
        name: view.name,
        rarity: view.rarity,
        icon: view.icon ?? legacy?.localImg ?? null
    };
}

function legacyCatalogEntry(itemdefid) {
    const strId = String(itemdefid);
    const comm = COMMUNITY_SKINS.find((s) => s.id === strId);
    if (comm) {
        const iconPath = `/economy/${comm.classId === 'scout' ? 'chassis_cryo_vanguard_scout' : comm.classId === 'tank' ? 'chassis_trench_warden_heavy' : 'chassis_subterran_drill_engineer'}.png`;
        return {
            itemdefid: comm.id,
            name: comm.name,
            rarity: comm.rarity || 'epic',
            desc: `${comm.desc} [Action: ${comm.actionLabel}]`,
            tradable: true,
            marketable: false,
            img: iconPath,
            localImg: iconPath,
            localImgLarge: iconPath.replace('.png', '_large.png')
        };
    }
    const numericId = Number(itemdefid);
    if (STEAM_ITEM_CATALOG[numericId]) return STEAM_ITEM_CATALOG[numericId];
    const achievement = ACHIEVEMENT_COSMETICS.find((item) => item.itemdefid === String(numericId));
    if (achievement) {
        const iconBase = achievement.slot === 'weapon'
            ? 'skin_frostbite_talon'
            : achievement.classId === 'scout' ? 'chassis_cryo_vanguard_scout'
                : achievement.classId === 'tank' ? 'chassis_trench_warden_heavy' : 'chassis_subterran_drill_engineer';
        const iconPath = `/economy/${iconBase}.png`;
        return { ...achievement, itemdefid: numericId, tradable: false, marketable: false, img: iconPath, localImg: iconPath, localImgLarge: iconPath.replace('.png', '_large.png') };
    }
    const armory = CATALOG_ITEMS?.[String(numericId)];
    if (armory) {
        const iconPath = armory.icon || `/economy/${numericId}.png`;
        return {
            itemdefid: numericId,
            name: armory.name,
            rarity: armory.rarity || 'common',
            desc: armory.perk ? `${armory.name} (${armory.perk})` : (armory.desc || armory.name),
            tradable: true,
            marketable: true,
            img: iconPath,
            localImg: iconPath,
            localImgLarge: iconPath.replace('.png', '_large.png')
        };
    }
    return null;
}

export function applyCatalogImage(image, catalog) {
    if (!image || !catalog) return;
    // Shared catalog icon (the model render the Armory and Foundry show) ->
    // remote CDN -> local economy PNG -> generic placeholder, skipping repeats,
    // so an art gap never becomes a broken-image icon.
    const sources = [...new Set([catalog.icon, catalog.img, catalog.localImg].filter(Boolean))];
    let next = 1;
    image.onerror = () => {
        if (next < sources.length) {
            image.dataset.localFallback = 'true';
            image.src = assetUrl(sources[next++]);
            return;
        }
        image.onerror = null;
        image.src = assetUrl('/favicon.png');
    };
    image.src = assetUrl(sources[0] ?? '/favicon.png');
}

let storeCatalog = null;
let storeOdds = [];
let storePurchasesEnabled = false;
let storePurchaseMode = 'disabled';
let storeDisabledReason = 'catalog_unavailable';
let storeHostedItemStore = null;
let storeKeysRestricted = false;
let storeRestrictedNotice = null;
let storeLegalTerms = null;

let vaultItems = [];
// Which inventory `vaultItems` holds: 'steam' (the service's response) or
// 'local' (the browser/QA sandbox ledger). Local trades only run on 'local'.
let vaultSource = 'local';
// Exchanges the backend commits (GET /steam/inventory `capabilities`).
let steamCapabilities = new Set();
let vaultSteamAccount = null;
let selectedVaultItem = null;
let marketEligibility = 'unknown';
let hudCardSeq = 0;
let cacheOpeningBusy = false;
const DEV_VAULT_STORAGE_KEY = 'hb_dev_vault_inventory_v1';
const DEV_INFINITE_CACHE_STORAGE_KEY = 'hb_dev_infinite_cache_v1';

function isBrowserSandbox() {
    return typeof window !== 'undefined' && (!window.electronAPI || window.__hbQaToolsEnabled === true);
}

function readDevVaultInventory() {
    if (!isBrowserSandbox()) return null;
    try {
        const parsed = JSON.parse(window.localStorage?.getItem(DEV_VAULT_STORAGE_KEY) ?? 'null');
        return Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.items) ? parsed.items : null);
    } catch {
        return null;
    }
}

function persistDevVaultInventory() {
    if (!isBrowserSandbox()) return;
    try {
        const ledger = new LocalVaultLedger(window.localStorage);
        const record = ledger.read();
        ledger.save({ ...record, items: vaultItems });
    } catch {
        // Sandbox persistence is best effort in private browsing.
    }
}

export function setDevInfiniteCacheMode(enabled) {
    if (typeof window === 'undefined') return Boolean(enabled);
    try {
        if (enabled) window.localStorage?.setItem(DEV_INFINITE_CACHE_STORAGE_KEY, 'true');
        else window.localStorage?.removeItem(DEV_INFINITE_CACHE_STORAGE_KEY);
    } catch { /* best effort */ }
    return Boolean(enabled);
}

export function isDevInfiniteCacheMode() {
    try {
        return isBrowserSandbox() && window.localStorage?.getItem(DEV_INFINITE_CACHE_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

export function resetDevVaultInventory() {
    vaultItems = [];
    selectedVaultItem = null;
    if (isBrowserSandbox()) {
        try { window.localStorage?.removeItem(DEV_VAULT_STORAGE_KEY); } catch { /* best effort */ }
        syncDevOwnership();
    }
    renderInventoryGrid();
    updateOpenCacheAvailability();
}

function syncDevOwnership() {
    if (isBrowserSandbox()) window.itemOwnership?.setDevInventory?.(vaultItems);
}

export function openSteamVaultModal() {
    if (typeof window !== 'undefined' && window.hbLog) {
        window.hbLog('STEAM', 'info', 'Steam Vault modal opened');
    }
    initSteamVaultUI();
    const modal = document.getElementById('steam-vault-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    loadVaultData().catch(() => null);
}

export function showSteamDropToast(itemdefid, quantity = 1) {
    const catalog = getItemCatalogEntry(itemdefid);
    if (!catalog) return;
    const stack = document.querySelector('.hud-notification-stack');
    if (!stack) return;

    window.AudioManager?.play?.('fx_achievement', { volume: 0.35, bus: 'sfx' });
    const toast = document.createElement('div');
    toast.className = 'achievement-toast steam-drop-toast hud-stack-card hidden';
    toast.setAttribute('aria-live', 'polite');
    toast.dataset.notificationPriority = '5';
    toast.dataset.seq = String(hudCardSeq++);
    toast.dataset.autoDismissMs = '5600';
    toast.dataset.removeDelayMs = '320';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'achievement-toast__icon';
    const img = document.createElement('img');
    img.alt = '';
    applyCatalogImage(img, catalog);
    iconWrap.append(img);

    const body = document.createElement('div');
    body.className = 'achievement-toast__body';
    const kicker = document.createElement('div');
    kicker.className = 'achievement-toast__kicker';
    kicker.textContent = t('ui.vault.item_acquired');
    const title = document.createElement('div');
    title.className = 'achievement-toast__title';
    title.textContent = quantity > 1 ? `${catalog.name} x${quantity}` : catalog.name;
    const blurb = document.createElement('div');
    blurb.className = 'achievement-toast__blurb';
    blurb.textContent = catalog.desc;
    body.append(kicker, title, blurb);
    toast.append(iconWrap, body);
    toast.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        if (typeof window.dismissHudNotificationCard === 'function') {
            window.dismissHudNotificationCard(toast);
        } else {
            toast.remove();
        }
    });

    stack.append(toast);
    if (typeof window.updateHudNotificationDeck === 'function') {
        window.updateHudNotificationDeck();
    }
    toast.classList.remove('hidden');
    requestAnimationFrame(() => {
        toast.classList.add('visible');
        if (typeof window.updateHudNotificationDeck === 'function') {
            window.updateHudNotificationDeck();
        }
    });
}

export function getLocalSeasonInventory() {
    return !window.electronAPI ? new LocalVaultLedger(window.localStorage).read() : { items: [], receipts: {} };
}

function applyLocalSeasonInventory(items) {
    vaultItems = items;
    syncDevOwnership();
    reconcileCosmeticsOwnership(vaultItems);
    renderInventoryGrid();
    updateOpenCacheAvailability();
}

export function deliverLocalSeasonReward(reward, receiptId) {
    // Supply bundles are the game's own TECH / COIN / MED bank, so they land
    // on every build. Refusing them on Steam builds left every one of them
    // "Pending — retry" forever (session logs 2026-10-06).
    if (reward.kind === 'supply_bundle') {
        return window.bankManager?.depositSeasonReward({ tech: reward.tech, coin: reward.coin, med: reward.med }, receiptId)
            ?? { ok: false, reason: 'bank_unavailable' };
    }
    if (window.electronAPI) return { ok: false, reason: 'verified_service_required' };
    const result = new LocalVaultLedger(window.localStorage).grant(reward.itemdefid, reward.qty ?? 1, receiptId);
    if (result.ok) applyLocalSeasonInventory(result.items);
    return result;
}

export function craftLocalSeasonRecipe(recipeId, options) {
    if (window.electronAPI) return { ok: false, reason: 'verified_service_required' };
    const result = new LocalVaultLedger(window.localStorage).craft(recipeId, options);
    if (result.ok) applyLocalSeasonInventory(result.items);
    return result;
}

// The Fragment Workshop's view of what the player owns: the Steam inventory
// on a Steam build, the local ledger on the browser build. It used to read
// only the local ledger, so on Steam it showed 0 fragments and every recipe
// said "Service required" (session 2026-10-06).
export function getSeasonWorkshopInventory() {
    return window.electronAPI ? { items: vaultItems, receipts: {} } : getLocalSeasonInventory();
}

// Fewest stacks, in inventory order, that cover every ingredient; null when
// the player is short. The backend draws the quantities from these stacks.
export function pickRecipeMaterials(items, ingredients) {
    const picked = [];
    for (const { itemdefid, quantity } of ingredients) {
        let needed = quantity;
        for (const item of items) {
            if (needed <= 0) break;
            if (Number(item.itemdefid) !== itemdefid || !(Number(item.quantity) > 0)) continue;
            picked.push(item.itemId);
            needed -= Number(item.quantity);
        }
        if (needed > 0) return null;
    }
    return picked;
}

// Steam: the schema's own exchange recipe (2100 / 2200), run by the backend.
export async function craftSeasonRecipe(recipeId, options) {
    if (!window.electronAPI) return craftLocalSeasonRecipe(recipeId, options);
    const recipe = DETERMINISTIC_RECIPES[recipeId];
    if (!recipe) return { ok: false, reason: 'invalid_recipe_id' };
    const materials = pickRecipeMaterials(vaultItems, recipe.ingredients);
    if (!materials) return { ok: false, reason: 'missing_fragments' };
    const result = await window.electronAPI.exchangeSteamInventory(recipeId, materials)
        .catch((err) => ({ ok: false, reason: err?.message ?? 'exchange_failed' }));
    storeLog(result?.ok ? 'info' : 'warn', 'workshop-craft', { recipeId, ok: Boolean(result?.ok), reason: result?.reason ?? null });
    if (result?.ok) {
        await loadVaultData().catch(() => {});
        for (const item of result.granted ?? []) showSteamDropToast(Number(item.itemdefid), Number(item.quantity) || 1);
    }
    return result?.ok ? { ok: true, granted: result.granted ?? [] } : { ok: false, reason: result?.reason ?? 'exchange_failed' };
}

// Adds an item to the local sandbox inventory (same pattern as openDeepRelicCache()'s
// !window.electronAPI branch) without going through a real Steam Inventory Service
// transaction. Used by anything that grants an item outside of crate-opening — currently
// Season Pass tier claims (src/seasonPassUi.js). Real Electron/Steam builds should route
// grants through the actual inventory service instead once that's wired for this source.
export function grantVaultItem(itemdefid, quantity = 1) {
    if (isBrowserSandbox()) vaultItems = readDevVaultInventory() ?? vaultItems;
    const existing = vaultItems.find((i) => i.itemdefid === itemdefid);
    if (existing) {
        existing.quantity += quantity;
    } else {
        vaultItems.push({ itemId: `grant_${Date.now()}_${itemdefid}`, itemdefid, quantity });
    }
    persistDevVaultInventory();
    syncDevOwnership();
    reconcileCosmeticsOwnership(vaultItems);
    renderInventoryGrid();
    updateOpenCacheAvailability();
}

export function renderSteamMilestoneGrants(grants = []) {
    const grantNote = document.getElementById('go-steam-grant-note');
    if (!grantNote || !Array.isArray(grants) || grants.length === 0) return;

    const names = grants
        .map((item) => {
            const catalog = getItemCatalogEntry(item.itemdefid);
            const label = catalog?.name ?? `Item #${item.itemdefid}`;
            return item.quantity > 1 ? `${label} x${item.quantity}` : label;
        })
        .join(', ');
    grantNote.textContent = t('ui.vault.item_unlocked', { names });
    grantNote.classList.remove('hidden');
}

export function initSteamVaultUI() {
    const vaultBtn = document.getElementById('steam-vault-btn');
    const closeBtn = document.getElementById('close-steam-vault-modal');
    const modal = document.getElementById('steam-vault-modal');

    if (!modal) return;

    if (vaultBtn && !vaultBtn.dataset.bound) {
        vaultBtn.dataset.bound = 'true';
        vaultBtn.addEventListener('click', async () => {
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            if (typeof window.showDeveloperCommentary === 'function') {
                window.showDeveloperCommentary('steam_vault');
            }
            await loadVaultData();
        });
    }

    const closeModal = () => {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    };

    if (closeBtn && !closeBtn.dataset.bound) {
        closeBtn.dataset.bound = 'true';
        closeBtn.addEventListener('click', closeModal);
    }

    if (!modal.dataset.escBound) {
        modal.dataset.escBound = 'true';
        window.addEventListener('keydown', (e) => {
            if (modal.classList.contains('hidden')) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
                return;
            }
            if (e.code === 'KeyQ') {
                e.preventDefault();
                const tabs = [tabInventory, tabStore, tabSmelter].filter((tab) => tab && !tab.classList.contains('hidden'));
                const currentIdx = tabs.findIndex((t) => t.classList.contains('active'));
                const prevIdx = (currentIdx - 1 + tabs.length) % tabs.length;
                tabs[prevIdx]?.click();
                tabs[prevIdx]?.focus();
                return;
            }
            if (e.code === 'KeyE') {
                e.preventDefault();
                const tabs = [tabInventory, tabStore, tabSmelter].filter((tab) => tab && !tab.classList.contains('hidden'));
                const currentIdx = tabs.findIndex((t) => t.classList.contains('active'));
                const nextIdx = (currentIdx + 1) % tabs.length;
                tabs[nextIdx]?.click();
                tabs[nextIdx]?.focus();
                return;
            }
        });
    }

    if (typeof window.setupClickOutside === 'function') {
        window.setupClickOutside('steam-vault-modal', closeModal);
    }

    const tabInventory = document.getElementById('vault-tab-inventory');
    const tabStore = document.getElementById('vault-tab-store');
    const tabSmelter = document.getElementById('vault-tab-smelter');
    const inventoryLayout = document.getElementById('vault-inventory-layout');
    const storeLayout = document.getElementById('vault-store-layout');
    const smelterLayout = document.getElementById('vault-smelter-layout');

    const activateTab = (activeBtn, activeLayout) => {
        for (const btn of [tabInventory, tabStore, tabSmelter]) btn?.classList.remove('active');
        for (const layout of [inventoryLayout, storeLayout, smelterLayout]) layout?.classList.add('hidden');
        activeBtn?.classList.add('active');
        activeLayout?.classList.remove('hidden');
    };

    // The Store tab shows whenever keys can actually be bought: through
    // Steam's hosted Item Store (Steam Inventory items; Steam runs checkout
    // and the Wallet) or the Microtransactions checkout. With neither, it is
    // removed, so no priced surface appears that can't complete a purchase.
    loadStoreCatalog().then(() => {
        const storeVisible = storePurchasesEnabled || hostedItemStoreEnabled();
        tabStore?.classList.toggle('hidden', !storeVisible);
        if (!storeVisible) {
            storeLayout?.classList.add('hidden');
            if (tabStore?.classList.contains('active')) activateTab(tabInventory, inventoryLayout);
        }
    }).catch(() => {
        tabStore?.classList.add('hidden');
        storeLayout?.classList.add('hidden');
    });

    tabInventory?.addEventListener('click', () => {
        activateTab(tabInventory, inventoryLayout);
        renderInventoryGrid();
    });

    tabStore?.addEventListener('click', async () => {
        activateTab(tabStore, storeLayout);
        await renderStorePanel();
    });

    tabSmelter?.addEventListener('click', () => {
        activateTab(tabSmelter, smelterLayout);
        renderSmelterPanel();
    });

    document.getElementById('vault-store-open-btn')?.addEventListener('click', openDeepRelicCache);
    document.getElementById('vault-store-hosted-btn')?.addEventListener('click', () => openHostedSteamItemStore());
    document.getElementById('vault-btn-view-market')?.addEventListener('click', () => {
        if (!window.electronAPI?.openSteamOverlayToUrl) return;
        window.electronAPI.openSteamOverlayToUrl('https://steamcommunity.com/market/search?appid=4957040');
    });
}

function isMarketEligibilityAllowed(result) {
    return result?.allowed === true
        || result?.allowed === 1
        || result?.allowed === '1'
        || result?.allowed === 'true'
        || result?.eligibility?.allowed === true
        || result?.eligibility?.allowed === 1
        || result?.eligibility?.allowed === '1'
        || result?.eligibility?.allowed === 'true';
}

function setMarketEligibilityFromResult(result) {
    marketEligibility = result?.ok && isMarketEligibilityAllowed(result) ? 'eligible' : 'ineligible';
}

function canOpenMarketOverlay() {
    return marketEligibility === 'eligible';
}

export async function loadVaultData() {
    const statusEl = document.getElementById('vault-connection-status');
    const playerEl = document.getElementById('vault-player-name');
    const commandStatus = document.getElementById('vault-command-status');

    if (window.electronAPI) {
        // Fetch Identity
        const identity = await window.electronAPI.getSteamIdentity().catch(() => null);
        const account = identity?.active ? identity.steamId64 : null;
        if (account !== vaultSteamAccount || !account) {
            vaultItems = [];
            window.itemOwnership?.setSteamInventory([]);
            reconcileCosmeticsOwnership([]);
            vaultSteamAccount = account;
        }

        // Fetch Market Eligibility
        const marketCheck = window.electronAPI.getSteamMarketEligibility
            ? window.electronAPI.getSteamMarketEligibility()
            : Promise.resolve({ ok: false, reason: 'unsupported' });
        const marketResult = await Promise.resolve(marketCheck).catch(() => ({ ok: false, reason: 'error' }));
        setMarketEligibilityFromResult(marketResult);
        if (identity?.active) {
            if (playerEl) playerEl.textContent = identity.persona ?? t('ui.vault.operator');
            if (statusEl) statusEl.textContent = t('ui.vault.steam_connected');
            if (statusEl) statusEl.classList.remove('vault-status--offline');
            if (commandStatus) commandStatus.textContent = identity.persona ?? t('ui.vault.online');
        } else {
            if (playerEl) playerEl.textContent = t('ui.vault.dev_mode');
            if (statusEl) statusEl.textContent = t('ui.vault.dev_fallback');
            if (commandStatus) commandStatus.textContent = t('ui.vault.dev_mode');
        }

        // Fetch Inventory
        const result = await window.electronAPI.refreshSteamInventory().catch(() => null);
        if (result?.ok && Array.isArray(result.inventory)) {
            vaultSource = 'steam';
            steamCapabilities = new Set(Array.isArray(result.capabilities) ? result.capabilities : []);
            vaultItems = result.inventory;
            // Feed the unified ownership store (src/itemOwnership.js) so the
            // Armory gates on the same entitlements the Vault renders. Only the
            // real service response is pushed here -- the sandbox fallback below
            // is not an entitlement and must not read as one.
            window.itemOwnership?.setSteamInventory(result.inventory);
        } else if (isBrowserSandbox()) {
            // QA tools on and no service inventory: show the sandbox ledger
            // that QA grants and trades write to, not a stale in-memory copy.
            vaultSource = 'local';
            vaultItems = readDevVaultInventory() ?? vaultItems;
            syncDevOwnership();
        } else {
            vaultSource = 'steam';
        }
        reconcileCosmeticsOwnership(vaultItems);
        renderInventoryGrid();
        updateOpenCacheAvailability();
    } else {
        setMarketEligibilityFromResult({ ok: false, reason: 'unsupported' });
        if (playerEl) playerEl.textContent = t('ui.vault.local_operator');
        if (statusEl) statusEl.textContent = t('ui.vault.local_beta');
        if (commandStatus) commandStatus.textContent = t('ui.vault.local');
        vaultSource = 'local';
        vaultItems = readDevVaultInventory() ?? [];
        reconcileCosmeticsOwnership(vaultItems);
        syncDevOwnership();
        renderInventoryGrid();
        updateOpenCacheAvailability();
    }
}

export function renderInventoryGrid() {
    const grid = document.getElementById('vault-item-grid');
    const emptyState = document.getElementById('vault-empty-state');

    if (!grid) return;
    grid.innerHTML = '';

    if (vaultItems.length === 0) {
        emptyState?.classList.remove('hidden');
        return;
    }

    emptyState?.classList.add('hidden');

    vaultItems.forEach(item => {
        const catalog = getItemCatalogEntry(item.itemdefid);
        if (!catalog) return;

        const card = document.createElement('div');
        const rarityClass = `vault-item--${catalog.rarity}`;
        const isSelected = selectedVaultItem && selectedVaultItem.itemId === item.itemId;

        card.className = `vault-item-card ${rarityClass} ${isSelected ? 'selected' : ''}`;
        // Focusable and pressable, so a controller can pick items (Full
        // Controller Support: the grid was mouse-only).
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `${catalog.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}`);
        card.setAttribute('aria-pressed', String(Boolean(isSelected)));
        card.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            card.click();
        });

        const img = document.createElement('img');
        img.className = 'vault-item-card__art';
        applyCatalogImage(img, catalog);
        card.appendChild(img);

        if (item.quantity > 1) {
            const qty = document.createElement('div');
            qty.className = 'vault-item-card__qty';
            qty.textContent = `x${item.quantity}`;
            card.appendChild(qty);
        }

        card.addEventListener('click', () => {
            selectedVaultItem = item;
            document.querySelectorAll('.vault-item-card').forEach((c) => {
                c.classList.remove('selected');
                c.setAttribute('aria-pressed', 'false');
            });
            card.classList.add('selected');
            card.setAttribute('aria-pressed', 'true');
            updateDetailsPanel(item);
        });

        grid.appendChild(card);
    });

    if (!selectedVaultItem && vaultItems.length > 0) {
        selectedVaultItem = vaultItems[0];
    }
    // Called unconditionally: with an empty vault this paints the localized
    // empty state, which previously stayed on its English markup placeholder.
    updateDetailsPanel(selectedVaultItem);
}

export function updateDetailsPanel(item) {
    const nameEl = document.getElementById('vault-details-name');
    const rarityEl = document.getElementById('vault-details-rarity');
    const descEl = document.getElementById('vault-details-desc');
    const imgEl = document.getElementById('vault-details-img');
    const tradableEl = document.getElementById('vault-meta-tradable');
    const marketableEl = document.getElementById('vault-meta-marketable');

    const btnEquip = document.getElementById('vault-btn-equip');
    const btnUnequip = document.getElementById('vault-btn-unequip');
    const btnViewMarket = document.getElementById('vault-btn-view-market');
    const statusEl = document.getElementById('vault-equip-status');

    // An empty vault, or an item missing from the catalog, leaves this panel on
    // its markup placeholder. Those used to be authored English that nothing
    // ever rewrote, so a player with no items read the panel in English no
    // matter the locale. JS owns both states now, which also keeps the element
    // off the static-annotation path where a locale change would clobber a
    // selected item's name back to the placeholder.
    const catalog = item ? getItemCatalogEntry(item.itemdefid) : null;
    if (!catalog) {
        if (nameEl) nameEl.textContent = t('ui.vault_details.select_an_item');
        if (rarityEl) {
            rarityEl.textContent = t('ui.vault_details.no_rarity');
            rarityEl.style.color = '';
        }
        if (descEl) descEl.textContent = t('ui.vault_details.select_hint');
        if (tradableEl) tradableEl.textContent = t('ui.vault.tradable');
        if (marketableEl) marketableEl.textContent = t('ui.vault.marketable');
        if (statusEl) statusEl.textContent = t('ui.vault_details.read_only');
        for (const btn of [btnEquip, btnUnequip, btnViewMarket]) btn?.classList.add('hidden');
        return;
    }

    if (nameEl) nameEl.textContent = catalog.name;
    if (rarityEl) {
        rarityEl.textContent = catalog.rarity;
        rarityEl.style.color = getRarityColor(catalog.rarity);
    }
    if (descEl) descEl.textContent = catalog.desc;
    if (imgEl) applyCatalogImage(imgEl, catalog);

    if (tradableEl) {
        tradableEl.className = `vault-meta-tag vault-meta-tag--readonly ${catalog.tradable ? 'active' : ''}`;
        tradableEl.title = t('ui.vault.trading_external');
        tradableEl.textContent = catalog.tradable ? t('ui.vault.tradable') : t('ui.vault.non_tradable');
    }
    if (marketableEl) {
        const isEligible = canOpenMarketOverlay();
        marketableEl.className = `vault-meta-tag vault-meta-tag--readonly ${catalog.marketable ? 'active' : ''} ${catalog.marketable && !isEligible ? 'degraded' : ''}`;
        marketableEl.title = t('ui.vault.market_external');
        if (catalog.marketable && !isEligible) {
            marketableEl.textContent = t('ui.vault.marketable_offline');
            marketableEl.title = t('ui.vault.market_route_unavailable');
        } else {
            marketableEl.textContent = catalog.marketable ? t('ui.vault.marketable') : t('ui.vault.non_marketable');
        }
    }
    if (btnViewMarket) {
        const canView = Boolean(catalog.marketable) && canOpenMarketOverlay();
        btnViewMarket.classList.toggle('hidden', !canView);
    }

    btnEquip?.classList.add('hidden');
    btnUnequip?.classList.add('hidden');
    if (statusEl) {
        const quantity = Number(item.quantity) > 1 ? ` x${Number(item.quantity)}` : '';
        statusEl.textContent = t('ui.vault.ownership_verified', { quantity });
    }
}

export function getRarityColor(rarity) {
    if (rarity === 'common') return '#94a3b8';
    if (rarity === 'uncommon') return '#22c55e';
    if (rarity === 'rare') return '#00c8ff';
    if (rarity === 'epic') return '#a855f7';
    if (rarity === 'legendary') return '#eab308';
    return '#fff';
}

export function reconcileCosmeticsOwnership(inventory = []) {
    const ownedDefIds = new Set(inventory.map(item => item.itemdefid));

    const patch = localStorage.getItem('hb_equipped_patch');
    if (patch && !ownedDefIds.has(Number(patch))) {
        localStorage.removeItem('hb_equipped_patch');
        console.log('[steam-vault] Unequipped unowned patch:', patch);
    }

    const decal = localStorage.getItem('hb_equipped_decal');
    if (decal && !ownedDefIds.has(Number(decal))) {
        localStorage.removeItem('hb_equipped_decal');
        console.log('[steam-vault] Unequipped unowned decal:', decal);
    }

    const weapon = localStorage.getItem('hb_equipped_weapon_finish');
    if (weapon && !ownedDefIds.has(Number(weapon))) {
        localStorage.removeItem('hb_equipped_weapon_finish');
        console.log('[steam-vault] Unequipped unowned weapon finish:', weapon);
    }

    // Also reconcile LoadoutManager v2 per-class state
    try {
        if (window.loadout?.reconcileOwnership) {
            window.loadout.reconcileOwnership(inventory);
        }
    } catch {
        // best-effort
    }
}

let storeCatalogRequest = 0;

// Store outcomes in the session log: purchases and cache opens are what a
// Steam support case or refund review asks about, and failures alone left no
// record of what did work.
function storeLog(level, message, detail = {}) {
    if (typeof window !== 'undefined') window.hbLog?.('STORE', level, message, detail);
}

export async function loadStoreCatalog() {
    const request = ++storeCatalogRequest;
    storeCatalog = [];
    storeOdds = [];
    storePurchasesEnabled = false;
    storePurchaseMode = 'disabled';
    storeDisabledReason = 'catalog_unavailable';
    storeHostedItemStore = null;
    if (window.electronAPI?.getSteamStoreCatalog) {
        let result;
        try {
            result = await window.electronAPI.getSteamStoreCatalog();
        } catch { return; }
        if (request !== storeCatalogRequest) return;
        const adapted = adaptStoreCatalogResponse(result);
        if (adapted) {
            storeCatalog = adapted.catalog;
            storeOdds = adapted.odds;
            storePurchasesEnabled = Boolean(result.purchasesEnabled);
            storePurchaseMode = result.purchaseMode ?? (storePurchasesEnabled ? 'live' : 'disabled');
            storeDisabledReason = result.disabledReason ?? null;
            storeHostedItemStore = result.hostedItemStore ?? null;
            storeKeysRestricted = Boolean(adapted.keysRestricted);
            storeRestrictedNotice = adapted.restrictedRegionNotice ?? null;
            storeLegalTerms = adapted.legalTerms ?? null;
        }
    }
}

export function getStoreKeysRestricted() { return storeKeysRestricted; }
export function getStoreRestrictedNotice() { return storeRestrictedNotice; }
export function getStoreLegalTerms() { return storeLegalTerms; }

function escapeStoreText(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function formatStoreDisabledReason(reason) {
    if (reason === 'steam_store_disabled') return 'PURCHASES OFFLINE';
    if (reason === 'catalog_unavailable') return 'CATALOG OFFLINE';
    return 'UNAVAILABLE';
}

/**
 * The whole store: key bundles, Steam Item Store link, odds and the cache
 * opener. Shared by the Vault's STORE tab and the Foundry hub's, which borrows
 * the same layout; the hub used to show it empty because only the Vault's tab
 * drew it (session logs 2026-10-06).
 */
export async function renderStorePanel() {
    await loadStoreCatalog();
    renderStoreSkuGrid();
    renderHostedItemStoreCta();
    renderOddsTable();
    updateOpenCacheAvailability();
    void finishPendingStorePurchases();
}

export function renderStoreSkuGrid() {
    const grid = document.getElementById('vault-store-sku-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!storeCatalog || storeCatalog.length === 0) {
        grid.innerHTML = '<div class="vault-empty-state">STORE CATALOG UNAVAILABLE</div>';
        return;
    }

    let noticeEl = document.getElementById('vault-store-region-notice');
    if (storeKeysRestricted) {
        if (!noticeEl && grid.parentElement) {
            noticeEl = document.createElement('div');
            noticeEl.id = 'vault-store-region-notice';
            noticeEl.className = 'vault-store-region-notice';
            noticeEl.setAttribute('role', 'alert');
            grid.parentElement.insertBefore(noticeEl, grid);
        }
        if (noticeEl) {
            noticeEl.textContent = storeRestrictedNotice
                || 'Paid random item keys are unavailable in your region in accordance with local regulations. Direct collection purchases and in-game crafting remain available.';
            noticeEl.style.display = '';
        }
    } else if (noticeEl) {
        noticeEl.style.display = 'none';
    }

    for (const sku of storeCatalog) {
        const card = document.createElement('div');
        card.className = 'vault-store-sku-card';
        // Microtransactions checkout when the backend runs it; otherwise the
        // key's own page in Steam's hosted Item Store.
        const viaHostedStore = !storePurchasesEnabled && hostedItemStoreEnabled();
        const isRestricted = storeKeysRestricted || Boolean(sku.restricted);
        const purchasable = !isRestricted && (storePurchasesEnabled || (viaHostedStore && Boolean(HOSTED_STORE_ITEMDEF_BY_SKU[sku.sku])));
        // The public USD MicroTxn catalog is not a quote for Steam's hosted
        // Item Store. Steam shows its own account-currency total at checkout.
        const priceLabel = viaHostedStore ? 'PRICE SHOWN ON STEAM' : formatStorePrice(sku, getLocale());
        const buttonLabel = isRestricted
            ? t('ui.vault.region_restricted')
            : (storePurchasesEnabled
                ? (storePurchaseMode === 'mock' ? '◈ BUY (DEV)' : '◈ BUY VIA STEAM')
                : viaHostedStore ? t('ui.vault.buy_on_steam') : formatStoreDisabledReason(storeDisabledReason));
        const keyCount = sku.keyCount;
        card.innerHTML = `
            <div class="vault-store-sku-top">
                <div class="vault-sku-icon-wrap">
                    <span class="vault-sku-icon">🗝️</span>
                    <span class="vault-sku-count">x${keyCount}</span>
                </div>
            </div>
            <div class="vault-store-sku-label">${escapeStoreText(sku.label)}</div>
            <div class="vault-store-sku-price">${escapeStoreText(priceLabel)}</div>
            <div class="vault-store-sku-sub">${t('ui.vault.wallet_direct')}</div>
            <button class="start-btn vault-store-buy-btn" data-sku="${sku.sku}" ${purchasable ? '' : 'disabled'}>${buttonLabel}</button>
        `;
        const buyBtn = card.querySelector('.vault-store-buy-btn');
        buyBtn?.addEventListener('click', () => (viaHostedStore ? openHostedSteamItemStore(sku.sku) : purchaseKeys(sku.sku)));
        grid.appendChild(card);
    }

    let legalEl = document.getElementById('vault-store-legal-terms');
    if (!legalEl && grid.parentElement) {
        legalEl = document.createElement('div');
        legalEl.id = 'vault-store-legal-terms';
        legalEl.className = 'vault-store-legal-terms';
        grid.parentElement.appendChild(legalEl);
    }
    if (legalEl) {
        legalEl.textContent = storeLegalTerms
            || 'Virtual items have no cash value. Steam Subscriber Agreement governs Steam Wallet and Community Market transactions. In-Game Purchases (Includes Random Items).';
    }
}

export function renderHostedItemStoreCta() {
    const row = document.getElementById('vault-store-hosted');
    const status = document.getElementById('vault-store-hosted-status');
    const btn = document.getElementById('vault-store-hosted-btn');
    if (!row || !status || !btn) return;

    // Buying from the Item Store needs no Community Market eligibility (that
    // gates trading only), so a new account, like a reviewer's, can buy.
    const configured = hostedItemStoreEnabled();
    row.classList.toggle('hidden', !configured);
    btn.disabled = !configured;
    if (!configured) {
        status.textContent = t('ui.vault.store_offline');
        return;
    }

    const mode = storeHostedItemStore.mode === 'beta' ? 'BETA PREVIEW' : 'STEAM-HOSTED CHECKOUT';
    status.textContent = mode;
}

// Each store SKU is its own priced item in the Steam Inventory schema.
const HOSTED_STORE_ITEMDEF_BY_SKU = Object.freeze({ key_1: 4001, key_5: 4005, key_15: 4015 });

function hostedItemStoreEnabled() {
    return Boolean(storeHostedItemStore?.enabled && storeHostedItemStore.url);
}

/** The Item Store page for a SKU (its item's detail page), or the store front. */
export function hostedItemStoreUrl(store, sku = null) {
    const base = store?.url;
    if (!base) return null;
    const itemdefid = HOSTED_STORE_ITEMDEF_BY_SKU[sku];
    if (!itemdefid) return base;
    const url = new URL(base);
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/detail/${itemdefid}/`;
    return url.toString();
}

let refreshInventoryOnReturn = false;

export async function openHostedSteamItemStore(sku = null) {
    if (!hostedItemStoreEnabled() || (typeof sku === 'string' && !storeCatalog?.some((row) => row.sku === sku))) return;
    const url = hostedItemStoreUrl(storeHostedItemStore, typeof sku === 'string' ? sku : null);
    if (!url) {
        renderHostedItemStoreCta();
        return;
    }
    if (typeof window !== 'undefined' && window.hbLog) window.hbLog('STORE', 'info', 'hosted item store opened', { sku, url });
    // Steam grants a bought key to the inventory; re-read it when the player
    // comes back from the overlay so the key shows without reopening.
    if (!refreshInventoryOnReturn && typeof window !== 'undefined') {
        refreshInventoryOnReturn = true;
        window.addEventListener('focus', () => {
            refreshInventoryOnReturn = false;
            loadVaultData().catch(() => null);
        }, { once: true });
    }
    if (window.electronAPI?.openSteamOverlayToUrl) {
        await window.electronAPI.openSteamOverlayToUrl(url);
    } else {
        window.open(url, '_blank', 'noopener');
    }
}

export function renderOddsTable() {
    const table = document.getElementById('vault-store-odds-table');
    if (!table) return;
    table.innerHTML = '';
    document.querySelector?.('.vault-store-odds-badge')?.classList.toggle('hidden', storeOdds.length === 0);
    if (storeOdds.length === 0) {
        table.innerHTML = '<div class="vault-empty-state">DROP RATES UNAVAILABLE</div>';
        return;
    }

    for (const row of storeOdds) {
        const rowEl = document.createElement('div');
        rowEl.className = 'vault-store-odds-row';
        const color = getRarityColor(row.rarity);
        const rarityLabel = (row.rarity || 'UNCOMMON').toUpperCase();
        rowEl.innerHTML = `
            <div class="vault-store-odds-left">
                <span class="vault-odds-rarity-pill" style="color:${color}; border-color:${color}80; background:${color}1a;">${escapeStoreText(rarityLabel)}</span>
                <span class="vault-store-odds-item">${escapeStoreText(row.label)}</span>
            </div>
            <div class="vault-store-odds-right">
                <div class="vault-odds-gauge-track">
                    <div class="vault-odds-gauge-fill" style="width:${row.percent}%; background:${color}; box-shadow:0 0 10px ${color}88;"></div>
                </div>
                <span class="vault-store-odds-percent" style="color:${color}">${row.percent}%</span>
            </div>
        `;
        table.appendChild(rowEl);
    }
}

export async function purchaseKeys(sku) {
    const skuInfo = storeCatalog?.find((row) => row.sku === sku);
    if (!storePurchasesEnabled || !skuInfo) {
        showStorePurchaseStatus({ key: 'offline', tone: 'error' });
        return;
    }

    if (storeKeysRestricted || skuInfo.restricted) {
        showStorePurchaseStatus({ key: 'region_restricted', tone: 'error' });
        return { ok: false, reason: 'region_restricted' };
    }

    if (!window.electronAPI?.purchaseSteamKeys) {
        if (storePurchaseMode !== 'mock' || !isBrowserSandbox()) return;
        const keyCount = skuInfo.keyCount;
        const existingKey = vaultItems.find((i) => i.itemdefid === 4001);
        if (existingKey) {
            existingKey.quantity += keyCount;
        } else {
            vaultItems.push({ itemId: `sandbox_key_${Date.now()}`, itemdefid: 4001, quantity: keyCount });
        }
        const existingCache = vaultItems.find((i) => i.itemdefid === 4000);
        if (!existingCache) {
            vaultItems.push({ itemId: `sandbox_cache_${Date.now()}`, itemdefid: 4000, quantity: keyCount });
        }
        reconcileCosmeticsOwnership(vaultItems);
        renderInventoryGrid();
        updateOpenCacheAvailability();
        const statusEl = document.getElementById('vault-store-open-status');
        if (statusEl) {
            statusEl.classList.remove('hidden');
            statusEl.textContent = t('ui.vault.qa_grant', { count: keyCount });
        }
        showSteamDropToast(4001, keyCount);
        return;
    }

    if (purchaseInFlight) return;
    purchaseInFlight = true;
    setBuyButtonsBusy(true);
    storeLog('info', 'purchase-start', { sku });
    try {
        const outcome = await runSteamKeyPurchase({
            api: window.electronAPI,
            sku,
            pending: pendingStorePurchases,
            onStatus: (status) => {
                storeLog(status.tone === 'error' ? 'warn' : 'info', `purchase-${status.key}`, { sku, reason: status.reason ?? null });
                showStorePurchaseStatus(status, { count: skuInfo.keyCount });
            }
        });
        if (outcome.state === 'completed') {
            await loadVaultData();
            updateOpenCacheAvailability();
            showSteamDropToast(4001, skuInfo.keyCount);
        }
        return outcome;
    } finally {
        purchaseInFlight = false;
        setBuyButtonsBusy(false);
    }
}

let purchaseInFlight = false;

// Approved-but-unsettled Steam transactions, finished on the next store visit.
const PENDING_STORE_PURCHASES_KEY = 'hb_store_pending_txns';
const pendingStorePurchases = {
    list() {
        try {
            const ids = JSON.parse(window.localStorage?.getItem(PENDING_STORE_PURCHASES_KEY) ?? '[]');
            return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [];
        } catch {
            return [];
        }
    },
    write(ids) {
        try {
            if (ids.length) window.localStorage?.setItem(PENDING_STORE_PURCHASES_KEY, JSON.stringify(ids));
            else window.localStorage?.removeItem(PENDING_STORE_PURCHASES_KEY);
        } catch { /* best effort */ }
    },
    add(id) { this.write([...new Set([...this.list(), id])]); },
    remove(id) { this.write(this.list().filter((entry) => entry !== id)); }
};

function setBuyButtonsBusy(busy) {
    for (const button of document.querySelectorAll('.vault-store-buy-btn')) {
        if (busy) {
            button.dataset.busyWasDisabled = button.disabled ? '1' : '';
            button.disabled = true;
        } else if (button.dataset.busyWasDisabled !== undefined) {
            button.disabled = button.dataset.busyWasDisabled === '1';
            delete button.dataset.busyWasDisabled;
        }
    }
}

// The answer to a BUY press, right under the buttons. It used to land in the
// cache decryptor's status line at the bottom of the panel, off screen on the
// Deck, so a refused purchase looked like a button that did nothing.
function showStorePurchaseStatus(status, { count = 0 } = {}) {
    const el = document.getElementById('vault-store-purchase-status');
    if (!el) return;
    const messages = {
        awaiting_approval: () => t('ui.vault.purchase_awaiting_approval'),
        awaiting_sandbox: () => t('ui.vault.purchase_awaiting_sandbox'),
        declined: () => t('ui.vault.purchase_declined'),
        completed: () => t('ui.vault.purchase_complete', { count }),
        pending: () => t('ui.vault.purchase_pending'),
        sandbox_not_allowed: () => t('ui.vault.purchases_disabled'),
        offline: () => t('ui.vault.purchases_offline'),
        region_restricted: () => t('ui.vault.purchases_region_restricted'),
        failed: () => t('ui.vault.purchase_failed_reason', { reason: String(status.reason ?? 'unknown').replace(/_/g, ' ') })
    };
    el.textContent = (messages[status.key] ?? messages.failed)();
    el.dataset.tone = status.tone ?? 'info';
    el.classList.remove('hidden');
}

async function finishPendingStorePurchases() {
    if (!window.electronAPI?.finalizeSteamPurchase || pendingStorePurchases.list().length === 0) return;
    const { completed } = await finishPendingPurchases({ api: window.electronAPI, pending: pendingStorePurchases });
    if (completed > 0) {
        storeLog('info', 'purchase-recovered', { completed });
        await loadVaultData();
        updateOpenCacheAvailability();
        showStorePurchaseStatus({ key: 'completed', tone: 'success' }, { count: completed });
    }
}

export function updateKeyCacheCounts() {
    const cache = vaultItems.find((i) => i.itemdefid === 4000);
    const key = vaultItems.find((i) => i.itemdefid === 4001);
    const cacheQty = cache ? Number(cache.quantity) || 0 : 0;
    const keyQty = key ? Number(key.quantity) || 0 : 0;

    const cacheEl = document.getElementById('vault-cache-count');
    const keyEl = document.getElementById('vault-key-count');
    const storeCacheEl = document.getElementById('vault-store-cache-val');
    const storeKeyEl = document.getElementById('vault-store-key-val');

    if (cacheEl) cacheEl.textContent = String(cacheQty);
    if (keyEl) keyEl.textContent = String(keyQty);
    if (storeCacheEl) storeCacheEl.textContent = String(cacheQty);
    if (storeKeyEl) storeKeyEl.textContent = String(keyQty);
}

function findOwnedCacheAndKey() {
    const cache = vaultItems.find((i) => i.itemdefid === 4000);
    const key = vaultItems.find((i) => i.itemdefid === 4001);
    return cache && key ? { cache, key } : null;
}

export function updateOpenCacheAvailability() {
    const statusEl = document.getElementById('vault-store-open-status');
    const btn = document.getElementById('vault-store-open-btn');
    const pair = findOwnedCacheAndKey();
    updateKeyCacheCounts();

    if (pair || isDevInfiniteCacheMode()) {
        statusEl?.classList.add('hidden');
        btn?.classList.remove('hidden');
    } else {
        if (statusEl) {
            statusEl.classList.remove('hidden');
            statusEl.textContent = t('ui.vault.key_and_cache_required');
        }
        btn?.classList.add('hidden');
    }
}

function applyCacheOpeningRewards(result) {
    for (const reward of result?.rewards ?? []) {
        grantVaultItem(reward.itemdefid, reward.quantity ?? 1);
    }
}

// The reveal lives in the Steam Vault window, but caches are now opened from
// the Foundry hub's STORE tab while that window stays hidden, so the whole
// decryptor sequence played out of sight (session 2026-10-06). Mount it in
// whichever of the two windows is open before it starts.
function mountRevealOverlay(overlay) {
    const hub = document.getElementById('foundry-hub-modal');
    const host = hub && !hub.classList.contains('hidden')
        ? hub.querySelector('.modal-content')
        : document.querySelector('#steam-vault-modal .modal-content');
    if (host && overlay.parentElement !== host) host.appendChild(overlay);
}

export function playCacheRevealAnimation(openingOrReward, onClaim) {
    const overlay = document.getElementById('vault-reveal-overlay');
    const titleEl = document.getElementById('vault-reveal-title');
    const statusEl = document.getElementById('vault-reveal-status');
    const stripWrap = document.getElementById('vault-reveal-strip-wrap');
    const strip = document.getElementById('vault-reveal-strip');
    const cardEl = document.getElementById('vault-reveal-card');
    const rarityPill = document.getElementById('vault-reveal-rarity-pill');
    const img = document.getElementById('vault-reveal-img');
    const nameEl = document.getElementById('vault-reveal-name');
    const descEl = document.getElementById('vault-reveal-desc');
    const claimBtn = document.getElementById('vault-reveal-claim-btn');

    if (!overlay) {
        if (typeof onClaim === 'function') onClaim();
        return;
    }
    mountRevealOverlay(overlay);

    const rewards = Array.isArray(openingOrReward?.rewards)
        ? openingOrReward.rewards
        : [{ slot: 'cosmetic', itemdefid: openingOrReward, quantity: 1 }];
    const primaryDefId = rewards[0]?.itemdefid ?? null;
    const reward = getItemCatalogEntry(primaryDefId) || {
        name: primaryDefId ? `Item #${primaryDefId}` : 'RELIC CACHE OPENED',
        rarity: 'rare',
        desc: primaryDefId
            ? 'Subterranean relic recovered from deep vault cache.'
            : 'Steam confirmed the cache exchange. No new item grant was returned for this transaction.',
        localImg: '/favicon.png'
    };

    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.dataset.state = 'spinning';

    if (titleEl) titleEl.textContent = t('ui.vault.decrypting');
    if (statusEl) statusEl.textContent = t('ui.vault.spinning_cipher');

    const CANDIDATE_ITEMS = Object.values(STEAM_ITEM_CATALOG).filter((i) => i.itemdefid !== 4000 && i.itemdefid !== 4001);
    const WIN_INDEX = 38;
    const TOTAL_TILES = 50;
    const tiles = [];

    for (let i = 0; i < TOTAL_TILES; i++) {
        if (i === WIN_INDEX) {
            tiles.push(reward);
        } else {
            const randomItem = CANDIDATE_ITEMS[Math.floor(Math.random() * CANDIDATE_ITEMS.length)] || reward;
            tiles.push(randomItem);
        }
    }

    if (strip) {
        strip.innerHTML = tiles.map((item, idx) => {
            const rarity = (item.rarity || 'uncommon').toLowerCase();
            const color = getRarityColor(rarity);
            const isWinner = idx === WIN_INDEX;
            return `
                <div class="vault-tile vault-tile--${rarity}${isWinner ? ' vault-tile--winner-slot' : ''}" id="${isWinner ? 'vault-tile-winner' : ''}" style="--rar-color:${color};">
                    <img src="${assetUrl(item.localImg || item.img)}" alt="${item.name}" onerror="this.src='/favicon.png'">
                    <span class="vault-tile-label">${(item.rarity || 'RARE').toUpperCase()}</span>
                </div>
            `;
        }).join('');
        strip.style.transition = 'none';
        strip.style.transform = 'translateY(-50%) translateX(0px)';
        strip.offsetWidth; // Force reflow
    }

    window.AudioManager?.play?.('door_gears_spin', { volume: 0.45 });

    // Smooth horizontal tape deceleration landing exactly on winner tile under needle
    requestAnimationFrame(() => {
        if (!strip || !stripWrap) return;
        const winnerTile = document.getElementById('vault-tile-winner') || strip.children[WIN_INDEX];
        if (!winnerTile) return;

        // Exact pixel measurement of winner center relative to strip and stripWrap center (needle)
        const wrapCenter = stripWrap.clientWidth / 2;
        const winnerCenter = winnerTile.offsetLeft + (winnerTile.offsetWidth / 2);
        const target = wrapCenter - winnerCenter;

        strip.style.transition = 'transform 3.0s cubic-bezier(0.12, 0.8, 0.18, 1)';
        strip.style.transform = `translateY(-50%) translateX(${target}px)`;
    });

    // Unblur and reveal winning tile under needle when it lands
    setTimeout(() => {
        const winnerEl = document.getElementById('vault-tile-winner');
        if (winnerEl) {
            winnerEl.classList.add('vault-tile--revealed');
        }
        window.AudioManager?.playProceduralLoot?.('weapon', (reward.rarity || 'rare').toLowerCase());
    }, 2950);

    // Reveal final grand showcase card
    setTimeout(() => {
        overlay.dataset.state = 'revealed';
        if (titleEl) titleEl.textContent = t('ui.vault.decryption_complete');
        if (statusEl) statusEl.textContent = t('ui.vault.item_secured');

        if (cardEl) {
            const color = getRarityColor(reward.rarity);
            cardEl.className = `vault-reveal-card vault-reveal-card--${reward.rarity.toLowerCase()}`;
            cardEl.style.borderColor = color;
            cardEl.style.boxShadow = `0 0 40px ${color}80, 0 0 80px ${color}40`;
        }

        if (rarityPill) {
            rarityPill.textContent = t('ui.vault.rarity_reward', { rarity: (reward.rarity || 'RARE').toUpperCase() });
            const color = getRarityColor(reward.rarity);
            rarityPill.style.color = color;
            rarityPill.style.borderColor = color;
            rarityPill.style.background = `${color}18`;
        }

        if (img) applyCatalogImage(img, reward);
        if (nameEl) nameEl.textContent = reward.name;
        if (descEl) descEl.textContent = reward.desc;

        const existingBundle = cardEl?.querySelector('.vault-reveal-bundle');
        existingBundle?.remove();
        if (cardEl && rewards.length > 1) {
            const bundle = document.createElement('div');
            bundle.className = 'vault-reveal-bundle';
            bundle.innerHTML = rewards.map((entry) => {
                const catalog = getItemCatalogEntry(entry.itemdefid);
                const color = getRarityColor(entry.rarity || catalog?.rarity || 'common');
                return `<div class="vault-reveal-bundle__item" style="--rarity-color:${color}">
                    <span class="vault-reveal-bundle__slot">${String(entry.slot || 'reward').toUpperCase()}</span>
                    <strong>${entry.label || catalog?.name || `ITEM #${entry.itemdefid}`}</strong>
                    <span>x${entry.quantity ?? 1}${entry.duplicate ? ' // DUPLICATE' : ''}</span>
                </div>`;
            }).join('');
            cardEl.insertBefore(bundle, claimBtn);
        }

        window.AudioManager?.play?.('fx_achievement', { volume: 0.5, bus: 'sfx' });
    }, 3200);

    const handleClaim = () => {
        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');
        overlay.dataset.state = 'idle';
        claimBtn?.removeEventListener('click', handleClaim);
        if (typeof onClaim === 'function') onClaim();
    };

    claimBtn?.addEventListener('click', handleClaim, { once: true });
}

// Season 0 Crafting Matrix panel (docs/season-zero-protocol/05) — 5:1 trade-up smelting
// and the Deep Core Shard dispensary. Operates on the same local `vaultItems` sandbox array
// as the rest of this file (see grantVaultItem's comment on why that's the honest baseline).
export function renderSmelterPanel() {
    const smelterGrid = document.getElementById('vault-smelter-grid');
    const dispensaryGrid = document.getElementById('vault-dispensary-grid');
    const shardBalanceEl = document.getElementById('vault-shard-balance');
    if (shardBalanceEl) shardBalanceEl.textContent = String(getShardBalance(vaultItems));

    const exchangeAvailable = isVaultExchangeAvailable() && !exchangeBusy;
    const exchangeNote = document.getElementById('vault-smelter-status');
    if (!isVaultExchangeAvailable() && exchangeNote) exchangeNote.textContent = t('ui.vault.exchange_needs_service');

    const SMELT_TIERS = ['uncommon', 'rare', 'epic'];
    const NEXT_TIER_LABEL = { uncommon: 'RARE', rare: 'EPIC', epic: 'LEGENDARY' };

    if (smelterGrid) {
        smelterGrid.innerHTML = '';
        for (const rarity of SMELT_TIERS) {
            const owned = rarityCounts(vaultItems)[rarity] ?? 0;
            const eligible = exchangeAvailable && canSmelt(vaultItems, rarity, tradeUpLookup);

            const card = document.createElement('div');
            card.className = 'vault-smelter-card';
            card.innerHTML = `
                <div class="vault-smelter-card__title" style="color:${getRarityColor(rarity)}">${rarity.toUpperCase()} → ${NEXT_TIER_LABEL[rarity]}</div>
                <div class="vault-smelter-card__sub">OWNED: ${owned} / 5</div>
                <button class="vault-smelter-card__btn" ${eligible ? '' : 'disabled'} data-smelt-rarity="${rarity}">SMELT 5x ${rarity.toUpperCase()}</button>
            `;
            card.querySelector('button')?.addEventListener('click', () => handleSmeltClick(rarity));
            smelterGrid.appendChild(card);
        }
    }

    if (dispensaryGrid) {
        dispensaryGrid.innerHTML = '';

        // Quartermaster Trade Shop (doc 05 §4) — the one entry that maps to a real itemdef
        // and a real spendable currency (see craftingMatrix.js's INGOT_PACK_COST comment).
        // Tech is a client-side currency, so the pack can only land in the local
        // inventory; on the Steam inventory the ingots would vanish on the next
        // refresh after the Tech was spent.
        const ingotAffordable = exchangeMode() === 'local' && !exchangeBusy && (window.bankManager?.canAfford?.(INGOT_PACK_COST) ?? false);
        const ingotCard = document.createElement('div');
        ingotCard.className = 'vault-smelter-card';
        ingotCard.innerHTML = `
            <div class="vault-smelter-card__title" style="color:${getRarityColor('uncommon')}">Cryo-Alloy Ingot Pack (x${INGOT_PACK_QUANTITY})</div>
            <div class="vault-smelter-card__sub">${INGOT_PACK_COST.tech} Tech · Quartermaster</div>
            <button class="vault-smelter-card__btn" ${ingotAffordable ? '' : 'disabled'} id="vault-quartermaster-ingot-btn">${t('ui.vault.purchase')}</button>
        `;
        ingotCard.querySelector('button')?.addEventListener('click', handleIngotPackPurchase);
        dispensaryGrid.appendChild(ingotCard);

        const shardBalance = getShardBalance(vaultItems);
        // Two per tier from the trade-up collection: never a key, a trophy or
        // a season reward (the backend refuses those too).
        const dispensableIds = ['uncommon', 'rare', 'epic', 'legendary']
            .flatMap((tier) => TRADE_UP_POOL.filter((id) => TRADE_UP_ITEMS[id] === tier).slice(0, 2));

        for (const itemdefid of dispensableIds) {
            const cat = getItemCatalogEntry(itemdefid);
            if (!cat) continue;
            const cost = DISPENSARY_COST_BY_RARITY[cat.rarity];
            const affordable = exchangeAvailable && shardBalance >= cost;

            const card = document.createElement('div');
            card.className = 'vault-smelter-card';
            card.innerHTML = `
                <div class="vault-smelter-card__title" style="color:${getRarityColor(cat.rarity)}">${cat.name}</div>
                <div class="vault-smelter-card__sub">${cost} Shards · ${cat.rarity.toUpperCase()}</div>
                <button class="vault-smelter-card__btn" ${affordable ? '' : 'disabled'} data-dispense-id="${itemdefid}">${t('ui.vault.redeem')}</button>
            `;
            card.querySelector('button')?.addEventListener('click', () => handleDispensaryRedeem(itemdefid));
            dispensaryGrid.appendChild(card);
        }
    }
}

function handleIngotPackPurchase() {
    const statusEl = document.getElementById('vault-smelter-status');
    if (exchangeMode() !== 'local') {
        if (statusEl) statusEl.textContent = t('ui.vault.exchange_needs_service');
        return;
    }
    const plan = planIngotPackPurchase(window.bankManager);
    if (!plan.ok) {
        if (statusEl) statusEl.textContent = t('ui.vault.purchase_failed_reason', { reason: plan.reason.replace(/_/g, ' ') });
        return;
    }

    if (!window.bankManager.spend(plan.cost)) {
        if (statusEl) statusEl.textContent = t('ui.vault.purchase_failed_bank');
        return;
    }
    grantVaultItem(plan.itemdefid, plan.quantity);

    if (statusEl) statusEl.textContent = t('ui.vault.purchased_ingot', { quantity: plan.quantity, cost: plan.cost.tech });
    showSteamDropToast(plan.itemdefid, plan.quantity);
    window.AudioManager?.play?.('fx_achievement', { volume: 0.4, bus: 'sfx' });
    renderSmelterPanel();
}

// Trade-ups and redemptions (decision 9, Sprint 48) run where the inventory
// the Vault shows lives:
//   * 'local': the browser/QA ledger, committed in one write
//     (LocalVaultLedger.exchange);
//   * 'steam': the backend (server/steamTradeUp.js), which chooses the
//     inputs, consumes them, grants the output and refunds on failure. Used
//     only when that backend advertises the capability, so an older
//     deployment leaves the buttons disabled with a reason instead of a
//     trade that reverts on the next refresh.
// Both work only on the trade-up collection (server/tradeUpCatalog.js), so a
// key, shard, reagent, trophy or season item is never counted or burned.
function exchangeMode() {
    if (isBrowserSandbox() && vaultSource === 'local') return 'local';
    if (vaultSource === 'steam' && steamCapabilities.has('trade-up') && typeof window.electronAPI?.tradeUpSteamInventory === 'function') return 'steam';
    return null;
}

/** Whether trade-ups and redemptions can run on the inventory the Vault shows. */
export function isVaultExchangeAvailable() {
    return exchangeMode() !== null;
}

const tradeUpLookup = (itemdefid) => {
    const rarity = TRADE_UP_ITEMS[Number(itemdefid)];
    return rarity ? { rarity } : null;
};
const TRADE_UP_POOL = Object.keys(TRADE_UP_ITEMS).map(Number);
let exchangeBusy = false;

function logExchange(level, message, detail) {
    if (typeof window !== 'undefined' && window.hbLog) window.hbLog('VAULT', level, message, detail);
}

function rarityCounts(items) {
    const counts = {};
    for (const item of items) {
        const rarity = tradeUpLookup(item.itemdefid)?.rarity;
        if (rarity) counts[rarity] = (counts[rarity] || 0) + (Number(item.quantity) || 0);
    }
    return counts;
}

// One local trade: plan it against the stored inventory (the source of truth,
// so a stale in-memory copy cannot restore spent inputs), commit consumption
// and output in one ledger write, then show the committed inventory.
function commitLocalExchange(kind, plan, granted) {
    const ledger = new LocalVaultLedger(window.localStorage);
    const before = ledger.read().items;
    const receiptId = `${kind}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const result = ledger.exchange({ consumed: plan.consumed, granted, receiptId });
    logExchange(result.ok ? 'info' : 'warn', `${kind} ${result.ok ? 'committed' : 'rejected'}`, {
        mode: 'local',
        receiptId,
        consumed: plan.consumed,
        granted,
        reason: result.reason ?? null,
        before: rarityCounts(before),
        after: result.ok ? rarityCounts(result.items) : null
    });
    if (result.ok) applyLocalSeasonInventory(result.items);
    return { ok: result.ok, reason: result.reason, grantedItemdefid: granted[0]?.itemdefid ?? null };
}

// One Steam trade through the backend. The inventory is re-read afterwards
// whatever the outcome, so the Vault shows what Steam now holds.
async function commitSteamExchange(kind, call) {
    const requestId = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const before = rarityCounts(vaultItems);
    const result = await call(requestId).catch((error) => ({ ok: false, reason: 'request_failed', message: String(error?.message ?? error) }));
    await loadVaultData().catch(() => null);
    logExchange(result?.ok ? 'info' : 'warn', `${kind} ${result?.ok ? 'committed' : 'rejected'}`, {
        mode: 'steam',
        requestId,
        consumed: result?.consumed ?? null,
        granted: result?.granted ?? null,
        refunded: result?.refunded ?? null,
        reason: result?.reason ?? null,
        before,
        after: rarityCounts(vaultItems)
    });
    return { ok: Boolean(result?.ok), reason: result?.reason ?? 'request_failed', grantedItemdefid: result?.granted?.[0]?.itemdefid ?? null };
}

function exchangeFailureText(key, reason) {
    return t(key, { reason: String(reason ?? 'unknown').replace(/_/g, ' ') });
}

async function runExchange({ kind, localPlan, steamCall, failedKey, onSuccessText }) {
    const statusEl = document.getElementById('vault-smelter-status');
    const mode = exchangeMode();
    if (!mode) {
        logExchange('warn', `${kind} unavailable on this build`, {});
        if (statusEl) statusEl.textContent = t('ui.vault.exchange_needs_service');
        return;
    }
    if (exchangeBusy) return;
    exchangeBusy = true;
    renderSmelterPanel();
    try {
        let result;
        if (mode === 'local') {
            const plan = localPlan(storedVaultItems());
            if (!plan.ok) {
                logExchange('warn', `${kind} refused`, { mode, reason: plan.reason });
                result = { ok: false, reason: plan.reason };
            } else {
                result = commitLocalExchange(kind, plan, [{ itemdefid: plan.outputItemdefid, quantity: 1 }]);
            }
        } else {
            result = await commitSteamExchange(kind, steamCall);
        }
        if (!result.ok) {
            if (statusEl) statusEl.textContent = exchangeFailureText(failedKey, result.reason);
            window.AudioManager?.play?.('ui_error', { volume: 0.5 });
            return;
        }
        const reward = getItemCatalogEntry(result.grantedItemdefid);
        if (statusEl) statusEl.textContent = onSuccessText(reward?.name ?? result.grantedItemdefid);
        if (result.grantedItemdefid != null) showSteamDropToast(result.grantedItemdefid, 1);
        window.AudioManager?.play?.('fx_achievement', { volume: 0.4, bus: 'sfx' });
    } finally {
        exchangeBusy = false;
        renderSmelterPanel();
    }
}

function storedVaultItems() {
    return readDevVaultInventory() ?? vaultItems;
}

function handleSmeltClick(rarity) {
    return runExchange({
        kind: 'smelt',
        localPlan: (items) => planSmelt({ vaultItems: items, rarity, catalogLookup: tradeUpLookup, outputPool: TRADE_UP_POOL }),
        steamCall: (requestId) => window.electronAPI.tradeUpSteamInventory(rarity, requestId),
        failedKey: 'ui.vault.smelt_failed',
        onSuccessText: (reward) => t('ui.vault.smelted', { rarity, reward })
    });
}

function handleDispensaryRedeem(targetItemdefid) {
    return runExchange({
        kind: 'redeem',
        localPlan: (items) => {
            const plan = planDispensaryRedeem(items, targetItemdefid, tradeUpLookup);
            return plan.ok
                ? { ...plan, consumed: [{ itemdefid: SHARD_ITEMDEFID, quantity: plan.cost }], outputItemdefid: plan.targetItemdefid }
                : plan;
        },
        steamCall: (requestId) => window.electronAPI.redeemSteamItem(targetItemdefid, requestId),
        failedKey: 'ui.vault.redeem_failed',
        onSuccessText: (reward) => {
            const rarity = tradeUpLookup(targetItemdefid)?.rarity;
            return t('ui.vault.redeemed', { cost: DISPENSARY_COST_BY_RARITY[rarity] ?? '?', reward });
        }
    });
}

export async function openDeepRelicCache() {
    if (cacheOpeningBusy) return;
    cacheOpeningBusy = true;
    if (!window.electronAPI?.openSteamCache && isDevInfiniteCacheMode()) {
        if (!vaultItems.some((item) => item.itemdefid === CACHE_ITEMDEFID && item.quantity > 0)) {
            vaultItems.push({ itemId: `dev_cache_${Date.now()}`, itemdefid: CACHE_ITEMDEFID, quantity: 1 });
        }
        if (!vaultItems.some((item) => item.itemdefid === CACHE_KEY_ITEMDEFID && item.quantity > 0)) {
            vaultItems.push({ itemId: `dev_key_${Date.now()}`, itemdefid: CACHE_KEY_ITEMDEFID, quantity: 1 });
        }
    }
    const pair = findOwnedCacheAndKey();
    if (!pair) {
        cacheOpeningBusy = false;
        return;
    }

    if (!window.electronAPI?.openSteamCache) {
        const infinite = isDevInfiniteCacheMode();
        if (!infinite) {
            pair.cache.quantity -= 1;
            pair.key.quantity -= 1;
            if (pair.cache.quantity <= 0) vaultItems = vaultItems.filter((i) => i !== pair.cache);
            if (pair.key.quantity <= 0) vaultItems = vaultItems.filter((i) => i !== pair.key);
        }
        const opening = createCacheOpeningResult({ inventory: vaultItems });
        applyCacheOpeningRewards(opening);
        persistDevVaultInventory();
        reconcileCosmeticsOwnership(vaultItems);
        renderInventoryGrid();
        updateOpenCacheAvailability();

        playCacheRevealAnimation(opening, () => {
            cacheOpeningBusy = false;
            const statusEl = document.getElementById('vault-store-open-status');
            if (statusEl) {
                statusEl.classList.remove('hidden');
                statusEl.textContent = t('ui.vault.cache_unlocked', { count: opening.rewards.length });
            }
            for (const reward of opening.rewards) showSteamDropToast(reward.itemdefid, reward.quantity ?? 1);
        });
        return;
    }

    const statusEl = document.getElementById('vault-store-open-status');
    const result = await window.electronAPI.openSteamCache(pair.cache.itemId, pair.key.itemId)
        .catch((err) => ({ ok: false, message: err?.message }));

    if (result?.ok) {
        // The inventory refresh is useful for counts, but a transient refresh
        // failure must not swallow the successful cache reveal animation.
        await loadVaultData().catch((error) => {
            console.warn('[steam-store] inventory refresh after cache open failed:', error);
        });
        updateOpenCacheAvailability();
        const opening = adaptSteamCacheResult(result);
        storeLog('info', 'cache-opened', {
            granted: (result.granted ?? []).map((item) => ({ itemdefid: item.itemdefid ?? null, quantity: item.quantity ?? 1 })),
            complete: Boolean(opening.complete)
        });

        // Steam can legitimately return an empty `granted` array for a
        // duplicate/already-granted exchange. Still show the same decryptor
        // sequence so a successful OPEN action never appears to do nothing.
        playCacheRevealAnimation(opening, () => {
            cacheOpeningBusy = false;
            if (statusEl) {
                statusEl.classList.remove('hidden');
                statusEl.textContent = opening.complete ? t('ui.vault.cache_opened') : t('ui.vault.cache_partial');
            }
            for (const reward of opening.rewards) showSteamDropToast(reward.itemdefid, reward.quantity ?? 1);
        });
    } else {
        cacheOpeningBusy = false;
        console.error('[steam-store] cache open failed:', result);
        if (statusEl) {
            statusEl.classList.remove('hidden');
            // The server holds an account's exchanges while an earlier attempt
            // is unverified and releases it once Steam's inventory has settled.
            statusEl.textContent = result?.reason === 'exchange_outcome_requires_review'
                ? t('ui.vault.cache_pending_review')
                : t('ui.vault.cache_failed');
        }
    }
}
import { assetUrl } from './assetUrl.js';

// The vault renders its panels when it opens, so a language change while it is
// on screen has to rebuild them. Guarded on the modal actually being visible so
// switching language from the title screen does no work.
onLocaleChange(() => {
    renderInventoryGrid();
    renderStoreSkuGrid();
    renderHostedItemStoreCta();
    renderOddsTable();
    renderSmelterPanel();
}, () => {
    const modal = document.getElementById('steam-vault-modal');
    return Boolean(modal) && !modal.classList.contains('hidden');
});
