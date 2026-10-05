import { test, expect } from '@playwright/test';
import { bootToTitleSplash, bootToOperatorMenu } from './helpers.js';

// Tabs switch from the keyboard (Q / E) the same way LB / RB switch them on a
// pad (handleControllerTabNavigation). The Dossier's tabs were missing from
// the tab selector, so neither input could leave its first tab.
// docs/design/ui-surfaces-menu-map-and-controller-navigation.md §3.

async function activeTab(page, root) {
    return page.evaluate((root) => {
        const tab = document.querySelector(`${root} :is(.active, .is-active, [aria-selected="true"]):is([role="tab"], .settings-tab, .season-pass-tab-btn, .foundry-hub__tab)`);
        return (tab?.textContent || '').replace(/\s+/g, ' ').trim();
    }, root);
}

async function expectQeCycles(page, root) {
    const first = await activeTab(page, root);
    await page.keyboard.press('KeyE');
    await expect.poll(() => activeTab(page, root)).not.toBe(first);
    await page.keyboard.press('KeyQ');
    await expect.poll(() => activeTab(page, root)).toBe(first);
}

test.describe('menu tabs switch with Q / E', () => {
    test('Settings', async ({ page }) => {
        await bootToTitleSplash(page);
        await page.locator('#title-settings-btn').click();
        await expectQeCycles(page, '#settings-popup');
    });

    test('Archive, Foundry hub and Dossier from the operator menu', async ({ page }) => {
        await bootToOperatorMenu(page);
        for (const [button, root] of [
            ['#archive-btn', '#archive-modal'],
            ['#fabrication-btn', '#foundry-hub-modal'],
            ['#season-pass-btn', '#season-pass-modal']
        ]) {
            await page.locator(button).click();
            await expect(page.locator(root)).toBeVisible();
            await expectQeCycles(page, root);
            await page.keyboard.press('Escape');
            await expect(page.locator(root)).toBeHidden();
        }
    });
});
