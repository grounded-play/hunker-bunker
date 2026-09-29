import { test, expect } from '@playwright/test';
import { bootToOperatorMenu } from '../helpers.js';

// Sprint 48 P2: the Foundry hub skeleton (src/foundryHub.js) behind
// hb_foundry_hub=1. One window, five tabs over the Vault's and Fab Bay's own
// panels; resources always in the header; Fabricate locked until the Foundry
// is activated; closing puts every borrowed panel back.

async function enableHub(page, enabled = true) {
    await page.addInitScript((on) => {
        if (on) localStorage.setItem('hb_foundry_hub', '1');
        else localStorage.removeItem('hb_foundry_hub');
    }, enabled);
}

const hub = (page) => page.locator('#foundry-hub-modal');
const tab = (page, id) => page.locator(`#foundry-hub-tabs [data-tab="${id}"]`);
const insideHub = (page, id) => page.evaluate((elId) => Boolean(document.getElementById(elId)?.closest('#foundry-hub-panel')), id);
const insideModal = (page, id, modalId) => page.evaluate(([elId, mId]) => Boolean(document.getElementById(elId)?.closest(`#${mId}`)), [id, modalId]);

test('the menu opens one Foundry window with its tabs, resources and borrowed panels', async ({ page }) => {
    await enableHub(page);
    await bootToOperatorMenu(page);
    await page.evaluate(() => window.bankManager?.setFoundryActivated?.(false));

    await page.locator('#steam-vault-btn').click({ force: true });
    await expect(hub(page)).toBeVisible();
    await expect(page.locator('#steam-vault-modal')).toBeHidden();
    await expect(tab(page, 'stash')).toHaveClass(/is-active/);
    expect(await insideHub(page, 'vault-inventory-layout')).toBe(true);

    // Resources are always visible, whatever the tab.
    const tech = await page.evaluate(() => String(window.bankManager.getState().tech ?? 0));
    await expect(page.locator('#foundry-hub-tech')).toHaveText(tech);
    await expect(hub(page)).toHaveAttribute('data-hub-class', await page.evaluate(() => window.loadout.activeClassId));

    await tab(page, 'loadout').click();
    await expect(page.locator('#foundry-hub-loadout-strip .item-card')).toHaveCount(5);
    expect(await insideHub(page, 'vault-inventory-layout')).toBe(false);

    await expect(tab(page, 'fabricate')).toHaveClass(/is-locked/);
    await tab(page, 'fabricate').click();
    expect(await insideHub(page, 'fab-recipe-grid')).toBe(true);
    await expect(page.locator('#foundry-hub-panel .fab-activation-panel').first()).toBeVisible();
    await expect(page.locator('#foundry-hub-tech')).toHaveText(tech);

    await page.evaluate(() => { window.bankManager.setFoundryActivated(true); window.foundryHub.select('fabricate'); });
    await expect(tab(page, 'fabricate')).not.toHaveClass(/is-locked/);
    await expect(page.locator('#foundry-hub-panel .fab-card')).toHaveCount(13);

    await tab(page, 'tradeup').click();
    expect(await insideHub(page, 'vault-smelter-layout')).toBe(true);
    await expect(page.locator('#foundry-hub-panel #vault-smelter-grid')).toBeVisible();

    await page.screenshot({ path: 'playwright-report/screenshots/foundry-hub-tradeup-1280x800.png' });

    await page.keyboard.press('Escape');
    await expect(hub(page)).toBeHidden();
    expect(await insideModal(page, 'vault-inventory-layout', 'steam-vault-modal')).toBe(true);
    expect(await insideModal(page, 'vault-smelter-layout', 'steam-vault-modal')).toBe(true);
    expect(await insideModal(page, 'fab-recipe-grid', 'fabrication-modal')).toBe(true);
    await expect(page.locator('#vault-smelter-layout')).toHaveClass(/hidden/);
});

test('the Fab Bay button opens the hub at Fabricate', async ({ page }) => {
    await enableHub(page);
    await bootToOperatorMenu(page);
    await page.locator('#fabrication-btn').click({ force: true });
    await expect(hub(page)).toBeVisible();
    await expect(tab(page, 'fabricate')).toHaveClass(/is-active/);
    await expect(page.locator('#fabrication-modal')).toBeHidden();
    await page.screenshot({ path: 'playwright-report/screenshots/foundry-hub-fabricate-1280x800.png' });
    await page.locator('#close-foundry-hub').click();
    await expect(hub(page)).toBeHidden();
});

test('with the flag off, the Fab Bay opens as before', async ({ page }) => {
    await enableHub(page, false);
    await bootToOperatorMenu(page);
    await page.locator('#fabrication-btn').click({ force: true });
    await expect(page.locator('#fabrication-modal')).toBeVisible();
    await expect(hub(page)).toBeHidden();
});
