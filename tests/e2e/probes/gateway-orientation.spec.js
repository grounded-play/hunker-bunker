import { test, expect } from '@playwright/test';

// S49 lived-in world M1 (docs/planning/sprint-49-lived-in-world-continuation.md):
// visual capture of the authored-room gateway frame on north/east/south/west
// thresholds, both kit skins, door closed and open. Writes the evidence images
// to docs/reports/assets/. Run with HB_PROBES=1.
for (const skin of ['cave', 'space']) {
    for (const door of ['closed', 'open']) {
        test(`gateway frame on four thresholds — ${skin}, door ${door}`, async ({ page }) => {
            await page.goto(`/tests/e2e/fixtures/gateway-orientation.html?skin=${skin}&door=${door}`);
            await page.waitForFunction(() => window.__gatewayProbe?.ready === true, null, { timeout: 30_000 });
            const placements = await page.evaluate(() => window.__gatewayProbe.placements);
            expect(placements).toHaveLength(4);
            await page.screenshot({ path: `docs/reports/assets/gateway-orientation-${skin}-${door}-2026-10-04.png` });
        });
    }
}
