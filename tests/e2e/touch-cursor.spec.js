import { test, expect } from '@playwright/test';
import { bootToTitleSplash } from './helpers.js';

test('touching a menu hides the tactical cursor through compatibility mouse events', async ({ page }) => {
    await bootToTitleSplash(page);

    await expect(page.locator('html')).not.toHaveClass(/boot-cursor-hidden/);
    await page.mouse.move(400, 300);
    await expect(page.locator('html')).toHaveClass(/custom-cursor-enabled/);
    await expect(page.locator('#tactical-cursor')).toBeVisible();

    await page.evaluate(() => {
        window.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true,
            pointerType: 'touch',
            clientX: 500,
            clientY: 350
        }));
        window.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true,
            pointerType: 'touch',
            clientX: 500,
            clientY: 350
        }));
        // Chromium's compatibility event used to re-show the icon immediately.
        window.dispatchEvent(new MouseEvent('mousemove', {
            bubbles: true,
            clientX: 500,
            clientY: 350
        }));
    });

    await expect(page.locator('html')).not.toHaveClass(/custom-cursor-enabled/);
    await expect(page.locator('#tactical-cursor')).toBeHidden();

    await page.waitForTimeout(850);
    await page.mouse.move(600, 400);
    await expect(page.locator('html')).toHaveClass(/custom-cursor-enabled/);
    await expect(page.locator('#tactical-cursor')).toBeVisible();
});
