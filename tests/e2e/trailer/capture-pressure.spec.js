import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro, stubOfflineElectronAPI } from '../helpers.js';

// Beat 0:16-0:30, "pressure rises": low O2 reading, a patrol closing in
// without god mode this time (so hits actually land/read as threatening),
// weapon fire under pressure.
test('pressure: low O2 HUD, enemies closing, weapon fire', async ({ page }) => {
    test.setTimeout(150_000);
    await stubOfflineElectronAPI(page);
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);

    await page.evaluate(() => {
        if (window.game?.playerVitals) window.game.playerVitals.o2 = 18;
        window.game?.spawnPatrolNearPlayer?.();
        window.game?.spawnPatrolNearPlayer?.();
    });
    await page.waitForTimeout(1_000);
    await page.evaluate(() => window.game?.fireWeaponAtCurrentAim?.());
    await page.waitForTimeout(2_500);
});
