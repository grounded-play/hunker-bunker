import { expect, test } from '@playwright/test';
import { bootToOperatorMenu } from './helpers.js';

async function stubCacheExchange(page, { delay = 0, failSyncOnce = false } = {}) {
    await page.addInitScript(({ delay, failSyncOnce }) => {
        const inventory = [
            { itemId: 'cache-1', itemdefid: 4000, quantity: 2 },
            { itemId: 'key-1', itemdefid: 4001, quantity: 2 }
        ];
        const catalog = {
            ok: true,
            purchasesEnabled: true,
            purchaseMode: 'live',
            hostedItemStore: { enabled: false },
            catalog: [{ sku: 'key_1', keyCount: 1, priceUsdCents: 100, label: '1x Cache Key' }],
            deepRelicCacheOdds: [{ itemdefid: 4101, label: 'Arc Decal', rarity: 'legendary', quantity: 1, percent: 100 }]
        };
        window.__cacheOpenCalls = 0;
        let syncFailuresRemaining = failSyncOnce ? 1 : 0;
        window.electronAPI = new Proxy({}, {
            get(_target, property) {
                if (typeof property === 'string' && property.startsWith('on')) return () => {};
                if (property === 'setStat' || property === 'setSteamInputPhase') return () => {};
                if (property === 'getSteamIdentity') return async () => ({ active: true, steamId64: 'transaction-test', persona: 'TRANSACTION TEST' });
                if (property === 'getSteamMarketEligibility') return async () => ({ ok: true, allowed: true });
                if (property === 'getSteamStoreCatalog') return async () => structuredClone(catalog);
                if (property === 'refreshSteamInventory') return async () => {
                    if (window.__cacheOpenCalls > 0 && syncFailuresRemaining > 0) {
                        syncFailuresRemaining -= 1;
                        return { ok: false, reason: 'temporary_sync_failure' };
                    }
                    return { ok: true, inventory: structuredClone(inventory), capabilities: [] };
                };
                if (property === 'openSteamCache') {
                    return async () => {
                        window.__cacheOpenCalls += 1;
                        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
                        return { ok: true, openingId: 'open-1', granted: [{ itemId: 'reward-1', itemdefid: 4101, quantity: 1 }] };
                    };
                }
                return async () => ({ ok: false, reason: 'stubbed' });
            }
        });
    }, { delay, failSyncOnce });
}

async function openFoundryStore(page) {
    await bootToOperatorMenu(page);
    await page.locator('#steam-vault-btn').click();
    const store = page.locator('#foundry-hub-tabs button:has-text("STORE")').first();
    await expect(store).toBeVisible({ timeout: 15_000 });
    await store.click();
    await expect(page.locator('#foundry-hub-modal #vault-store-open-btn')).toBeVisible();
}

test('cache reveal submits once, contains focus, skips, claims, and restores focus', async ({ page }) => {
    await stubCacheExchange(page, { failSyncOnce: true });
    await openFoundryStore(page);

    const open = page.locator('#foundry-hub-modal #vault-store-open-btn');
    await open.focus();
    await open.click();

    const reveal = page.locator('#vault-reveal-overlay');
    const skip = page.locator('#vault-reveal-skip-btn');
    await expect(skip).toBeVisible();
    await skip.click();
    await expect(reveal).toHaveAttribute('role', 'dialog');
    await expect(reveal).toHaveAttribute('aria-modal', 'true');
    await expect(reveal).toHaveAttribute('data-state', 'revealed');
    await expect(open).toBeDisabled();
    expect(await page.evaluate(() => window.__cacheOpenCalls)).toBe(1);
    await expect(page.locator('#vault-reveal-claim-btn')).toBeFocused();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.getElementById('vault-reveal-overlay').contains(document.activeElement))).toBe(true);

    await page.locator('#vault-reveal-claim-btn').click();
    await expect(reveal).toBeHidden();
    await expect(reveal).toHaveAttribute('data-state', 'idle');
    await expect(open).toBeFocused();
    await expect(open).toBeEnabled();
    const retrySync = page.locator('#vault-store-sync-btn');
    await expect(retrySync).toBeVisible();
    await retrySync.click();
    await expect(retrySync).toBeHidden();
    expect(await page.evaluate(() => window.__cacheOpenCalls)).toBe(1);
});

test('reduced motion bypasses the reel but preserves the committed receipt', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await stubCacheExchange(page);
    await openFoundryStore(page);
    await page.locator('#vault-store-open-btn').click();

    await expect(page.locator('#vault-reveal-overlay')).toHaveAttribute('data-state', 'revealed');
    await expect(page.locator('#vault-reveal-skip-btn')).toBeHidden();
    await expect(page.locator('#vault-reveal-name')).not.toBeEmpty();
});

test('closing the Foundry cancels timers so reopen cannot show a stale reward', async ({ page }) => {
    await stubCacheExchange(page);
    await openFoundryStore(page);
    await page.locator('#vault-store-open-btn').click();
    await expect(page.locator('#vault-reveal-overlay')).toHaveAttribute('data-state', 'spinning');

    await page.evaluate(() => window.foundryHub.close());
    await expect(page.locator('#vault-reveal-overlay')).toBeHidden();
    await expect(page.locator('#vault-reveal-overlay')).toHaveAttribute('data-state', 'idle');
    await page.waitForTimeout(3400);
    await expect(page.locator('#vault-reveal-overlay')).toBeHidden();

    await page.evaluate(() => window.foundryHub.open('store'));
    await expect(page.locator('#foundry-hub-modal')).toBeVisible();
    await expect(page.locator('#vault-reveal-overlay')).toBeHidden();
});
