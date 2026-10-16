import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// Owner, 2026-10-08: talking at a camp opened two conversations with music
// videos behind them, and up to twelve actions shared one prompt. One
// conversation now (its choices continue in the same window), no video
// behind it, and at most three prompt actions with CAMP SERVICES for the rest.
test.describe.configure({ timeout: 300_000 });

test('a camp has one conversation and a short prompt', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForTimeout(3000);
    const visible = (id) => page.evaluate((id) => {
        const el = document.getElementById(id);
        return Boolean(el && !el.classList.contains('hidden') && !el.hidden);
    }, id);

    // Talk to Kaelen (first contact already past: straight to the leader).
    const started = await page.evaluate(() => {
        const g = window.game;
        const camp = g.getCampById('camp_meridian');
        return camp ? g.talkToLeader('camp', camp) : null;
    });
    expect(started).toBe(true);
    await page.waitForTimeout(800);
    expect(await visible('leader-conversation-modal')).toBe(true);
    // The standalone tree modal is gone; trees only draw in this window.
    expect(await page.locator('#npc-dialogue-modal').count()).toBe(0);
    expect(await visible('song-interstitial')).toBe(false);
    await page.screenshot({ path: 'playwright-report/screenshots/camp-conversation-staged.png' });

    // The staged lines, then the leader's choices in the same window.
    for (let i = 0; i < 12 && !(await visible('leader-conversation-choices')); i++) {
        await page.locator('#leader-conversation-continue').click();
        // Continue holds for CONTINUE_HOLD_MS (600) after each line appears.
        await page.waitForTimeout(700);
    }
    expect(await visible('leader-conversation-choices')).toBe(true);
    expect(await visible('leader-conversation-modal')).toBe(true);
    expect(await visible('npc-dialogue-modal')).toBe(false);
    const choices = await page.locator('#leader-conversation-choices .npc-choice-btn').count();
    expect(choices).toBeGreaterThan(1);
    await page.screenshot({ path: 'playwright-report/screenshots/camp-conversation-choices.png' });
    console.log('OVER', JSON.stringify(await page.evaluate(() => {
        const panel = document.querySelector('.leader-conversation-panel').getBoundingClientRect();
        const hits = [];
        for (const [x, y] of [[panel.left + panel.width * 0.4, panel.bottom - 50], [panel.right - 80, panel.top + 30]]) {
            const el = document.elementFromPoint(x, y);
            const owner = el?.closest('[id]');
            hits.push({ tag: el?.tagName, id: owner?.id, cls: String(el?.className).slice(0, 60), z: owner ? getComputedStyle(owner).zIndex : null });
        }
        const list = document.getElementById('leader-conversation-choices').getBoundingClientRect();
        return { hits, listBottom: Math.round(list.bottom), panelBottom: Math.round(panel.bottom) };
    })));

    await page.locator('#leader-conversation-choices .npc-choice-btn').first().click();
    await page.waitForTimeout(600);
    expect(await visible('npc-dialogue-modal')).toBe(false);
    expect(await visible('song-interstitial')).toBe(false);
    await page.screenshot({ path: 'playwright-report/screenshots/camp-conversation-after-choice.png' });

    await page.locator('#leader-conversation-leave').click();
    await page.waitForTimeout(300);
    expect(await visible('leader-conversation-modal')).toBe(false);
    expect(await page.evaluate(() => Boolean(window.npcDialogueTreeManager?.activeTree))).toBe(false);

    // The prompt at the camp, and the services menu.
    const prompt = await page.evaluate(() => {
        const g = window.game;
        const camp = g.getCampById('camp_meridian');
        const x = camp.pos.x, z = camp.pos.z;
        const all = g.getCampActionsAt(x, z);
        g._campActionCampId = null;
        const first = g.getSelectedCampAction(x, z);
        const services = first ? (() => {
            const shown = [];
            for (let i = 0; i < first.count; i++) { g._campActionIndex = i; shown.push(g.getSelectedCampAction(x, z)); }
            return shown.find((entry) => entry.action === 'services') ?? null;
        })() : null;
        if (services) {
            g.player.position.set(x, 0, z);
            g.interactWithAct2Camp(services);
        }
        return { all: all.length, count: first?.count ?? 0, services: services?.services?.length ?? 0 };
    });
    console.log('PROMPT', JSON.stringify(prompt));
    expect(prompt.count).toBeLessThanOrEqual(3);
    if (prompt.all > 3) {
        expect(prompt.services).toBe(prompt.all - 2);
        await page.waitForTimeout(400);
        expect(await visible('camp-services-modal')).toBe(true);
        await page.screenshot({ path: 'playwright-report/screenshots/camp-services.png' });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        expect(await visible('camp-services-modal')).toBe(false);
    }
});

test('first contact plays the title card once, then the conversation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForTimeout(3000);
    const visible = (id) => page.evaluate((id) => {
        const el = document.getElementById(id);
        return Boolean(el && !el.classList.contains('hidden') && !el.hidden);
    }, id);
    const talk = () => page.evaluate(() => {
        const g = window.game;
        const camp = g.getCampById('camp_tallow');
        return g.interactWithAct2Camp({ camp, action: 'talk', label: 'TALK' });
    });

    expect(await talk()).toBe(true);
    await page.waitForTimeout(500);
    expect(await visible('song-interstitial')).toBe(true);
    expect(await visible('leader-conversation-modal')).toBe(false);
    await page.screenshot({ path: 'playwright-report/screenshots/camp-first-contact-card.png' });
    await expect.poll(() => visible('leader-conversation-modal'), { timeout: 20000 }).toBe(true);
    expect(await visible('song-interstitial')).toBe(false);
    expect(await page.locator('#leader-conversation-name').textContent()).toMatch(/Martha/i);
    await page.locator('#leader-conversation-leave').click();
    await page.waitForTimeout(300);

    expect(await talk()).toBe(true);
    await page.waitForTimeout(800);
    expect(await visible('song-interstitial')).toBe(false);
    expect(await visible('leader-conversation-modal')).toBe(true);
});
