import { expect, test } from '@playwright/test';
import { bootToTitleSplash } from './helpers.js';

test.describe('player settings audit', () => {
    test('restores working accessibility settings and persists live toggles', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('hb_ui_scale', '130');
            localStorage.setItem('hb_text_floor', '22');
            localStorage.setItem('hunker_nightvision_enabled', 'false');
            localStorage.setItem('hunker_commentary_enabled', 'false');
        });
        await bootToTitleSplash(page);
        await page.locator('#title-settings-btn').click();

        await expect(page.locator('#setting-ui-scale')).toHaveValue('130');
        await expect(page.locator('#setting-text-floor')).toHaveValue('22');
        await expect.poll(() => page.evaluate(() => ({
            uiScale: window.state.settings.uiScale,
            textFloor: window.state.settings.textFloor,
            cssFloor: getComputedStyle(document.documentElement).getPropertyValue('--hb-text-floor').trim()
        }))).toEqual({ uiScale: 130, textFloor: 22, cssFloor: '22px' });

        await page.evaluate(() => {
            for (const id of ['main-nightvision-toggle', 'main-commentary-toggle']) {
                const toggle = document.getElementById(id);
                toggle.checked = true;
                toggle.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        await expect.poll(() => page.evaluate(() => ({
            nightVision: window.state.settings.nightVision,
            commentary: window.state.settings.commentary,
            storedNightVision: localStorage.getItem('hunker_nightvision_enabled'),
            storedCommentary: localStorage.getItem('hunker_commentary_enabled')
        }))).toEqual({
            nightVision: true,
            commentary: true,
            storedNightVision: 'true',
            storedCommentary: 'true'
        });
    });

    test('does not render inert or QA-only rows and reports truthful web cloud state', async ({ page }) => {
        await bootToTitleSplash(page);
        await page.locator('#title-settings-btn').click();

        for (const selector of [
            '#setting-resolution',
            '#setting-shake-toggle',
            '#setting-difficulty-val',
            '#open-mature-audit-btn'
        ]) {
            await expect(page.locator(selector)).toHaveCount(0);
        }
        await expect(page.locator('#debug-overlay-setting-row')).toBeVisible();
        await expect(page.locator('#main-debug-toggle')).toBeEnabled();
        await expect(page.locator('#setting-steam-cloud-status')).toHaveText('NOT AVAILABLE (WEB BUILD)');
    });
});
