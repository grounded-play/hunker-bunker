import { afterEach, describe, expect, it, vi } from 'vitest';

// Issue #106: the web build downloaded all seven languages at boot (~330 KB
// gzipped of the six non-English ones). English stays bundled; the others load
// on demand, and src/boot.js loads the player's language before the game runs.
// vitest.setup.js preloads every dictionary, so each test re-imports a fresh
// i18n module to see the on-demand behaviour.
describe('languages load on demand', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    const freshI18n = async () => {
        vi.resetModules();
        return import('./i18n.js');
    };

    it('bundles only English', async () => {
        const i18n = await freshI18n();
        expect(i18n.isLocaleLoaded('en')).toBe(true);
        for (const code of ['de', 'ja', 'ru', 'zh-CN', 'pt-BR', 'es-419']) expect(i18n.isLocaleLoaded(code)).toBe(false);
    });

    it('switches to a language once its dictionary arrives, and English answers meanwhile', async () => {
        const i18n = await freshI18n();
        expect(i18n.setLocale('de')).toBe(true);
        expect(i18n.getLocale()).toBe('en');
        expect(i18n.t('ui.menu.settings')).toBe('SETTINGS');
        await vi.waitFor(() => expect(i18n.getLocale()).toBe('de'));
        expect(i18n.isLocaleLoaded('de')).toBe(true);
        expect(i18n.t('ui.menu.settings')).not.toBe('SETTINGS');
    });

    it('loads the detected language before boot continues', async () => {
        vi.stubGlobal('window', { localStorage: { getItem: () => 'ja', setItem: () => {} }, addEventListener: () => {}, dispatchEvent: () => {} });
        const i18n = await freshI18n();
        expect(i18n.getLocale()).toBe('ja');
        expect(i18n.isLocaleLoaded('ja')).toBe(false);
        await expect(i18n.ensureLocaleReady()).resolves.toBe(true);
        expect(i18n.isLocaleLoaded('ja')).toBe(true);
        expect(i18n.t('ui.menu.settings')).not.toBe('SETTINGS');
    });

    it('refuses an unknown language without loading anything', async () => {
        const i18n = await freshI18n();
        expect(i18n.setLocale('xx')).toBe(false);
        await expect(i18n.loadLocale('xx')).resolves.toBe(false);
    });
});
