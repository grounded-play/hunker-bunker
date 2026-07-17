import { test, expect } from '@playwright/test';
import { bootToOperatorMenu } from './helpers.js';

test.describe('Steam Screenshot Capture', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('capture all 5 store screenshots', async ({ page }) => {
        test.setTimeout(60_000); // 60 seconds timeout for screenshot session
        // Unlocks some lore drops in local storage so the Archive has logs to show
        await page.addInitScript(() => {
            localStorage.setItem('hb_world_memory_v1', JSON.stringify({
                logsFound: ['A01', 'A02', 'A03']
            }));
            // Stub electron API to avoid mock-rejection crash if window.electronAPI is accessed
            window.electronAPI = new Proxy({}, {
                get(_target, prop) {
                    if (typeof prop === 'string' && prop.startsWith('on')) return () => {};
                    if (prop === 'setStat' || prop === 'setSteamInputPhase') return () => {};
                    return (..._args) => Promise.resolve({ ok: true, inventory: [] });
                }
            });
        });

        // ==========================================
        // Screenshot 4: Terminal, codex, or lore interaction
        // ==========================================
        await bootToOperatorMenu(page);
        // Open the Archive modal
        await page.locator('#archive-btn').click();
        await page.waitForTimeout(1000);
        // Click on the first unlocked log item to open details
        await page.locator('button.archive-log-entry').first().click();
        await page.waitForTimeout(1000);
        // Take Screenshot 4
        await page.screenshot({ path: 'steam/store/steam_screenshot_04_en.png' });
        // Close archive detail and modal
        await page.locator('#close-archive-log-detail').click();
        await page.locator('#close-archive-modal').click();
        await page.waitForTimeout(500);

        // ==========================================
        // Start run for gameplay screenshots
        // ==========================================
        await page.locator('#start-game').click();
        await expect(page.locator('#hud-run-seed')).toBeVisible({ timeout: 20_000 });
        await page.waitForTimeout(2000); // Wait for shader compilation / render

        // ==========================================
        // Screenshot 1: Core bunker exploration with HUD
        // ==========================================
        // Move the player slightly to show exploration
        await page.keyboard.down('KeyD');
        await page.waitForTimeout(500);
        await page.keyboard.up('KeyD');
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'steam/store/steam_screenshot_01_en.png' });

        // ==========================================
        // Screenshot 3: Base management view (Bunker Tree)
        // ==========================================
        // Open the console terminal modal
        await page.evaluate(() => {
            if (window.game) {
                window.game.openConsoleModal({ type: 'SCOUT' });
            }
        });
        await page.waitForTimeout(1000);
        // Switch to class skills tab (which displays the Bunker Tree)
        await page.locator('#terminal-tab-skills').click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'steam/store/steam_screenshot_03_en.png' });
        // Close console modal
        await page.locator('#close-console-terminal').click();
        await page.waitForTimeout(500);

        // ==========================================
        // Screenshot 2: Combat or enemy encounter
        // ==========================================
        // Enable god mode programmatically to make it safe
        await page.evaluate(() => {
            if (window.game) {
                window.game.setGodMode(true);
                window.game.spawnPatrolNearPlayer();
                window.game.spawnPatrolNearPlayer();
            }
        });
        await page.waitForTimeout(1500);
        // Fire weapon a couple times to show active combat trail/flourish
        await page.evaluate(() => {
            if (window.game) {
                window.game.fireWeaponAtCurrentAim();
            }
        });
        await page.waitForTimeout(200);
        await page.screenshot({ path: 'steam/store/steam_screenshot_02_en.png' });

        // ==========================================
        // Screenshot 5: Cave reveal, boss, or ending
        // ==========================================
        // Spawn the Queen boss fight
        await page.evaluate(() => {
            if (window.game) {
                window.game.startQueenFight();
            }
        });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'steam/store/steam_screenshot_05_en.png' });
    });
});
