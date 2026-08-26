import { test, expect } from '@playwright/test';
import { MENU_FOCUS_ROOT_IDS } from '../../src/inputActions.js';
import { bootToTitleSplash } from './helpers.js';

const ALLOWED_EMPTY_SURFACES = new Set([
    // These application hosts populate only while their standalone runtime is
    // mounted. Their registration/order is covered by the unit contract; the
    // runtime-specific E2E specs exercise their generated controls.
    'rgb-root'
]);

test.describe('complete menu keyboard and Steam Deck reachability', () => {
    test('every rendered control in every registered menu surface is reachable', async ({ page }) => {
        await bootToTitleSplash(page);

        const results = await page.evaluate(async ({ rootIds, allowedEmpty }) => {
            const selector = [
                'button:not([disabled])',
                'input:not([disabled])',
                'textarea:not([disabled])',
                'select:not([disabled])',
                'a[href]',
                '[tabindex]:not([tabindex="-1"])'
            ].join(', ');
            const isVisible = (element) => {
                if (!element?.getClientRects().length) return false;
                if (element.closest('.hidden, [hidden], [inert], [aria-hidden="true"]')) return false;
                const style = getComputedStyle(element);
                return style.display !== 'none' && style.visibility !== 'hidden';
            };
            const roots = rootIds.map((id) => document.getElementById(id)).filter(Boolean);
            const saved = roots.map((root) => ({
                root,
                className: root.className,
                ariaHidden: root.getAttribute('aria-hidden'),
                display: root.style.display
            }));
            const output = [];

            for (const root of roots) {
                for (const candidate of roots) {
                    candidate.classList.toggle('hidden', candidate !== root);
                    candidate.setAttribute('aria-hidden', candidate === root ? 'false' : 'true');
                }
                root.classList.remove('hidden');
                root.setAttribute('aria-hidden', 'false');
                if (root.id === 'hb-debug-console') root.style.display = 'flex';
                await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

                const targets = Array.from(root.querySelectorAll(selector)).filter(isVisible);
                targets.forEach((target, index) => { target.dataset.menuAuditKey = `${root.id}:${index}`; });
                const targetKeys = new Set(targets.map((target) => target.dataset.menuAuditKey));
                const reached = new Set();
                const queue = [];
                const captureFocus = () => {
                    const active = document.activeElement;
                    const key = active?.dataset?.menuAuditKey;
                    if (key && targetKeys.has(key) && !reached.has(key)) {
                        reached.add(key);
                        queue.push(active);
                    }
                };

                document.activeElement?.blur?.();
                document.dispatchEvent(new KeyboardEvent('keydown', {
                    key: 'ArrowDown', code: 'ArrowDown', bubbles: true, cancelable: true
                }));
                captureFocus();

                while (queue.length) {
                    const current = queue.shift();
                    for (const code of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
                        current.focus();
                        document.dispatchEvent(new KeyboardEvent('keydown', {
                            key: code.replace('Arrow', 'Arrow'), code, bubbles: true, cancelable: true
                        }));
                        captureFocus();
                    }
                }

                const missing = targets
                    .filter((target) => !reached.has(target.dataset.menuAuditKey))
                    .map((target) => target.id || target.getAttribute('aria-label') || target.textContent.trim().replace(/\s+/g, ' ').slice(0, 60));

                const activationFailures = [];
                for (const target of targets.filter((element) => element.matches('button, a[href], [role="button"]'))) {
                    let clicked = null;
                    const intercept = (event) => {
                        clicked = event.target;
                        event.preventDefault();
                        event.stopImmediatePropagation();
                    };
                    root.addEventListener('click', intercept, true);
                    target.focus();
                    document.dispatchEvent(new KeyboardEvent('keydown', {
                        key: 'Enter', code: 'Enter', bubbles: true, cancelable: true
                    }));
                    root.removeEventListener('click', intercept, true);
                    if (clicked !== target) activationFailures.push(target.id || target.textContent.trim().slice(0, 60));
                }

                output.push({
                    id: root.id,
                    controls: targets.length,
                    missing,
                    activationFailures,
                    allowedEmpty: allowedEmpty.includes(root.id)
                });
                targets.forEach((target) => { delete target.dataset.menuAuditKey; });
            }

            for (const state of saved) {
                state.root.className = state.className;
                state.root.style.display = state.display;
                if (state.ariaHidden === null) state.root.removeAttribute('aria-hidden');
                else state.root.setAttribute('aria-hidden', state.ariaHidden);
            }
            return output;
        }, { rootIds: MENU_FOCUS_ROOT_IDS, allowedEmpty: [...ALLOWED_EMPTY_SURFACES] });

        const failures = results.filter((result) => (
            result.missing.length
            || result.activationFailures.length
            || (!result.controls && !result.allowedEmpty)
        ));
        expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
    });

    test('WASD and arrows traverse the title menu and Steam confirm activates focus', async ({ page }) => {
        await bootToTitleSplash(page);
        await expect(page.locator('#title-newrun-btn')).toBeFocused();

        await page.keyboard.press('KeyS');
        await expect(page.locator('#title-achievements-btn')).toBeFocused();
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('#title-settings-btn')).toBeFocused();
        await page.keyboard.press('KeyW');
        await expect(page.locator('#title-achievements-btn')).toBeFocused();
        await page.keyboard.press('ArrowUp');
        await expect(page.locator('#title-newrun-btn')).toBeFocused();

        await page.locator('#title-about-btn').focus();
        await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('gamepad-menu-nav', {
                detail: { action: 'menu_confirm' }
            }));
        });
        await expect(page.locator('#about-modal')).toBeVisible();
        await expect(page.locator('#about-modal button')).toBeFocused();

        await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('gamepad-menu-nav', {
                detail: { action: 'menu_back' }
            }));
        });
        await expect(page.locator('#about-modal')).toBeHidden();
        await expect(page.locator('#title-about-btn')).toBeFocused();
    });
});
