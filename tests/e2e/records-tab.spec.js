import { expect, test } from '@playwright/test';
import { bootToOperatorMenu } from './helpers.js';

// Archive → RECORDS (docs/planning/records-and-leaderboards-popup-plan-2026-10-05.md):
// SERVICE RECORD from the save, LEADERBOARDS from Steam (offline on the web
// build), reachable from the operator menu and laid out at the Deck stage.
test.describe('Archive → RECORDS', () => {
    test.beforeEach(async ({ page }) => {
        await bootToOperatorMenu(page);
    });

    test('the operator menu opens the service record, and it fits the stage', async ({ page }) => {
        await page.locator('#homebase-records-btn').click();
        await expect(page.locator('#archive-modal')).toBeVisible();
        await expect(page.locator('#archive-tab-records')).toHaveAttribute('aria-selected', 'true');
        await expect(page.locator('#archive-modal [data-archive-tab]')).toHaveCount(5);

        const service = page.locator('#records-service');
        await expect(service).toBeVisible();
        await expect(service.locator('.records-card')).toHaveCount(6);
        await expect(service.locator('[data-records-row="runs"]')).toHaveText(/^\d[\d,.\s]*$/);
        await expect(service.locator('[data-records-row="lore"]')).toHaveText(/^\d+ \/ \d+$/);

        const layout = await page.evaluate(() => {
            const panel = document.getElementById('archive-panel-records');
            const values = [...panel.querySelectorAll('.records-card__rows dd, .records-card__rows dt')];
            return {
                spills: panel.scrollWidth > panel.clientWidth + 1,
                clipped: values.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent),
                smallest: Math.min(...values.map((el) => parseFloat(getComputedStyle(el).fontSize)))
            };
        });
        expect(layout.spills).toBe(false);
        expect(layout.clipped).toEqual([]);
        expect(layout.smallest).toBeGreaterThanOrEqual(14);
    });

    test('leaderboards show five boards, Global only and offline on the web build', async ({ page }) => {
        // The web build reads Global boards from the backend; an unreachable
        // backend is the offline state.
        await page.route('**/steam/leaderboards/**', (route) => route.abort());
        await page.locator('#archive-btn').click();
        await page.locator('#archive-tab-records').click();
        await page.locator('[data-records-view="boards"]').click();
        await expect(page.locator('#records-boards')).toBeVisible();
        await expect(page.locator('#records-board-chips .records-chip')).toHaveCount(5);
        await expect(page.locator('#records-scope-chips .records-chip')).toHaveCount(1);
        await expect(page.locator('#records-board-status')).toHaveAttribute('data-state', 'offline');

        await page.locator('[data-records-board="fastest_extraction_ms"]').click();
        await expect(page.locator('[data-records-board="fastest_extraction_ms"]')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('[data-records-board="best_run_score"]')).toHaveAttribute('aria-pressed', 'false');
    });

    test('the web build lists the Global board from the backend', async ({ page }) => {
        await page.route('**/steam/leaderboards/best_run_score**', (route) => route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: { 'access-control-allow-origin': '*' },
            body: JSON.stringify({ ok: true, entries: [
                { steamId64: '1', persona: 'Operator Aegis', score: 1550, rank: 1 },
                { steamId64: '2', persona: 'Operator Striker', score: 1200, rank: 2 }
            ] })
        }));
        await page.locator('#archive-btn').click();
        await page.locator('#archive-tab-records').click();
        await page.locator('[data-records-view="boards"]').click();
        await expect(page.locator('#records-board-status')).toHaveAttribute('data-state', 'live');
        await expect(page.locator('#records-board-list .records-board-row')).toHaveCount(2);
        await expect(page.locator('#records-board-list .records-board-name').first()).toHaveText('Operator Aegis');
    });

    test('Escape closes the Archive and focus returns to the opener', async ({ page }) => {
        await page.locator('#homebase-records-btn').focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('#archive-modal')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('#archive-modal')).toBeHidden();
        await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('homebase-records-btn');
    });

    test('opened as a shortcut over another screen, the Archive is on top', async ({ page }) => {
        await page.evaluate(() => window.openArchiveModal({ tab: 'records', view: 'service', overlay: true }));
        await expect(page.locator('#archive-modal')).toHaveClass(/archive-modal--overlay/);
        const onTop = await page.evaluate(() => {
            const r = document.querySelector('#archive-modal .modal-content').getBoundingClientRect();
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return Boolean(hit?.closest('#archive-modal'));
        });
        expect(onTop).toBe(true);
        await page.keyboard.press('Escape');
        await expect(page.locator('#archive-modal')).not.toHaveClass(/archive-modal--overlay/);
    });
});
