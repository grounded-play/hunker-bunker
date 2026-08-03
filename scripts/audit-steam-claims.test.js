import { describe, expect, it } from 'vitest';
import { claimsReportMatches, findUnsupportedClaims } from './audit-steam-claims.js';

const claims = {
    cloud: { accepted: false, phrases: ['steam cloud support', 'fully synchronized'] },
    achievements: { accepted: true, phrases: ['steam achievements support'] }
};

describe('Steam claims control', () => {
    it('accepts an equivalent report checked out with Windows line endings', () => {
        const report = { version: 1, copyFiles: ['steam/store-page-description.md'], violations: [] };
        const windowsJson = `${JSON.stringify(report, null, 2).replace(/\n/g, '\r\n')}\r\n`;

        expect(claimsReportMatches(windowsJson, report)).toBe(true);
    });

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
