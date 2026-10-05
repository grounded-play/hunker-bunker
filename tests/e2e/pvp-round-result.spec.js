import { expect, test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro, stubOfflineElectronAPI } from './helpers.js';

// Session logs 2026-10-05 21:21-21:25 (PvP, Deck host + Windows guest): the
// relay ended the duel with pvpRoundCompleted, the loser reached Game Over
// through their own death, and the winner got nothing — no result, no way to
// vote for the rematch. The client turned the relay message into a
// `pvp-round-completed` window event that nothing listened to.
test('the PvP winner gets a victory screen from the relay round result', async ({ page }) => {
    test.setTimeout(400_000);
    await stubOfflineElectronAPI(page);
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);

    await page.evaluate(() => {
        const game = window.game;
        game.isMultiplayer = true;
        game.multiplayerMode = 'pvp';
        game.multiplayerLocalPlayerId = 'local-player';
        game.handlePvpRoundCompleted({ winnerId: 'local-player', loserId: 'rival', roundId: 'round-1', reason: 'combat' });
    });

    const modal = page.locator('#game-over-modal');
    await expect(modal).toBeVisible({ timeout: 20_000 });
    await expect(modal).toHaveClass(/game-over-modal--victory/);
    await expect(page.locator('.game-over-title')).toHaveText('RIVAL ELIMINATED');
    await expect(page.locator('#game-over-try-again')).toBeEnabled();
});
