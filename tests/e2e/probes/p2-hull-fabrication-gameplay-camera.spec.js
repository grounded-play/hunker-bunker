import { test, expect } from '@playwright/test';

// P2 shop-floor proof: unequal work cells, the west inspection console, clear
// process line and far bench/exit must survive every cardinal camera rotation.
for (let rotation = 0; rotation < 4; rotation += 1) {
    test(`P2 hull fabrication game camera — R${rotation}`, async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 900 });
        await page.goto(`/tests/e2e/fixtures/furnished-room-showroom.html?build=hull_fabrication_bay&biome=cryo&review=gameplay&rotation=${rotation}`);
        await page.waitForFunction(() => window.__showroom?.ready === true, null, { timeout: 90_000 });
        const result = await page.evaluate(() => window.__showroom);
        expect(result.reviewMode).toBe(true);
        expect(result.rotation).toBe(rotation);
        expect(result.cutawayCells).toBeGreaterThan(0);
        expect(result.props + result.decals).toBeGreaterThan(0);
        await page.screenshot({
            path: `docs/reports/assets/furnished-rooms/p2-hull_fabrication_bay-game-camera-r${rotation}.png`
        });
    });
}
