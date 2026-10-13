import { test, expect } from '@playwright/test';
import { bootToOperatorMenu } from './helpers.js';

async function stubStackedSteamInventory(page) {
    await page.addInitScript(() => {
        const inventory = [
            ...Array.from({ length: 5 }, (_, index) => ({ itemId: `frost-${index}`, itemdefid: 4100, quantity: 1 })),
            { itemId: 'arc-1', itemdefid: 4101, quantity: 1 },
            { itemId: 'arc-2', itemdefid: 4101, quantity: 1 },
            { itemId: 'cache', itemdefid: 4000, quantity: 2 },
            { itemId: 'key', itemdefid: 4001, quantity: 2 },
            { itemId: 'shards', itemdefid: 4159, quantity: 25 }
        ];
        const api = {
            getSteamIdentity: async () => ({ active: true, steamId64: 'audit-account', persona: 'STACK AUDIT' }),
            getSteamMarketEligibility: async () => ({ ok: true, allowed: true }),
            refreshSteamInventory: async () => ({ ok: true, inventory, capabilities: ['trade_up', 'redeem'] }),
            getSteamQuartermasterWeek: async () => ({ ok: true, counts: {} }),
            getSteamStoreCatalog: async () => ({ ok: false }),
            setStat: () => {},
            setSteamInputPhase: () => {}
        };
        window.electronAPI = new Proxy(api, {
            get(target, property) {
                if (property in target) return target[property];
                if (typeof property === 'string' && property.startsWith('on')) return () => {};
                return async () => ({ ok: false, reason: `stubbed_${String(property)}` });
            }
        });
    });
}

test('Foundry Stash stacks duplicate instances, filters, and uses its available height', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await stubStackedSteamInventory(page);
    await bootToOperatorMenu(page);
    await page.locator('#steam-vault-btn').click({ force: true });
    await expect(page.locator('#foundry-hub-panel #vault-inventory-layout')).toBeVisible();

    const cards = page.locator('#vault-item-grid .vault-item-card');
    await expect(cards).toHaveCount(5);
    await expect(cards.filter({ has: page.locator('.vault-item-card__qty', { hasText: 'x5' }) })).toHaveCount(1);
    await expect(page.locator('#vault-inventory-summary')).toHaveText('5 ITEM TYPES · 36 TOTAL');

    await page.locator('#vault-search-input').fill('frost');
    await expect(cards).toHaveCount(1);
    await expect(page.locator('#vault-inventory-summary')).toHaveText('5 OF 36 ITEMS (1 TYPES)');

    await page.locator('#vault-filter-clear').click();
    await page.locator('#vault-group-filter').selectOption('cache');
    await expect(cards).toHaveCount(2);
    await expect(page.locator('#vault-inventory-summary')).toHaveText('4 OF 36 ITEMS (2 TYPES)');

    await page.locator('#vault-filter-clear').click();
    const gridHeight = await page.locator('#vault-item-grid').evaluate((element) => element.getBoundingClientRect().height);
    expect(gridHeight, 'the Deck rule collapsed the inventory back to a short strip').toBeGreaterThan(300);
});
