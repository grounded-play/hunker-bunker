import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// Rooms and hallways carry names, learned by radar scan; unscanned places
// read "???" (src/locationNames.js, owner request 2026-10-06).
test.describe.configure({ timeout: 300_000 });

test('the HUD names the place underfoot only after a scan, and the map labels it', async ({ page }) => {
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForFunction(() => window.game?.performanceProfile === 'gameplay', null, { timeout: 60_000 });

    const location = page.locator('#hud-location');
    await page.evaluate(() => window.game.syncPlayerLocationLabel({ force: true }));
    await expect(location).toHaveClass(/is-unknown/);
    await expect(location).toContainText('???');

    await page.evaluate(() => {
        window.game.radarScanCooldownRemaining = 0;
        window.game.triggerRadarScan();
    });
    await expect(location).not.toHaveClass(/is-unknown/);
    await expect(location).not.toContainText('???');

    const labels = await page.evaluate(() => window.game.getTacticalMapState().detailedChunks.flatMap((chunk) => chunk.labels ?? []));
    expect(labels.length).toBeGreaterThan(0);
    await page.screenshot({ path: 'playwright-report/screenshots/location-hud.png' });
    await page.keyboard.press('KeyM');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'playwright-report/screenshots/location-map.png' });
});
