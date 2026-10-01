import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, bootToTitleSplash, startRunAndSkipIntro } from '../helpers.js';

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

const focusKey = (page) => page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return 'body';
    return `${el.id}|${el.className}|${(el.textContent || '').trim().slice(0, 30)}|${Math.round(el.getBoundingClientRect().x)},${Math.round(el.getBoundingClientRect().y)}`;
});

// Where the target sits relative to the focused element, as a player sees it.
const offsetToTarget = (page, selector) => page.evaluate((sel) => {
    const target = [...document.querySelectorAll(sel)].find((el) => el.getClientRects().length);
    const active = document.activeElement;
    if (!target || !active || active === document.body) return null;
    const a = active.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    return { dx: (b.x + b.width / 2) - (a.x + a.width / 2), dy: (b.y + b.height / 2) - (a.y + a.height / 2) };
}, selector);

// Steer focus onto `selector` with the D-pad only. First the way a player
// would, pressing toward the target on screen; if that stalls, a raster scan:
// to the top, then each row left-to-right, then down a row.
async function steerTo(page, selector, opts = {}) {
    const path = [];
    for (let i = 0, stalls = 0; i < 40 && stalls < 4; i += 1) {
        if (await isFocusedMatch(page, selector)) { await page.waitForTimeout(200); return path; }
        const off = await offsetToTarget(page, selector);
        if (!off) break;
        const horizontal = Math.abs(off.dx) > Math.abs(off.dy);
        const order = horizontal
            ? [off.dx > 0 ? 'menu_right' : 'menu_left', off.dy > 0 ? 'menu_down' : 'menu_up']
            : [off.dy > 0 ? 'menu_down' : 'menu_up', off.dx > 0 ? 'menu_right' : 'menu_left'];
        const dir = order[stalls % 2];
        const before = await focusKey(page);
        await pad(page, dir);
        await page.waitForTimeout(50);
        const after = await focusKey(page);
        path.push(`${dir}→${after.split('|')[0] || after.split('|')[2]}`);
        const next = await offsetToTarget(page, selector);
        const closer = next && Math.hypot(next.dx, next.dy) < Math.hypot(off.dx, off.dy) - 1;
        stalls = after !== before && closer ? 0 : stalls + 1;
    }
    if (await isFocusedMatch(page, selector)) { await page.waitForTimeout(200); return path; }
    const result = await rasterTo(page, selector, path, opts);
    await page.waitForTimeout(200);
    return result;
}

