import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { localizeCatalog, refreshCatalogs, flattenCatalog } from './i18nCatalog.js';
import { setLocale } from './i18n.js';
import { DIALOGUE_LINES, DIALOGUE_REGISTERS } from './data/dialogueLines.js';
import { CODEX_ENTRIES } from './data/codex.js';
import { LEADER_DIALOGUE } from './data/campDialogue.js';
import en from './locales/en.json' with { type: 'json' };

describe('narrative catalogs', () => {
    beforeEach(() => {
        const windowMock = new EventTarget();
        windowMock.localStorage = {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
            removeItem: vi.fn()
        };
        vi.stubGlobal('window', windowMock);
        vi.stubGlobal('localStorage', windowMock.localStorage);
        setLocale('en');
        refreshCatalogs();
    });

    afterEach(() => {
        setLocale('en');
        refreshCatalogs();
        vi.unstubAllGlobals();
    });

    it('exports the authored English by default', () => {
        expect(DIALOGUE_LINES.lowO2[0]).toBe(
            'Life support advisory: breathing remains optional only in archived training material.'
        );
        expect(CODEX_ENTRIES[0].name).toBe('CYBERSNAIL');
    });

    it('keeps identity between the corporate register and DIALOGUE_LINES', () => {
        // Consumers read DIALOGUE_REGISTERS.corporate and DIALOGUE_LINES
        // interchangeably; wrapping must not fork them into two objects.
        expect(DIALOGUE_REGISTERS.corporate).toBe(DIALOGUE_LINES);
    });

    it('leaves identifier fields untranslated', () => {
        // id/category/image are lookup keys and asset paths, not prose.
        expect(CODEX_ENTRIES[0].id).toBe('cybersnail');
        expect(CODEX_ENTRIES[0].image.startsWith('/')).toBe(true);
        expect(LEADER_DIALOGUE.kaelen.stages[0].next.talks).toBe(2);
    });

    it('falls back to English for a locale with no narrative translations', () => {
        setLocale('ru');
        refreshCatalogs();
        expect(DIALOGUE_LINES.lowO2[0]).toBe(
            'Life support advisory: breathing remains optional only in archived training material.'
        );
    });

    it('swaps content in place when a translation exists', () => {
        // Mutating a live structure rather than reassigning the export is what
        // lets consumers hold a reference (const pool = DIALOGUE_LINES.lowO2)
        // and still see the new locale.
        const pool = DIALOGUE_LINES.lowO2;
        const source = { greeting: 'HELLO OPERATOR' };
        const live = localizeCatalog('narrative.__test', source);
        expect(live.greeting).toBe('HELLO OPERATOR');

        setLocale('de');
        refreshCatalogs();
        expect(DIALOGUE_LINES.lowO2).toBe(pool);
    });

    it('flattens a catalog into extractable key/text pairs', () => {
        const flat = flattenCatalog('x', {
            a: 'one',
            b: { id: 'skipme', text: 'two' },
            c: ['three']
        }, { skip: ['id'] });
        expect(flat).toEqual({
            'x.a': 'one',
            'x.b.text': 'two',
            'x.c.0': 'three'
        });
    });

    it('has every extracted narrative key present in en.json', () => {
        const narrative = en.narrative;
        expect(narrative).toBeTruthy();
        expect(narrative.dialogue.corporate.lowO2['0']).toBe(DIALOGUE_LINES.lowO2[0]);
        expect(narrative.codexEntries['0'].blurb).toBe(CODEX_ENTRIES[0].blurb);
    });
});
