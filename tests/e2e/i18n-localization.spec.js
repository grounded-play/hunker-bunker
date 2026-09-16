import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootToTitleSplash } from './helpers.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readLocaleJson = (code) => JSON.parse(readFileSync(path.join(ROOT_DIR, `src/locales/${code}.json`), 'utf8'));

const LOCALES = ['en', 'de', 'es-419', 'ja', 'pt-BR', 'ru', 'zh-CN'].map((code) => {
    const dict = readLocaleJson(code);
    return {
        code,
        dict,
        newRun: dict.ui.menu.new_run,
        settings: dict.ui.menu.settings
    };
});

test.describe('Localization Browser Runtime Validation Across All 7 Languages', () => {
    for (const locale of LOCALES) {
        test(`boots cleanly and renders title menu in ${locale.code}`, async ({ page }) => {
            const pageErrors = [];
            page.on('pageerror', (err) => pageErrors.push(err.message));

            await page.addInitScript((code) => {
                localStorage.setItem('hb_locale', code);
            }, locale.code);

            await bootToTitleSplash(page);

            // Verify document language tag is updated correctly
            const docLang = await page.evaluate(() => document.documentElement.lang);
            expect(docLang).toBe(locale.code);

            // Verify title menu buttons render localized translations
            const newRunBtn = page.locator('#title-newrun-btn');
            await expect(newRunBtn).toHaveText(locale.newRun);

            const settingsBtn = page.locator('#title-settings-btn');
            await expect(settingsBtn).toHaveText(locale.settings);

            // Verify no uncaught runtime errors during boot
            expect(pageErrors).toEqual([]);
        });
    }

    test('supports live in-session locale switching across all 7 languages without reloading', async ({ page }) => {
        const pageErrors = [];
        page.on('pageerror', (err) => pageErrors.push(err.message));

        await page.addInitScript(() => {
            localStorage.setItem('hb_locale', 'en');
        });

        await bootToTitleSplash(page);

        // Open settings modal
        await page.locator('#title-settings-btn').click();
        const settingsModal = page.locator('#settings-popup');
        await expect(settingsModal).toBeVisible();

        for (const target of LOCALES) {
            await page.evaluate((code) => {
                (window.i18n?.setLocale || window.setLocale)(code);
            }, target.code);

            // Verify document language tag updates immediately
            await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(target.code);

            // Verify title menu button updates live under the modal
            await expect(page.locator('#title-newrun-btn')).toHaveText(target.newRun);
            await expect(page.locator('#title-settings-btn')).toHaveText(target.settings);

            // Verify localStorage was updated with the new preference
            const storedLocale = await page.evaluate(() => localStorage.getItem('hb_locale'));
            expect(storedLocale).toBe(target.code);
        }

        // Close settings modal
        const closeBtn = page.locator('#close-settings');
        if (await closeBtn.isVisible()) {
            await closeBtn.click();
        }

        // Verify zero uncaught errors across all language changes
        expect(pageErrors).toEqual([]);
    });

    test('contains no unresolved catalog addresses or undefined tokens on screen', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('hb_locale', 'zh-CN');
        });

        await bootToTitleSplash(page);

        const visibleTexts = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('#splash, #menu, .title-menu-btn'));
            return elements.map((el) => el.innerText || el.textContent || '').join(' ');
        });

        // Ensure no raw catalog keys leaked as literal text
        expect(visibleTexts).not.toMatch(/\bui\.[a-z0-9_.]+/);
        expect(visibleTexts).not.toMatch(/\bcommon\.[a-z0-9_.]+/);
        expect(visibleTexts).not.toContain('undefined');
        expect(visibleTexts).not.toContain('NaN');
    });
});
