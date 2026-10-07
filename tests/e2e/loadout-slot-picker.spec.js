import { test, expect } from '@playwright/test';
import { bootToOperatorMenu } from './helpers.js';

// Sprint 51: "I want to see what the loadout does" and "when I click an empty
// box we see what can go there, in the Foundry or on the hero select, just
// like in the Armory screen". A fresh save owns no Rig Modules.
test.describe.configure({ timeout: 240_000 });

test('an empty hero slot opens the picker, with earned items locked on a fresh save', async ({ page }) => {
    await bootToOperatorMenu(page);
    const bayA = page.locator('#hero-loadout-strip button.item-card[data-slot="bay_a"]');
    await expect(bayA).toBeVisible();
    await bayA.click();

    const picker = page.locator('#loadout-picker-modal');
    await expect(picker).toBeVisible();
    await expect(picker.locator('.armory-tile').first()).toBeVisible();
    // Fresh save: every Rig Module is locked, none owned by default.
    const lockedRig = await picker.locator('.armory-tile[data-value="4160"]').getAttribute('class');
    expect(lockedRig).toContain('is-locked');
    await picker.locator('.armory-tile[data-value="4160"]').hover();
    await expect(picker.locator('#armory-picker-readout-state')).toContainText('150');
    await page.screenshot({ path: 'playwright-report/screenshots/loadout-picker-hero.png' });

    await picker.locator('#armory-picker-close').click();
    await expect(picker).toBeHidden();
    await expect(bayA).toBeFocused();
});

test('the Foundry LOADOUT tab says what the loadout does and its slots open the picker', async ({ page }) => {
    await bootToOperatorMenu(page);
    await page.evaluate(() => window.foundryHub.open('loadout'));
    const panel = page.locator('#foundry-hub-loadout');
    await expect(panel.locator('.loadout-effects')).toBeVisible();
    await expect(panel.locator('.loadout-effects')).toContainText(/factory weapon/i);
    await page.screenshot({ path: 'playwright-report/screenshots/loadout-foundry.png' });

    await panel.locator('button.item-card[data-slot="charm"]').click();
    const picker = page.locator('#loadout-picker-modal');
    await expect(picker).toBeVisible();
    // The picker sits above the Foundry hub.
    const onTop = await page.evaluate(() => {
        const tile = document.querySelector('#loadout-picker-modal .armory-tile');
        const rect = tile.getBoundingClientRect();
        return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('#loadout-picker-modal') !== null;
    });
    expect(onTop).toBe(true);
});
