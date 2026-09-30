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

    test('queues alerts and bounds notifications below the drawer', async ({ page }) => {
        await page.evaluate(() => {
            for (const id of ['boss-status-panel', 'hazard-status-panel', 'queens-ledger-hud']) {
                document.getElementById(id).classList.remove('hidden');
            }
            const tracker = document.getElementById('objective-tracker');
            tracker.innerHTML = '<div class="objective-tracker__item"><span class="objective-tracker__label">PRIMARY</span><span class="objective-tracker__progress">ACTIVE</span></div>';
            tracker.classList.remove('hidden');
            document.getElementById('radio-transmission-prompt').classList.remove('hidden');
        });

        await expect(page.locator('html')).toHaveAttribute('data-alert-lane-id', 'boss-status-panel');
        await expect(page.locator('#hazard-status-panel')).toHaveAttribute('data-hud-alert-suppressed', 'true');
        await expect(page.locator('#queens-ledger-hud')).toHaveAttribute('data-hud-alert-suppressed', 'true');

        await page.evaluate(() => document.getElementById('boss-status-panel').classList.add('hidden'));
        await expect(page.locator('html')).toHaveAttribute('data-alert-lane-id', 'hazard-status-panel');
        await expect(page.locator('#hazard-status-panel')).not.toHaveAttribute('data-hud-alert-suppressed', 'true');

        const rail = page.locator('.hud-right-rail');
        await expect(rail.locator(':scope > #objective-drawer')).toBeVisible();
        await expect(rail.locator(':scope > .hud-notification-stack')).toBeVisible();
        const notificationHeight = await rail.locator(':scope > .hud-notification-stack').evaluate((element) => element.getBoundingClientRect().height);
        expect(notificationHeight).toBeLessThanOrEqual(136.5); // 170 u at the Deck/CI 0.8 u floor
    });

    test('resolves gameplay state, collapses objectives in combat, and scopes feedback', async ({ page }) => {
        await page.evaluate(() => {
            const tracker = document.getElementById('objective-tracker');
            tracker.innerHTML = '<div class="objective-tracker__item"><span class="objective-tracker__label">SURVIVE</span><span class="objective-tracker__progress">ACTIVE</span></div>';
            tracker.classList.remove('hidden');
            document.getElementById('objective-drawer-toggle').click();
        });
        await expect(page.locator('#objective-drawer')).toHaveAttribute('data-expanded', 'true');

        await page.evaluate(() => window.dispatchEvent(new CustomEvent('combat-state-changed', {
            detail: { active: true, source: 'enemy-targeted-player', quietWindowSeconds: 4 }
        })));
        await expect(page.locator('#objective-drawer')).toHaveAttribute('data-expanded', 'false');
        await expect(page.locator('html')).toHaveAttribute('data-hud-gameplay-state', 'engaged');

        await page.evaluate(() => window.dispatchEvent(new CustomEvent('weapon-clip-updated', {
            detail: { reloading: true, clip: 1, maxClip: 6 }
        })));
        await expect(page.locator('html')).toHaveAttribute('data-hud-gameplay-state', 'reloading');
        await page.evaluate(() => window.dispatchEvent(new CustomEvent('weapon-clip-updated', {
            detail: { reloading: false, clip: 6, maxClip: 6 }
        })));
        await expect(page.locator('#weapon-status-panel')).toHaveAttribute('data-hud-feedback', 'reload-complete');

        await page.evaluate(() => window.dispatchEvent(new CustomEvent('player-health-changed', {
            detail: { hp: 1, maxHp: 4 }
        })));
        await expect(page.locator('html')).toHaveAttribute('data-hud-gameplay-state', 'critical');

        await page.evaluate(() => window.dispatchEvent(new CustomEvent('pickup-collected')));
        await expect(page.locator('#pickup-counter-panel')).toHaveAttribute('data-hud-feedback', 'pickup');
        await page.waitForTimeout(650);
        await expect(page.locator('#pickup-counter-panel')).not.toHaveAttribute('data-hud-feedback', 'pickup');

        await page.evaluate(() => window.dispatchEvent(new CustomEvent('player-death')));
        await expect(page.locator('html')).toHaveAttribute('data-hud-gameplay-state', 'dead');
    });
});
