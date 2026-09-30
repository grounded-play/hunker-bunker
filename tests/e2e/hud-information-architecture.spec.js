import { expect, test } from '@playwright/test';

test.describe('dock HUD information architecture', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            document.documentElement.dataset.hudLayout = 'dock';
        });
    });

    test('collapses objectives to one line and expands them in the tactical map', async ({ page }) => {
        await page.evaluate(() => {
            const tracker = document.getElementById('objective-tracker');
            tracker.innerHTML = `
                <div class="objective-tracker__item">
                    <div class="objective-tracker__header"><span class="objective-tracker__label">RECOVER BLACK BOX</span><span class="objective-tracker__progress">0/1</span></div>
                </div>
                <div class="objective-tracker__item">
                    <div class="objective-tracker__header"><span class="objective-tracker__label">RESTORE O₂</span><span class="objective-tracker__progress">ACTIVE</span></div>
                </div>`;
            tracker.classList.remove('hidden');
        });

        const drawer = page.locator('#objective-drawer');
        await expect(drawer).toBeVisible();
        await expect(page.locator('#objective-drawer-label')).toHaveText('RECOVER BLACK BOX');
        await expect(page.locator('#objective-drawer-count')).toHaveText('+1');
        await expect(page.locator('#objective-tracker')).toBeHidden();

        await page.locator('#objective-drawer-toggle').click();
        await expect(page.locator('#objective-tracker')).toBeVisible();

        await page.evaluate(() => {
            document.getElementById('objective-drawer-toggle').click();
            const map = document.getElementById('tactical-map-modal');
            map.classList.remove('hidden');
            map.setAttribute('aria-hidden', 'false');
        });
        await expect(drawer).toHaveClass(/objective-drawer--map/);
        await expect(page.locator('.tactical-map-sidebar > #objective-drawer')).toBeVisible();
        await expect(page.locator('#objective-tracker')).toBeVisible();
    });

    test('shows only the highest-priority live prompt', async ({ page }) => {
        await page.evaluate(() => {
            document.getElementById('console-hud-prompt').classList.remove('hidden');
            document.getElementById('foundry-hud-prompt').classList.remove('hidden');
            document.getElementById('loop-step-hud').classList.remove('hidden');
        });
        await expect(page.locator('html')).toHaveAttribute('data-prompt-lane-id', 'console-hud-prompt');
        await expect(page.locator('#foundry-hud-prompt')).toHaveAttribute('data-hud-suppressed', 'true');
        await expect(page.locator('#loop-step-hud')).toHaveAttribute('data-hud-suppressed', 'true');

        await page.evaluate(() => {
            document.getElementById('console-hud-prompt').classList.add('hidden');
            document.getElementById('foundry-hud-prompt').classList.add('hidden');
            document.getElementById('tutorial-prompt').classList.remove('hidden');
        });
        await expect(page.locator('html')).toHaveAttribute('data-prompt-lane-id', 'tutorial-prompt');
        await expect(page.locator('#loop-step-hud')).toHaveAttribute('data-hud-suppressed', 'true');

        await page.evaluate(() => document.getElementById('tutorial-prompt').classList.add('hidden'));
        await expect(page.locator('html')).toHaveAttribute('data-prompt-lane-id', 'loop-step-hud');
        await expect(page.locator('#loop-step-hud')).not.toHaveAttribute('data-hud-suppressed', 'true');
    });

    test('leaves the classic objective tracker and prompt visibility unchanged', async ({ page }) => {
        const classicState = await page.evaluate(() => {
            document.documentElement.dataset.hudLayout = 'classic';
            document.documentElement.classList.remove('phase-menu');
            document.documentElement.classList.add('phase-gameplay');
            document.getElementById('ui').classList.remove('hidden');
            const tracker = document.getElementById('objective-tracker');
            tracker.innerHTML = `
                <div class="objective-tracker__item">
                    <div class="objective-tracker__header"><span class="objective-tracker__label">CLASSIC OBJECTIVE</span><span class="objective-tracker__progress">ACTIVE</span></div>
                </div>`;
            tracker.classList.remove('hidden');
            document.getElementById('console-hud-prompt').classList.remove('hidden');
            document.getElementById('loop-step-hud').classList.remove('hidden');
            window.hudInformationArchitecture.refresh();
            return {
                trackerDisplay: getComputedStyle(tracker).display,
                toggleDisplay: getComputedStyle(document.getElementById('objective-drawer-toggle')).display,
                consoleSuppressed: document.getElementById('console-hud-prompt').dataset.hudSuppressed ?? null,
                loopSuppressed: document.getElementById('loop-step-hud').dataset.hudSuppressed ?? null
            };
        });

        expect(classicState).toEqual({
            trackerDisplay: 'flex',
            toggleDisplay: 'none',
            consoleSuppressed: null,
            loopSuppressed: null
        });
    });
});
