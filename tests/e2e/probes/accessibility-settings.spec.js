import { expect, test } from '@playwright/test';
import { bootToOperatorMenu } from '../helpers.js';

test('accessibility and comfort settings persist and apply live to runtime', async ({ page }) => {
    test.setTimeout(180_000);
    await bootToOperatorMenu(page);

    // Open settings modal
    await page.locator('.open-settings-btn').first().click();
    await page.waitForSelector('#settings-popup:not(.hidden)');

    // Switch to ACCESSIBILITY tab
    await page.locator('[data-settings-tab="accessibility"]').click();
    await page.waitForSelector('[data-settings-panel="accessibility"]:not(.hidden)');

    // Verify controls exist in the accessibility panel
    const shakeSelect = page.locator('#setting-camera-shake');
    const aimAssistSelect = page.locator('#setting-aim-assist');
    const pressureToggle = page.locator('#setting-reduced-pressure');

    await expect(shakeSelect).toBeVisible();
    await expect(aimAssistSelect).toBeVisible();
    await expect(pressureToggle).toBeVisible();

    // Adjust settings
    await shakeSelect.selectOption('reduced');
    await aimAssistSelect.selectOption('low');
    await pressureToggle.check();

    // Check live DOM properties and storage
    const state = await page.evaluate(() => {
        return {
            shakeScaleCss: document.documentElement.style.getPropertyValue('--hb-camera-shake-scale'),
            storedShake: localStorage.getItem('hb_camera_shake'),
            storedAimAssist: localStorage.getItem('hb_aim_assist'),
            storedPressure: localStorage.getItem('hb_reduced_pressure'),
            gameStateShake: window.game?.cameraShakeScale,
            gameStatePressure: window.game?.reducedPressure
        };
    });

    expect(state.shakeScaleCss).toBe('0.5');
    expect(state.storedShake).toBe('reduced');
    expect(state.storedAimAssist).toBe('low');
    expect(state.storedPressure).toBe('true');

    // Reload page to verify persistence
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.open-settings-btn');

    const reloadedState = await page.evaluate(() => {
        return {
            shakeScaleCss: document.documentElement.style.getPropertyValue('--hb-camera-shake-scale'),
            storedShake: localStorage.getItem('hb_camera_shake'),
            storedAimAssist: localStorage.getItem('hb_aim_assist'),
            storedPressure: localStorage.getItem('hb_reduced_pressure'),
            shakeSelectVal: document.getElementById('setting-camera-shake')?.value,
            aimSelectVal: document.getElementById('setting-aim-assist')?.value,
            pressureChecked: document.getElementById('setting-reduced-pressure')?.checked
        };
    });

    expect(reloadedState.shakeScaleCss).toBe('0.5');
    expect(reloadedState.storedShake).toBe('reduced');
    expect(reloadedState.storedAimAssist).toBe('low');
    expect(reloadedState.storedPressure).toBe('true');
    expect(reloadedState.shakeSelectVal).toBe('reduced');
    expect(reloadedState.aimSelectVal).toBe('low');
    expect(reloadedState.pressureChecked).toBe(true);
});
