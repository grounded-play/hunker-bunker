import { test, expect } from '@playwright/test';
import { bootToTitleSplash } from './helpers.js';

async function seedReturningEngineer(page) {
    await page.addInitScript(() => {
        localStorage.setItem('hb_profile_v1', JSON.stringify({
            callsign: 'GHOST',
            profileId: 'HB-TEST',
            createdAt: Date.now()
        }));
        localStorage.setItem('hb_active_class_v1', 'ENGINEER');
        localStorage.setItem('hb_run_stats_v1', JSON.stringify({ runCount: 2 }));
        localStorage.setItem('hb_best_score_ENGINEER', '4321');
    });
}

test('returning profile appears on the title and Switch Class opens hero select', async ({ page }) => {
    await seedReturningEngineer(page);
    await bootToTitleSplash(page);

    await expect(page.locator('#title-profile-hud')).toBeVisible();
    await expect(page.locator('#title-profile-callsign')).toHaveText('GHOST');
    await expect(page.locator('#title-profile-class')).toHaveText('ENGINEER');
    await expect(page.locator('#title-profile-best')).toContainText('4321');

    await page.locator('#title-switch-class-btn').click();
    await expect(page.locator('#start-game')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.char-card.selected')).toHaveAttribute('data-type', 'ENGINEER');
});

test('Continue deploys the saved class without opening hero select', async ({ page }) => {
    await seedReturningEngineer(page);
    await bootToTitleSplash(page);
    await page.locator('#title-continue-btn').click();

    await expect(page.locator('#menu')).toBeHidden();
    await page.waitForFunction(
        () => window.game?.inputEnabled === true && window.game?.playerType === 'ENGINEER',
        { timeout: 25_000 }
    );
    await expect(page.locator('#ui')).toBeVisible();
});
