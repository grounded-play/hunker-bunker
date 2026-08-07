import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro, stubOfflineElectronAPI } from '../helpers.js';

// Beat 0:04-0:16, "the loop, fast": bunker interior, HUD/vitals readable,
// player movement for a Ken-Burns-able pan, then a procedural door
// interaction if one is in reach.
test('exploration: bunker interior, HUD, movement, door interact', async ({ page }) => {
    test.setTimeout(150_000);
    await stubOfflineElectronAPI(page);
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);

    await page.waitForTimeout(500);
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(1_200);
    await page.keyboard.up('KeyW');
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(800);
    await page.keyboard.up('KeyD');

    // Best-effort: interact with whatever procedural door is nearest, if
    // any is within range yet. Not required for the clip to be useful.
    await page.evaluate(() => window.game?.interactWithProceduralDoor?.());
    await page.waitForTimeout(1_500);
});
