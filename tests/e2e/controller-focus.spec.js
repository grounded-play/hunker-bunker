import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, bootToTitleSplash } from './helpers.js';

test.describe('controller-ready modal focus', () => {
    test('operator commands use spatial WASD navigation across both columns', async ({ page }) => {
        await bootToOperatorMenu(page);
        const rosterModal = page.locator('#roster-modal');
        if (await rosterModal.isVisible()) await page.locator('#close-roster-modal').click();

        await page.locator('#daily-ops-btn').focus();
        await page.keyboard.press('KeyS');
        await expect(page.locator('#roster-btn')).toBeFocused();

        await page.keyboard.press('KeyS');
        await expect(page.locator('#steam-vault-btn')).toBeFocused();

        await page.keyboard.press('KeyS');
        await expect(page.locator('#start-game')).toBeFocused();

        await page.keyboard.press('KeyW');
        await expect(page.locator('#steam-vault-btn')).toBeFocused();

        await page.keyboard.press('KeyW');
        await expect(page.locator('#roster-btn')).toBeFocused();

        await page.keyboard.press('KeyD');
        await expect(page.locator('#codex-btn')).toBeFocused();

        await page.keyboard.press('KeyD');
        await expect(page.locator('#hero-polish-btn')).toBeFocused();

        await page.keyboard.press('KeyD');
        await expect(page.locator('.char-selection .char-card.selected')).toBeFocused();

        // Navigate down the hero stack through all cards to the back button
        await page.locator('.char-selection .char-card[data-type="SCOUT"]').focus();
        await page.keyboard.press('KeyS');
        await expect(page.locator('.char-selection .char-card[data-type="TANK"]')).toBeFocused();

        await page.keyboard.press('KeyS');
        await expect(page.locator('.char-selection .char-card[data-type="ENGINEER"]')).toBeFocused();

        await page.keyboard.press('KeyS');
        await expect(page.locator('#hero-select-back-btn')).toBeFocused();

        await page.keyboard.press('KeyW');
        await expect(page.locator('.char-selection .char-card[data-type="ENGINEER"]')).toBeFocused();

        await page.locator('#hero-select-back-btn').focus();
        await page.keyboard.press('KeyA');
        await expect(page.locator('#start-game')).toBeFocused();

        await page.locator('#steam-vault-btn').focus();
        await page.keyboard.press('KeyD');
        await expect(page.locator('#season-pass-btn')).toBeFocused();

        await page.keyboard.press('KeyA');
        await expect(page.locator('#steam-vault-btn')).toBeFocused();
    });

    test('operator polish picker uses a spatial WASD grid', async ({ page }) => {
        await bootToOperatorMenu(page);
        const rosterModal = page.locator('#roster-modal');
        if (await rosterModal.isVisible()) await page.locator('#close-roster-modal').click();

        await page.locator('#hero-polish-btn').click();
        await expect(page.locator('#operator-polish-modal')).toBeVisible();
        const chips = page.locator('#operator-polish-grid .operator-polish-chip');
        await expect(chips.nth(0)).toBeFocused();

        await page.keyboard.press('KeyD');
        await expect(chips.nth(1)).toBeFocused();
        await page.keyboard.press('KeyS');
        await expect(chips.nth(5)).toBeFocused();
        await page.keyboard.press('ArrowLeft');
        await expect(chips.nth(4)).toBeFocused();
        await page.keyboard.press('ArrowUp');
        await expect(chips.nth(0)).toBeFocused();
    });

    test('settings traps focus and restores the title trigger when closed', async ({ page }) => {
        await bootToTitleSplash(page);

        const trigger = page.locator('#title-settings-btn');
        const modal = page.locator('#settings-popup');
        await trigger.focus();
        await trigger.click();
        await expect(modal).toBeVisible();

        await expect.poll(() => page.evaluate(() => (
            document.getElementById('settings-popup')?.contains(document.activeElement)
        ))).toBe(true);

        const focusableCount = await modal.locator(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        ).count();
        for (let index = 0; index < focusableCount + 2; index += 1) {
            await page.keyboard.press('Tab');
            expect(await page.evaluate(() => (
                document.getElementById('settings-popup')?.contains(document.activeElement)
            ))).toBe(true);
        }

        await page.keyboard.press('Escape');
        await expect(modal).toBeHidden();
        await expect(trigger).toBeFocused();
    });

    test('settings callsign requires activation and keeps visible scrolling enabled', async ({ page }) => {
        await bootToTitleSplash(page);
        await page.locator('#title-settings-btn').click();

        const panel = page.locator('.settings-modal-content');
        const callsign = page.locator('#operator-callsign');
        await callsign.focus();
        const original = await callsign.inputValue();

        await page.keyboard.press('KeyX');
        await expect(callsign).toHaveValue(original);

        await page.keyboard.press('Enter');
        await page.keyboard.press('KeyX');
        await expect(callsign).toHaveValue(`${original}x`);
        await page.keyboard.press('Escape');
        await page.keyboard.press('KeyS');
        await expect(page.locator('#open-save-data')).toBeFocused();

        expect(await panel.evaluate((element) => ({
            overflowY: getComputedStyle(element).overflowY,
            scrollbarWidth: getComputedStyle(element).scrollbarWidth
        }))).toEqual({ overflowY: 'auto', scrollbarWidth: 'thin' });
    });

    test('controller left and right change focused settings selects', async ({ page }) => {
        await bootToTitleSplash(page);
        await page.locator('#title-settings-btn').click();

        const sensitivity = page.locator('#setting-aim-sensitivity');
        await sensitivity.focus();
        await sensitivity.selectOption('1.0');

        await page.evaluate(() => {
            const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
            buttons[15] = { pressed: true, value: 1 };
            const pad = {
                id: 'Xbox Wireless Controller (STANDARD GAMEPAD)',
                index: 0,
                connected: true,
                mapping: 'standard',
                axes: [0, 0, 0, 0],
                buttons
            };
            navigator.getGamepads = () => [pad];
        });

        await expect(sensitivity).toHaveValue('1.25');
        await expect.poll(() => page.evaluate(() => localStorage.getItem('hb_aim_sensitivity'))).toBe('1.25');

        await page.evaluate(() => { navigator.getGamepads = () => []; });
    });

    test('controller can choose a visible right-stick sensitivity preset', async ({ page }) => {
        await bootToTitleSplash(page);
        await page.locator('#title-settings-btn').click();

        const fast = page.locator('[data-aim-sensitivity="1.5"]');
        await fast.focus();
        await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('gamepad-menu-nav', { detail: { action: 'menu_confirm' } }));
        });

        await expect(fast).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('#setting-aim-sensitivity')).toHaveValue('1.5');
        await expect.poll(() => page.evaluate(() => localStorage.getItem('hb_aim_sensitivity'))).toBe('1.5');
    });

    test('crosshair color picker updates and persists the accessibility color', async ({ page }) => {
        await bootToTitleSplash(page);
        await page.locator('#title-settings-btn').click();

        const picker = page.locator('#setting-crosshair-color');
        await picker.evaluate((element) => {
            element.value = '#39ff88';
            element.dispatchEvent(new Event('input', { bubbles: true }));
        });

        await expect(picker).toHaveValue('#39ff88');
        await expect.poll(() => page.evaluate(() => ({
            stored: localStorage.getItem('hb_crosshair_color'),
            rendered: getComputedStyle(document.documentElement).getPropertyValue('--crosshair-color').trim()
        }))).toEqual({ stored: '#39ff88', rendered: '#39ff88' });
    });

    test('controller can choose a crosshair color without opening the native picker', async ({ page }) => {
        await bootToTitleSplash(page);
        await page.locator('#title-settings-btn').click();

        const green = page.locator('[data-crosshair-color="#39ff88"]');
        await green.focus();
        await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('gamepad-menu-nav', { detail: { action: 'menu_confirm' } }));
        });

        await expect(green).toHaveAttribute('aria-pressed', 'true');
        await expect.poll(() => page.evaluate(() => localStorage.getItem('hb_crosshair_color'))).toBe('#39ff88');
    });

    test('controls/remapping traps focus and restores its settings trigger', async ({ page }) => {
        await bootToTitleSplash(page);
        await page.locator('#title-settings-btn').click();

        const trigger = page.locator('#open-controls');
        const modal = page.locator('#controls-popup');
        await trigger.focus();
        await trigger.click();
        await expect(modal).toBeVisible();

        await expect.poll(() => page.evaluate(() => (
            document.getElementById('controls-popup')?.contains(document.activeElement)
        ))).toBe(true);

        for (let index = 0; index < 5; index += 1) {
            await page.keyboard.press('Tab');
            expect(await page.evaluate(() => (
                document.getElementById('controls-popup')?.contains(document.activeElement)
            ))).toBe(true);
        }

        await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('gamepad-menu-nav', { detail: { action: 'menu_back' } }));
        });
        await expect(modal).toBeHidden();
        await expect(page.locator('#settings-popup')).toBeVisible();
        await expect(trigger).toBeFocused();
    });

    test('tactical map receives deterministic focus when it becomes visible', async ({ page }) => {
        await bootToTitleSplash(page);
        await page.evaluate(() => {
            const modal = document.getElementById('tactical-map-modal');
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
        });

        await expect(page.locator('#tactical-map-modal')).toBeVisible();
        await expect(page.locator('#close-tactical-map-modal')).toBeFocused();
    });

    test('base turret submenu owns controller focus when it becomes visible', async ({ page }) => {
        await bootToTitleSplash(page);
        await page.evaluate(() => {
            const modal = document.getElementById('base-turret-modal');
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
        });

        await expect(page.locator('#base-turret-modal')).toBeVisible();
        await expect(page.locator('#close-base-turret-modal')).toBeFocused();
    });

    test('pointer hover updates active focus and moves highlight across main menu buttons', async ({ page }) => {
        await bootToTitleSplash(page);
        await expect(page.locator('#title-newrun-btn')).toBeFocused();

        await page.locator('#title-settings-btn').hover();
        await expect(page.locator('#title-settings-btn')).toBeFocused();

        await page.locator('#title-about-btn').hover();
        await expect(page.locator('#title-about-btn')).toBeFocused();

        await page.locator('#title-quit-btn').hover();
        await expect(page.locator('#title-quit-btn')).toBeFocused();

        await page.locator('#title-newrun-btn').hover();
        await expect(page.locator('#title-newrun-btn')).toBeFocused();
    });

    test('main menu buttons are navigable via arrow keys and WASD', async ({ page }) => {
        await bootToTitleSplash(page);
        await expect(page.locator('#title-newrun-btn')).toBeFocused();

        await page.keyboard.press('ArrowDown');
        await expect(page.locator('#title-achievements-btn')).toBeFocused();

        await page.keyboard.press('ArrowDown');
        await expect(page.locator('#title-settings-btn')).toBeFocused();

        await page.keyboard.press('ArrowDown');
        await expect(page.locator('#title-about-btn')).toBeFocused();

        await page.keyboard.press('ArrowDown');
        await expect(page.locator('#title-quit-btn')).toBeFocused();

        await page.keyboard.press('ArrowUp');
        await expect(page.locator('#title-about-btn')).toBeFocused();
    });
});
