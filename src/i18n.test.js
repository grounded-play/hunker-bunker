import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
    t,
    hasKey,
    applyStaticTranslations,
    getLocale,
    setLocale,
    getAvailableLocales,
    resolveLocaleCode,
    interpolate
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
        // These assert against keys that are actually wired to shipped markup.
        // They previously asserted against menu.play/menu.version/vault.*, which
        // were authored blind and referenced by nothing, so the suite validated
        // the fiction instead of the UI. Those keys are now deleted.
        it('returns English translation by default', () => {
            setLocale('en');
            expect(t('ui.menu.new_run')).toBe('NEW RUN');
            expect(t('classes.scout')).toBe('Scout');
            expect(t('hud.shield')).toBe('SHIELD');
        });

        it('translates strings into Simplified Chinese', () => {
            setLocale('zh-CN');
            expect(t('ui.menu.new_run')).toBe('新的征程');
            expect(t('classes.tank')).toBe('重装兵');
            expect(t('hud.shield')).toBe('护盾');
        });

        it('translates strings into Russian', () => {
            setLocale('ru');
            expect(t('ui.menu.new_run')).toBe('НОВЫЙ ЗАБЕГ');
            expect(t('classes.engineer')).toBe('Инженер');
            expect(t('hud.shield')).toBe('ЩИТ');
        });

        it('translates strings into Japanese', () => {
            setLocale('ja');
            expect(t('ui.menu.new_run')).toBe('ニューラン');
            expect(t('hud.shield')).toBe('シールド');
        });

        it('interpolates named variables into templates', () => {
            setLocale('en');
            expect(interpolate('Version {version}', { version: '2.4.0' })).toBe('Version 2.4.0');
            expect(interpolate('KEYS: {count}', { count: 5 })).toBe('KEYS: 5');
        });

        it('leaves an unsupplied placeholder untouched rather than printing undefined', () => {
            expect(interpolate('KEYS: {count}', {})).toBe('KEYS: {count}');
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

        // Chrome keys (menus, Settings, Armory, HUD) must exist in every
        // locale. narrative.* is extracted content awaiting a native pass, so
        // it is tracked separately below rather than blocking parity.
        const isChrome = (k) => !k.startsWith('narrative.');
        const chromeKeys = baseKeys.filter(isChrome);

        for (const lang of languages) {
            it(`matches all English chrome keys in ${lang.code}`, () => {
                const langKeys = getAllKeys(lang.dict).filter(isChrome).sort();
                expect(langKeys).toEqual(chromeKeys);
            });

            it(`defines no narrative key absent from English in ${lang.code}`, () => {
                const orphans = getAllKeys(lang.dict)
                    .filter((k) => !isChrome(k) && !baseKeys.includes(k));
                expect(orphans).toEqual([]);
            });
        }

        it('reports narrative translation coverage per locale', () => {
            const narrativeKeys = baseKeys.filter((k) => !isChrome(k));
            expect(narrativeKeys.length).toBeGreaterThan(0);
            const coverage = languages.map((lang) => {
                const have = getAllKeys(lang.dict).filter((k) => !isChrome(k)).length;
                return `${lang.code}: ${have}/${narrativeKeys.length}`;
            });
            // Not an assertion on progress -- this keeps the current state
            // visible in test output so a partial native pass is obvious.
            expect(coverage).toHaveLength(languages.length);
        });
    });

    describe('applyStaticTranslations', () => {
        // The suite runs in vitest's node environment, so there is no real
        // DOM. A minimal stand-in exercises the same traversal the browser
        // takes without pulling jsdom into the dependency tree.
        function fakeElement(attrs, text = '') {
            return {
                attrs: { ...attrs },
                textContent: text,
                getAttribute(name) {
                    return Object.prototype.hasOwnProperty.call(this.attrs, name)
                        ? this.attrs[name]
                        : null;
                },
                setAttribute(name, value) {
                    this.attrs[name] = value;
                }
            };
        }

        function fakeRoot(elements) {
            return {
                querySelectorAll(selector) {
                    const attr = selector.slice(1, -1);
                    return elements.filter((el) => el.getAttribute(attr) !== null);
                }
            };
        }

        it('replaces textContent for known keys', () => {
            const el = fakeElement({ 'data-i18n': 'ui.menu.new_run' }, 'NEW RUN');
            setLocale('de');
            const applied = applyStaticTranslations(fakeRoot([el]));
            expect(applied).toBe(1);
            expect(el.textContent).toBe('NEUER DURCHLAUF');
        });

        it('translates annotated attributes', () => {
            const el = fakeElement({
                'data-i18n-title': 'ui.hub.codex',
                title: 'Field Codex'
            });
            setLocale('ja');
            applyStaticTranslations(fakeRoot([el]));
            expect(el.getAttribute('title')).toBe('❑ コーデックス');
        });

        it('leaves authored English in place for unknown keys', () => {
            const el = fakeElement({ 'data-i18n': 'ui.nope.missing' }, 'ORIGINAL');
            setLocale('ru');
            const applied = applyStaticTranslations(fakeRoot([el]));
            expect(applied).toBe(0);
            expect(el.textContent).toBe('ORIGINAL');
        });

        it('re-translates the same element when the locale changes again', () => {
            const el = fakeElement({ 'data-i18n': 'ui.menu.settings' }, 'SETTINGS');
            const root = fakeRoot([el]);

            setLocale('pt-BR');
            applyStaticTranslations(root);
            expect(el.textContent).toBe('CONFIGURAÇÕES');

            setLocale('zh-CN');
            applyStaticTranslations(root);
            expect(el.textContent).toBe('设置');
        });

        it('returns 0 for a root that cannot be queried', () => {
            expect(applyStaticTranslations(null)).toBe(0);
            expect(applyStaticTranslations({})).toBe(0);
        });
    });

    describe('markup coverage', () => {
        // Annotations live both in index.html and in the template literals
        // that JS modules assign to innerHTML, so both are scanned.
        const sources = [
            '../index.html',
            './armoryUi.js'
        ].map((rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));

        const keys = [...new Set(
            sources.flatMap((src) => [...src.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)]
                .map((m) => m[1]))
        )];

        it('annotates the shipped UI', () => {
            expect(keys.length).toBeGreaterThan(0);
        });

        it('translates armory markup at render time, not only on locale change', () => {
            // applyStaticTranslations must run right after each innerHTML
            // assignment; without it an armory opened while a non-English
            // locale is active renders in English until the player toggles
            // language. Guards the wiring, which the key checks cannot see.
            const armory = readFileSync(
                fileURLToPath(new URL('./armoryUi.js', import.meta.url)),
                'utf8'
            );
            const assignments = [...armory.matchAll(/\.innerHTML = /g)].length;
            const applications = [...armory.matchAll(/applyStaticTranslations\(/g)].length;
            expect(assignments).toBeGreaterThan(0);
            expect(applications).toBeGreaterThanOrEqual(assignments);
        });

        it('resolves every annotated key in every locale', () => {
            const unresolved = [];
            for (const locale of getAvailableLocales()) {
                setLocale(locale.code);
                for (const key of keys) {
                    if (!hasKey(key)) unresolved.push(`${locale.code}:${key}`);
                }
            }
            expect(unresolved).toEqual([]);
        });
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

/**
 * Script-contamination guard.
 *
 * Bulk translation work mixes scripts by accident - a Cyrillic word left inside
 * a Japanese string reads as corruption to the player and is invisible to a
 * key-parity check, which only compares key sets. This caught a real slip
 * ("新規требование") during the runtime-UI sweep.
 */
describe('translation script integrity', () => {
    const CYRILLIC = /[Ѐ-ӿ]/;
    const CJK = /[぀-ヿ一-鿿]/;
    const HANGUL = /[가-힯]/;

    const flatten = (obj, prefix = '', out = {}) => {
        for (const key of Object.keys(obj)) {
            const value = obj[key];
            const full = prefix ? `${prefix}.${key}` : key;
            if (value && typeof value === 'object') flatten(value, full, out);
            else out[full] = value;
        }
        return out;
    };

    const catalogs = { en, 'zh-CN': zhCN, ru, 'es-419': es419, de, ja, ptBR };

    // Deliberately multi-script: the language setting names itself in several
    // scripts so a player who cannot read the active one can still find it.
    const MULTISCRIPT_BY_DESIGN = new Set(['ui.settings.language']);

    const offenders = (dict, pattern) => Object.entries(flatten(dict))
        .filter(([key]) => !MULTISCRIPT_BY_DESIGN.has(key))
        .filter(([, value]) => typeof value === 'string' && pattern.test(value))
        .map(([key]) => key);

    it('keeps Cyrillic out of every non-Russian catalog', () => {
        for (const [code, dict] of Object.entries(catalogs)) {
            if (code === 'ru') continue;
            expect({ code, keys: offenders(dict, CYRILLIC) }).toEqual({ code, keys: [] });
        }
    });

    it('keeps CJK out of the Latin and Cyrillic catalogs', () => {
        for (const code of ['en', 'ru', 'es-419', 'de', 'ptBR']) {
            expect({ code, keys: offenders(catalogs[code], CJK) }).toEqual({ code, keys: [] });
        }
    });

    it('uses no Hangul anywhere, since Korean is not a shipped locale', () => {
        for (const [code, dict] of Object.entries(catalogs)) {
            expect({ code, keys: offenders(dict, HANGUL) }).toEqual({ code, keys: [] });
        }
    });
});
