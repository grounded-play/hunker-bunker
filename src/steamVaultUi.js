/**
 * Steam Vault & Store UI Frontend Implementation
 * Extracted from main.js for modular UI architecture.
 */

export const STEAM_ITEM_CATALOG = Object.freeze({
    1000: {
        name: 'Common Relic Fragment',
        rarity: 'common',
        desc: 'A shard of ancient subterranean machinery, used in basic crafting exchanges.',
        tradable: true,
        marketable: false,
        img: 'https://hunkerbunker.netlify.app/economy/relic_common.png'
    },
    1100: {
        name: 'Rare Relic Fragment',
        rarity: 'rare',
        desc: 'An intact processor core from the deep vaults, used to craft elite cosmetics.',
        tradable: true,
        marketable: false,
        img: 'https://hunkerbunker.netlify.app/economy/relic_rare.png'
    },
    2000: {
        name: 'Scout Victory Patch',
        rarity: 'uncommon',
        desc: 'Awarded to operators who successfully extract using a Scout frame. Cosmetic equip.',
        tradable: true,
        marketable: true,
        img: 'https://hunkerbunker.netlify.app/economy/patch_scout.png'
    },
    2001: {
        name: 'Tank Victory Patch',
        rarity: 'uncommon',
        desc: 'Awarded to operators who successfully extract using a Tank frame. Cosmetic equip.',
        tradable: true,
        marketable: true,
        img: 'https://hunkerbunker.netlify.app/economy/patch_tank.png'
    },
    2002: {
        name: 'Engineer Victory Patch',
        rarity: 'uncommon',
        desc: 'Awarded to operators who successfully extract using an Engineer frame. Cosmetic equip.',
        tradable: true,
        marketable: true,
        img: 'https://hunkerbunker.netlify.app/economy/patch_engineer.png'
    },
    2100: {
        name: 'Carbon Fiber Decal',
        rarity: 'rare',
        desc: 'A high-performance weave finish for your exosuit. Cosmetic equip.',
        tradable: true,
        marketable: true,
        img: 'https://hunkerbunker.netlify.app/economy/decal_carbon.png'
    },
    2200: {
        name: 'Chrome Plated Sidearm',
        rarity: 'epic',
        desc: 'Polished high-reflectivity chrome finish for the standard sidearm. Cosmetic equip.',
        tradable: true,
        marketable: true,
        img: 'https://hunkerbunker.netlify.app/economy/finish_chrome.png'
    },
    2003: {
        name: 'Queen Slayer Emblem',
        rarity: 'legendary',
        desc: 'Awarded for defeating the Act 2 queen. Cosmetic equip.',
        tradable: true,
        marketable: true,
        img: 'https://hunkerbunker.netlify.app/economy/emblem_queen_slayer.png'
    },
    2004: {
        name: 'Archivist Emblem',
        rarity: 'epic',
        desc: 'Awarded for recovering the full bunker archive. Cosmetic equip.',
        tradable: true,
        marketable: true,
        img: 'https://hunkerbunker.netlify.app/economy/emblem_archivist.png'
    },
    4000: {
        name: 'Deep Relic Cache',
        rarity: 'container',
        desc: 'A sealed drop container. Requires a Cache Key to open — see the STORE tab for published odds.',
        tradable: true,
        marketable: true,
        img: 'https://hunkerbunker.netlify.app/economy/cache_deep_relic.png'
    },
    4001: {
        name: 'Cache Key',
        rarity: 'key',
        desc: 'Opens a single Deep Relic Cache. Purchased with real money; never drops for free.',
        tradable: true,
        marketable: true,
        img: 'https://hunkerbunker.netlify.app/economy/cache_key.png'
    }
});

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
    const catalog = STEAM_ITEM_CATALOG[itemdefid];
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
    img.src = assetUrl(catalog.img);
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

