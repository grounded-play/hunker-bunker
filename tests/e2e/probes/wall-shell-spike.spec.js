import { test, expect } from '@playwright/test';

// S49 lived-in world M5 spike (docs/planning/sprint-49-lived-in-world-continuation.md):
// before/after captures for the [Art] sign-off. Showroom only; nothing here
// changes normal play. Run with HB_PROBES=1.
for (const [build, biome] of [['medical_triage', 'active'], ['reactor_compressor_hall', 'cave']]) {
    test(`wall shell spike — ${build} (${biome})`, async ({ page }) => {
        await page.goto(`/tests/e2e/fixtures/wall-shell-spike.html?build=${build}&biome=${biome}`);
        await page.waitForFunction(() => window.__wallShellSpike?.ready === true, null, { timeout: 60_000 });
        const result = await page.evaluate(() => window.__wallShellSpike);
        expect(result.loaded).toBe(true);
        expect(result.shells).toBeGreaterThan(0);
        await page.screenshot({ path: `docs/reports/assets/wall-shell-spike-${build}-${biome}-2026-10-04.png` });
    });
}
