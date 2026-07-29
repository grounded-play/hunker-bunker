import { describe, expect, it } from 'vitest';
import { findUnsupportedClaims } from './audit-steam-claims.js';

const claims = {
    cloud: { accepted: false, phrases: ['steam cloud support', 'fully synchronized'] },
    achievements: { accepted: true, phrases: ['steam achievements support'] }
};

describe('Steam claims control', () => {
    it('flags positive claims without accepted evidence', () => {
        const violations = findUnsupportedClaims(
            'Steam Cloud Support keeps your saves fully synchronized.',
            claims,
            'copy.md'
        );
        expect(violations.map((item) => item.phrase)).toEqual(['steam cloud support', 'fully synchronized']);
    });

    it('allows clearly held or pending wording', () => {
        expect(findUnsupportedClaims(
            'Steam Cloud support is pending until the two-machine test passes.',
            claims
        )).toEqual([]);
    });

    it('allows claims whose evidence is accepted', () => {
        expect(findUnsupportedClaims('Steam Achievements Support is included.', claims)).toEqual([]);
    });
});

