import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// S49-10 (docs/planning/sprint-49.md): the review build failed Full
// Controller Support. The review probe proves Achievements; this walks every
// other surface the review lists using ONLY controller menu events after boot:
// reach the entry by D-pad, confirm, move inside, back out, and land where
// the player came from. No mouse, no keyboard, no element.click().

const pad = (page, action) => page.evaluate(
    (a) => window.dispatchEvent(new CustomEvent('gamepad-menu-nav', { detail: { action: a } })),
    action
);

const focused = (page) => page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + Math.min(r.height / 2, 30));
    return {
        id: el.id || null,
        cls: el.className?.toString?.() ?? '',
        text: (el.textContent || '').trim().slice(0, 40),
        visible: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight,
        topmost: Boolean(hit && (el === hit || el.contains(hit) || hit.contains(el)))
    };
});

const isFocusedMatch = (page, selector) => page.evaluate(
    (sel) => Boolean(document.activeElement?.matches?.(sel)),
    selector
);

const focusInside = (page, rootSelector) => page.evaluate(
    (sel) => Boolean(document.querySelector(sel)?.contains(document.activeElement)),
    rootSelector
);

// Steer focus onto `selector` with the D-pad only. Tries down, then right,
// then up, then left sweeps; records the path for the failure message.
async function steerTo(page, selector, { maxSteps = 40 } = {}) {
    const path = [];
    for (const dir of ['menu_down', 'menu_right', 'menu_up', 'menu_left']) {
        for (let i = 0; i < maxSteps; i += 1) {
            if (await isFocusedMatch(page, selector)) return path;
            await pad(page, dir);
            await page.waitForTimeout(60);
            const f = await focused(page);
            path.push(`${dir}→${f?.id || f?.text || 'body'}`);
        }
    }
    if (await isFocusedMatch(page, selector)) return path;
    throw new Error(`controller could not reach ${selector}; path: ${path.slice(-25).join(' | ')}`);
}

// Move inside an open surface and prove focus stays inside, visible, on top,
// and actually goes somewhere.
async function exploreInside(page, rootSelector, steps = 6) {
    const seen = new Set();
    for (const dir of ['menu_down', 'menu_right']) {
        for (let i = 0; i < steps; i += 1) {
            await pad(page, dir);
            await page.waitForTimeout(60);
            const f = await focused(page);
            expect(f, `${rootSelector}: focus lost to body after ${dir}`).not.toBeNull();
            expect(await focusInside(page, rootSelector), `${rootSelector}: focus escaped to ${f?.id || f?.text}`).toBe(true);
            expect(f.visible, `${rootSelector}: focused ${f.id || f.text} is off screen`).toBe(true);
            expect(f.topmost, `${rootSelector}: focused ${f.id || f.text} is covered`).toBe(true);
            seen.add(f.id || f.text);
        }
    }
    return seen;
}

async function openSettingsByPad(page) {
    await steerTo(page, '.open-settings-btn');
    await pad(page, 'menu_confirm');
    await expect(page.locator('#settings-popup')).toBeVisible({ timeout: 10_000 });
}

