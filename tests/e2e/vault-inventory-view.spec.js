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

async function expectStashLayout(page, { detailRatio = true } = {}) {
    const geometry = await page.evaluate(() => {
        const rect = (selector) => {
            const box = document.querySelector(selector)?.getBoundingClientRect();
            return box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height } : null;
        };
        const selectors = [
            '#foundry-hub-panel', '#vault-inventory-layout', '.vault-left-column',
            '#vault-inventory-container', '#vault-item-grid'
        ];
        const scrollOwners = selectors.filter((selector) => {
            const element = document.querySelector(selector);
            if (!element) return false;
            const overflow = getComputedStyle(element).overflowY;
            return element.scrollHeight > element.clientHeight + 1 && (overflow === 'auto' || overflow === 'scroll');
        });
        const left = document.querySelector('.vault-left-column')?.getBoundingClientRect();
        const clippedToolbarControls = [...document.querySelectorAll('.vault-inventory-toolbar > *')]
            .filter((element) => {
                const box = element.getBoundingClientRect();
                return !left || box.left < left.left - 1 || box.right > left.right + 1 || box.top < left.top - 1 || box.bottom > left.bottom + 1;
            })
            .map((element) => element.id);
        return {
            panel: rect('#foundry-hub-panel'),
            inventory: rect('#vault-inventory-layout'),
            grid: rect('#vault-item-grid'),
            detail: rect('.vault-right-column'),
            scrollOwners,
            clippedToolbarControls
        };
    });
    expect(geometry.panel).not.toBeNull();
    expect(geometry.inventory).not.toBeNull();
    expect(geometry.grid.height).toBeGreaterThan(240);
    expect(geometry.clippedToolbarControls, 'toolbar controls clipped outside the Stash column').toEqual([]);
    expect(geometry.scrollOwners.length, `nested Stash scroll owners: ${geometry.scrollOwners.join(', ')}`).toBeLessThanOrEqual(1);
    if (detailRatio) {
        expect(geometry.detail.width / geometry.inventory.width, 'detail rail consumed more than 36% of the Stash').toBeLessThanOrEqual(0.36);
    }
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

    await expectStashLayout(page);
    for (const viewport of [{ width: 1920, height: 1080 }, { width: 2560, height: 1440 }]) {
        await page.setViewportSize(viewport);
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await expectStashLayout(page);
    }

    // Maximum supported in-game UI scale. This adjusts the same custom
    // properties as the Accessibility setting without reopening Settings.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator('#game-viewport').evaluate((element) => {
        element.style.setProperty('--ui-scale-multiplier', '1.5');
        element.style.setProperty('--vu-text', '12px');
    });
    await expectStashLayout(page);
});
