import { test, expect } from '@playwright/test';
import { bootToTitleSplash } from './helpers.js';

test.describe('controller-ready modal focus', () => {
    test('settings traps focus and restores the title trigger when closed', async ({ page }) => {
        await bootToTitleSplash(page);

        const trigger = page.locator('#title-settings-btn');
        const modal = page.locator('#settings-popup');
        await trigger.focus();
        await trigger.click();
        await expect(modal).toBeVisible();

        await expect.poll(() => page.evaluate(() => (
            document.getElementById('settings-popup')?.contains(document.activeElement)
        ))).toBe(true);

        const focusableCount = await modal.locator(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        ).count();
        for (let index = 0; index < focusableCount + 2; index += 1) {
            await page.keyboard.press('Tab');
            expect(await page.evaluate(() => (
                document.getElementById('settings-popup')?.contains(document.activeElement)
            ))).toBe(true);
        }

        await page.keyboard.press('Escape');
        await expect(modal).toBeHidden();
        await expect(trigger).toBeFocused();
    });

    test('controls/remapping traps focus and restores its settings trigger', async ({ page }) => {
        await bootToTitleSplash(page);
        await page.locator('#title-settings-btn').click();

        const trigger = page.locator('#open-controls');
        const modal = page.locator('#controls-popup');
        await trigger.focus();
        await trigger.click();
        await expect(modal).toBeVisible();

        await expect.poll(() => page.evaluate(() => (
            document.getElementById('controls-popup')?.contains(document.activeElement)
        ))).toBe(true);

        for (let index = 0; index < 5; index += 1) {
            await page.keyboard.press('Tab');
            expect(await page.evaluate(() => (
                document.getElementById('controls-popup')?.contains(document.activeElement)
            ))).toBe(true);
        }

        await page.locator('#close-controls').click();
        await expect(modal).toBeHidden();
        await expect(trigger).toBeFocused();
    });

    test('tactical map receives deterministic focus when it becomes visible', async ({ page }) => {
        await bootToTitleSplash(page);
        await page.evaluate(() => {
            const modal = document.getElementById('tactical-map-modal');
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
        });

        await expect(page.locator('#tactical-map-modal')).toBeVisible();
        await expect(page.locator('#close-tactical-map-modal')).toBeFocused();
    });
});
