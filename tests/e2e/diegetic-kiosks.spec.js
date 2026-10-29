import { expect, test } from '@playwright/test';

async function revealSurface(page, selector) {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => [...document.querySelectorAll('[data-app-style]')]
        .every((link) => link.dataset.ready === 'true' || link.media === 'all'), null, { timeout: 30_000 });
    await page.locator(selector).evaluate((element) => {
        element.classList.remove('hidden');
        element.setAttribute('aria-hidden', 'false');
    });
}

async function expectInsideViewport(locator, viewport = { width: 1280, height: 800 }) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

test('Fabrication Auto-Mart reads as one fitted machine at 1280x800', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await revealSurface(page, '#fabrication-modal');

    const kiosk = page.locator('#fabrication-modal .fab-minimart-terminal');
    await expect(kiosk).toBeVisible();
    await expectInsideViewport(kiosk);
    await expect(page.locator('#fab-aisle-nav .fab-aisle-btn')).toHaveCount(4);
    await expect(page.locator('#fab-aisle-btn-hardware')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.fab-minimart-footer-tray')).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('fabrication-auto-mart-1280x800.png') });
});

test('main terminal uses the same kiosk chassis and numbered departments', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await revealSurface(page, '#console-terminal-modal');

    const kiosk = page.locator('#console-terminal-modal .terminal-corporate-kiosk');
    await expect(kiosk).toBeVisible();
    await expectInsideViewport(kiosk);
    await expect(page.locator('#console-terminal-modal .terminal-tab-key')).toHaveText(['[1]', '[2]', '[3]']);
    await expect(page.locator('#console-terminal-modal .terminal-kiosk-footer')).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('main-terminal-kiosk-1280x800.png') });
});
