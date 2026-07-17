import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// Phase 13: "Keyboard controls" (docs/steam-launch-readiness-master-plan.md).
// Drives the real input paths a keyboard/mouse player uses — WASD movement
// (main.js KEY_BINDINGS moveRight: ['KeyD', 'ArrowRight']) and mouse-click
// fire (pointerdown on the renderer canvas, src/threeGame.js:2757) — rather
// than the programmatic debug hooks (setGodMode/fireWeaponAtCurrentAim)
// used by the screenshot-capture spec, since those bypass the actual input
// listeners this test exists to exercise.

test.describe('Keyboard and mouse controls', () => {
    test('WASD moves the player and a mouse click fires a shot', async ({ page }) => {
        const consoleErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        page.on('pageerror', (err) => consoleErrors.push(err.message));

        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        const before = await page.evaluate(() => ({
            x: window.game.player.position.x,
            z: window.game.player.position.z,
            clipAmmo: window.game.weaponClipAmmo,
            projectiles: window.game.activeProjectiles.length
        }));

        await page.keyboard.down('KeyD');
        await page.waitForTimeout(500);
        await page.keyboard.up('KeyD');
        await page.waitForTimeout(100);

        const afterMove = await page.evaluate(() => ({
            x: window.game.player.position.x,
            z: window.game.player.position.z
        }));
        const moved = Math.hypot(afterMove.x - before.x, afterMove.z - before.z);
        expect(moved, 'holding D should move the player').toBeGreaterThan(0.05);

        // Fire is a canvas pointerdown, not a key. Target the WebGL
        // renderer's canvas specifically (inside #game-container) — a bare
        // `canvas` selector matches index.html's #char-preview-sprite
        // canvas first, which is hidden during gameplay and hangs
        // Playwright's actionability wait forever.
        const canvas = page.locator('#game-container canvas').first();
        await canvas.click({ position: { x: 50, y: 0 } });
        await page.waitForTimeout(100);

        const afterFire = await page.evaluate(() => ({
            clipAmmo: window.game.weaponClipAmmo,
            projectiles: window.game.activeProjectiles.length
        }));
        expect(
            afterFire.clipAmmo < before.clipAmmo || afterFire.projectiles > before.projectiles,
            'clicking the canvas should fire a shot (clip ammo drops or a projectile spawns)'
        ).toBe(true);

        // Interact (E) and reload (R) shouldn't throw even with nothing to
        // interact with / a full-enough clip nearby.
        await page.keyboard.press('KeyE');
        await page.waitForTimeout(100);
        await page.keyboard.press('KeyR');
        await page.waitForTimeout(200);

        expect(consoleErrors, `unexpected console errors: ${consoleErrors.join('\n')}`).toEqual([]);
    });
});
