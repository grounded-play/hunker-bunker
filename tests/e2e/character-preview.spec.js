import { test, expect } from '@playwright/test';
import { bootToOperatorMenu } from './helpers.js';

test('every operator preview is 3D-only', async ({ page }) => {
    await bootToOperatorMenu(page);

    await expect(page.locator('#char-preview-fallback')).toHaveCount(0);
    await expect(page.locator('#char-preview-sprite')).toHaveCount(0);
    for (const type of ['SCOUT', 'TANK', 'ENGINEER']) {
        await page.locator(`.char-card[data-type="${type}"]`).click();
        await expect(page.locator('#char-preview-loading')).toBeHidden({ timeout: 20_000 });
        await expect(page.locator('#char-preview-3d')).toBeVisible();
        await expect(page.locator('#char-preview-name')).toHaveText(type);
    }
});

test('rapid class changes settle on the latest validated 3D operator', async ({ page }) => {
    await bootToOperatorMenu(page);
    const types = ['SCOUT', 'TANK', 'ENGINEER'];
    const switchCount = 8;
    await page.evaluate(({ sequence, count }) => {
        for (let index = 0; index < count; index += 1) {
            document.querySelector(`.char-card[data-type="${sequence[index % sequence.length]}"]`)?.click();
        }
    }, { sequence: types, count: switchCount });
    const expected = types[(switchCount - 1) % types.length];
    await expect(page.locator('#char-preview-name')).toHaveText(expected);
    await expect(page.locator(`.char-card[data-type="${expected}"]`)).toHaveClass(/selected/);
    await expect(page.locator('#char-preview-loading')).toBeHidden({ timeout: 20_000 });
    await expect(page.locator('#char-preview-3d')).toBeVisible();
    await expect(page.locator('#char-preview-fallback, #char-preview-sprite')).toHaveCount(0);
});

test('a missing operator model shows a 3D diagnostic state, never 2D art', async ({ page }) => {
    await page.route('**/3d/runtime/tank-rigged.glb', (route) => route.abort('failed'));
    await bootToOperatorMenu(page);
    await page.locator('.char-card[data-type="TANK"]').click();

    const status = page.locator('#char-preview-loading');
    await expect(status).toHaveAttribute('data-state', 'error', { timeout: 20_000 });
    await expect(status).toBeVisible();
    await expect(status).toContainText('3D PREVIEW UNAVAILABLE');
    await expect(page.locator('#char-preview-3d')).toBeHidden();
    await expect(page.locator('#char-preview-fallback, #char-preview-sprite')).toHaveCount(0);
});
