import { test, expect } from '@playwright/test';

// P2 trap-space proof: the observation shelf, central warning lure, paired
// emitters and concealed western payoff must survive every camera rotation.
for (let rotation = 0; rotation < 4; rotation += 1) {
    test(`P2 trap vault game camera — R${rotation}`, async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 900 });
        await page.goto(`/tests/e2e/fixtures/furnished-room-showroom.html?build=trap_vault&biome=active&review=gameplay&rotation=${rotation}`);
        await page.waitForFunction(() => window.__showroom?.ready === true, null, { timeout: 90_000 });
        const result = await page.evaluate(() => window.__showroom);
        expect(result.reviewMode).toBe(true);
        expect(result.rotation).toBe(rotation);
        expect(result.cutawayCells).toBeGreaterThan(0);
        expect(result.props + result.decals).toBeGreaterThan(0);
        await page.screenshot({
            path: `docs/reports/assets/furnished-rooms/p2-trap_vault-game-camera-r${rotation}.png`
        });
    });
}