async function rasterTo(page, selector, path, { maxRows = 40, maxCols = 25 } = {}) {
    const hit = () => isFocusedMatch(page, selector);
    const step = async (dir) => {
        const before = await focusKey(page);
        await pad(page, dir);
        await page.waitForTimeout(50);
        const after = await focusKey(page);
        path.push(`${dir}→${after.split('|')[0] || after.split('|')[2] || after}`);
        return after !== before ? after : null;
    };
    if (await hit()) return path;
    for (let i = 0; i < maxRows; i += 1) {
        if (!(await step('menu_up'))) break;
        if (await hit()) return path;
    }
    for (let row = 0; row < maxRows; row += 1) {
        const seenInRow = new Set();
        for (let i = 0; i < maxCols; i += 1) {
            const moved = await step('menu_left');
            if (await hit()) return path;
            if (!moved || seenInRow.has(moved)) break;
            seenInRow.add(moved);
        }
        seenInRow.clear();
        for (let i = 0; i < maxCols; i += 1) {
            const moved = await step('menu_right');
            if (await hit()) return path;
            if (!moved || seenInRow.has(moved)) break;
            seenInRow.add(moved);
        }
        if (!(await step('menu_down'))) break;
        if (await hit()) return path;
    }
    throw new Error(`controller could not reach ${selector}; path: ${path.slice(-30).join(' | ')}`);
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

async function openSettingsByPad(page, tab = null) {
    await steerTo(page, '.open-settings-btn');
    await pad(page, 'menu_confirm');
    await expect(page.locator('#settings-popup')).toBeVisible({ timeout: 10_000 });
    if (tab) {
        await steerTo(page, `#settings-popup [data-settings-tab="${tab}"]`);
        await pad(page, 'menu_confirm');
        await expect(page.locator(`#settings-popup [data-settings-panel="${tab}"]`)).toBeVisible();
    }
}

// The main menu's Vault and Foundry buttons both open the Foundry hub (Stash
// and Fabricate tabs) while the hub is on, which is the default.
async function walkHub(page, opener, tab) {
    await bootToOperatorMenu(page);
    await steerTo(page, opener);
    await pad(page, 'menu_confirm');
    await expect(page.locator('#foundry-hub-modal')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(`#foundry-hub-tabs [data-tab="${tab}"]`)).toHaveAttribute('aria-selected', 'true');
    await page.waitForTimeout(400);
    const seen = await exploreInside(page, '#foundry-hub-modal');
    expect(seen.size, 'focus moves between hub controls').toBeGreaterThan(1);
    // Every visible, unlocked tab can be selected from the tab bar by pad.
    const tabs = await page.locator('#foundry-hub-tabs [data-tab]:visible:not([disabled])').evaluateAll((els) => els.map((el) => el.dataset.tab));
    for (const id of tabs) {
        await steerTo(page, `#foundry-hub-tabs [data-tab="${id}"]`);
        await pad(page, 'menu_confirm');
        await expect(page.locator(`#foundry-hub-tabs [data-tab="${id}"]`)).toHaveAttribute('aria-selected', 'true');
    }
    await page.screenshot({ path: `playwright-report/screenshots/s49-10-hub-${tab}.png` });
    await pad(page, 'menu_back');
    await expect(page.locator('#foundry-hub-modal')).toBeHidden({ timeout: 5_000 });
    expect(await isFocusedMatch(page, opener), `focus returns to ${opener}`).toBe(true);
}

test.describe('S49-10 controller journey', () => {
    test.describe.configure({ timeout: 300_000 });

    test('Vault (Foundry hub at Stash): reach, browse every tab, back out', async ({ page }) => {
        await walkHub(page, '#steam-vault-btn', 'stash');
    });

    test('Foundry (hub at Fabricate): reach, browse every tab, back out', async ({ page }) => {
        await walkHub(page, '#fabrication-btn', 'fabricate');
    });

    test('Content Guide: reach from Settings, read a transcript, scroll it, back out twice', async ({ page }) => {
        await bootToOperatorMenu(page);
        await openSettingsByPad(page, 'accessibility');
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
        await openSettingsByPad(page, 'audio');
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
        await page.locator('#armory-btn-embark').waitFor({ state: 'visible', timeout: 60_000 });
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
        // Pressing the D-pad must soon land somewhere usable, never leave the
        // player with no focus at all. Focus comes back once the close
        // animation and screen transition finish, so keep pressing for a bit.
        await expect.poll(async () => {
            await pad(page, 'menu_down');
            const f = await focused(page);
            return Boolean(f?.visible && f?.topmost);
        }, { timeout: 4_000, intervals: [250] }).toBe(true);
    });

    test('Armory: open a slot picker, browse it, back out to the slot', async ({ page }) => {
        await bootToOperatorMenu(page);
        await steerTo(page, '#start-game');
        await pad(page, 'menu_confirm');
        await page.locator('#armory-btn-embark').waitFor({ state: 'visible', timeout: 60_000 });
        await steerTo(page, '#armory-slot-mod1');
        await pad(page, 'menu_confirm');
        await expect(page.locator('#armory-picker-modal')).toBeVisible({ timeout: 10_000 });
        const seen = await exploreInside(page, '#armory-picker-modal', 4);
        expect(seen.size, 'focus moves between picker tiles').toBeGreaterThan(1);
        await page.screenshot({ path: 'playwright-report/screenshots/s49-10-armory-picker.png' });
        await pad(page, 'menu_back');
        await expect(page.locator('#armory-picker-modal')).toBeHidden({ timeout: 5_000 });
        await page.waitForTimeout(400);
        expect(await isFocusedMatch(page, '#armory-slot-mod1'), 'focus returns to the slot').toBe(true);
    });

    for (const [opener, modal] of [['#archive-btn', '#archive-modal'], ['#codex-btn', '#codex-modal'], ['#season-pass-btn', '#season-pass-modal']]) {
        test(`Operator menu ${opener}: reach, browse, back out to it`, async ({ page }) => {
            await bootToOperatorMenu(page);
            await steerTo(page, opener);
            await pad(page, 'menu_confirm');
            await expect(page.locator(modal)).toBeVisible({ timeout: 10_000 });
            await page.waitForTimeout(400);
            await exploreInside(page, modal, 4);
            await page.screenshot({ path: `playwright-report/screenshots/s49-10-${opener.slice(1)}.png` });
            await pad(page, 'menu_back');
            await expect(page.locator(modal)).toBeHidden({ timeout: 5_000 });
            await expect.poll(() => isFocusedMatch(page, opener), { timeout: 3_000 }).toBe(true);
        });
    }

    test('Title: Quit asks first, and Back cancels it', async ({ page }) => {
        await bootToTitleSplash(page);
        await steerTo(page, '#title-quit-btn');
        await pad(page, 'menu_confirm');
        await expect(page.locator('#quit-confirm-modal')).toBeVisible({ timeout: 5_000 });
        expect(await focusInside(page, '#quit-confirm-modal'), 'focus is in the quit prompt').toBe(true);
        await pad(page, 'menu_back');
        await expect(page.locator('#quit-confirm-modal')).toBeHidden({ timeout: 5_000 });
        await page.waitForTimeout(400);
        expect(await isFocusedMatch(page, '#title-quit-btn'), 'focus returns to QUIT').toBe(true);
    });

    test('In run: pause, settings, abort, results — all by controller', async ({ page }) => {
        await bootToOperatorMenu(page);
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
