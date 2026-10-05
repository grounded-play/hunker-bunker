import { test, expect } from '@playwright/test';

// S49 lived-in world M4 (docs/planning/sprint-49-lived-in-world-continuation.md):
// before/after capture of the signature-anchor practical light on the three
// key-art anchors. Writes the evidence image to docs/reports/assets/.
// Run with HB_PROBES=1.
test('anchor practical light — before and after', async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/anchor-practical-light.html');
    await page.waitForFunction(() => window.__anchorLightProbe?.ready === true, null, { timeout: 60_000 });
    expect(await page.evaluate(() => window.__anchorLightProbe.loaded)).toEqual([true, true, true]);
    await page.screenshot({ path: 'docs/reports/assets/anchor-practical-light-2026-10-04.png' });
});
