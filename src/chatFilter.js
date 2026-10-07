import { CHAT_FILTER_TERMS } from './data/chatFilterTerms.js';

export const CHAT_MAX_CODEPOINTS = 400;
export const CHAT_MAX_UTF8_BYTES = 1600;
export const CHAT_FILTER_VERSION = 1;

const ZERO_WIDTH = /[\u00ad\u180e\u200b-\u200d\u2060\ufeff]|\u034f/gu;
const CONTROL = /[\p{Cc}\p{Cf}]/u;
const LETTER = /\p{L}/u;
const SUPPORTED_LETTER = /[\p{Script_Extensions=Latin}\p{Script_Extensions=Cyrillic}\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}]/u;
const WORD_CHARACTER = /[\p{L}\p{M}\p{N}_]/u;
const CJK_CHARACTER = /[\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}]/u;

// A small explicit set, not a claim of implementing the Unicode confusables
// standard. Applying the same mapping to terms preserves Russian matching.
const LOOKALIKES = Object.freeze({
    а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', х: 'x', у: 'y',
    к: 'k', м: 'm', т: 't', в: 'b', н: 'h', і: 'i', ј: 'j', 'ß': 'ss'
});
const LETTER_PATTERNS = Object.freeze({
    a: '[a@4]', b: '[b8]', e: '[e3]', i: '[i1!|]',
    o: '[o0]', s: '[s$5]', t: '[t7+]'
});
// Bounded separators catch f.u.c.k, f u c k and punctuation/combining-mark
// insertion without permitting unbounded regular-expression backtracking.
const SEPARATOR = '[\\s\\p{P}\\p{S}\\p{M}]{0,3}';

function reject(reason) {
    return { ok: false, text: '', filtered: false, reason };
}

function inputProblem(text) {
    // Bound work before allocating normalization buffers. Every code point
    // occupies at most two UTF-16 code units.
    if (text.length > CHAT_MAX_CODEPOINTS * 2) return 'too-long';
    let count = 0;
    let bytes = 0;
    for (const character of text) {
        const code = character.codePointAt(0);
        if (code >= 0xd800 && code <= 0xdfff) return 'invalid-unicode';
        count += 1;
        bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
        if (count > CHAT_MAX_CODEPOINTS || bytes > CHAT_MAX_UTF8_BYTES) return 'too-long';
    }
    return null;
}

function canonicalCharacter(character) {
    return [...character.normalize('NFKC').toLowerCase()].map((lower) => LOOKALIKES[lower] ?? lower).join('');
}

function canonicalText(text) {
    return [...text.normalize('NFKC')].map(canonicalCharacter).join('');
}

function escapePattern(character) {
    return character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Compiled on first use: building every term's pattern at import cost ~150 ms
// of main thread during boot (~600 ms at Lighthouse's mobile throttle, issue
// #106), and nothing filters chat until a message is sent or received.
let compiledRules = null;
function getRules() {
    if (compiledRules) return compiledRules;
    const rules = [];
    const seenRules = new Set();
    for (const dictionary of Object.values(CHAT_FILTER_TERMS)) {
        for (const [kind, terms] of Object.entries(dictionary)) {
            for (const term of terms) {
                const canonical = canonicalText(term);
                const key = `${kind}:${canonical}`;
                if (seenRules.has(key)) continue;
                seenRules.add(key);
                const pattern = [...canonical]
                    .map((character) => LETTER_PATTERNS[character] ?? escapePattern(character))
                    .join(SEPARATOR);
                rules.push({
                    pattern: new RegExp(pattern, 'gu'),
                    bounded: kind === 'words',
                    cjk: CJK_CHARACTER.test(term)
                });
            }
        }
    }
    compiledRules = rules;
    return rules;
}

function isAdjacentWordCharacter(character, cjkTerm) {
    if (!character || !WORD_CHARACTER.test(character)) return false;
    // A Latin/Russian word in a Japanese/Chinese sentence still has a word
    // boundary at the script change. Do not join two Latin/Cyrillic names.
    return cjkTerm || !CJK_CHARACTER.test(character);
}

/**
 * The mandatory shared client/relay lexical baseline.
 *
 * Success: { ok: true, text, filtered }. `text` is normalized and safe to
 * display ONLY through textContent (this is not an HTML sanitizer).
 * Failure: { ok: false, text: '', filtered: false, reason }; callers must show
 * a localized error and never deliver the original input as a fallback.
 *
 * UI locale cannot disable another language's dictionary. Unsupported letter
 * scripts and bidi/control characters fail explicitly rather than appearing
 * to have passed a dictionary which does not cover them. Common whitespace
 * is collapsed; zero-width joining/spacing characters are removed.
 * `filtered` means a dictionary span was masked, not mere normalization.
 */
export function filterChatText(input) {
    if (typeof input !== 'string') return reject('invalid-type');
    const problem = inputProblem(input) || inputProblem(input.normalize('NFKC'));
    if (problem) return reject(problem);

    const normalized = input.normalize('NFC')
        .replace(ZERO_WIDTH, '')
        .replace(/[\t\r\n]/g, ' ')
        .replace(/\s+/gu, ' ')
        .trim();
    if (!normalized) return reject('empty');
    const normalizedProblem = inputProblem(normalized);
    if (normalizedProblem) return reject(normalizedProblem);
    if (CONTROL.test(normalized)) return reject('unsupported-control');
    for (const character of normalized) {
        if (LETTER.test(character) && !SUPPORTED_LETTER.test(character)) {
            return reject('unsupported-script');
        }
    }

    // Index every canonical UTF-16 code unit back to its displayed code point.
    // Lowercasing or ß -> ss can expand a character, so regex offsets cannot
    // index the original text directly.
    const characters = [...normalized];
    const offsets = [];
    let canonical = '';
    characters.forEach((character, index) => {
        const mapped = canonicalCharacter(character);
        canonical += mapped;
        for (let unit = 0; unit < mapped.length; unit += 1) offsets.push(index);
    });
    const masked = new Set();
    for (const rule of getRules()) {
        rule.pattern.lastIndex = 0;
        for (const match of canonical.matchAll(rule.pattern)) {
            const first = offsets[match.index];
            const last = offsets[match.index + match[0].length - 1];
            if (rule.bounded && (
                isAdjacentWordCharacter(characters[first - 1], rule.cjk)
                || isAdjacentWordCharacter(characters[last + 1], rule.cjk)
            )) continue;
            for (let index = first; index <= last; index += 1) masked.add(index);
        }
    }
    return {
        ok: true,
        text: characters.map((character, index) => masked.has(index) ? '*' : character).join(''),
        filtered: masked.size > 0
    };
}
