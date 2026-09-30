import { test, expect } from '@playwright/test';
import { bootToOperatorMenu } from '../helpers.js';

// Sprint 48 P2 acceptance for the smelter (QA 2026-09-24 "trade-up does not
// stick"): smelt 5 -> 1, see both counts change, close and reopen, counts
// unchanged. On the Deck, SMELT 5x EPIC was pressed 12 times and stayed
// enabled: the handler spent the inputs in memory, then grantVaultItem
// re-read the stored inventory (inputs still in it) before adding the output.
//
// The Vault only initializes under an electronAPI. QA tools on = the local
// inventory (browser sandbox); QA tools off = a Steam build, where trade-ups
// have no service recipe and must stay disabled rather than revert.

const RARE = [4103, 4104];

function stubElectron(page, { qaTools }) {
    return page.addInitScript((qa) => {
        window.electronAPI = new Proxy({}, {
            get(_target, prop) {
                if (typeof prop === 'string' && prop.startsWith('on')) return () => {};
                if (prop === 'setStat' || prop === 'setSteamInputPhase') return () => {};
                if (prop === 'getQaToolsEnabled') return () => Promise.resolve(qa);
                return () => Promise.reject(new Error(`stubbed offline: ${String(prop)}`));
            }
        });
    }, qaTools);
}

function seedVault(page, items) {
    return page.addInitScript((seed) => {
        if (!sessionStorage.getItem('hb-probe-seeded')) {
            localStorage.setItem('hb_dev_vault_inventory_v1', JSON.stringify({ items: seed, receipts: {} }));
            sessionStorage.setItem('hb-probe-seeded', '1');
        }
    }, items);
}

// The Vault opens inside the Foundry hub; the smelter is its Trade-up tab.
async function openSmelter(page) {
    await page.locator('#steam-vault-btn').click({ force: true });
    await expect(page.locator('#foundry-hub-modal')).toBeVisible();
    await page.locator('#foundry-hub-tabs [data-tab="tradeup"]').click();
    await expect(page.locator('#vault-smelter-grid .vault-smelter-card')).toHaveCount(3);
}

const card = (page, rarity) => page.locator(`#vault-smelter-grid .vault-smelter-card:has([data-smelt-rarity="${rarity}"])`);

test('a trade-up spends five, grants one, and survives close and reopen', async ({ page }) => {
    const logs = [];
    page.on('console', (msg) => { if (msg.text().includes('smelt')) logs.push(msg.text()); });
    await stubElectron(page, { qaTools: true });
    await seedVault(page, [
        { itemId: 'r1', itemdefid: RARE[0], quantity: 3 },
        { itemId: 'r2', itemdefid: RARE[1], quantity: 1 },
        { itemId: 'r3', itemdefid: RARE[1], quantity: 1 }
    ]);
    await bootToOperatorMenu(page);
    await page.waitForFunction(() => window.__hbQaToolsEnabled === true);
    await openSmelter(page);

    await expect(card(page, 'rare')).toContainText('5 / 5');
    await expect(card(page, 'epic')).toContainText('0 / 5');
    await card(page, 'rare').locator('button').click();

    await expect(card(page, 'rare')).toContainText('0 / 5');
    await expect(card(page, 'epic')).toContainText('1 / 5');
    await expect(card(page, 'rare').locator('button')).toBeDisabled();

    await page.locator('#close-foundry-hub').click();
    await expect(page.locator('#foundry-hub-modal')).toBeHidden();
    await openSmelter(page);
    await expect(card(page, 'rare')).toContainText('0 / 5');
    await expect(card(page, 'epic')).toContainText('1 / 5');

    // And after a full reload (the stored inventory, not this page's memory).
    await page.reload();
    await bootToOperatorMenu(page);
    await page.waitForFunction(() => window.__hbQaToolsEnabled === true);
    await openSmelter(page);
    await expect(card(page, 'rare')).toContainText('0 / 5');
    await expect(card(page, 'epic')).toContainText('1 / 5');

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('hb_dev_vault_inventory_v1')));
    expect(stored.items.filter((i) => [4103, 4104].includes(i.itemdefid))).toEqual([]);
    expect(Object.keys(stored.receipts).filter((k) => k.startsWith('smelt:'))).toHaveLength(1);
});

test('on a Steam build the trade-up is disabled with a reason instead of reverting', async ({ page }) => {
    await stubElectron(page, { qaTools: false });
    await bootToOperatorMenu(page);
    await page.waitForFunction(() => window.__hbQaToolsEnabled === false);
    await openSmelter(page);
    for (const rarity of ['uncommon', 'rare', 'epic']) {
        await expect(card(page, rarity).locator('button')).toBeDisabled();
    }
    await expect(page.locator('#vault-smelter-status')).toContainText(/Steam item service/i);
    await expect(page.locator('#foundry-hub-tabs [data-tab="tradeup"]')).toHaveClass(/is-locked/);
});

test('on a Steam build with an updated backend, the trade-up goes through the server and sticks', async ({ page }) => {
    await page.addInitScript(() => {
        // A fake backend: five rares, trade-up capability, and a trade-up
        // route that replaces them with one epic (as server/steamTradeUp.js does).
        let inventory = [4103, 4104, 4105, 4106, 4103].map((itemdefid, i) => ({ itemId: `r${i}`, itemdefid, quantity: 1 }));
        window.__tradeUpCalls = [];
        const api = {
            getQaToolsEnabled: () => Promise.resolve(false),
            getSteamIdentity: () => Promise.resolve({ active: true, steamId64: '76561198000000001', persona: 'Probe' }),
            refreshSteamInventory: () => Promise.resolve({ ok: true, inventory, capabilities: ['trade-up', 'redeem'] }),
            tradeUpSteamInventory: (rarity, requestId) => {
                window.__tradeUpCalls.push({ rarity, requestId });
                inventory = [{ itemId: 'e1', itemdefid: 4107, quantity: 1 }];
                return Promise.resolve({ ok: true, consumed: [], granted: [{ itemId: 'e1', itemdefid: 4107, quantity: 1 }] });
            }
        };
        window.electronAPI = new Proxy(api, {
            get(target, prop) {
                if (prop in target) return target[prop];
                if (typeof prop === 'string' && prop.startsWith('on')) return () => {};
                if (prop === 'setStat' || prop === 'setSteamInputPhase') return () => {};
                return () => Promise.reject(new Error(`stubbed offline: ${String(prop)}`));
            }
        });
    });
    await bootToOperatorMenu(page);
    await openSmelter(page);
    await expect(page.locator('#foundry-hub-tabs [data-tab="tradeup"]')).not.toHaveClass(/is-locked/);
    await expect(card(page, 'rare')).toContainText('5 / 5');

    await card(page, 'rare').locator('button').click();
    await expect(card(page, 'rare')).toContainText('0 / 5');
    await expect(card(page, 'epic')).toContainText('1 / 5');
    const calls = await page.evaluate(() => window.__tradeUpCalls);
    expect(calls).toHaveLength(1);
    expect(calls[0].rarity).toBe('rare');
    expect(calls[0].requestId).toMatch(/^smelt-/);

    await page.locator('#close-foundry-hub').click();
    await openSmelter(page);
    await expect(card(page, 'epic')).toContainText('1 / 5');
});
