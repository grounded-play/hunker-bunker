import { test, expect } from '@playwright/test';
import { bootToOperatorMenu } from './helpers.js';

async function finishActiveIntro(page) {
    const skipBtn = page.locator('#global-skip-intro-btn');
    const dialogueSkipChoice = page.locator('#mothership-choice-skip');
    const deadline = Date.now() + 45_000;

    while (Date.now() < deadline) {
        const ready = await page.evaluate(() => {
            window.skipAllIntro = true;
            return window.game?.inputEnabled === true
                && !document.body.classList.contains('mission-intro-active');
        }).catch(() => false);
        if (ready) return;

        if (await skipBtn.isVisible().catch(() => false)) {
            await skipBtn.click({ timeout: 1_000 }).catch(() => {});
        }
        if (await dialogueSkipChoice.isVisible().catch(() => false)) {
            await dialogueSkipChoice.click({ timeout: 1_000 }).catch(() => {});
        }
        await page.waitForTimeout(400);
    }

    throw new Error('Intro did not finish within 45 seconds');
}

test('new-run intro keeps gameplay black, paused, and invulnerable until the final doors open', async ({ page }) => {
    await bootToOperatorMenu(page);

    // Debug UI must be explicitly enabled; a retail/new-game boot starts clean.
    await expect(page.locator('body')).not.toHaveClass(/show-debug/);

    const rosterConfirm = page.locator('#roster-confirm-btn');
    if (await rosterConfirm.isVisible().catch(() => false)) {
        await rosterConfirm.click();
        await page.waitForTimeout(200);
    }
    await page.locator('#start-game').click();

    await page.locator('#transition-overlay.opening-h.active').waitFor({
        state: 'visible',
        timeout: 30_000
    });
    expect(await page.locator('#transition-overlay').evaluate((overlay) => (
        getComputedStyle(overlay, '::before').opacity
    ))).toBe('1');

    await page.waitForFunction(() => (
        window.__hbAppPhase === 'gameplay'
        && window.game?.loadingPaused === true
        && window.game?.cinematicLock === true
        && document.body.classList.contains('mission-intro-active')
    ), { timeout: 30_000 });

    const before = await page.evaluate(() => ({
        health: window.game.playerHealth,
        oxygen: window.game.playerOxygen,
        dead: window.game.isPlayerDead,
        canvasVisibility: getComputedStyle(window.game.renderer.domElement).visibility
    }));
    expect(before.dead).toBe(false);
    expect(before.canvasVisibility).toBe('hidden');
    await expect(page.locator('#ui')).toBeHidden();
    await expect(page.locator('#hole-hud-prompt')).toBeHidden();
    await expect(page.locator('#console-hud-prompt')).toBeHidden();

    // If the simulation leaks through the intro barrier, oxygen or health can
    // tick down here and enemies can kill the player before the video ends.
    await page.waitForTimeout(1_500);
    const during = await page.evaluate(() => ({
        health: window.game.playerHealth,
        oxygen: window.game.playerOxygen,
        dead: window.game.isPlayerDead,
        paused: window.game.loadingPaused,
        locked: window.game.cinematicLock,
        canvasVisibility: getComputedStyle(window.game.renderer.domElement).visibility
    }));
    expect(during).toMatchObject({
        health: before.health,
        oxygen: before.oxygen,
        dead: false,
        paused: true,
        locked: true,
        canvasVisibility: 'hidden'
    });

    await finishActiveIntro(page);

    await expect(page.locator('body')).not.toHaveClass(/mission-intro-active/);
    await expect(page.locator('#hud-run-seed')).toBeVisible();
    const ready = await page.evaluate(() => ({
        dead: window.game.isPlayerDead,
        paused: window.game.loadingPaused,
        inputEnabled: window.game.inputEnabled,
        canvasVisibility: getComputedStyle(window.game.renderer.domElement).visibility
    }));
    expect(ready).toEqual({
        dead: false,
        paused: false,
        inputEnabled: true,
        canvasVisibility: 'visible'
    });

    // The handoff must land in the authored crash room with the selected
    // wreck and its terminal present; merely surviving the cinematic is not
    // enough if the starting landmark failed to mount.
    const crashRoom = await page.evaluate(() => {
        const game = window.game;
        const ship = game.crashedShips?.find((candidate) => candidate.type === game.playerType);
        return {
            spawn: game.getSpawnTile(),
            player: { x: game.player.position.x, z: game.player.position.z },
            tile: game.getTileType(Math.round(game.player.position.x), Math.round(game.player.position.z)),
            shipType: ship?.type ?? null,
            shipVisible: ship?.isVisible ?? false,
            shipSpriteVisible: ship?.threeObjects?.[1]?.visible ?? false,
            consoleSpriteVisible: ship?.threeObjects?.[3]?.visible ?? false,
            shipTextureLoaded: Boolean(ship?.material?.map),
            consoleTextureLoaded: Boolean(ship?.threeObjects?.[3]?.material?.map)
        };
    });
    expect(crashRoom).toMatchObject({
        player: { x: crashRoom.spawn.x, z: crashRoom.spawn.y },
        tile: '.',
        shipVisible: true,
        shipSpriteVisible: true,
        consoleSpriteVisible: true,
        shipTextureLoaded: true,
        consoleTextureLoaded: true
    });
    expect(['SCOUT', 'TANK', 'ENGINEER']).toContain(crashRoom.shipType);

    await page.waitForTimeout(5_000);
    expect(await page.evaluate(() => window.game.isPlayerDead)).toBe(false);
});
