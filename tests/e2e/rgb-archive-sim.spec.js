import { test, expect } from '@playwright/test';
import { bootToOperatorMenu } from './helpers.js';

const RGB_SAVE_KEY = 'hb_minigame_rgb_v1';

function unlockedSave() {
    return {
        version: 1,
        unlocked: true,
        checkpoint: 'parking_lot',
        endingsSeen: [],
        gameOversSeen: [],
        settings: { hints: 'standard' },
        run: { timeBand: 0, pain: 'stable', evidence: [], inventory: [], flags: {} }
    };
}

test.describe('RGB archive simulation', () => {
    test('unlocked save shows the menu entry, launches, and completes chapter 1 into a persisted checkpoint', async ({ page }) => {
        await page.goto('/');
        await page.evaluate((key) => {
            localStorage.removeItem(key);
        }, RGB_SAVE_KEY);

        await bootToOperatorMenu(page);

        const archiveBtn = page.locator('#archive-sims-btn');
        await expect(archiveBtn).toBeHidden();

        await page.evaluate(({ key, save }) => {
            localStorage.setItem(key, JSON.stringify(save));
        }, { key: RGB_SAVE_KEY, save: unlockedSave() });
        await page.reload();
        await bootToOperatorMenu(page);

        await expect(archiveBtn).toBeVisible();
        await archiveBtn.click();

        const modal = page.locator('#archive-sims-modal');
        await expect(modal).toBeVisible();
        await expect(page.locator('#archive-sim-rgb-status')).toHaveText('NOT STARTED');

        await page.locator('#archive-sim-rgb-launch').click();
        await page.locator('#rgb-root').waitFor({ state: 'visible' });

        await page.locator('.rgb-warning__continue').click();
        await expect(page.locator('.rgb-header__title')).toHaveText(/Chapter 1/);

        const requiredBeats = ['Albuterol Bottle', 'Phone Balance', "Lucia's Message", 'Calibration Notebook'];
        for (const label of requiredBeats) {
            await page.locator('.rgb-hotspot', { hasText: label }).click();
        }

        await page.locator('.rgb-hotspot', { hasText: 'Badge Reader' }).click();
        await expect(page.locator('.rgb-header__title')).toHaveText(/Chapter 2/);

        const savedCheckpoint = await page.evaluate((key) => {
            return JSON.parse(localStorage.getItem(key)).checkpoint;
        }, RGB_SAVE_KEY);
        expect(savedCheckpoint).toBe('warehouse');

        await page.keyboard.press('Tab');
        await expect(page.locator('.rgb-inventory')).toBeVisible();
        await expect(page.locator('.rgb-inventory li')).toHaveCount(4);
        await page.keyboard.press('Tab');

        await page.locator('.rgb-hotspot', { hasText: 'Notebook Diagram' }).click();
    });
});
