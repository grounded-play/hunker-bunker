import { test, expect } from '@playwright/test';

const BUILD_ID = 'ring_crossing_landmark_spatial_proof_v1';

// P0B detached proof only: these captures exercise pure authored-room shape.
// The fixture is absent from the live catalog and cannot receive crossing IDs,
// mission controls, persistent door states, or progression requirements.
for (let rotation = 0; rotation < 4; rotation += 1) {
    test(`P0B detached ring crossing game camera — R${rotation}`, async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 900 });
        await page.goto(`/tests/e2e/fixtures/furnished-room-showroom.html?build=${BUILD_ID}&biome=active&review=gameplay&greybox=1&rotation=${rotation}`);
        await page.waitForFunction(() => window.__showroom?.ready === true, null, { timeout: 90_000 });
        const result = await page.evaluate(() => window.__showroom);
        expect(result.mode).toBe('authored');
        expect(result.detachedProof).toBe(true);
        expect(result.greyboxReview).toBe(true);
        expect(result.dressing).toBe(0);
        expect(result.reviewMode).toBe(true);
        expect(result.rotation).toBe(rotation);
        expect(result.gateways).toBe(4);
        expect(result.cutawayCells).toBeGreaterThan(0);
        expect(result.props + result.decals).toBeGreaterThan(0);
        await page.screenshot({
            path: `docs/reports/assets/furnished-rooms/p0b-ring_crossing_landmark-detached-game-camera-r${rotation}.png`
        });
    });
}
