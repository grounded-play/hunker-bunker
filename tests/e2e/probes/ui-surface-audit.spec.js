import { test } from '@playwright/test';
import fs from 'node:fs';
import { bootToTitleSplash, startRunAndSkipIntro, stubOfflineElectronAPI } from '../helpers.js';

// UI surface audit (docs/design/ui-surfaces-menu-map-and-controller-navigation.md).
// Walks every menu a player can reach at the Deck stage (1280x800), opens each
// tab, and records per surface: what spills off the stage, what is clipped by
// its own panel, truncated text, every focusable control with its size and
// font, and a screenshot. Writes docs/reports/ui-surface-audit/ (JSON + PNGs).
// Run with HB_PROBES=1 (needs the dev server). Read-only: it changes no state
// beyond opening and closing menus.
const OUT = process.env.HB_UI_AUDIT_OUT || 'docs/reports/ui-surface-audit';
const VIEW = { width: Number(process.env.HB_UI_AUDIT_W || 1280), height: Number(process.env.HB_UI_AUDIT_H || 800) };

const TAB_SELECTOR = [
    '[role="tab"]', '.terminal-tab-btn', '.settings-tab', '.settings-tab-btn', '.vault-tab', '.vault-tab-btn',
    '.foundry-tab', '.hub-tab', '.archive-tab', '.codex-tab', '.armory-tab', '[data-tab]'
].join(', ');

async function audit(page, name, rootSelector) {
    const result = await page.evaluate(({ rootSelector, tabSelector }) => {
        const root = document.querySelector(rootSelector);
        if (!root) return { missing: true };
        const W = innerWidth;
        const H = innerHeight;
        const visible = (el) => {
            const r = el.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) return false;
            for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
                const cs = getComputedStyle(n);
                if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
                if (n.classList?.contains('hidden') || n.getAttribute?.('aria-hidden') === 'true' && n !== root) return false;
            }
            return true;
        };
        const label = (el) => (el.id ? `#${el.id}` : '') || `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join('.')}`;
        const text = (el) => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
        // Any scrollable ancestor makes off-panel content reachable (cards
        // often clip their own text with overflow:hidden inside a scrolling
        // grid). Only a clipping ancestor with no scroller above it hides content.
        const clipAncestor = (el) => {
            let firstClip = null;
            for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
                const cs = getComputedStyle(n);
                if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX)) return { node: n, scroll: true };
                if (!firstClip && /(hidden|clip)/.test(cs.overflowY + cs.overflowX)) firstClip = { node: n, scroll: false };
            }
            return firstClip;
        };
        const offStage = [];
        const clipped = [];
        const truncated = [];
        const all = [...root.querySelectorAll('*')].filter(visible);
        for (const el of all) {
            const r = el.getBoundingClientRect();
            const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
            if (ownText || el.matches('button, input, select, [tabindex]')) {
                if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) {
                    const anc = clipAncestor(el);
                    if (!anc?.scroll) offStage.push([label(el), text(el), Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]);
                }
                const anc = clipAncestor(el);
                if (anc && !anc.scroll) {
                    const a = anc.node.getBoundingClientRect();
                    const over = Math.max(a.left - r.left, a.top - r.top, r.right - a.right, r.bottom - a.bottom);
                    if (over > 2) clipped.push([label(el), text(el), label(anc.node), Math.round(over)]);
                }
            }
            if (ownText && el.scrollWidth > el.clientWidth + 2) {
                const cs = getComputedStyle(el);
                if (/(hidden|clip)/.test(cs.overflowX) || cs.textOverflow === 'ellipsis') truncated.push([label(el), text(el), el.scrollWidth, el.clientWidth]);
            }
        }
        const focusables = [...root.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"]')]
            .filter((el) => visible(el) && !el.disabled)
            .map((el) => {
                const r = el.getBoundingClientRect();
                return { id: label(el), text: text(el), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), font: parseFloat(getComputedStyle(el).fontSize) };
            });
        const tabs = [...root.querySelectorAll(tabSelector)].filter(visible).map((el) => ({ id: label(el), text: text(el) }));
        const rr = root.getBoundingClientRect();
        return {
            rect: [Math.round(rr.left), Math.round(rr.top), Math.round(rr.width), Math.round(rr.height)],
            offStage, clipped, truncated, tabs, focusables,
            smallTargets: focusables.filter((f) => f.h < 32 || f.w < 32).map((f) => `${f.id} ${f.w}x${f.h}`),
            smallText: focusables.filter((f) => f.font < 14).map((f) => `${f.id} ${f.font}px`)
        };
    }, { rootSelector, tabSelector: TAB_SELECTOR });
    const file = `${OUT}/${name.replace(/[^a-z0-9-]+/gi, '_')}.png`;
    await page.screenshot({ path: file });
    return { name, root: rootSelector, screenshot: file, ...result };
}

async function visibleRoot(page, candidates) {
    return page.evaluate((ids) => ids.find((id) => {
        const el = document.getElementById(id);
        return el && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
    }) ?? null, candidates);
}

async function auditTabs(page, report, name, rootSelector) {
    const tabs = await page.$$(`${rootSelector} :is(${TAB_SELECTOR})`);
    for (const [i, tab] of tabs.entries()) {
        if (!(await tab.isVisible().catch(() => false))) continue;
        const label = ((await tab.textContent()) || `tab${i}`).replace(/\s+/g, ' ').trim().slice(0, 24) || `tab${i}`;
        // force: the terminal's scanline/flicker animation keeps tabs "unstable".
        await tab.click({ timeout: 2_000, force: true }).catch(() => {});
        await page.waitForTimeout(400);
        report.push(await audit(page, `${name}--tab-${label}`, rootSelector));
    }
}

