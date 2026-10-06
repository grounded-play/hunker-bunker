import { expect, test } from '@playwright/test';
import { bootToOperatorMenu } from './helpers.js';

// Session logs 2026-10-06 (Steam build d2e7b149, Deck + PC): the Foundry hub's
// STORE tab opened onto an empty panel. It borrows the Vault's store layout
// but only the old Vault's own STORE tab drew the key bundles, odds and cache
// opener, so on the hub there was nothing to buy.
test('Foundry → STORE lists the key bundles with BUY buttons', async ({ page }) => {
    await page.addInitScript(() => {
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
            getSteamStoreCatalog: catalog
        };
        window.electronAPI = new Proxy({}, {
            get(_target, prop) {
                if (typeof prop === 'string' && prop.startsWith('on')) return () => {};
                if (prop === 'setStat' || prop === 'setSteamInputPhase') return () => {};
                if (Object.hasOwn(answers, prop)) return async () => structuredClone(answers[prop]);
                return async () => ({ ok: false, reason: 'stubbed' });
            }
        });
    });
    await bootToOperatorMenu(page);

    await page.locator('#steam-vault-btn').click();
    await expect(page.locator('#foundry-hub-modal')).toBeVisible();
    const storeTab = page.locator('#foundry-hub-tabs [data-hub-tab="store"], #foundry-hub-tabs button:has-text("STORE")').first();
    await expect(storeTab).toBeVisible({ timeout: 15_000 });
    await storeTab.click();

    const buy = page.locator('#foundry-hub-modal .vault-store-buy-btn');
    await expect(buy).toHaveCount(3);
    for (const button of await buy.all()) await expect(button).toBeEnabled();
    await expect(page.locator('#foundry-hub-modal #vault-store-sku-grid')).not.toContainText('STORE CATALOG UNAVAILABLE');
});
