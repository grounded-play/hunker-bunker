import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// Snail-diplomacy encounter (docs/superpowers/specs/2026-07-26-snail-
// diplomacy-encounter-design.md). Vitest covers the pure state machine
// (src/snailEncounter.test.js) and the Act2/dialogue plumbing in isolation;
// this spec is the one thing that needs a real browser: the actual
// #snail-encounter-modal DOM updating, hasBlockingGameplayOverlay actually
// freezing the world, and a befriended sprite surviving as a real
// companion in the live scene.

test.describe('Snail diplomacy encounter', () => {
    test('opening the encounter pauses the world and renders the panel', async ({ page }) => {
        const consoleErrors = [];
        page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
        page.on('pageerror', (err) => consoleErrors.push(err.message));

        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        const setup = await page.evaluate(() => {
            const game = window.game;
            game.act2.begin();
            const fakeSprite = {
                userData: { type: 'cybersnail', hp: 2, maxHp: 2 },
                position: { x: game.player.position.x, z: game.player.position.z }
            };
            game.openSnailEncounter(fakeSprite);
            return {
                isAct2Active: game.isAct2Active(),
                hasBlockingOverlay: game.hasBlockingGameplayOverlay(),
                encounterState: game.encounterState
            };
        });

        expect(setup.isAct2Active).toBe(true);
        expect(setup.hasBlockingOverlay).toBe(true);
        expect(setup.encounterState).toMatchObject({ snailType: 'cybersnail', snailHp: 2, resolve: 0, outcome: null });

        await expect(page.locator('#snail-encounter-modal')).not.toHaveClass(/hidden/);
        await expect(page.locator('#snail-encounter-log')).toContainText('CYBERSNAIL');

        expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
    });

    test('Fight reduces snail HP and, on the killing blow, closes the encounter', async ({ page }) => {
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        await page.evaluate(() => {
            const game = window.game;
            game.act2.begin();
            const fakeSprite = {
                userData: { type: 'cybersnail', hp: 1, maxHp: 2 },
                position: { x: game.player.position.x, z: game.player.position.z }
            };
            game.openSnailEncounter(fakeSprite);
        });

        await page.locator('#snail-encounter-fight-btn').click();

        const result = await page.evaluate(() => ({
            encounterState: window.game.encounterState,
            modalHidden: document.getElementById('snail-encounter-modal').classList.contains('hidden')
        }));

        expect(result.encounterState).toBeNull();
        expect(result.modalHidden).toBe(true);
    });

    test('Talk while infected reliably builds resolve toward befriending', async ({ page }) => {
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        const outcome = await page.evaluate(() => {
            const game = window.game;
            game.act2.begin();
            // 'latent' (default post-begin infectionStage) counts as
            // alien-aligned per the design doc — anything but 'cured'.
            const fakeSprite = {
                isObject3D: true,
                parent: null,
                userData: { type: 'cybersnail', hp: 2, maxHp: 2 },
                position: { x: game.player.position.x, z: game.player.position.z },
                scale: { set: () => {} },
                material: {}
            };
            game.openSnailEncounter(fakeSprite);
            // TALK_GAIN_ALIEN is 35/round with a 5% backfire chance — three
            // rounds crosses RESOLVE_MAX (100) on every non-backfiring round,
            // and even one backfire still leaves room within a few more.
            for (let i = 0; i < 6 && game.encounterState; i += 1) {
                game.handleSnailEncounterTalk();
            }
            return {
                companionCount: game.companions.length,
                companionIsCompanionFlag: game.companions[0]?.sprite?.userData?.isCompanion,
                companionParentIsScene: game.companions[0]?.sprite?.parent === game.scene
            };
        });

        expect(outcome.companionCount).toBe(1);
        expect(outcome.companionIsCompanionFlag).toBe(true);
        expect(outcome.companionParentIsScene).toBe(true);
    });

    test('a companion follows the player after a few frames', async ({ page }) => {
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        const result = await page.evaluate(() => {
            const game = window.game;
            game.act2.begin();
            const startX = game.player.position.x + 5;
            const startZ = game.player.position.z + 5;
            const fakeSprite = {
                userData: { type: 'cybersnail', hp: 2, maxHp: 2 },
                position: { x: startX, z: startZ },
                scale: { set: () => {} },
                material: {},
                parent: { remove: () => {} }
            };
            game.openSnailEncounter(fakeSprite);
            for (let i = 0; i < 6 && game.encounterState; i += 1) game.handleSnailEncounterTalk();

            const before = Math.hypot(
                fakeSprite.position.x - game.player.position.x,
                fakeSprite.position.z - game.player.position.z
            );
            for (let i = 0; i < 30; i += 1) game.updateCompanions(1 / 30);
            const after = Math.hypot(
                fakeSprite.position.x - game.player.position.x,
                fakeSprite.position.z - game.player.position.z
            );
            return { before, after };
        });

        expect(result.after).toBeLessThan(result.before);
    });
});
