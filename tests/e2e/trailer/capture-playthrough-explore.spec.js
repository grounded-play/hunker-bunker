import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro, stubOfflineElectronAPI } from '../helpers.js';
import { closeConsoleModalIfOpen } from './trailerHelpers.js';

// Real played footage, not debug hooks: actual WASD holds and real mouse
// moves/clicks on the renderer canvas (same input paths keyboard-controls.
// spec.js proves work) for one continuous exploration take once boot
// finishes -- movement, look-around, a door interact attempt (E), a fired
// shot, a reload (R). This is the raw "just play it" footage the earlier
// debug-hook clips were missing.
test('playthrough: real WASD movement, look-around, interact, fire, reload', async ({ page }) => {
    test.setTimeout(180_000);
    await stubOfflineElectronAPI(page);
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await closeConsoleModalIfOpen(page);

    const canvas = page.locator('#game-container canvas').first();
    const box = await canvas.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Walk forward, look around by moving the mouse across the canvas.
    await page.keyboard.down('KeyW');
    await page.mouse.move(cx + 200, cy - 80, { steps: 15 });
    await page.waitForTimeout(1_400);
    await page.mouse.move(cx - 200, cy + 60, { steps: 15 });
    await page.waitForTimeout(1_400);
    await page.keyboard.up('KeyW');

    // Strafe right while turning to look right.
    await page.keyboard.down('KeyD');
    await page.mouse.move(cx + 260, cy, { steps: 10 });
    await page.waitForTimeout(1_200);
    await page.keyboard.up('KeyD');

    // Real door interact attempt -- a genuine keypress, not a debug call.
    // Not guaranteed to land on a door, but it's the real control path.
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(400);
    await closeConsoleModalIfOpen(page);

    // Turn and walk again toward wherever the look direction now points.
    await page.keyboard.down('KeyW');
    await page.mouse.move(cx - 150, cy - 120, { steps: 12 });
    await page.waitForTimeout(1_600);
    await page.keyboard.up('KeyW');

    // A real fired shot: aim via mouse position, click the canvas.
    await closeConsoleModalIfOpen(page);
    await page.mouse.move(cx + 120, cy - 40, { steps: 10 });
    await canvas.click({ position: { x: box.width / 2 + 120, y: box.height / 2 - 40 } });
    await page.waitForTimeout(300);
    await page.keyboard.press('KeyR');
    await page.waitForTimeout(1_000);

    // One more traversal loop -- strafe left, walk forward, look around --
    // so the take has enough varied motion to Ken-Burns/cut from.
    await page.keyboard.down('KeyA');
    await page.waitForTimeout(900);
    await page.keyboard.up('KeyA');
    await page.keyboard.down('KeyW');
    await page.mouse.move(cx, cy + 100, { steps: 10 });
    await page.waitForTimeout(1_800);
    await page.keyboard.up('KeyW');

    await page.waitForTimeout(600);
});
