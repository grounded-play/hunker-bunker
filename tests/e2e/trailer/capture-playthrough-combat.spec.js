import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro, stubOfflineElectronAPI } from '../helpers.js';
import { closeConsoleModalIfOpen } from './trailerHelpers.js';

// Real played combat footage. spawnPatrolNearPlayer() forces an encounter
// into the frame (waiting for one to occur naturally would eat the whole
// capture budget on empty corridors) but every action against it -- aim,
// fire, kite, reload -- is a real mouse/keyboard input on the canvas, the
// same paths keyboard-controls.spec.js exercises, not a debug auto-resolve.
test('playthrough: forced encounter, real aim/fire/kite/reload', async ({ page }) => {
    test.setTimeout(180_000);
    await stubOfflineElectronAPI(page);
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await closeConsoleModalIfOpen(page);

    const canvas = page.locator('#game-container canvas').first();
    const box = await canvas.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.evaluate(() => window.game?.spawnPatrolNearPlayer?.());
    await page.waitForTimeout(500);
    await closeConsoleModalIfOpen(page);

    // Fire a burst, moving the aim point each shot like a player tracking
    // a moving target, backing away (S) between shots.
    for (let i = 0; i < 5; i += 1) {
        const dx = 80 + i * 15;
        const dy = -40 + i * 10;
        await page.mouse.move(cx + dx, cy + dy, { steps: 6 });
        await closeConsoleModalIfOpen(page);
        await canvas.click({ position: { x: box.width / 2 + dx, y: box.height / 2 + dy } });
        await page.keyboard.down('KeyS');
        await page.waitForTimeout(350);
        await page.keyboard.up('KeyS');
    }

    await page.keyboard.press('KeyR');
    await page.waitForTimeout(900);

    // A second enemy joins -- kite left while firing back over the shoulder.
    await page.evaluate(() => window.game?.spawnPatrolNearPlayer?.());
    await page.keyboard.down('KeyA');
    await page.waitForTimeout(600);
    for (let i = 0; i < 4; i += 1) {
        const dx = -60 - i * 10;
        await page.mouse.move(cx + dx, cy, { steps: 6 });
        await closeConsoleModalIfOpen(page);
        await canvas.click({ position: { x: box.width / 2 + dx, y: box.height / 2 } });
        await page.waitForTimeout(300);
    }
    await page.keyboard.up('KeyA');

    await page.waitForTimeout(1_200);
});
