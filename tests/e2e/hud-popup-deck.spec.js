import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// Playthrough 2026-10-07: "the comment boxes that pop up, the second one is
// having its lower part cropped". At Deck size, with several popups up, every
// card the docked deck shows must be whole; the rest wait their turn.
test.describe.configure({ timeout: 300_000 });

test('popups at Deck size are shown whole or not at all', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('hunker_commentary_enabled', 'true'));
    await page.setViewportSize({ width: 1280, height: 800 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('black-box-marker-active'));
        window.dispatchEvent(new CustomEvent('special-room-discovered', { detail: { template: 'armory', label: 'ARMORY' } }));
    });
    await page.waitForTimeout(1500);
    const deck = await page.evaluate(() => {
        const stack = document.querySelector('.hud-notification-stack');
        const top = stack.getBoundingClientRect().top;
        const cap = parseFloat(getComputedStyle(stack).maxHeight);
        const cards = [...stack.querySelectorAll('.hud-stack-card:not(.hidden)')].map((card) => {
            const r = card.getBoundingClientRect();
            return { shown: getComputedStyle(card).display !== 'none', bottom: r.bottom, clipped: card.scrollHeight > card.clientHeight + 2 };
        });
        return { layout: document.documentElement.dataset.hudLayout, limit: top + cap, cards };
    });
    expect(deck.layout).toBe('dock');
    const shown = deck.cards.filter((card) => card.shown);
    expect(deck.cards.length).toBeGreaterThanOrEqual(2);
    expect(shown.length).toBeGreaterThanOrEqual(1);
    for (const card of shown) expect(card.clipped).toBe(false);
    // Past the first card, nothing shown may run past the cap.
    for (const card of shown.slice(1)) expect(card.bottom).toBeLessThanOrEqual(deck.limit + 1);
    await page.screenshot({ path: 'playwright-report/screenshots/hud-popup-deck.png' });
});
