import { test, expect } from '@playwright/test';
import { bootToTitleSplash } from './helpers.js';

// Isolated UI fixture: seeds O2 eligibility without playing the cinematic.
// Actual O2 repair and firing rules are exercised in baseTurret.test.js.
test('terminal offers an optional turret purchase and persists it exactly once', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await bootToTitleSplash(page);
    await page.waitForFunction(() => window.game && window.bankManager);
    await page.evaluate(() => {
        const bank = window.bankManager;
        bank.save({ ...bank.getState(), o2GeneratorLevel: 1, tech: 100, coin: 100, baseTurretUnlocked: false });
        window.game.openConsoleModal({ type: 'SCOUT' });
    });
    await page.locator('#terminal-tab-objectives').click();
    const build = page.locator('#terminal-build-turret');
    await expect(build).toBeEnabled();
    await expect(page.locator('#terminal-turret-build-cost')).toContainText('30 TECH / 10 COIN');
    await build.click();
    await expect(build).toBeDisabled();
    await expect(build).toHaveText('TURRET BUILT');
    expect(await page.evaluate(() => ({
        built: window.bankManager.isBaseTurretUnlocked(),
        tech: window.bankManager.getState().tech,
        coin: window.bankManager.getState().coin,
        active: window.game.baseDefenseTurretState.active
    }))).toEqual({ built: true, tech: 70, coin: 90, active: true });
    expect(await page.evaluate(() => {
        document.getElementById('terminal-build-turret').click();
        return JSON.parse(localStorage.getItem('hb_bank'));
    })).toMatchObject({ baseTurretUnlocked: true, tech: 70, coin: 90 });
    await page.reload();
    await page.waitForFunction(() => window.bankManager);
    expect(await page.evaluate(() => window.bankManager.getState()))
        .toMatchObject({ baseTurretUnlocked: true, tech: 70, coin: 90 });
    expect(errors).toEqual([]);
});
