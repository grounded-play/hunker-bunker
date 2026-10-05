import { describe, expect, it } from 'vitest';
import { loaderBuildLabel, versionLabel } from './buildLabels.js';

describe('build labels', () => {
    const info = {
        version: '2.4.14-beta',
        commit: '51c952c9',
        branch: 'dev/sprint-49',
        dirty: false,
        steamBuild: '',
        builtAt: '2026-10-05T08:01:00.000Z'
    };

    it('shows the package version on the title, not a fixed number', () => {
        expect(versionLabel(info)).toBe('v2.4.14-beta');
        expect(versionLabel({ ...info, version: 'v2.5.0' })).toBe('v2.5.0');
    });

    it('labels a build without a semver as such', () => {
        expect(versionLabel({ ...info, version: 'dev' })).toBe('DEV');
        expect(versionLabel({})).toBe('');
    });

    it('leads the loader tag with the version, then sprint and commit', () => {
        expect(loaderBuildLabel(info)).toBe('v2.4.14-beta // SPRINT 49 // 51c952c9');
        expect(loaderBuildLabel({ ...info, dirty: true, steamBuild: '25596041' }))
            .toBe('v2.4.14-beta // SPRINT 49 // 51c952c9-dirty // PIPELINE 25596041');
        expect(loaderBuildLabel({ ...info, branch: 'mothership' })).toBe('v2.4.14-beta // MOTHERSHIP // 51c952c9');
    });
});
