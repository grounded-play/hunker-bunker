import { describe, expect, it } from 'vitest';
import { isTerrainTextureReady } from './terrainTextureReadiness.js';

describe('terrain texture readiness', () => {
    it('does not treat the temporary checker canvas as final floor art', () => {
        expect(isTerrainTextureReady({
            image: { width: 32, height: 32 },
            userData: { isProceduralFallback: true }
        })).toBe(false);
    });

    it('accepts a decoded source image after the loader clears the fallback flag', () => {
        expect(isTerrainTextureReady({
            image: { naturalWidth: 1024, naturalHeight: 1024 },
            userData: { isProceduralFallback: false }
        })).toBe(true);
    });

    it('rejects empty and undecoded textures', () => {
        expect(isTerrainTextureReady(null)).toBe(false);
        expect(isTerrainTextureReady({ image: {}, userData: { isProceduralFallback: false } })).toBe(false);
    });
});
