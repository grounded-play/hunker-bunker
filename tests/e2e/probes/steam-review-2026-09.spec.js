import { test, expect } from '@playwright/test';
import { bootToTitleSplash, bootToOperatorMenu } from '../helpers.js';

// Valve build review 25475189 (2026-09): each failure, replayed the way a
// reviewer would reach it. Plan: docs/planning/steam-review-build-25475189-fix-plan-2026-09-30.md

// True when the element's centre is not covered by another layer.
const topmostIn = (page, selector) => page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const r = el?.getBoundingClientRect();
    if (!r) return false;
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + Math.min(r.height / 2, 60));
    return Boolean(hit && (el === hit || el.contains(hit)));
}, selector);

const pad = (page, action) => page.evaluate((a) => window.dispatchEvent(new CustomEvent('gamepad-menu-nav', { detail: { action: a } })), action);

async function openTitleMenu(page) {
    await bootToTitleSplash(page);
    const title = page.locator('#title-newrun-btn');
    if (!(await title.isVisible().catch(() => false))) {
        await page.locator('body').click({ force: true }).catch(() => {});
        await title.waitFor({ state: 'visible', timeout: 15_000 });
    }
}

test('online play is on the title menu and lands on the co-op / PvP choice', async ({ page }) => {
    await openTitleMenu(page);
    const multiplayer = page.locator('#title-multiplayer-btn');
    await expect(multiplayer).toBeVisible();
    await expect(multiplayer).toHaveText(/MULTIPLAYER/);
    await multiplayer.click();
    await page.locator('#start-game').waitFor({ state: 'visible', timeout: 20_000 });
    await page.locator('#start-game').click();
    await page.locator('#armory-btn-embark').waitFor({ state: 'visible', timeout: 30_000 });
    await page.locator('#armory-btn-embark').click();
    await expect(page.locator('#multiplayer-modal')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#net-mode-coop-btn')).toBeVisible();
    await expect(page.locator('#net-mode-pvp-btn')).toBeVisible();
    await expect(page.locator('#net-mode-coop-btn')).toBeFocused();
    await page.screenshot({ path: 'playwright-report/screenshots/review-multiplayer-console.png' });
});

test('a controller reaches and scrolls every achievement', async ({ page }) => {
    await openTitleMenu(page);
    await page.locator('#title-achievements-btn').click();
    await expect(page.locator('#achievements-modal')).toBeVisible();
    const total = await page.locator('#achievements-grid .achievement-card').count();
    expect(total).toBeGreaterThan(5);
    // Down to the bottom row, then right to the end, as a player would.
    const focusState = () => page.evaluate(() => {
        const cards = [...document.querySelectorAll('#achievements-grid .achievement-card')];
        let top = 0;
        for (let el = document.getElementById('achievements-grid'); el; el = el.parentElement) top = Math.max(top, el.scrollTop);
        const active = document.activeElement;
        const rect = active?.getBoundingClientRect?.();
        return { index: cards.indexOf(active), top, onScreen: Boolean(rect && rect.top >= 0 && rect.bottom <= window.innerHeight) };
    });
    let state = await focusState();
    for (let i = 0; i < 40; i += 1) {
        await pad(page, 'menu_down');
        await page.waitForTimeout(80);
        const next = await focusState();
        if (next.index === state.index && next.index >= 0) break;
        state = next;
    }
    for (let i = 0; i < 12; i += 1) {
        await pad(page, 'menu_right');
        await page.waitForTimeout(80);
        state = await focusState();
        if (state.index === total - 1) break;
    }
    expect(state.index, 'focus reaches the last achievement').toBe(total - 1);
    expect(state.top, 'the list scrolled').toBeGreaterThan(0);
    expect(state.onScreen, 'the focused card is on screen').toBe(true);
    await page.screenshot({ path: 'playwright-report/screenshots/review-achievements-controller-end.png' });
});

test('switching commentary on shows commentary at once, and every entry is readable', async ({ page }) => {
    await bootToOperatorMenu(page);
    await page.locator('.open-settings-btn').first().click({ force: true });
    await expect(page.locator('#settings-popup')).toBeVisible({ timeout: 10_000 });
    await page.evaluate(() => {
        const toggle = document.getElementById('main-commentary-toggle');
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('#menu-commentary-stack .commentary-toast')).toBeVisible();
    await expect(page.locator('#menu-commentary-stack .commentary-toast')).toContainText('Developer Commentary');

    await page.evaluate(() => document.getElementById('open-commentary-list').click());
    await expect(page.locator('#commentary-list-modal')).toBeVisible();
    expect(await topmostIn(page, '#commentary-list-modal .commentary-list-content'), 'list is above Settings').toBe(true);
    expect(await page.locator('#commentary-list .commentary-list__item').count()).toBeGreaterThanOrEqual(12);
    await page.keyboard.press('Escape');
    await expect(page.locator('#commentary-list-modal')).toBeHidden();
    await expect(page.locator('#settings-popup')).toBeVisible();
});

test('the content guide opens from Settings and shows the real dialogue from the title screen', async ({ page }) => {
    await bootToOperatorMenu(page);
    await page.locator('.open-settings-btn').first().click({ force: true });
    await expect(page.locator('#settings-popup')).toBeVisible({ timeout: 10_000 });
    await page.evaluate(() => document.getElementById('open-mature-audit-btn').click());
    await expect(page.locator('#mature-content-audit-modal')).toBeVisible();
    expect(await topmostIn(page, '#mature-content-audit-modal .modal-content, #mature-content-audit-modal'), 'guide is above Settings').toBe(true);
    await expect(page.locator('#mature-audit-list')).not.toContainText('Bio-Incubation');
    await page.locator('.mature-launch-tree-btn[data-tree-id="sister_val"]').click();
    const viewer = page.locator('#mature-audit-scene-viewer');
    await expect(viewer).toBeVisible();
    expect(await topmostIn(page, '#mature-audit-scene-viewer'), 'transcript is above the guide').toBe(true);
    await expect(viewer).toContainText('[DEEPEN INTIMACY]');
    await page.screenshot({ path: 'playwright-report/screenshots/review-content-guide-transcript.png' });
});
