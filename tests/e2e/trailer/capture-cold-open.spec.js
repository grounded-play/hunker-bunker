import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro, stubOfflineElectronAPI } from '../helpers.js';

// Beat 0:00-0:04, "cold open, mid-action". God mode + a forced patrol spawn
// so the encounter is guaranteed on screen the moment the clip starts,
// rather than hoping combat happens naturally in the capture window.
test('cold open: forced combat, weapon fire, enemy down', async ({ page }) => {
    test.setTimeout(150_000);
    await stubOfflineElectronAPI(page);
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);

    await page.evaluate(() => {
        window.game?.setGodMode?.(true);
        window.game?.spawnPatrolNearPlayer?.();
    });
    await page.waitForTimeout(600);
    for (let i = 0; i < 6; i += 1) {
        await page.evaluate(() => window.game?.fireWeaponAtCurrentAim?.());
        await page.waitForTimeout(250);
    }
    await page.waitForTimeout(1_500);
});
