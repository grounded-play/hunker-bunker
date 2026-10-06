import { expect, test } from '@playwright/test';
import { bootToOperatorMenu } from './helpers.js';

// Session 2026-10-06 (Deck): at Rank 12 in week 4 the Dossier still opened on
// rank 1 and the Directives on week 1, which read as "stuck at the first
// level". Progress was saved; the lists just started at the top.
const SAVE = {
    seasonId: 'deep-crust-beta-1',
    version: 1,
    xp: 19300,
    events: [],
    runs: {},
    activeRunId: null,
    directives: {
        'week:1:objectives': 8, 'week:1:depth': 2, 'week:1:activity': 1,
        'week:2:objectives': 8, 'week:2:depth': 2, 'week:2:activity': 1,
        'week:3:objectives': 5
    },
    receipts: {},
    onboarding: { objective: true },
    pinnedTarget: null,
    fragments: { common: 3, rareWeeks: [1, 2] }
};

test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    // Week 4 of the season (it starts 2026-09-11).
    await page.clock.install({ time: new Date('2026-10-06T12:00:00Z') });
    await page.clock.resume();
    await page.addInitScript((save) => {
        localStorage.setItem('hb_season_deep_crust_beta_1_v1', JSON.stringify(save));
    }, SAVE);
    await bootToOperatorMenu(page);
    await page.locator('#season-pass-btn').click();
    await expect(page.locator('#season-pass-modal')).toBeVisible();
});

test('the Dossier opens on the current rank', async ({ page }) => {
    await expect(page.locator('#season-pass-modal [data-tier="12"]')).toBeInViewport();
    await expect(page.locator('#season-pass-modal [data-tier="1"]')).not.toBeInViewport();
});

test('Directives open on the first week with work left, and count what is done', async ({ page }) => {
    await page.locator('.season-pass-tab-btn', { hasText: 'Directives' }).click();
    await expect(page.locator('#season-pass-modal [data-week="3"]')).toBeInViewport();
    await expect(page.locator('#season-pass-modal .season-tab-telemetry-bar')).toContainText('6 / 12');
});
