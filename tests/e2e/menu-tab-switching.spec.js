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

// Left / right on a focused Settings tab moved two tabs: the capture-phase
// menu handler moved focus one tab spatially, then the tab bar's own handler
// advanced again from there. One press must be one tab, wrapping at the ends.
test('Settings tabs step one at a time with arrows and A / D', async ({ page }) => {
    await bootToTitleSplash(page);
    await page.locator('#title-settings-btn').click();
    await expect(page.locator('#settings-popup')).toBeVisible();
    await page.locator('#settings-popup .settings-tab.active').focus();
    const order = await page.locator('#settings-popup .settings-tab').evaluateAll((tabs) => tabs.map((t) => t.textContent.replace(/\s+/g, ' ').trim()));
    const focused = () => page.evaluate(() => document.activeElement?.textContent.replace(/\s+/g, ' ').trim());
    for (let i = 1; i < order.length; i += 1) {
        await page.keyboard.press(i % 2 ? 'ArrowRight' : 'KeyD');
        await expect.poll(() => activeTab(page, '#settings-popup')).toBe(order[i]);
        expect(await focused()).toBe(order[i]);
    }
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => activeTab(page, '#settings-popup')).toBe(order[0]);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => activeTab(page, '#settings-popup')).toBe(order[order.length - 1]);
    await page.keyboard.press('KeyA');
    await expect.poll(() => activeTab(page, '#settings-popup')).toBe(order[order.length - 2]);
    expect(await focused()).toBe(order[order.length - 2]);
});

// Same capture-phase double move as the Settings tabs (061d80a4): every tab
// bar with its own left/right handler stepped twice per press.
test('Archive tabs step one at a time with arrows and A / D', async ({ page }) => {
    await bootToOperatorMenu(page);
    await page.locator('#archive-btn').click();
    await expect(page.locator('#archive-modal')).toBeVisible();
    const tabs = page.locator('#archive-modal [data-archive-tab]');
    await tabs.first().click();
    const order = await tabs.evaluateAll((list) => list.map((t) => t.textContent.replace(/\s+/g, ' ').trim()));
    for (let i = 1; i < order.length; i += 1) {
        await page.keyboard.press(i % 2 ? 'ArrowRight' : 'KeyD');
        await expect.poll(() => activeTab(page, '#archive-modal')).toBe(order[i]);
    }
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => activeTab(page, '#archive-modal')).toBe(order[0]);
    await page.keyboard.press('KeyA');
    await expect.poll(() => activeTab(page, '#archive-modal')).toBe(order[order.length - 1]);
});
