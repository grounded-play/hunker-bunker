import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro, stubOfflineElectronAPI } from '../helpers.js';

// Beat 0:30-0:42, "decision montage": archive UI, bunker/skills tree,
// banked resources HUD.
//
// NOTE: seeding localStorage's hb_world_memory_v1.logsFound (the trick
// captureScreenshots.spec.js uses) did NOT unlock any entries here — all 42
// still read ENCRYPTED // LOCKED even with A01-A03 seeded before boot.
// Rather than chase that (unrelated to this clip's purpose), this clip just
// shows the archive UI ambiance/HUD counters and skips opening a locked
// entry's detail view.
test('decision montage: archive UI, skills tree, banked resources', async ({ page }) => {
    test.setTimeout(150_000);
    await stubOfflineElectronAPI(page);
    await bootToOperatorMenu(page);

    // bootToOperatorMenu can leave #roster-modal open (operator select) on
    // top of #archive-btn's z-order — close it before interacting with the
    // menu behind it.
    const rosterModal = page.locator('#roster-modal');
    if (await rosterModal.isVisible().catch(() => false)) {
        await page.locator('#close-roster-modal').click();
        await page.waitForTimeout(300);
    }

    await page.locator('#archive-btn').click();
    await page.waitForTimeout(1_500);
    await page.locator('#close-archive-modal').click();
    await page.waitForTimeout(400);

    await startRunAndSkipIntro(page);
    await page.evaluate(() => document.body.classList.add('show-debug'));
    await page.locator('#debug-grant-resources').click();
    await page.waitForTimeout(500);

    await page.evaluate(() => window.game?.openConsoleModal?.({ type: 'SCOUT' }));
    await page.waitForTimeout(800);
    await page.locator('#terminal-tab-skills').click();
    await page.waitForTimeout(1_500);
});
