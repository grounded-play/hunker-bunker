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

test.describe('on the browser build', () => {
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
});

// docs/planning/season-server-progress-plan-2026-10-06.md: on Steam builds the
// backend holds the Dossier; the local save is only a display cache.
test.describe('on a Steam build', () => {
    test('the Dossier shows the server ledger and its delivered rank items', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.clock.install({ time: new Date('2026-10-06T12:00:00Z') });
        await page.clock.resume();
        await page.addInitScript((save) => {
            localStorage.setItem('hb_season_deep_crust_beta_1_v1', JSON.stringify({ ...save, xp: 0, directives: {} }));
            localStorage.setItem('hb_season_server_synced', '1');
            const serverState = { ...save, xp: 4600, receipts: {
                'rank:1:free': { id: 'deep-crust-beta-1:rank:1:free', key: 'rank:1:free', tier: 1, track: 'free', status: 'confirmed',
                    reward: { kind: 'item', itemdefid: 4120, qty: 1, label: 'Sub-Zero Pioneer Patch' } }
            } };
            window.__seasonCalls = [];
            window.electronAPI = new Proxy({}, {
                get(_target, prop) {
                    if (prop === 'getSeasonState') return async () => ({ ok: true, state: structuredClone(serverState), bankable: [], imported: true });
                    if (prop === 'seasonAction') return async (verb, body) => { window.__seasonCalls.push([verb, body]); return { ok: true, accepted: true, state: structuredClone(serverState), bankable: [] }; };
                    if (prop === 'getSteamIdentity') return async () => ({ active: true, steamId64: '76561198000000099', persona: 'Tester' });
                    if (typeof prop === 'string' && prop.startsWith('on')) return () => {};
                    if (prop === 'setStat' || prop === 'setSteamInputPhase') return () => {};
                    return async () => ({ ok: false, reason: 'stubbed' });
                }
            });
        }, SAVE);
        await bootToOperatorMenu(page);
        await page.locator('#season-pass-btn').click();
        const summary = page.locator('#season-pass-progress-summary');
        await expect(summary).toContainText('RANK 3 / 30');
        await expect(summary).toContainText('4,600 XP');
        await expect(summary).toContainText('STEAM SYNC');
        await expect(page.locator('#season-pass-modal [data-tier="1"] .season-pass-slot--free')).toHaveClass(/season-pass-slot--claimed/);
    });
});
