import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

test.describe('gameplay facing yaw (mouse + gamepad)', () => {
    test('clicking the game canvas hides the mouse-look prompt without requiring pointer lock', async ({ page }) => {
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        await page.locator('#game-container canvas').first().click();
        await expect(page.locator('#mouse-look-prompt')).toHaveClass(/hidden/);
        const locked = await page.evaluate(() => document.pointerLockElement !== null);
        expect(locked).toBe(false);
    });

    test('mouse movement in tactical-cursor mode turns facingYaw', async ({ page }) => {
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        await page.locator('#game-container canvas').first().click();
        const initialYaw = await page.evaluate(() => window.game.facingYaw);

        await page.mouse.move(400, 300);
        await page.mouse.move(700, 300);
        await page.waitForTimeout(100);

        const turnedYaw = await page.evaluate(() => window.game.facingYaw);
        expect(turnedYaw).not.toBeCloseTo(initialYaw, 2);
    });

    test('gamepad right-stick moves the visible aim crosshair and updates facingYaw', async ({ page }) => {
        test.setTimeout(180_000);
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        const pushStick = (x, y) => page.evaluate(([sx, sy]) => {
            const fakeGamepad = {
                id: 'Xbox Wireless Controller (STANDARD GAMEPAD)',
                index: 0,
                connected: true,
                mapping: 'standard',
                axes: [0, 0, sx, sy],
                buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }))
            };
            navigator.getGamepads = () => [fakeGamepad];
        }, [x, y]);

        const readState = () => {
            const crosshair = document.getElementById('gameplay-crosshair');
            const tacticalCursor = document.getElementById('tactical-cursor');
            const crosshairRect = crosshair.getBoundingClientRect();
            return {
                controllerMode: document.body.classList.contains('controller-mode'),
            crosshairHidden: crosshair.classList.contains('hidden'),
            crosshairCenterX: crosshairRect.left + crosshairRect.width / 2,
            crosshairCenterY: crosshairRect.top + crosshairRect.height / 2,
                tacticalDisplay: getComputedStyle(tacticalCursor).display,
                facingYaw: window.game.facingYaw
            };
        };

        const viewport = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
        const yawBefore = await page.evaluate(() => window.game.facingYaw);
        await pushStick(0.7, -0.7);
        await page.waitForTimeout(500);
        const rightUp = await page.evaluate(readState);
        await pushStick(-0.7, 0.7);
        await page.waitForTimeout(500);
        const leftDown = await page.evaluate(readState);
        await page.evaluate(() => { navigator.getGamepads = () => []; });

        expect(rightUp.controllerMode).toBe(true);
        expect(rightUp.crosshairHidden, 'the fixed gameplay crosshair should be visible').toBe(false);
        expect(rightUp.facingYaw).not.toBeCloseTo(yawBefore, 2);
        expect(leftDown.facingYaw).not.toBeCloseTo(rightUp.facingYaw, 2);
        expect(Math.abs(rightUp.crosshairCenterX - viewport.width / 2)).toBeGreaterThan(4);
        expect(Math.abs(rightUp.crosshairCenterY - viewport.height / 2)).toBeGreaterThan(4);
        expect(rightUp.crosshairCenterX).not.toBeCloseTo(leftDown.crosshairCenterX, 0);
        expect(rightUp.crosshairCenterY).not.toBeCloseTo(leftDown.crosshairCenterY, 0);
    });

    test('WASD movement is screen-relative regardless of facing direction', async ({ page }) => {
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        await page.locator('#game-container canvas').first().click();
        // Release pointer lock directly rather than pressing Escape: the
        // game's own global Escape handler (main.js) falls through to
        // openSettingsModal() during gameplay whenever no other modal is
        // open, which is correct, pre-existing pause-menu behavior --  but
        // it would disable gameplay input here and make the WASD assertion
        // below fail for a reason unrelated to facing/movement.
        await page.evaluate(() => document.exitPointerLock());
        await page.waitForTimeout(100);
        await page.evaluate(() => window.game.updateFacingYaw(0));

        const startPos = await page.evaluate(() => ({ x: window.game.player.position.x, z: window.game.player.position.z }));
        await page.keyboard.down('KeyW');
        await page.waitForTimeout(300);
        await page.keyboard.up('KeyW');
        const endPos = await page.evaluate(() => ({ x: window.game.player.position.x, z: window.game.player.position.z }));

        expect(Math.hypot(endPos.x - startPos.x, endPos.z - startPos.z)).toBeGreaterThan(0.05);
    });
});
