/**
 * Steam Vault & Store UI Frontend Implementation
 * Extracted from main.js for modular UI architecture.
 */
import { STEAM_ITEM_CATALOG } from './data/steamItemCatalog.js';
import { CATALOG_ITEMS } from './armoryUi.js';
import {
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

export { STEAM_ITEM_CATALOG };

export function getItemCatalogEntry(itemdefid) {
    if (!itemdefid) return null;
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
    // Remote CDN -> local economy PNG -> generic placeholder. The current visible Season 0
    // catalog (itemdefs 4100-4159) has complete 2D economy coverage; retain the fallback for
    // legacy/achievement/community entries so a future art gap never becomes a broken-image
    // icon.
    image.onerror = () => {
        if (!image.dataset.localFallback) {
            image.dataset.localFallback = 'true';
            image.src = assetUrl(catalog.localImg);
            return;
        }
        image.onerror = null;
        image.src = assetUrl('/favicon.png');
    };
    image.src = assetUrl(catalog.img);
}

let storeCatalog = null;
let storeOdds = [];
let storePurchasesEnabled = false;
let storePurchaseMode = 'disabled';
let storeDisabledReason = 'catalog_unavailable';
let storeHostedItemStore = null;

let vaultItems = [];
let selectedVaultItem = null;
let marketEligibility = 'unknown';
let marketEligibilityReason = null;
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
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function persistDevVaultInventory() {
    if (!isBrowserSandbox()) return;
    try {
        window.localStorage?.setItem(DEV_VAULT_STORAGE_KEY, JSON.stringify(vaultItems));
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
    kicker.textContent = 'STEAM ITEM ACQUIRED';
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

// Adds an item to the local sandbox inventory (same pattern as openDeepRelicCache()'s
// !window.electronAPI branch) without going through a real Steam Inventory Service
// transaction. Used by anything that grants an item outside of crate-opening — currently
// Season Pass tier claims (src/seasonPassUi.js). Real Electron/Steam builds should route
// grants through the actual inventory service instead once that's wired for this source.
export function grantVaultItem(itemdefid, quantity = 1) {
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
    grantNote.textContent = `STEAM ITEM UNLOCKED: ${names}`;
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
                closeModal();
                return;
            }
            if (e.code === 'KeyQ') {
                e.preventDefault();
                const tabs = [tabInventory, tabStore, tabSmelter].filter(Boolean);
                const currentIdx = tabs.findIndex((t) => t.classList.contains('active'));
                const prevIdx = (currentIdx - 1 + tabs.length) % tabs.length;
                tabs[prevIdx]?.click();
                tabs[prevIdx]?.focus();
                return;
            }
            if (e.code === 'KeyE') {
                e.preventDefault();
                const tabs = [tabInventory, tabStore, tabSmelter].filter(Boolean);
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

    tabInventory?.addEventListener('click', () => {
        activateTab(tabInventory, inventoryLayout);
        renderInventoryGrid();
    });

    tabStore?.addEventListener('click', async () => {
        activateTab(tabStore, storeLayout);
        await loadStoreCatalog();
        renderStoreSkuGrid();
        renderHostedItemStoreCta();
        renderOddsTable();
        updateOpenCacheAvailability();
    });

    tabSmelter?.addEventListener('click', () => {
        activateTab(tabSmelter, smelterLayout);
        renderSmelterPanel();
    });

    document.getElementById('vault-store-open-btn')?.addEventListener('click', openDeepRelicCache);
    document.getElementById('vault-store-hosted-btn')?.addEventListener('click', openHostedSteamItemStore);
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
    marketEligibilityReason = result?.reason ?? result?.eligibility?.reason ?? null;
}

function canOpenMarketOverlay() {
    return marketEligibility === 'eligible';
}

function getMarketEligibilityStatusText() {
    if (marketEligibility === 'unknown') return 'STEAM MARKET CHECK PENDING';
    if (marketEligibilityReason === 'unsupported') return 'STEAM MARKET CHECK UNSUPPORTED';
    if (marketEligibilityReason === 'error') return 'STEAM MARKET CHECK FAILED';
    return 'STEAM MARKET ELIGIBILITY UNCONFIRMED';
}

export async function loadVaultData() {
    const statusEl = document.getElementById('vault-connection-status');
    const playerEl = document.getElementById('vault-player-name');
    const commandStatus = document.getElementById('vault-command-status');

    if (window.electronAPI) {
        // Fetch Identity
        const identity = await window.electronAPI.getSteamIdentity().catch(() => null);

        // Fetch Market Eligibility
        const marketCheck = window.electronAPI.getSteamMarketEligibility
            ? window.electronAPI.getSteamMarketEligibility()
            : Promise.resolve({ ok: false, reason: 'unsupported' });
        const marketResult = await Promise.resolve(marketCheck).catch(() => ({ ok: false, reason: 'error' }));
        setMarketEligibilityFromResult(marketResult);
        if (identity?.active) {
            if (playerEl) playerEl.textContent = identity.persona ?? 'OPERATOR';
            if (statusEl) statusEl.textContent = 'STEAM CONNECTED';
            if (statusEl) statusEl.classList.remove('vault-status--offline');
            if (commandStatus) commandStatus.textContent = identity.persona ?? 'ONLINE';
        } else {
            if (playerEl) playerEl.textContent = 'DEV MODE';
            if (statusEl) statusEl.textContent = 'DEV FALLBACK';
            if (commandStatus) commandStatus.textContent = 'DEV MODE';
        }

        // Fetch Inventory
        const result = await window.electronAPI.refreshSteamInventory().catch(() => null);
        if (result?.ok && Array.isArray(result.inventory) && result.inventory.length > 0) {
            vaultItems = result.inventory;
            // Feed the unified ownership store (src/itemOwnership.js) so the
            // Armory gates on the same entitlements the Vault renders. Only the
            // real service response is pushed here -- the sandbox fallback below
            // is not an entitlement and must not read as one.
            window.itemOwnership?.setSteamInventory(result.inventory);
        } else if (vaultItems.length === 0) {
            vaultItems = readDevVaultInventory() ?? [
                { itemId: 'sandbox_4000', itemdefid: 4000, quantity: 2 },
                { itemId: 'sandbox_4001', itemdefid: 4001, quantity: 2 },
                { itemId: 'sandbox_2000', itemdefid: 2000, quantity: 1 },
                { itemId: 'sandbox_2003', itemdefid: 2003, quantity: 1 },
                { itemId: 'sandbox_2100', itemdefid: 2100, quantity: 1 }
            ];
        }
        reconcileCosmeticsOwnership(vaultItems);
        renderInventoryGrid();
        updateOpenCacheAvailability();
    } else {
        setMarketEligibilityFromResult({ ok: false, reason: 'unsupported' });
        if (playerEl) playerEl.textContent = 'SANDBOX OPERATOR';
        if (statusEl) statusEl.textContent = 'SANDBOX ACTIVE';
        if (commandStatus) commandStatus.textContent = 'SANDBOX';
        if (vaultItems.length === 0) {
            vaultItems = readDevVaultInventory() ?? [
                { itemId: 'sandbox_4000', itemdefid: 4000, quantity: 2 },
                { itemId: 'sandbox_4001', itemdefid: 4001, quantity: 2 },
                { itemId: 'sandbox_2000', itemdefid: 2000, quantity: 1 },
                { itemId: 'sandbox_2003', itemdefid: 2003, quantity: 1 },
                { itemId: 'sandbox_2100', itemdefid: 2100, quantity: 1 }
            ];
            persistDevVaultInventory();
            reconcileCosmeticsOwnership(vaultItems);
        }
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
            document.querySelectorAll('.vault-item-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            updateDetailsPanel(item);
        });

        grid.appendChild(card);
    });

    if (!selectedVaultItem && vaultItems.length > 0) {
        selectedVaultItem = vaultItems[0];
        updateDetailsPanel(selectedVaultItem);
    }
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

    if (!item) return;
    const catalog = getItemCatalogEntry(item.itemdefid);
    if (!catalog) return;

    if (nameEl) nameEl.textContent = catalog.name;
    if (rarityEl) {
        rarityEl.textContent = catalog.rarity;
        rarityEl.style.color = getRarityColor(catalog.rarity);
    }
    if (descEl) descEl.textContent = catalog.desc;
    if (imgEl) applyCatalogImage(imgEl, catalog);

    if (tradableEl) {
        tradableEl.className = `vault-meta-tag vault-meta-tag--readonly ${catalog.tradable ? 'active' : ''}`;
        tradableEl.title = "Trading is handled externally through Steam.";
        tradableEl.textContent = catalog.tradable ? 'TRADABLE' : 'NON-TRADABLE';
    }
    if (marketableEl) {
        const isEligible = canOpenMarketOverlay();
        marketableEl.className = `vault-meta-tag vault-meta-tag--readonly ${catalog.marketable ? 'active' : ''} ${catalog.marketable && !isEligible ? 'degraded' : ''}`;
        marketableEl.title = "Market actions are handled externally through Steam.";
        if (catalog.marketable && !isEligible) {
            marketableEl.textContent = 'MARKETABLE (OFFLINE)';
            marketableEl.title = "Market eligibility route unavailable or rejected.";
        } else {
            marketableEl.textContent = catalog.marketable ? 'MARKETABLE' : 'NON-MARKETABLE';
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
        statusEl.textContent = `STEAM OWNERSHIP VERIFIED${quantity}`;
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

const FALLBACK_STORE_SKUS = [
    { sku: 'keys_1', label: '1x Relic Key', priceUsdCents: 99, keys: 1 },
    { sku: 'keys_5', label: '5x Relic Keys', priceUsdCents: 449, keys: 5 },
    { sku: 'keys_10', label: '10x Relic Keys', priceUsdCents: 799, keys: 10 }
];
const FALLBACK_STORE_ODDS = [
    { label: 'Victory Patches (Scout/Tank/Eng)', rarity: 'uncommon', percent: 60 },
    { label: 'Rare Decals & Weapon Finishes', rarity: 'rare', percent: 25 },
    { label: 'Epic Emblems & Armaments', rarity: 'epic', percent: 12 },
    { label: 'Legendary Queen Slayer Emblem', rarity: 'legendary', percent: 3 }
];

export async function loadStoreCatalog() {
    if (window.electronAPI?.getSteamStoreCatalog) {
        const result = await window.electronAPI.getSteamStoreCatalog().catch(() => null);
        if (result?.ok) {
            storeCatalog = result.catalog ?? [];
            storeOdds = result.deepRelicCacheOdds ?? [];
            storePurchasesEnabled = Boolean(result.purchasesEnabled);
            storePurchaseMode = result.purchaseMode ?? (storePurchasesEnabled ? 'live' : 'disabled');
            storeDisabledReason = result.disabledReason ?? null;
            storeHostedItemStore = result.hostedItemStore ?? null;
            return;
        }
    }
    storeCatalog = FALLBACK_STORE_SKUS;
    storeOdds = FALLBACK_STORE_ODDS;
    storePurchasesEnabled = true;
    storePurchaseMode = 'mock';
    storeDisabledReason = null;
    storeHostedItemStore = {
        enabled: true,
        url: 'https://store.steampowered.com/itemstore/4957040/',
        mode: 'beta'
    };
}

function formatStoreDisabledReason(reason) {
    if (reason === 'steam_store_disabled') return 'PURCHASES OFFLINE';
    if (reason === 'catalog_unavailable') return 'CATALOG OFFLINE';
    return 'UNAVAILABLE';
}

export function renderStoreSkuGrid() {
    const grid = document.getElementById('vault-store-sku-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!storeCatalog || storeCatalog.length === 0) {
        grid.innerHTML = '<div class="vault-empty-state">STORE CATALOG UNAVAILABLE</div>';
        return;
    }

    for (const sku of storeCatalog) {
        const card = document.createElement('div');
        card.className = 'vault-store-sku-card';
        const priceLabel = `$${(sku.priceUsdCents / 100).toFixed(2)}`;
        const buttonLabel = storePurchasesEnabled
            ? (storePurchaseMode === 'mock' ? '◈ BUY (DEV)' : '◈ BUY VIA STEAM')
            : formatStoreDisabledReason(storeDisabledReason);
        const keyCount = sku.keys || 1;
        const savingsTag = keyCount === 5
            ? '<span class="vault-sku-save-badge">SAVE 10%</span>'
            : (keyCount === 10 ? '<span class="vault-sku-save-badge vault-sku-save-badge--best">BEST VALUE // -20%</span>' : '');
        card.innerHTML = `
            <div class="vault-store-sku-top">
                <div class="vault-sku-icon-wrap">
                    <span class="vault-sku-icon">🗝️</span>
                    <span class="vault-sku-count">x${keyCount}</span>
                </div>
                ${savingsTag}
            </div>
            <div class="vault-store-sku-label">${sku.label}</div>
            <div class="vault-store-sku-price">${priceLabel}</div>
            <div class="vault-store-sku-sub">STEAM WALLET DIRECT</div>
            <button class="start-btn vault-store-buy-btn" data-sku="${sku.sku}" ${storePurchasesEnabled ? '' : 'disabled'}>${buttonLabel}</button>
        `;
        const buyBtn = card.querySelector('.vault-store-buy-btn');
        buyBtn?.addEventListener('click', () => purchaseKeys(sku.sku));
        grid.appendChild(card);
    }
}

export function renderHostedItemStoreCta() {
    const row = document.getElementById('vault-store-hosted');
    const status = document.getElementById('vault-store-hosted-status');
    const btn = document.getElementById('vault-store-hosted-btn');
    if (!row || !status || !btn) return;

    const url = storeHostedItemStore?.url;
    const configured = Boolean(storeHostedItemStore?.enabled && url);
    const enabled = configured && canOpenMarketOverlay();
    row.classList.toggle('hidden', !configured);
    btn.disabled = !enabled;
    if (!configured) {
        status.textContent = 'STEAM ITEM STORE OFFLINE';
        return;
    }
    if (!enabled) {
        status.textContent = getMarketEligibilityStatusText();
        return;
    }

    const mode = storeHostedItemStore.mode === 'beta' ? 'BETA PREVIEW' : 'STEAM-HOSTED CHECKOUT';
    status.textContent = mode;
}

export async function openHostedSteamItemStore() {
    const url = storeHostedItemStore?.url;
    if (!url || !canOpenMarketOverlay()) {
        renderHostedItemStoreCta();
        return;
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

    for (const row of storeOdds) {
        const rowEl = document.createElement('div');
        rowEl.className = 'vault-store-odds-row';
        const color = getRarityColor(row.rarity);
        const rarityLabel = (row.rarity || 'UNCOMMON').toUpperCase();
        rowEl.innerHTML = `
            <div class="vault-store-odds-left">
                <span class="vault-odds-rarity-pill" style="color:${color}; border-color:${color}80; background:${color}1a;">${rarityLabel}</span>
                <span class="vault-store-odds-item">${row.label}</span>
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
    if (!window.electronAPI?.purchaseSteamKeys) {
        const skuInfo = storeCatalog?.find((s) => s.sku === sku) || { keys: 1 };
        const keyCount = skuInfo.keys || 1;
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
            statusEl.textContent = `Sandbox purchase verified: +${keyCount} Relic Key(s) added!`;
        }
        showSteamDropToast(4001, keyCount);
        return;
    }

    if (!storePurchasesEnabled) {
        const statusEl = document.getElementById('vault-store-open-status');
        if (statusEl) {
            statusEl.classList.remove('hidden');
            statusEl.textContent = 'Steam Store purchases are offline for this build.';
        }
        return;
    }

    const result = await window.electronAPI.purchaseSteamKeys(sku).catch((err) => ({ ok: false, message: err?.message }));

    if (result?.ok && result.mode === 'mock') {
        await loadVaultData();
        updateOpenCacheAvailability();
        return;
    }

    if (result?.ok && result.requiresConfirmation && result.confirmUrl) {
        await window.electronAPI.openSteamOverlayToUrl(result.confirmUrl);
        const finalized = await window.electronAPI.finalizeSteamPurchase(result.transId).catch(() => null);
        if (finalized?.ok && finalized.status === 'completed') {
            await loadVaultData();
            updateOpenCacheAvailability();
        } else {
            console.warn('[steam-store] purchase not yet completed:', finalized);
        }
        return;
    }

    console.error('[steam-store] purchase failed:', result);
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
            statusEl.textContent = 'No Cache + Key pair detected in your inventory.';
        }
        btn?.classList.add('hidden');
    }
}

function applyCacheOpeningRewards(result) {
    for (const reward of result?.rewards ?? []) {
        grantVaultItem(reward.itemdefid, reward.quantity ?? 1);
    }
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

    if (titleEl) titleEl.textContent = 'DECRYPTING RELIC CACHE';
    if (statusEl) statusEl.textContent = 'SPINNING CIPHER MATRIX...';

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
        if (titleEl) titleEl.textContent = 'DECRYPTION COMPLETE';
        if (statusEl) statusEl.textContent = 'ITEM SECURED & PERSISTED TO STEAM';

        if (cardEl) {
            const color = getRarityColor(reward.rarity);
            cardEl.className = `vault-reveal-card vault-reveal-card--${reward.rarity.toLowerCase()}`;
            cardEl.style.borderColor = color;
            cardEl.style.boxShadow = `0 0 40px ${color}80, 0 0 80px ${color}40`;
        }

        if (rarityPill) {
            rarityPill.textContent = `★ ${(reward.rarity || 'RARE').toUpperCase()} REWARD ★`;
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
                    <span>x${entry.quantity ?? 1}${entry.duplicate ? ' // DUPLICATE CONVERTED' : ''}</span>
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

    const SMELT_TIERS = ['uncommon', 'rare', 'epic'];
    const NEXT_TIER_LABEL = { uncommon: 'RARE', rare: 'EPIC', epic: 'LEGENDARY' };

    if (smelterGrid) {
        smelterGrid.innerHTML = '';
        for (const rarity of SMELT_TIERS) {
            const owned = vaultItems.reduce((sum, i) => {
                const cat = getItemCatalogEntry(i.itemdefid);
                return cat?.rarity === rarity ? sum + Number(i.quantity || 0) : sum;
            }, 0);
            const eligible = canSmelt(vaultItems, rarity, getItemCatalogEntry);

            const card = document.createElement('div');
            card.className = 'vault-smelter-card';
            card.innerHTML = `
                <div class="vault-smelter-card__title" style="color:${getRarityColor(rarity)}">${rarity.toUpperCase()} → ${NEXT_TIER_LABEL[rarity]}</div>
                <div class="vault-smelter-card__sub">Owned: ${owned} / 5 required</div>
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
        const ingotAffordable = window.bankManager?.canAfford?.(INGOT_PACK_COST) ?? false;
        const ingotCard = document.createElement('div');
        ingotCard.className = 'vault-smelter-card';
        ingotCard.innerHTML = `
            <div class="vault-smelter-card__title" style="color:${getRarityColor('uncommon')}">Cryo-Alloy Ingot Pack (x${INGOT_PACK_QUANTITY})</div>
            <div class="vault-smelter-card__sub">${INGOT_PACK_COST.tech} Tech — Quartermaster, unlimited</div>
            <button class="vault-smelter-card__btn" ${ingotAffordable ? '' : 'disabled'} id="vault-quartermaster-ingot-btn">PURCHASE</button>
        `;
        ingotCard.querySelector('button')?.addEventListener('click', handleIngotPackPurchase);
        dispensaryGrid.appendChild(ingotCard);

        const shardBalance = getShardBalance(vaultItems);
        const dispensableIds = Object.keys(STEAM_ITEM_CATALOG)
            .map(Number)
            .filter((id) => DISPENSARY_COST_BY_RARITY[STEAM_ITEM_CATALOG[id]?.rarity])
            .slice(0, 5);

        for (const itemdefid of dispensableIds) {
            const cat = getItemCatalogEntry(itemdefid);
            if (!cat) continue;
            const cost = DISPENSARY_COST_BY_RARITY[cat.rarity];
            const affordable = shardBalance >= cost;

            const card = document.createElement('div');
            card.className = 'vault-smelter-card';
            card.innerHTML = `
                <div class="vault-smelter-card__title" style="color:${getRarityColor(cat.rarity)}">${cat.name}</div>
                <div class="vault-smelter-card__sub">${cost} Shards (${cat.rarity})</div>
                <button class="vault-smelter-card__btn" ${affordable ? '' : 'disabled'} data-dispense-id="${itemdefid}">REDEEM</button>
            `;
            card.querySelector('button')?.addEventListener('click', () => handleDispensaryRedeem(itemdefid));
            dispensaryGrid.appendChild(card);
        }
    }
}

function handleIngotPackPurchase() {
    const plan = planIngotPackPurchase(window.bankManager);
    const statusEl = document.getElementById('vault-smelter-status');
    if (!plan.ok) {
        if (statusEl) statusEl.textContent = `Purchase failed: ${plan.reason.replace(/_/g, ' ')}.`;
        return;
    }

    if (!window.bankManager.spend(plan.cost)) {
        if (statusEl) statusEl.textContent = 'Purchase failed: bank spend rejected.';
        return;
    }
    grantVaultItem(plan.itemdefid, plan.quantity);

    if (statusEl) statusEl.textContent = `Purchased ${plan.quantity}x Cryo-Alloy Ingot for ${plan.cost.tech} Tech!`;
    showSteamDropToast(plan.itemdefid, plan.quantity);
    window.AudioManager?.play?.('fx_achievement', { volume: 0.4, bus: 'sfx' });
    renderSmelterPanel();
}

function handleSmeltClick(rarity) {
    const outputPool = Object.keys(STEAM_ITEM_CATALOG).map(Number);
    const plan = planSmelt({ vaultItems, rarity, catalogLookup: getItemCatalogEntry, outputPool });
    const statusEl = document.getElementById('vault-smelter-status');
    if (!plan.ok) {
        if (statusEl) statusEl.textContent = `Smelt failed: ${plan.reason.replace(/_/g, ' ')}.`;
        return;
    }

    for (const { itemdefid, quantity } of plan.consumed) {
        const stack = vaultItems.find((i) => i.itemdefid === itemdefid);
        if (!stack) continue;
        stack.quantity -= quantity;
    }
    vaultItems = vaultItems.filter((i) => i.quantity > 0);
    grantVaultItem(plan.outputItemdefid, 1);

    if (statusEl) {
        const reward = getItemCatalogEntry(plan.outputItemdefid);
        statusEl.textContent = `Smelted 5x ${rarity} → ${reward?.name ?? plan.outputItemdefid}!`;
    }
    showSteamDropToast(plan.outputItemdefid, 1);
    window.AudioManager?.play?.('fx_achievement', { volume: 0.4, bus: 'sfx' });
    renderSmelterPanel();
}

function handleDispensaryRedeem(targetItemdefid) {
    const plan = planDispensaryRedeem(vaultItems, targetItemdefid, getItemCatalogEntry);
    const statusEl = document.getElementById('vault-smelter-status');
    if (!plan.ok) {
        if (statusEl) statusEl.textContent = `Redeem failed: ${plan.reason.replace(/_/g, ' ')}.`;
        return;
    }

    const shardStack = vaultItems.find((i) => i.itemdefid === SHARD_ITEMDEFID);
    if (shardStack) shardStack.quantity -= plan.cost;
    vaultItems = vaultItems.filter((i) => i.quantity > 0);
    grantVaultItem(plan.targetItemdefid, 1);

    if (statusEl) {
        const reward = getItemCatalogEntry(plan.targetItemdefid);
        statusEl.textContent = `Redeemed ${plan.cost} Shards for ${reward?.name ?? plan.targetItemdefid}!`;
    }
    showSteamDropToast(plan.targetItemdefid, 1);
    window.AudioManager?.play?.('fx_achievement', { volume: 0.4, bus: 'sfx' });
    renderSmelterPanel();
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
                statusEl.textContent = `Cache unlocked: ${opening.rewards.length} rewards secured.`;
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

        // Steam can legitimately return an empty `granted` array for a
        // duplicate/already-granted exchange. Still show the same decryptor
        // sequence so a successful OPEN action never appears to do nothing.
        playCacheRevealAnimation(opening, () => {
            cacheOpeningBusy = false;
            if (statusEl) {
                statusEl.classList.remove('hidden');
                statusEl.textContent = opening.complete ? 'Cache bundle opened.' : 'Cache exchange completed with a partial Steam grant.';
            }
            for (const reward of opening.rewards) showSteamDropToast(reward.itemdefid, reward.quantity ?? 1);
        });
    } else {
        cacheOpeningBusy = false;
        console.error('[steam-store] cache open failed:', result);
        if (statusEl) {
            statusEl.classList.remove('hidden');
            statusEl.textContent = 'Cache open failed — check your connection and try again.';
        }
    }
}
import { assetUrl } from './assetUrl.js';