test.describe('S49-10 controller journey', () => {
    test.describe.configure({ timeout: 300_000 });

    test('Steam Vault: reach, browse, back out', async ({ page }) => {
        await bootToOperatorMenu(page);
        await steerTo(page, '#steam-vault-btn');
        await pad(page, 'menu_confirm');
        await expect(page.locator('#steam-vault-modal')).toBeVisible({ timeout: 15_000 });
        await page.waitForTimeout(400);
        const seen = await exploreInside(page, '#steam-vault-modal');
        expect(seen.size, 'focus moves between vault controls').toBeGreaterThan(1);
        await page.screenshot({ path: 'playwright-report/screenshots/s49-10-vault.png' });
        await pad(page, 'menu_back');
        await expect(page.locator('#steam-vault-modal')).toBeHidden({ timeout: 5_000 });
        expect(await isFocusedMatch(page, '#steam-vault-btn'), 'focus returns to the Vault button').toBe(true);
    });

    test('Foundry: reach, browse, back out', async ({ page }) => {
        await bootToOperatorMenu(page);
        await steerTo(page, '#fabrication-btn');
        await pad(page, 'menu_confirm');
        await expect(page.locator('#foundry-hub-modal')).toBeVisible({ timeout: 15_000 });
        await page.waitForTimeout(400);
        const seen = await exploreInside(page, '#foundry-hub-modal');
        expect(seen.size, 'focus moves between foundry controls').toBeGreaterThan(1);
        await page.screenshot({ path: 'playwright-report/screenshots/s49-10-foundry.png' });
        await pad(page, 'menu_back');
        await expect(page.locator('#foundry-hub-modal')).toBeHidden({ timeout: 5_000 });
        expect(await isFocusedMatch(page, '#fabrication-btn'), 'focus returns to the Foundry button').toBe(true);
    });

    test('Content Guide: reach from Settings, read a transcript, scroll it, back out twice', async ({ page }) => {
        await bootToOperatorMenu(page);
        await openSettingsByPad(page);
        await steerTo(page, '#open-mature-audit-btn');
        await pad(page, 'menu_confirm');
        await expect(page.locator('#mature-content-audit-modal')).toBeVisible();
        await steerTo(page, '.mature-launch-tree-btn[data-tree-id="sister_val"]');
        await pad(page, 'menu_confirm');
        const viewer = page.locator('#mature-audit-scene-viewer');
        await expect(viewer).toBeVisible();
        const scrollTop = () => page.evaluate(() => document.querySelector('#mature-audit-scene-viewer .mature-audit-scene-text')?.scrollTop ?? -1);
        const before = await scrollTop();
        for (let i = 0; i < 8; i += 1) { await pad(page, 'menu_down'); await page.waitForTimeout(60); }
        expect(await scrollTop(), 'D-pad scrolls the transcript').toBeGreaterThan(before);
        await page.screenshot({ path: 'playwright-report/screenshots/s49-10-guide-transcript.png' });
        await pad(page, 'menu_back');
        await expect(viewer).toBeHidden();
        await expect(page.locator('#mature-content-audit-modal')).toBeVisible();
        expect(await focusInside(page, '#mature-content-audit-modal'), 'focus returns into the guide').toBe(true);
        await pad(page, 'menu_back');
        await expect(page.locator('#mature-content-audit-modal')).toBeHidden();
        await expect(page.locator('#settings-popup')).toBeVisible();
        expect(await focusInside(page, '#settings-popup'), 'focus returns into Settings').toBe(true);
    });

    test('Commentary: reach READ ALL from Settings, scroll the list, back out', async ({ page }) => {
        await bootToOperatorMenu(page);
        await openSettingsByPad(page);
        await steerTo(page, '#open-commentary-list');
        await pad(page, 'menu_confirm');
        await expect(page.locator('#commentary-list-modal')).toBeVisible();
        const scrollTop = () => page.evaluate(() => {
            let top = 0;
            for (const el of document.querySelectorAll('#commentary-list-modal, #commentary-list-modal *')) top = Math.max(top, el.scrollTop);
            return top;
        });
        for (let i = 0; i < 12; i += 1) { await pad(page, 'menu_down'); await page.waitForTimeout(60); }
        expect(await scrollTop(), 'D-pad scrolls the commentary list').toBeGreaterThan(0);
        await pad(page, 'menu_back');
        await expect(page.locator('#commentary-list-modal')).toBeHidden();
        expect(await focusInside(page, '#settings-popup'), 'focus returns into Settings').toBe(true);
    });

    test('Multiplayer console: move between modes and host, back out', async ({ page }) => {
        await bootToOperatorMenu(page);
        await steerTo(page, '#start-game');
        await pad(page, 'menu_confirm');
        await page.locator('#armory-btn-embark').waitFor({ state: 'visible', timeout: 30_000 });
        await steerTo(page, '#armory-btn-embark');
        await pad(page, 'menu_confirm');
        await expect(page.locator('#multiplayer-modal')).toBeVisible({ timeout: 20_000 });
        await steerTo(page, '#net-mode-pvp-btn');
        await steerTo(page, '#net-mode-coop-btn');
        await pad(page, 'menu_confirm');
        await steerTo(page, '#net-connect-btn');
        await page.screenshot({ path: 'playwright-report/screenshots/s49-10-multiplayer.png' });
        await pad(page, 'menu_back');
        await expect(page.locator('#multiplayer-modal')).toBeHidden({ timeout: 5_000 });
        const f = await focused(page);
        expect(f, 'focus is not lost after leaving the console').not.toBeNull();
    });

    test('In run: pause, settings, abort, results — all by controller', async ({ page }) => {
        await startRunAndSkipIntro(page);
        await pad(page, 'menu_back');
        await expect(page.locator('#settings-popup')).toBeVisible({ timeout: 10_000 });
        await steerTo(page, '#abort-mission');
        await pad(page, 'menu_confirm');
        await expect(page.locator('#confirm-modal')).toBeVisible({ timeout: 5_000 });
        await steerTo(page, '#confirm-yes');
        await pad(page, 'menu_confirm');
        await expect(page.locator('#game-over-modal')).toBeVisible({ timeout: 60_000 });
        await page.waitForTimeout(1500);
        await steerTo(page, '#game-over-main-menu');
        await steerTo(page, '#game-over-try-again');
        await page.screenshot({ path: 'playwright-report/screenshots/s49-10-results.png' });
    });
});
