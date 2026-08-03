import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, bootToTitleSplash } from './helpers.js';

test.describe('controller-ready modal focus', () => {
    test('operator commands use spatial WASD navigation across both columns', async ({ page }) => {
        await bootToOperatorMenu(page);
        const rosterModal = page.locator('#roster-modal');
        if (await rosterModal.isVisible()) await page.locator('#close-roster-modal').click();

        await page.locator('#daily-ops-btn').focus();
        await page.keyboard.press('KeyS');
        await expect(page.locator('#roster-btn')).toBeFocused();

        await page.keyboard.press('KeyD');
        await expect(page.locator('#hero-polish-btn')).toBeFocused();

        await page.keyboard.press('KeyD');
        await expect(page.locator('.char-selection .char-card.selected')).toBeFocused();

        await page.keyboard.press('KeyA');
        await expect(page.locator('#hero-polish-btn')).toBeFocused();

        await page.keyboard.press('KeyA');
        await expect(page.locator('#roster-btn')).toBeFocused();
    });

    test('operator polish picker uses a spatial WASD grid', async ({ page }) => {
        await bootToOperatorMenu(page);
        const rosterModal = page.locator('#roster-modal');
        if (await rosterModal.isVisible()) await page.locator('#close-roster-modal').click();

        await page.locator('#hero-polish-btn').click();
        await expect(page.locator('#operator-polish-modal')).toBeVisible();
        const chips = page.locator('#operator-polish-grid .operator-polish-chip');
        await expect(chips.nth(0)).toBeFocused();

        await page.keyboard.press('KeyD');
        await expect(chips.nth(1)).toBeFocused();
        await page.keyboard.press('KeyS');
        await expect(chips.nth(5)).toBeFocused();
        await page.keyboard.press('ArrowLeft');
        await expect(chips.nth(4)).toBeFocused();
        await page.keyboard.press('ArrowUp');
        await expect(chips.nth(0)).toBeFocused();
    });

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

    test('settings callsign requires activation and keeps visible scrolling enabled', async ({ page }) => {
        await bootToTitleSplash(page);
        await page.locator('#title-settings-btn').click();

        const panel = page.locator('.settings-modal-content');
        const callsign = page.locator('#operator-callsign');
        await callsign.focus();
        const original = await callsign.inputValue();

        await page.keyboard.press('KeyX');
        await expect(callsign).toHaveValue(original);

        await page.keyboard.press('Enter');
        await page.keyboard.press('KeyX');
        await expect(callsign).toHaveValue(`${original}x`);
        await page.keyboard.press('Escape');
        await page.keyboard.press('KeyS');
        await expect(page.locator('#open-save-data')).toBeFocused();

        expect(await panel.evaluate((element) => ({
            overflowY: getComputedStyle(element).overflowY,
            scrollbarWidth: getComputedStyle(element).scrollbarWidth
        }))).toEqual({ overflowY: 'auto', scrollbarWidth: 'thin' });
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
