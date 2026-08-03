import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { getDrmWrapPaths, runSteamDrmWrap } from './steam-drm-wrap.js';

describe('steam-drm-wrap helper', () => {
    it('computes expected default paths', () => {
        const paths = getDrmWrapPaths('/test/root');
        expect(paths.winUnpackedExe).toBe(path.join('/test/root', 'dist_electron', 'win-unpacked', 'hunker-bunker.exe'));
    });

    it('returns exe_missing when packaged binary is not built', () => {
        const result = runSteamDrmWrap({
            winExe: '/nonexistent/path/app.exe',
            drmTool: '/nonexistent/path/drmwrap.exe',
            quiet: true
        });
        expect(result.success).toBe(false);
        expect(result.status).toBe('exe_missing');
    });
});
