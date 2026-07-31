import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { isQaToolsEnabled, normalizeBetaName } = require('./qa-tools.cjs');

describe('packaged QA tool authorization', () => {
    it('enables tools on a named Steam beta branch', () => {
        expect(isQaToolsEnabled({ betaName: 'beta' })).toBe(true);
        expect(isQaToolsEnabled({ betaName: 'deck-qa' })).toBe(true);
    });

    it('keeps default and public builds locked', () => {
        expect(normalizeBetaName(null)).toBeNull();
        expect(isQaToolsEnabled({ betaName: '' })).toBe(false);
        expect(isQaToolsEnabled({ betaName: 'default' })).toBe(false);
        expect(isQaToolsEnabled({ betaName: 'public' })).toBe(false);
    });

    it('retains the explicit local QA override', () => {
        expect(isQaToolsEnabled({ override: '1' })).toBe(true);
    });
});
