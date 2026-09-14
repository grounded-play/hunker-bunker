import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

test('deployment, Foundry cycles, floor recovery and death/restart retain a playable world', async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);
        expect(await page.evaluate(() => window.isGameplayReady())).toBe(true);
        await page.screenshot({ path: testInfo.outputPath('deployed.png') });

        // Fixture unlocks/repositions the Foundry near the live spawn instead
        // of claiming to complete the O2/boss campaign. All portal rendering,
        // movement, interaction, death and retry use the real runtime.
        await page.evaluate(() => {
            const game = window.game;
            game.setGodMode(true);
            game.foundry.build(Math.round(game.player.position.x) + 3, Math.round(game.player.position.z));
            const site = game.foundry.getPosition();
            game.foundry.revealInstant(site.x, site.z);
        });
        const outside = await page.evaluate(() => window.game.player.position.toArray());
        const assertFloor = async () => {
            expect(await page.evaluate(() => {
                const game = window.game;
                const group = game.pocketGroups.get(game._pocketCacheKey);
                return {
                    pocket: game.isInPocket,
                    y: game.player.position.y,
                    mounted: group?.parent === game.scene && group.visible,
                    floor: group?.children.some((child) => child.userData.isPortalFloor && child.visible),
                    surface: game.chunkGroups.visible
                };
            })).toEqual({ pocket: true, y: -6, mounted: true, floor: true, surface: false });
        };
        for (let cycle = 0; cycle < 20; cycle++) {
            expect(await page.evaluate(() => window.game.enterFoundryInterior())).toBe(true);
            await assertFloor();
            if (cycle === 0) {
                await page.screenshot({ path: testInfo.outputPath('foundry-interior.png') });
                await page.keyboard.down('KeyS');
                await page.waitForTimeout(400);
                await page.keyboard.up('KeyS');
                expect(await page.evaluate(() => window.game.player.position.z !== window.game._pocketHoleZ)).toBe(true);
            }
            // Exercise the actual south-airlock interaction, not a plane pop.
            expect(await page.evaluate(() => {
                const game = window.game;
                game.player.position.set(game._pocketHoleX, -6, game._pocketHoleZ + 4);
                return game.getPriorityInteractionCandidates().find(({ id }) => id === 'foundry-interior-exit')?.interact();
            })).toBe(true);
            expect(await page.evaluate(() => window.game.player.position.toArray())).toEqual(outside);
            expect(await page.evaluate(() => window.game.chunkGroups.visible && !window.game.isInPocket)).toBe(true);
        }

        await page.evaluate(() => {
            const game = window.game;
            game.enterFoundryInterior();
            game.player.position.y = -30;
        });
        await expect.poll(() => page.evaluate(() => window.game.player.position.y)).toBe(-6);
        await assertFloor();
        await page.evaluate(() => {
            const game = window.game;
            game.pocketGroups.get(game._pocketCacheKey).children.find((child) => child.userData.isPortalFloor).visible = false;
        });
        await expect.poll(() => page.evaluate(() => window.game.isInPocket)).toBe(false);
        expect(await page.evaluate(() => window.game.chunkGroups.visible)).toBe(true);

        await page.evaluate(() => {
            const game = window.game;
            game.enterFoundryInterior();
            game.setGodMode(false);
            game.handleDeath('foundry-qa');
        });
        await expect(page.locator('#game-over-try-again')).toBeVisible({ timeout: 30_000 });
        await page.locator('#game-over-try-again').click();
        await page.waitForFunction(() => window.isGameplayReady(), null, { timeout: 60_000 });
        expect(await page.evaluate(() => ({
            dead: window.game.isPlayerDead,
            pocket: window.game.isInPocket,
            surface: window.game.chunkGroups.visible,
            planeDepth: window.game.planeState.stack.length,
            y: window.game.player.position.y
        }))).toEqual({ dead: false, pocket: false, surface: true, planeDepth: 1, y: 0 });
        await page.screenshot({ path: testInfo.outputPath('after-retry.png') });
        expect(errors).toEqual([]);
    } finally {
        const capture = await page.evaluate(() => ({
            phase: window.__hbAppPhase,
            ready: window.isGameplayReady?.(),
            paused: window.game?.loadingPaused,
            input: window.game?.inputEnabled,
            entries: window.hbLogger?.sessionLogs.filter((entry) => ['STARTUP', 'STREAM', 'PORTAL'].includes(entry.category)),
            errors: window.hbLogger?.sessionLogs.filter((entry) => entry.level === 'error')
        })).catch(() => ({ unavailable: true }));
        await testInfo.attach('deployment-foundry-diagnostics', { body: JSON.stringify(capture, null, 2), contentType: 'application/json' });
    }
});
