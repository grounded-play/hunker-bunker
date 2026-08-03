import { describe, expect, it } from 'vitest';
import { generatedTextMatches, normalizeGeneratedText } from './generated-text.js';

describe('generated text comparison', () => {
    it('treats Windows and Unix line endings as equivalent', () => {
        expect(normalizeGeneratedText('one\r\ntwo\rthree\n')).toBe('one\ntwo\nthree\n');
        expect(generatedTextMatches('one\r\ntwo\r\n', 'one\ntwo\n')).toBe(true);
    });
});
