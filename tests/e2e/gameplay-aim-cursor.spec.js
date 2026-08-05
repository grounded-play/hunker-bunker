import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// /goal: "on the steam deck, when we move the right joystick, show the
// mouse cursor icon like on desktop, so aiming is easier to read."
//
// Verified this already works (main.js's handleSteamGameplayInput, landed
// in the "restore interactive compass HUD ... right-joystick virtual mouse
// aim" commit): the right stick drives the direct virtual crosshair while
// the slower decorative mouse cursor stays suppressed in controller mode.
//
// Same fake-gamepad technique as browser-gamepad-fallback.spec.js: the
// fallback poll loop (main.js's handleBrowserGamepadFallbackFrame) reads
// navigator.getGamepads() every animation frame regardless of a real
// 'gamepadconnected' event, and browser-gamepad axes[2]/axes[3] always
// report camera.x/camera.y with cameraDelta pinned to {0,0} (no trackpad/
// gyro on the Gamepad API) -- so a right-stick push here exercises the same
// code path a real Deck player's right stick does.
test.describe('Gameplay right-stick aim cursor', () => {
    test('deflecting the right stick shows one responsive crosshair and suppresses the drifting mouse cursor', async ({ page }) => {
        test.setTimeout(180_000);
        const consoleErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        page.on('pageerror', (err) => consoleErrors.push(err.message));

        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        const readCursorState = () => {
            const cursor = document.getElementById('virtual-gamepad-cursor');
            const tacticalCursor = document.getElementById('tactical-cursor');
            const style = getComputedStyle(cursor);
            const match = cursor.style.transform.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px/);
            return {
                controllerMode: document.body.classList.contains('controller-mode'),
                display: style.display,
                hidden: cursor.classList.contains('hidden'),
                tacticalDisplay: getComputedStyle(tacticalCursor).display,
                x: match ? Number(match[1]) : null,
                y: match ? Number(match[2]) : null
            };
        };

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

        // Push right+up first and let the virtual cursor settle there --
        // this is the state under test (visible, tracking the stick), not
        // a "before" baseline. A real mouse move doesn't share state with
        // the controller-driven cursor position, so it can't establish a
        // meaningful baseline for it; comparing two stick-driven positions
        // against each other (below) can.
        await pushStick(0.7, -0.7);
        await page.waitForTimeout(800);
        const rightUp = await page.evaluate(readCursorState);

        expect(rightUp.controllerMode).toBe(true);
        expect(rightUp.hidden, 'responsive controller crosshair should be visible').toBe(false);
        expect(rightUp.display).not.toBe('none');
        expect(rightUp.tacticalDisplay, 'the drifting bracketed cursor should be suppressed').toBe('none');

        // Now push the opposite direction and confirm the cursor tracks the
        // reversal -- proves the stick is actively driving position, not
        // that a cursor merely happens to be on screen.
        await pushStick(-0.7, 0.7);
        await page.waitForTimeout(800);
        const leftDown = await page.evaluate(readCursorState);

        await page.evaluate(() => { navigator.getGamepads = () => []; });

        expect(leftDown.x, 'cursor should move left relative to the right-pushed position once the stick reverses').toBeLessThan(rightUp.x);
        expect(leftDown.y, 'cursor should move down relative to the up-pushed position once the stick reverses').toBeGreaterThan(rightUp.y);

        expect(consoleErrors, `unexpected console errors: ${consoleErrors.join('\n')}`).toEqual([]);
    });
});
