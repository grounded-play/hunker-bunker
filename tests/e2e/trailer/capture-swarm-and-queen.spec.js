import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro, stubOfflineElectronAPI } from '../helpers.js';

// Beat 0:42-0:52, "escalation to boss": a multi-enemy swarm, then the
// Queen fight start. God mode so the clip survives long enough to capture
// cleanly rather than ending in a death cutscene mid-shot.
test('escalation: enemy swarm then Queen fight start', async ({ page }) => {
    test.setTimeout(150_000);
    await stubOfflineElectronAPI(page);
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);

    await page.evaluate(() => window.game?.setGodMode?.(true));
    await page.evaluate(() => {
        window.game?.spawnPatrolNearPlayer?.();
        window.game?.spawnPatrolNearPlayer?.();
        window.game?.spawnPatrolNearPlayer?.();
    });
    await page.waitForTimeout(1_500);
    await page.evaluate(() => window.game?.fireWeaponAtCurrentAim?.());
    await page.waitForTimeout(800);
    await page.evaluate(() => window.game?.startQueenFight?.());
    await page.waitForTimeout(3_000);
});
