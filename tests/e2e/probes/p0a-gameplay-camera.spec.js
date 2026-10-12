import { test, expect } from '@playwright/test';

const ROOMS = [
    { id: 'medical_triage', biome: 'bio' },
    { id: 'reactor_compressor_hall', biome: 'bio' },
    { id: 'room_biomech_machine_nave', biome: 'bio' }
];

// P0A architecture review: fixed gameplay-style camera and the same cutaway
// planner as ThreeGame, across every supported authored-room rotation.
for (const room of ROOMS) {
    for (let rotation = 0; rotation < 4; rotation += 1) {
        test(`P0A game camera — ${room.id} R${rotation}`, async ({ page }) => {
            await page.setViewportSize({ width: 1600, height: 900 });
            await page.goto(`/tests/e2e/fixtures/furnished-room-showroom.html?build=${room.id}&biome=${room.biome}&review=gameplay&rotation=${rotation}`);
            await page.waitForFunction(() => window.__showroom?.ready === true, null, { timeout: 90_000 });
            const result = await page.evaluate(() => window.__showroom);
            expect(result.reviewMode).toBe(true);
            expect(result.rotation).toBe(rotation);
            expect(result.cutawayCells).toBeGreaterThan(0);
            expect(result.props + result.decals).toBeGreaterThan(0);
            await page.screenshot({
                path: `docs/reports/assets/furnished-rooms/p0a-${room.id}-game-camera-r${rotation}.png`
            });
        });
    }
}
