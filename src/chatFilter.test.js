import { describe, expect, it } from 'vitest';
import { CHAT_MAX_CODEPOINTS, CHAT_MAX_UTF8_BYTES, filterChatText } from './chatFilter.js';
import { CHAT_FILTER_LOCALES, CHAT_FILTER_TERMS } from './data/chatFilterTerms.js';

describe('mandatory seven-language chat baseline', () => {
    it('has a fixed dictionary union without depending on the selected UI language', () => {
        expect(CHAT_FILTER_LOCALES).toEqual(['en', 'de', 'es-419', 'ja', 'pt-BR', 'ru', 'zh-CN']);
        expect(Object.isFrozen(CHAT_FILTER_TERMS)).toBe(true);
        const result = filterChatText('fuck scheiße mierda クソ porra блядь 傻逼');
        expect(result.ok).toBe(true);
        expect(result.filtered).toBe(true);
        expect(result.text).toMatch(/^[* ]+$/);
    });

    it.each([
        ['en', 'FUCK! That is bullshit.', '****! That is ********.'],
        ['de', 'Du Arschloch!', 'Du *********!'],
        ['es-419', 'Qué mierda y cabrón.', 'Qué ****** y ******.'],
        ['ja', 'これはセックスです', 'これは****です'],
        ['pt-BR', 'Que caralho, porra!', 'Que *******, *****!'],
        ['ru', 'Это блядь и секс.', 'Это ***** и ****.'],
        ['zh-CN', '你这个傻逼。禁止色情。', '你这个**。禁止**。']
    ])('masks %s profanity and sexual terms in ordinary sentences', (_locale, input, expected) => {
        expect(filterChatText(input)).toEqual({ ok: true, text: expected, filtered: true });
    });

    it.each([
        'Scunthorpe and Dickinson are assisting Cassandra.',
        'The classic class has a compass and a cockpit.',
        'Sussex, Essex, and Middlesex are place names.',
        'Hallo Frick, schicke die klassische Nachricht.',
        'El conejo usa el cono y disfruta la computadora.',
        'A disputa precisa de computação e compilação.',
        'Спасибо, команда. Страховка и корабль готовы.',
        'やくそくをして、ばかりという言葉を読む。',
        '操作设置，改变性格。我妈的手机在这里。',
        'Fukuda and Shitake joined our squad.'
    ])('preserves benign names and substring collisions: %s', (input) => {
        expect(filterChatText(input)).toEqual({ ok: true, text: input, filtered: false });
    });

    it.each([
        'f.u.c.k', 'f u c k', 'f-u-c-k', 'f!u!c!k',
        'f_u_c_k', 'sh1t', '$h!t', 'a$$hole', 'p0rn', 'p3nis',
        'ＦＵＣＫ', 'ｓｈｉｔ', 'f\u200bu\u200cc\u200dk',
        'fuсk', 'fucк', 'sеx', 'сyкa', 'f\u034fu\u034fc\u034fk'
    ])('handles bounded separator, leet, Unicode and mixed-script evasion: %s', (input) => {
        const result = filterChatText(input);
        expect(result.ok).toBe(true);
        expect(result.filtered).toBe(true);
        expect(result.text).toMatch(/^\*+$/);
    });

    it('masks Latin profanity beside Han/Kana without losing surrounding text', () => {
        expect(filterChatText('你fuckだ')).toEqual({ ok: true, text: '你****だ', filtered: true });
    });

    it('maps normalization expansions and astral symbols to the correct display span', () => {
        expect(filterChatText('🚀 SCHEIẞE and shit 💙')).toEqual({
            ok: true, text: '🚀 ******* and **** 💙', filtered: true
        });
        expect(filterChatText('Cafe\u0301　ready\nnow')).toEqual({
            ok: true, text: 'Café ready now', filtered: false
        });
    });

    it('combines overlapping terms without masking adjacent innocent words', () => {
        expect(filterChatText('motherfucker, fuck! Ready?')).toEqual({
            ok: true, text: '************, ****! Ready?', filtered: true
        });
    });

    it('is deterministic and idempotent so client and relay can both filter', () => {
        const first = filterChatText('We saw f.u.c.k and 色情.');
        const second = filterChatText(first.text);
        expect(first.filtered).toBe(true);
        expect(second).toEqual({ ok: true, text: first.text, filtered: false });
        expect(filterChatText('We saw f.u.c.k and 色情.')).toEqual(first);
    });
});

describe('chat input contracts fail explicitly', () => {
    it.each([null, undefined, 42, {}, [], new String('hello')])('rejects non-string input %s', (input) => {
        expect(filterChatText(input)).toEqual({ ok: false, text: '', filtered: false, reason: 'invalid-type' });
    });

    it.each(['', ' \t\n ', '\u200b\u200c\u200d'])('rejects empty visible content', (input) => {
        expect(filterChatText(input).reason).toBe('empty');
    });

    it('enforces code-point and byte budgets before and after normalization', () => {
        expect(CHAT_MAX_CODEPOINTS).toBe(400);
        expect(CHAT_MAX_UTF8_BYTES).toBe(1600);
        expect(filterChatText('🚀'.repeat(400)).ok).toBe(true);
        expect(filterChatText('a'.repeat(400)).ok).toBe(true);
        expect(filterChatText('a'.repeat(401)).reason).toBe('too-long');
        expect(filterChatText('🚀'.repeat(401)).reason).toBe('too-long');
        expect(filterChatText('ﬃ'.repeat(134)).reason).toBe('too-long');
        expect(filterChatText(' '.repeat(401)).reason).toBe('too-long');
    });

    it.each(['bad\ud800input', '\udfff', 'a\u0000b', 'a\u202eb', 'a\u2066b'])('rejects malformed Unicode and unsafe control state', (input) => {
        expect(filterChatText(input)).toMatchObject({ ok: false, text: '', filtered: false });
    });

    it.each(['مرحبا', '안녕하세요', 'γειά', 'fυck'])('reports scripts outside the seven-language baseline', (input) => {
        expect(filterChatText(input)).toEqual({ ok: false, text: '', filtered: false, reason: 'unsupported-script' });
    });

    it('accepts emoji, supported multilingual names, punctuation and numbers', () => {
        const text = 'Zoë Борис 美咲 小明 🚀❤️ +42 (ready!)';
        expect(filterChatText(text)).toEqual({ ok: true, text, filtered: false });
    });

    it('does not treat markup as trusted HTML', () => {
        const text = '<img src=x onerror=alert(1)>';
        expect(filterChatText(text)).toEqual({ ok: true, text, filtered: false });
        // Receivers must use textContent; HTML escaping is not this API's job.
    });
});
