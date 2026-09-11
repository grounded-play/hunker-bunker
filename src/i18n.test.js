import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
    t,
    getLocale,
    setLocale,
    getAvailableLocales,
    resolveLocaleCode
} from './i18n.js';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';
import ru from './locales/ru.json';
import es419 from './locales/es-419.json';
import de from './locales/de.json';
import ja from './locales/ja.json';
import ptBR from './locales/pt-BR.json';

describe('i18n Localization Engine', () => {
    let mockStorage = {};

    beforeEach(() => {
        mockStorage = {};
        const localStorageMock = {
            getItem: vi.fn((key) => mockStorage[key] ?? null),
            setItem: vi.fn((key, value) => {
                mockStorage[key] = String(value);
            }),
            removeItem: vi.fn((key) => {
                delete mockStorage[key];
            })
        };
        const windowMock = new EventTarget();
        windowMock.localStorage = localStorageMock;
        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('window', windowMock);
        setLocale('en');
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('resolveLocaleCode', () => {
        it('resolves Steamworks language names', () => {
            expect(resolveLocaleCode('schinese')).toBe('zh-CN');
            expect(resolveLocaleCode('russian')).toBe('ru');
            expect(resolveLocaleCode('latam')).toBe('es-419');
            expect(resolveLocaleCode('german')).toBe('de');
            expect(resolveLocaleCode('japanese')).toBe('ja');
            expect(resolveLocaleCode('brazilian')).toBe('pt-BR');
            expect(resolveLocaleCode('english')).toBe('en');
        });

        it('resolves browser BCP-47 locale codes and prefixes', () => {
            expect(resolveLocaleCode('zh-CN')).toBe('zh-CN');
            expect(resolveLocaleCode('zh')).toBe('zh-CN');
            expect(resolveLocaleCode('ru-RU')).toBe('ru');
            expect(resolveLocaleCode('es-MX')).toBe('es-419');
            expect(resolveLocaleCode('de-DE')).toBe('de');
            expect(resolveLocaleCode('ja-JP')).toBe('ja');
            expect(resolveLocaleCode('pt-BR')).toBe('pt-BR');
        });

        it('returns null for unknown languages', () => {
            expect(resolveLocaleCode('klingon')).toBeNull();
            expect(resolveLocaleCode('')).toBeNull();
            expect(resolveLocaleCode(null)).toBeNull();
        });
    });

    describe('Translation function t()', () => {
        it('returns English translation by default', () => {
            setLocale('en');
            expect(t('menu.play')).toBe('DEPLOY OPERATIVE');
            expect(t('classes.scout')).toBe('Scout');
            expect(t('hud.shield')).toBe('SHIELD');
        });

        it('translates strings into Simplified Chinese', () => {
            setLocale('zh-CN');
            expect(t('menu.play')).toBe('部署特工');
            expect(t('classes.tank')).toBe('重装兵');
            expect(t('hud.shield')).toBe('护盾');
        });

        it('translates strings into Russian', () => {
            setLocale('ru');
            expect(t('menu.play')).toBe('ДИСЛОКАЦИЯ ОПЕРАТИВНИКА');
            expect(t('classes.engineer')).toBe('Инженер');
            expect(t('hud.shield')).toBe('ЩИТ');
        });

        it('translates strings into Japanese', () => {
            setLocale('ja');
            expect(t('menu.play')).toBe('エージェント出撃');
            expect(t('hud.shield')).toBe('シールド');
        });

        it('interpolates named variables into templates', () => {
            setLocale('en');
            expect(t('menu.version', { version: '2.4.0' })).toBe('Version 2.4.0');
            expect(t('vault.keys_available', { count: 5 })).toBe('Decryption Keys Available: 5');

            setLocale('zh-CN');
            expect(t('menu.version', { version: '2.4.0' })).toBe('版本 2.4.0');
            expect(t('vault.keys_available', { count: 5 })).toBe('可用解密码匙: 5');
        });

        it('falls back to English when a key is missing in active locale', () => {
            setLocale('zh-CN');
            // If non-existent key, returns fallback or key itself
            expect(t('non.existent.key', {}, 'Default Fallback')).toBe('Default Fallback');
            expect(t('non.existent.key')).toBe('non.existent.key');
        });
    });

    describe('setLocale & Events', () => {
        it('persists selection to localStorage and dispatches locale-changed event', () => {
            const listener = vi.fn();
            window.addEventListener('locale-changed', listener);

            const changed = setLocale('de');
            expect(changed).toBe(true);
            expect(getLocale()).toBe('de');
            expect(mockStorage.hb_locale).toBe('de');
            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                detail: { locale: 'de' }
            }));

            window.removeEventListener('locale-changed', listener);
        });

        it('rejects invalid locale codes', () => {
            const changed = setLocale('invalid_code');
            expect(changed).toBe(false);
            expect(getLocale()).not.toBe('invalid_code');
        });
    });

    describe('Dictionary Parity Across All 7 Languages', () => {
        function getAllKeys(obj, prefix = '') {
            let keys = [];
            for (const [k, v] of Object.entries(obj)) {
                const full = prefix ? `${prefix}.${k}` : k;
                if (v && typeof v === 'object' && !Array.isArray(v)) {
                    keys = keys.concat(getAllKeys(v, full));
                } else {
                    keys.push(full);
                }
            }
            return keys;
        }

        const baseKeys = getAllKeys(en).sort();

        const languages = [
            { code: 'zh-CN', dict: zhCN },
            { code: 'ru', dict: ru },
            { code: 'es-419', dict: es419 },
            { code: 'de', dict: de },
            { code: 'ja', dict: ja },
            { code: 'pt-BR', dict: ptBR }
        ];

        for (const lang of languages) {
            it(`matches all English keys in ${lang.code}`, () => {
                const langKeys = getAllKeys(lang.dict).sort();
                expect(langKeys).toEqual(baseKeys);
            });
        }
    });

    describe('getAvailableLocales', () => {
        it('returns all 7 supported locales with native names', () => {
            const locales = getAvailableLocales();
            expect(locales).toHaveLength(7);
            expect(locales.map((l) => l.code)).toEqual([
                'en', 'zh-CN', 'ru', 'es-419', 'de', 'ja', 'pt-BR'
            ]);
        });
    });
});
