import { test, expect } from '@playwright/test';
import { bootToOperatorMenu } from './helpers.js';

// Sprint 51 reagent loop: the Trade-up tab shows the Quartermaster (shards
// for reagents, weekly limits) and the Assembly Bay (overclock recipes).
test.describe.configure({ timeout: 240_000 });

test('the Trade-up tab lists the Quartermaster offers and the overclock recipes', async ({ page }) => {
    await bootToOperatorMenu(page);
    await page.evaluate(() => window.foundryHub.open('tradeup'));
    const quartermaster = page.locator('#vault-quartermaster-grid .vault-smelter-card');
    const assembly = page.locator('#vault-assembly-grid .vault-smelter-card');
    await expect(quartermaster).toHaveCount(3);
    await expect(assembly).toHaveCount(8);
    // A fresh save has no shards or reagents: nothing is affordable yet.
    await expect(quartermaster.first().locator('button')).toBeDisabled();
    await expect(assembly.first().locator('button')).toBeDisabled();
    await expect(quartermaster.filter({ hasText: /SUB-CORE MATRIX/i })).toContainText(/0\/3/);
    await page.screenshot({ path: 'playwright-report/screenshots/quartermaster-assembly.png' });
});
