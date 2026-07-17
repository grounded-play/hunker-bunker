import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, stubOfflineElectronAPI } from './helpers.js';

// Phase 13: "Open Steam Vault in offline/mock state", "Open Store tab and
// verify disabled state". main.js only initializes the Vault at all when
// window.electronAPI exists (confirmed via CDP while writing this: with no
// stub, #steam-vault-btn is rendered but has zero click listeners — the
// button is inert, not "offline", in a bare browser tab), so
// stubOfflineElectronAPI reproduces the real target scenario instead: an
// Electron shell with no reachable Steam backend, which is what "offline"
// actually means for this UI.

test.describe('Steam Vault (offline/mock state)', () => {
    test('opens without console errors and shows an OFFLINE status pill', async ({ page }) => {
        const consoleErrors = [];
        page.on('console', (msg) => {
            // loadVaultData() intentionally console.errors a failed
            // inventory fetch (main.js) — expected and correct once every
            // electronAPI call is stubbed to reject; not a bug to catch here.
            if (msg.type() === 'error' && !msg.text().includes('[steam-vault] failed to load inventory')) {
                consoleErrors.push(msg.text());
            }
        });
        page.on('pageerror', (err) => consoleErrors.push(err.message));

        await stubOfflineElectronAPI(page);
        await bootToOperatorMenu(page);

        // window.electronAPI exists (stubbed) but every call rejects — the
        // real "Steam shell present, no backend/account reachable" state —
        // so loadVaultData() lands in its DEV FALLBACK branch, not the
        // static HTML default "OFFLINE" a truly Electron-less page would
        // keep. Either way this must never read as ONLINE/a real persona.
        await expect(page.locator('#vault-command-status')).toHaveText(/DEV MODE/i);

        await page.locator('#steam-vault-btn').click();
        await expect(page.locator('#steam-vault-modal')).toBeVisible();

        expect(consoleErrors, `unexpected console errors opening the Vault: ${consoleErrors.join('\n')}`).toEqual([]);
    });

    test('STORE tab renders SKU cards/odds table and does not expose a live Buy button', async ({ page }) => {
        await stubOfflineElectronAPI(page);
        await bootToOperatorMenu(page);
        await page.locator('#steam-vault-btn').click();
        await expect(page.locator('#steam-vault-modal')).toBeVisible();

        await page.locator('#vault-tab-store').click();
        await expect(page.locator('#vault-store-layout')).toBeVisible({ timeout: 10_000 });

        // With no backend reachable, storePurchasesEnabled must be false —
        // every rendered buy button should be disabled, never a live BUY.
        const buyButtons = page.locator('.vault-store-buy-btn');
        const count = await buyButtons.count();
        for (let i = 0; i < count; i += 1) {
            await expect(buyButtons.nth(i)).toBeDisabled();
            await expect(buyButtons.nth(i)).not.toHaveText('BUY');
        }

        await page.screenshot({ path: 'playwright-report/screenshots/vault-store-tab-1280x800.png' });
    });
});
