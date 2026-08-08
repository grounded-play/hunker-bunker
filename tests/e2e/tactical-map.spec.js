import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

test.describe('Tactical Blueprint Map Overlay E2E', () => {
    test('opens tactical map overlay on M key press and closes on ESC', async ({ page }) => {
        await bootToOperatorMenu(page);
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
        await bootToOperatorMenu(page);
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

    test('opens tactical map overlay on clicking desktop compass HUD', async ({ page }) => {
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        const mapModal = page.locator('#tactical-map-modal');
        await expect(mapModal).toHaveClass(/hidden/);

        const compass = page.locator('#desktop-compass');
        await expect(compass).toBeVisible();
        await compass.click();

        await expect(mapModal).not.toHaveClass(/hidden/);
        await expect(page.locator('#tactical-map-canvas')).toBeVisible();

        // Click close button to verify closing works
        await page.locator('#close-tactical-map-modal').click();
        await expect(mapModal).toHaveClass(/hidden/);
    });

    test('interacts with tactical map toolbar controls and verifies home base legend', async ({ page }) => {
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        const mapModal = page.locator('#tactical-map-modal');
        await page.keyboard.press('KeyM');
        await expect(mapModal).not.toHaveClass(/hidden/);

        // Verify Home Base legend chip is present
        await expect(page.locator('.legend-chip--home')).toBeVisible();

        // Verify toolbar buttons exist and are clickable
        await expect(page.locator('#map-zoom-in')).toBeVisible();
        await expect(page.locator('#map-zoom-out')).toBeVisible();
        await expect(page.locator('#map-focus-home')).toBeVisible();
        await expect(page.locator('#map-focus-player')).toBeVisible();

        await page.locator('#map-zoom-in').click();
        await page.locator('#map-focus-home').click();
        await page.locator('#map-focus-player').click();
        await page.locator('#map-reset-view').click();

        await page.keyboard.press('Escape');
        await expect(mapModal).toHaveClass(/hidden/);
    });
});
