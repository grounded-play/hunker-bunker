import { test, expect } from '@playwright/test';

// P1 dual-process proof: the longer care route, tempting fabrication bay and
// permanent north crosscut must survive every gameplay-camera rotation.
for (let rotation = 0; rotation < 4; rotation += 1) {
    test(`P1 cyber-surgical ward game camera — R${rotation}`, async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 900 });
        await page.goto(`/tests/e2e/fixtures/furnished-room-showroom.html?build=room_cyber_surgical_fabrication_ward&biome=bio&review=gameplay&rotation=${rotation}`);
        await page.waitForFunction(() => window.__showroom?.ready === true, null, { timeout: 90_000 });
        const result = await page.evaluate(() => window.__showroom);
        expect(result.reviewMode).toBe(true);
        expect(result.rotation).toBe(rotation);
        expect(result.cutawayCells).toBeGreaterThan(0);
        expect(result.props + result.decals).toBeGreaterThan(0);
        await page.screenshot({
            path: `docs/reports/assets/furnished-rooms/p1-cyber_surgical_ward-game-camera-r${rotation}.png`
        });
    });
}
