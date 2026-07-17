import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// Phase 13: "Game-over leaderboard states" (docs/steam-launch-readiness-master-plan.md).
// renderGameOverLeaderboard (main.js) already implements all three states —
// retrieving -> live/mock/offline, plus an "exact rank if available" fetch
// (AroundUser) when the player isn't in the top 10 — this was flagged as a
// possibly-open item in docs/sprint-19-wave5-steam-connection-lane-split.md,
// but turned out to already be implemented; this test covers the state
// actually reachable without window.electronAPI (a bare browser tab, same
// as every other spec here): offline.

test.describe('Game-over leaderboard', () => {
    test('shows the offline state (no window.electronAPI) with the score banked-locally message', async ({ page }) => {
        const consoleErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        page.on('pageerror', (err) => consoleErrors.push(err.message));

        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        await page.evaluate(() => window.game.handleDeath('debug-test'));

        await expect(page.locator('#game-over-modal')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('#go-leaderboard-status')).toHaveClass(/go-leaderboard-status--offline/, { timeout: 10_000 });
        await expect(page.locator('#go-leaderboard-status')).toHaveText(/OFFLINE/i);

        expect(consoleErrors, `unexpected console errors: ${consoleErrors.join('\n')}`).toEqual([]);

        await page.screenshot({ path: 'playwright-report/screenshots/game-over-leaderboard-offline-1280x800.png' });
    });
});
