import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const config = JSON.parse(readFileSync(new URL('../lighthouserc.mobile.json', import.meta.url), 'utf8'));
const workflow = readFileSync(new URL('../.github/workflows/lighthouse.yml', import.meta.url), 'utf8');

describe('mobile Lighthouse release gate', () => {
    it('uses the median of three mobile runs to reject sustained regressions without failing on one noisy runner sample', () => {
        expect(config.ci.collect.numberOfRuns).toBe(3);
        expect(config.ci.collect.settings.formFactor).toBe('mobile');
        expect(config.ci.assert.assertions['categories:performance']).toEqual([
            'error', { minScore: 0.8, aggregationMethod: 'median' }
        ]);
        expect(config.ci.assert.assertions['largest-contentful-paint'][1]).toMatchObject({
            maxNumericValue: 4000,
            aggregationMethod: 'median'
        });
        expect(config.ci.assert.assertions['total-blocking-time'][1]).toMatchObject({
            maxNumericValue: 200,
            aggregationMethod: 'median'
        });
    });

    it('runs both desktop and mobile configs in CI', () => {
        expect(workflow).toContain('lighthouserc.json');
        expect(workflow).toContain('lighthouserc.mobile.json');
        expect(workflow).toContain('configPath: ./${{ matrix.config }}');
        expect(workflow).toContain('artifactName: lighthouse-results-${{ matrix.config }}');
    });
});
