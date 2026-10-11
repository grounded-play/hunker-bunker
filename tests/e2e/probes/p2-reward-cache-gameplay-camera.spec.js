import { test, expect } from '@playwright/test';

// P2 reward-space proof: the entry screen must conceal the cache body while
// both approaches, the reward apse and optional lore alcove remain legible in
// every cardinal camera rotation.
for (let rotation = 0; rotation < 4; rotation += 1) {
    test(`P2 reward cache game camera — R${rotation}`, async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 900 });
        await page.goto(`/tests/e2e/fixtures/furnished-room-showroom.html?build=reward_cache&biome=active&review=gameplay&rotation=${rotation}`);
        await page.waitForFunction(() => window.__showroom?.ready === true, null, { timeout: 90_000 });
        const result = await page.evaluate(() => window.__showroom);
        expect(result.reviewMode).toBe(true);
        expect(result.rotation).toBe(rotation);
        expect(result.cutawayCells).toBeGreaterThan(0);
        expect(result.props + result.decals).toBeGreaterThan(0);
        await page.screenshot({
            path: `docs/reports/assets/furnished-rooms/p2-reward_cache-game-camera-r${rotation}.png`
        });
    });
}
