import { test, expect } from '@playwright/test';
import { bootToOperatorMenu } from './helpers.js';

// Sprint 51 web perf: heavy screens are built on first open
// (src/deferredMarkup.js). Each must work exactly as before once opened:
// translated, wired, and closable.
test.describe.configure({ timeout: 240_000 });

test('the deployment briefing is built on first open and works', async ({ page }) => {
    await bootToOperatorMenu(page);
    // Not in the page at boot: only its shell and an inert template.
    await expect(page.locator('#net-connect-btn')).toHaveCount(0);
    await expect(page.locator('#multiplayer-modal > template[data-deferred-markup]')).toHaveCount(1);

    await page.locator('#start-game').click();
    await page.locator('#armory-btn-embark').click({ timeout: 30_000 });
    const modal = page.locator('#multiplayer-modal');
    await expect(modal).not.toHaveClass(/hidden/, { timeout: 30_000 });
    await expect(page.locator('#multiplayer-modal > template')).toHaveCount(0);

    // Bound once: a mode click switches the active card.
    const pvp = page.locator('#net-mode-pvp-btn');
    await pvp.click();
    await expect(pvp).toHaveClass(/active/);
    await page.locator('#net-mode-coop-btn').click();
    await expect(page.locator('#net-mode-coop-btn')).toHaveClass(/active/);
    await expect(pvp).not.toHaveClass(/active/);

    // Translated: no raw i18n keys in the built markup.
    expect(await modal.innerText()).not.toMatch(/\bui\.[a-z_]+\.[a-z_]+/);

    await page.screenshot({ path: 'playwright-report/screenshots/deferred-briefing.png' });
    await page.locator('#net-back-btn').click();
    await expect(modal).toHaveClass(/hidden/);
});

test('the Vault is built when the Foundry first shows its panels', async ({ page }) => {
    await bootToOperatorMenu(page);
    await expect(page.locator('#vault-item-grid')).toHaveCount(0);
    await page.evaluate(() => window.foundryHub.open('stash'));
    await expect(page.locator('#foundry-hub-panel #vault-inventory-layout')).toBeVisible();
    await expect(page.locator('#vault-item-grid')).toHaveCount(1);
    await page.evaluate(() => window.foundryHub.open('tradeup'));
    await expect(page.locator('#foundry-hub-panel #vault-smelter-layout')).toBeVisible();
    expect(await page.locator('#foundry-hub-modal').innerText()).not.toMatch(/\bui\.[a-z_]+\.[a-z_]+/);
    await page.evaluate(() => window.foundryHub.close());
    // The panels go home, and the Vault itself opens with working tabs.
    // The classic Vault window (Steam badge without the overlay, or hub off).
    await page.evaluate(() => import('/src/steamVaultUi.js').then((vaultUi) => vaultUi.openSteamVaultModal()));
    const vault = page.locator('#steam-vault-modal');
    await expect(vault).not.toHaveClass(/hidden/);
    await page.locator('#vault-tab-smelter').click();
    await expect(page.locator('#vault-tab-smelter')).toHaveClass(/active/);
    await expect(page.locator('#steam-vault-modal #vault-smelter-layout')).toBeVisible();
    await page.locator('#close-steam-vault-modal').click();
    await expect(vault).toHaveClass(/hidden/);
});

test('the squad trade window is built when a trade opens', async ({ page }) => {
    await bootToOperatorMenu(page);
    await expect(page.locator('#trade-confirm-btn')).toHaveCount(0);
    // T opens a trade only with a real squadmate; stand one in.
    await page.evaluate(() => {
        window.__savedRemotes = window.game.remotePlayers;
        window.game.remotePlayers = new Map([['p2', { id: 'p2', callsign: 'TITAN-1', opClass: 'TANK' }]]);
    });
    await page.locator('body').press('t');
    const modal = page.locator('#player-trade-modal');
    await expect(modal).not.toHaveClass(/hidden/);
    await expect(page.locator('#trade-peer-callsign')).toHaveText(/TITAN-1/);
    await expect(page.locator('#trade-confirm-btn')).not.toHaveText(/ui\./);
    await page.locator('#trade-cancel-btn').click();
    await expect(modal).toHaveClass(/hidden/);
    await page.evaluate(() => { window.game.remotePlayers = window.__savedRemotes; });
});
