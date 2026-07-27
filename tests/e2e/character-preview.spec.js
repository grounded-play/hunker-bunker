import { test, expect } from '@playwright/test';
import { bootToOperatorMenu } from './helpers.js';

test('every operator has a rendered sprite or packaged portrait fallback', async ({ page }) => {
    await bootToOperatorMenu(page);
    if (await page.locator('#roster-modal').isVisible()) {
        await page.locator('#close-roster-modal').click();
    }

    for (const type of ['SCOUT', 'TANK', 'ENGINEER']) {
        await page.locator(`.char-card[data-type="${type}"]`).click();
        await page.waitForTimeout(250);
        const preview = await page.evaluate(() => {
            const canvas = document.getElementById('char-preview-sprite');
            const fallback = document.getElementById('char-preview-fallback');
            const pixels = canvas?.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height)?.data;
            let alphaPixels = 0;
            for (let index = 3; pixels && index < pixels.length; index += 4) {
                if (pixels[index] > 0) alphaPixels += 1;
            }
            return {
                alphaPixels,
                fallbackLoaded: Boolean(fallback?.complete && fallback.naturalWidth > 0),
                fallbackSrc: fallback?.getAttribute('src') ?? ''
            };
        });

        expect(
            preview.alphaPixels > 0 || preview.fallbackLoaded,
            `${type} should never show a blank/broken character preview`
        ).toBe(true);
        expect(preview.fallbackSrc).toMatch(/\.(png|webp)$/);
    }
});
