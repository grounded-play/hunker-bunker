import { test } from '@playwright/test';
import { bootToTitleSplash } from '../helpers.js';

// The reusable "door" transition motif for the trailer: #transition-overlay
// runs the same vertical-close / horizontal-open animation (main.js
// triggerDoorTransition) on every title->menu, menu->run, and cutscene
// handoff in the game. Capturing the title->menu instance in isolation
// (nothing else on screen but the overlay + smoke) gives the assembly
// script one clean clip to reuse as a wipe between beats.
test('door transition: title -> operator menu reveal', async ({ page }) => {
    test.setTimeout(60_000);
    await bootToTitleSplash(page);
    await page.waitForTimeout(500);
    await page.locator('#title-newrun-btn').click();
    // Overlay timing (main.js): 900ms closed-hold + 300ms opening-hold +
    // 800ms open travel + 900ms cleanup tail ~= 2.9s. Pad both ends.
    await page.waitForTimeout(4_000);
});