export function renderSteamMilestoneGrants(grants = []) {
    const grantNote = document.getElementById('go-steam-grant-note');
    if (!grantNote || !Array.isArray(grants) || grants.length === 0) return;

    const names = grants
        .map((item) => {
            const catalog = STEAM_ITEM_CATALOG[item.itemdefid];
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
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                closeModal();
            }
        });
    }

    if (typeof window.setupClickOutside === 'function') {
        window.setupClickOutside('steam-vault-modal', closeModal);
    }

    const tabInventory = document.getElementById('vault-tab-inventory');
    const tabStore = document.getElementById('vault-tab-store');
    const inventoryLayout = document.getElementById('vault-inventory-layout');
    const storeLayout = document.getElementById('vault-store-layout');

    tabInventory?.addEventListener('click', () => {
        tabInventory.classList.add('active');
        tabStore?.classList.remove('active');
        inventoryLayout?.classList.remove('hidden');
        storeLayout?.classList.add('hidden');
        renderInventoryGrid();
    });

    tabStore?.addEventListener('click', async () => {
        tabStore.classList.add('active');
        tabInventory?.classList.remove('active');
        storeLayout?.classList.remove('hidden');
        inventoryLayout?.classList.add('hidden');
        await loadStoreCatalog();
        renderStoreSkuGrid();
        renderHostedItemStoreCta();
        renderOddsTable();
        updateOpenCacheAvailability();
    });

    document.getElementById('vault-store-open-btn')?.addEventListener('click', openDeepRelicCache);
    document.getElementById('vault-store-hosted-btn')?.addEventListener('click', openHostedSteamItemStore);
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
        if (result?.ok) {
            vaultItems = result.inventory ?? [];
            reconcileCosmeticsOwnership(vaultItems);
            renderInventoryGrid();
            updateOpenCacheAvailability();
        } else {
            console.error('[steam-vault] failed to load inventory:', result);
        }
    } else {
        setMarketEligibilityFromResult({ ok: false, reason: 'unsupported' });
        if (playerEl) playerEl.textContent = 'WEB BUILD';
        if (statusEl) statusEl.textContent = 'OFFLINE';
        if (commandStatus) commandStatus.textContent = 'OFFLINE';
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
        const catalog = STEAM_ITEM_CATALOG[item.itemdefid];
        if (!catalog) return;

        const card = document.createElement('div');
        const rarityClass = `vault-item--${catalog.rarity}`;
        const isSelected = selectedVaultItem && selectedVaultItem.itemId === item.itemId;

        card.className = `vault-item-card ${rarityClass} ${isSelected ? 'selected' : ''}`;

        const img = document.createElement('img');
        img.className = 'vault-item-card__art';
        img.src = assetUrl(catalog.img);
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
    const statusEl = document.getElementById('vault-equip-status');

    if (!item) return;
    const catalog = STEAM_ITEM_CATALOG[item.itemdefid];
    if (!catalog) return;

    if (nameEl) nameEl.textContent = catalog.name;
    if (rarityEl) {
        rarityEl.textContent = catalog.rarity;
        rarityEl.style.color = getRarityColor(catalog.rarity);
    }
    if (descEl) descEl.textContent = catalog.desc;
    if (imgEl) imgEl.src = assetUrl(catalog.img);

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
}

export async function loadStoreCatalog() {
    if (!window.electronAPI?.getSteamStoreCatalog) return;
    const result = await window.electronAPI.getSteamStoreCatalog().catch(() => null);
    if (result?.ok) {
        storeCatalog = result.catalog ?? [];
        storeOdds = result.deepRelicCacheOdds ?? [];
        storePurchasesEnabled = Boolean(result.purchasesEnabled);
        storePurchaseMode = result.purchaseMode ?? (storePurchasesEnabled ? 'live' : 'disabled');
        storeDisabledReason = result.disabledReason ?? null;
        storeHostedItemStore = result.hostedItemStore ?? null;
    } else {
        storePurchasesEnabled = false;
        storePurchaseMode = 'disabled';
        storeDisabledReason = result?.reason ?? 'catalog_unavailable';
        storeHostedItemStore = null;
        console.error('[steam-store] failed to load catalog:', result);
    }
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
            ? (storePurchaseMode === 'mock' ? 'DEV BUY' : 'BUY')
            : formatStoreDisabledReason(storeDisabledReason);
        card.innerHTML = `
            <div class="vault-store-sku-label">${sku.label}</div>
            <div class="vault-store-sku-price">${priceLabel}</div>
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
        rowEl.innerHTML = `
            <span class="vault-store-odds-item">${row.label}</span>
            <span class="vault-store-odds-percent" style="color:${getRarityColor(row.rarity)}">${row.percent}%</span>
        `;
        table.appendChild(rowEl);
    }
}

export async function purchaseKeys(sku) {
    if (!window.electronAPI?.purchaseSteamKeys) return;
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

function findOwnedCacheAndKey() {
    const cache = vaultItems.find((i) => i.itemdefid === 4000);
    const key = vaultItems.find((i) => i.itemdefid === 4001);
    return cache && key ? { cache, key } : null;
}

export function updateOpenCacheAvailability() {
    const statusEl = document.getElementById('vault-store-open-status');
    const btn = document.getElementById('vault-store-open-btn');
    const pair = findOwnedCacheAndKey();

    if (pair) {
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

export async function openDeepRelicCache() {
    if (!window.electronAPI?.openSteamCache) return;
    const pair = findOwnedCacheAndKey();
    if (!pair) return;

    const statusEl = document.getElementById('vault-store-open-status');
    const result = await window.electronAPI.openSteamCache(pair.cache.itemId, pair.key.itemId)
        .catch((err) => ({ ok: false, message: err?.message }));

    if (result?.ok) {
        await loadVaultData();
        updateOpenCacheAvailability();
        const reward = STEAM_ITEM_CATALOG[result.granted?.[0]?.itemdefid];
        if (statusEl) {
            statusEl.classList.remove('hidden');
            statusEl.textContent = reward ? `Cache opened: ${reward.name}!` : 'Cache opened.';
        }
    } else {
        console.error('[steam-store] cache open failed:', result);
        if (statusEl) {
            statusEl.classList.remove('hidden');
            statusEl.textContent = 'Cache open failed — check your connection and try again.';
        }
    }
}
import { assetUrl } from './assetUrl.js';
