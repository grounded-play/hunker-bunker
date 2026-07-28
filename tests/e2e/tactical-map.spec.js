import { test, expect } from '@playwright/test';
import { bootToTitleSplash, startRunAndSkipIntro } from './helpers.js';

test.describe('Tactical Blueprint Map Overlay E2E', () => {
    test('opens tactical map overlay on M key press and closes on ESC', async ({ page }) => {
        await bootToTitleSplash(page);
        await startRunAndSkipIntro(page);

        // Verify tactical map modal starts hidden
        const mapModal = page.locator('#tactical-map-modal');
        await expect(mapModal).toHaveClass(/hidden/);

        // Press M to open tactical map modal
        await page.keyboard.press('KeyM');
        await expect(mapModal).not.toHaveClass(/hidden/);
        await expect(page.locator('#tactical-map-canvas')).toBeVisible();
        await expect(page.locator('.tactical-map-title')).toHaveText(/TACTICAL BLUEPRINT OVERLAY/);

        // Press Escape to close tactical map modal
        await page.keyboard.press('Escape');
        await expect(mapModal).toHaveClass(/hidden/);
    });

    test('opens tactical map overlay on Tab key press', async ({ page }) => {
        await bootToTitleSplash(page);
        await startRunAndSkipIntro(page);

        const mapModal = page.locator('#tactical-map-modal');
        await expect(mapModal).toHaveClass(/hidden/);

        // Press Tab to open tactical map overlay
        await page.keyboard.press('Tab');
        await expect(mapModal).not.toHaveClass(/hidden/);

        // Click close button
        await page.locator('#close-tactical-map-modal').click();
        await expect(mapModal).toHaveClass(/hidden/);
    });
});
