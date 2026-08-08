import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro, stubOfflineElectronAPI } from '../helpers.js';
import { closeConsoleModalIfOpen } from './trailerHelpers.js';

// The Queen fight is a deep-run boss encounter -- reaching it through real
// play would burn the whole capture budget on travel, not footage.
// startQueenFight() only forces the *encounter* to start; every action
// against her once she's on screen (aim, fire, retreat) is a real
// mouse/keyboard input, not an auto-resolve.
test('playthrough: Queen encounter with real aim/fire under pressure', async ({ page }) => {
    test.setTimeout(180_000);
    await stubOfflineElectronAPI(page);
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await closeConsoleModalIfOpen(page);

    const canvas = page.locator('#game-container canvas').first();
    const box = await canvas.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Spawn starts inside the home base shop console's interaction radius
    // (confirmed via CDP: "ACCESS TANK BASE SHOP" prompt visible at frame
    // 0) -- walk clear of it first so nothing reopens the terminal modal
    // mid-fight the way it did the first time this was captured.
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(1_800);
    await page.keyboard.up('KeyW');
    await closeConsoleModalIfOpen(page);

    // God mode only -- so the take survives long enough to capture rather
    // than ending in a death cutscene a few seconds in; damage output and
    // aim are still real.
    await page.evaluate(() => window.game?.setGodMode?.(true));
    await page.evaluate(() => window.game?.startQueenFight?.());
    await page.waitForTimeout(1_500);
    await closeConsoleModalIfOpen(page);

    for (let i = 0; i < 8; i += 1) {
        const dx = (i % 2 === 0 ? 1 : -1) * (60 + i * 8);
        const dy = -30 - i * 6;
        await page.mouse.move(cx + dx, cy + dy, { steps: 6 });
        await closeConsoleModalIfOpen(page);
        await canvas.click({ position: { x: box.width / 2 + dx, y: box.height / 2 + dy } });
        if (i % 3 === 0) {
            await page.keyboard.down('KeyS');
            await page.waitForTimeout(250);
            await page.keyboard.up('KeyS');
        } else {
            await page.waitForTimeout(300);
        }
    }
    await page.keyboard.press('KeyR');
    await page.waitForTimeout(1_500);
});
