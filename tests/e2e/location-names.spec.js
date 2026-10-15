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
    // Crash site is seeded and known on landing (N1-N4)
    await expect(location).not.toHaveClass(/is-unknown/);
    await expect(location).toContainText('IMPACT SITE');

    // Unscanned corridors read "??? · SCAN TO IDENTIFY" until a radar scan reaches them
    await page.evaluate(() => {
        const grid = window.game.chunkCache?.get('0,0') ?? [];
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < (grid[y]?.length ?? 0); x++) {
                if (['.', 'D', 'R', 'B', 'L', 'O'].includes(grid[y][x]) && Math.hypot(x - 9, y - 9) > 12) {
                    window.game.player.position.x = x;
                    window.game.player.position.z = y;
                    window.game.syncPlayerLocationLabel({ force: true });
                    return;
                }
            }
        }
    });
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