// Escape first (the Back contract); if the surface is still open, use its own
// close control. Records which surfaces Escape did not close.
const escapeFailures = [];
async function closeTop(page, rootId = null) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    if (!rootId || !(await visibleRoot(page, [rootId]))) return;
    escapeFailures.push(rootId);
    await page.locator(`#${rootId} :is(.close-modal, [data-close], [aria-label*="lose" i], .modal-close, .close-btn)`).first()
        .click({ timeout: 2_000 }).catch(() => {});
    await page.waitForTimeout(500);
}

test.setTimeout(1_500_000);
test('UI surface audit', async ({ page }) => {
    fs.mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(VIEW);
    await stubOfflineElectronAPI(page);
    const report = [];
    const flush = () => fs.writeFileSync(`${OUT}/audit-${VIEW.width}x${VIEW.height}.json`,
        `${JSON.stringify({ escapeFailures, surfaces: report }, null, 1)}\n`);
    const { MENU_FOCUS_ROOT_IDS } = await import('../../../src/inputActions.js');

    await bootToTitleSplash(page);
    report.push(await audit(page, '01-title', '#splash'));
    // MULTIPLAYER leaves the title for the Tactical Net console, audited below.
    for (const id of ['title-settings-btn', 'title-achievements-btn', 'title-about-btn']) {
        await page.locator(`#${id}`).click({ timeout: 3_000 }).catch(() => {});
        await page.waitForTimeout(900);
        const open = await visibleRoot(page, MENU_FOCUS_ROOT_IDS.filter((r) => !['splash', 'menu', 'gameplay'].includes(r)));
        if (open) {
            report.push(await audit(page, `02-title-${id}--${open}`, `#${open}`));
            await auditTabs(page, report, `02-title-${id}--${open}`, `#${open}`);
            await closeTop(page, open);
        }
        flush();
    }

    if (!(await page.locator('#title-newrun-btn').isVisible())) await bootToTitleSplash(page);
    await page.locator('#title-newrun-btn').click({ timeout: 5_000 });
    await page.locator('#start-game').waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForTimeout(800);
    report.push(await audit(page, '03-operator-menu', '#menu'));
    const menuButtons = await page.$$eval('#menu button', (buttons) => buttons
        .filter((b) => b.id && b.offsetParent && !/^(start-game)$|back|quit|multiplayer|logout/i.test(b.id)).map((b) => b.id));
    console.log(`operator menu buttons: ${menuButtons.join(', ')}`);
    for (const id of menuButtons) {
        const before = await visibleRoot(page, MENU_FOCUS_ROOT_IDS.filter((r) => !['splash', 'menu', 'gameplay', 'armory-screen'].includes(r)));
        if (before) await closeTop(page, before);
        await page.locator(`#${id}`).click({ timeout: 2_000 }).catch(() => {});
        await page.waitForTimeout(900);
        const open = await visibleRoot(page, MENU_FOCUS_ROOT_IDS.filter((r) => !['splash', 'menu', 'gameplay'].includes(r)));
        if (!open) continue;
        report.push(await audit(page, `04-menu-${id}--${open}`, `#${open}`));
        await auditTabs(page, report, `04-menu-${id}--${open}`, `#${open}`);
        await closeTop(page, open);
        flush();
    }

    if (!(await page.locator('#start-game').isVisible())) {
        await closeTop(page);
        if (!(await page.locator('#start-game').isVisible())) {
            await page.locator('#title-newrun-btn').click({ timeout: 5_000 }).catch(() => {});
            await page.locator('#start-game').waitFor({ state: 'visible', timeout: 20_000 });
        }
    }
    await page.locator('#start-game').click({ timeout: 5_000 });
    await page.locator('#armory-screen').waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForTimeout(1500);
    report.push(await audit(page, '05-armory', '#armory-screen'));
    await auditTabs(page, report, '05-armory', '#armory-screen');
    await page.locator('#armory-btn-embark').click({ timeout: 5_000 });
    await page.locator('#multiplayer-modal').waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1200);
    if (await visibleRoot(page, ['multiplayer-modal'])) {
        report.push(await audit(page, '06-deployment-console', '#multiplayer-modal'));
        await auditTabs(page, report, '06-deployment-console', '#multiplayer-modal');
    }

    await startRunAndSkipIntro(page);
    await page.waitForTimeout(1500);
    report.push(await audit(page, '07-hud', '#ui'));
    await page.evaluate(() => {
        const g = window.game;
        if (!g?.interactWithConsole?.()) g?.openConsoleModal?.(g.activeInteractiveConsole ?? g.getActiveShip?.());
    });
    await page.waitForTimeout(1200);
    if (await visibleRoot(page, ['console-terminal-modal'])) {
        report.push(await audit(page, '08-terminal', '#console-terminal-modal'));
        await auditTabs(page, report, '08-terminal', '#console-terminal-modal');
        await closeTop(page, 'console-terminal-modal');
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(900);
    const paused = await visibleRoot(page, MENU_FOCUS_ROOT_IDS.filter((r) => !['splash', 'menu', 'gameplay'].includes(r)));
    if (paused) {
        report.push(await audit(page, `09-pause--${paused}`, `#${paused}`));
        await auditTabs(page, report, `09-pause--${paused}`, `#${paused}`);
    }

    flush();
    console.log(`escape did not close: ${[...new Set(escapeFailures)].join(', ') || 'none'}`);
    for (const s of report) {
        console.log(`${s.name.padEnd(64)} focus=${s.focusables?.length ?? 0} off=${s.offStage?.length ?? 0} clip=${s.clipped?.length ?? 0} trunc=${s.truncated?.length ?? 0} small=${s.smallTargets?.length ?? 0} tabs=${s.tabs?.length ?? 0}`);
    }
});
