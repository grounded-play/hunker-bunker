import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// Sprint 53 S1-S3: resting plays a sleep cutscene (a night card until the
// videos ship), then the morning card and the Bay, with the day advanced.
test.describe.configure({ timeout: 300_000 });

test('sleeping at the bunker cot plays the night, then morning', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    const before = await page.evaluate(() => window.game.dayState?.day ?? 1);
    const rested = await page.evaluate(() => window.game.beginCampRest(window.game.getBunkerRestPoint(), { confirmed: true }));
    expect(rested).toBe(true);
    const card = page.locator('.sleep-interstitial');
    await expect(card).toBeVisible();
    await expect(card).toContainText(/NIGHT FALLS/);
    await page.screenshot({ path: 'playwright-report/screenshots/sleep-night.png' });
    await expect(card).toHaveCount(0, { timeout: 6000 });
    // The Bay opens after the night: the Foundry hub (default) or the classic Bay.
    await expect(page.locator('#foundry-hub-modal:not(.hidden), #fabrication-modal:not(.hidden)')).toHaveCount(1, { timeout: 6000 });
    expect(await page.evaluate(() => window.game.dayState?.day)).toBe(before + 1);
});
