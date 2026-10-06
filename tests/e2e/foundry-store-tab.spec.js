import { expect, test } from '@playwright/test';
import { bootToOperatorMenu } from './helpers.js';

// Session logs 2026-10-06 (Steam build d2e7b149, Deck + PC): the Foundry hub's
// STORE tab opened onto an empty panel. It borrows the Vault's store layout
// but only the old Vault's own STORE tab drew the key bundles, odds and cache
// opener, so on the hub there was nothing to buy.
function stubSteamStore(page, purchase) {
    return page.addInitScript((purchase) => {
        const catalog = {
            ok: true,
            purchasesEnabled: true,
            purchaseMode: 'live',
            hostedItemStore: { enabled: false },
            legalTerms: 'In-Game Purchases (Includes Random Items).',
            catalog: [
                { sku: 'key_1', keyCount: 1, priceUsdCents: 100, label: '1x Cache Key' },
                { sku: 'key_5', keyCount: 5, priceUsdCents: 400, label: '5x Cache Key' },
                { sku: 'key_15', keyCount: 15, priceUsdCents: 1000, label: '15x Cache Key' }
            ],
            deepRelicCacheOdds: [
                { itemdefid: 1000, label: 'Common Relic Fragment x3', rarity: 'common', quantity: 3, percent: 55 },
                { itemdefid: 1100, label: 'Rare Relic Fragment', rarity: 'rare', quantity: 1, percent: 25 },
                { itemdefid: 2100, label: 'Carbon Fiber Decal', rarity: 'epic', quantity: 1, percent: 12 },
                { itemdefid: 2200, label: 'Chrome Plated Sidearm', rarity: 'legendary', quantity: 1, percent: 8 }
            ]
        };
        const answers = {
            getSteamIdentity: { active: true, steamId64: '76561198000000099', persona: 'Tester' },
            getSteamMarketEligibility: { ok: true, allowed: true },
            refreshSteamInventory: { ok: true, inventory: [], capabilities: [] },
            getSteamStoreCatalog: catalog,
            purchaseSteamKeys: purchase?.init,
            finalizeSteamPurchase: purchase?.finalize
        };
        window.__purchaseCalls = [];
        window.electronAPI = new Proxy({}, {
            get(_target, prop) {
                // Steam answers the overlay's approval dialog for the order.
                if (prop === 'onMicroTxnAuthorization') {
                    return (handler) => {
                        if (purchase?.authorized !== undefined) setTimeout(() => handler({ orderId: purchase.init.orderId, authorized: purchase.authorized }), 50);
                        return () => {};
                    };
                }
                if (typeof prop === 'string' && prop.startsWith('on')) return () => {};
                if (prop === 'purchaseSteamKeys' || prop === 'finalizeSteamPurchase') {
                    return async (...args) => { window.__purchaseCalls.push([prop, ...args]); return structuredClone(answers[prop]); };
                }
                if (prop === 'setStat' || prop === 'setSteamInputPhase') return () => {};
                if (Object.hasOwn(answers, prop)) return async () => structuredClone(answers[prop]);
                return async () => ({ ok: false, reason: 'stubbed' });
            }
        });
    }, purchase ?? null);
}

async function openStoreTab(page) {
    await bootToOperatorMenu(page);
    await page.locator('#steam-vault-btn').click();
    await expect(page.locator('#foundry-hub-modal')).toBeVisible();
    const storeTab = page.locator('#foundry-hub-tabs [data-hub-tab="store"], #foundry-hub-tabs button:has-text("STORE")').first();
    await expect(storeTab).toBeVisible({ timeout: 15_000 });
    await storeTab.click();
}

test('Foundry → STORE lists the key bundles with BUY buttons', async ({ page }) => {
    await stubSteamStore(page);
    await openStoreTab(page);

    const buy = page.locator('#foundry-hub-modal .vault-store-buy-btn');
    await expect(buy).toHaveCount(3);
    for (const button of await buy.all()) await expect(button).toBeEnabled();
    await expect(page.locator('#foundry-hub-modal #vault-store-sku-grid')).not.toContainText('STORE CATALOG UNAVAILABLE');
});

// Session log 2026-10-06 (Deck, beta 2.4.14): BUY VIA STEAM pressed 22 times,
// each logging purchase-start and nothing else on screen.
test('a beta purchase waits for Steam approval, then shows the keys, under the buttons', async ({ page }) => {
    await stubSteamStore(page, {
        init: { ok: true, requiresConfirmation: true, transId: 'sbx-1', orderId: '777', sandbox: true, confirmUrl: null },
        authorized: true,
        finalize: { ok: true, status: 'completed', purchaseStatus: 'completed' }
    });
    await openStoreTab(page);
    await page.locator('#foundry-hub-modal .vault-store-buy-btn').first().click();

    const status = page.locator('#foundry-hub-modal #vault-store-purchase-status');
    await expect(status).toHaveAttribute('data-tone', 'success');
    await expect(status).toContainText('+1');
    await expect(status).toBeInViewport();
    expect(await page.evaluate(() => window.__purchaseCalls.map(([name, arg]) => [name, arg])))
        .toEqual([['purchaseSteamKeys', 'key_1'], ['finalizeSteamPurchase', 'sbx-1']]);
    for (const button of await page.locator('#foundry-hub-modal .vault-store-buy-btn').all()) await expect(button).toBeEnabled();
});

test('a refused purchase says why, next to the BUY buttons', async ({ page }) => {
    await stubSteamStore(page, { init: { ok: false, reason: 'sandbox_not_allowed', purchaseStatus: 'disabled' } });
    await openStoreTab(page);
    await page.locator('#foundry-hub-modal .vault-store-buy-btn').first().click();

    const status = page.locator('#foundry-hub-modal #vault-store-purchase-status');
    await expect(status).toHaveAttribute('data-tone', 'error');
    await expect(status).toContainText('tester list');
    await expect(status).toBeInViewport();
});
