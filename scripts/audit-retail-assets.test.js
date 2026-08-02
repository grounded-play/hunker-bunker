import { describe, expect, it } from 'vitest';
import { classifyPublicAsset, extractAssetReferences } from './audit-retail-assets.js';

describe('retail asset audit', () => {
    it('extracts root-relative runtime assets and strips query/hash suffixes', () => {
        expect(extractAssetReferences(`
            const image = '/sprites/player.png?v=2';
            background: url("/ui/frame.webp#main");
            import local from './module.js';
        `)).toEqual(['sprites/player.png', 'ui/frame.webp']);
    });

    it('classifies explicit references as runtime required', () => {
        expect(classifyPublicAsset('odd/location.png', new Set(['odd/location.png']))).toBe('runtime-required');
    });

    it('keeps source/reference and generated intermediates out of runtime classification', () => {
        expect(classifyPublicAsset('art/concepts/ship.png', new Set())).toBe('source-reference');
        expect(classifyPublicAsset('art/player-preview.png', new Set())).toBe('source-reference');
        expect(classifyPublicAsset('art/generated/frame.png', new Set())).toBe('generated-intermediate');
    });

    it('recognizes generated song interstitials as intentional runtime media', () => {
        expect(classifyPublicAsset('interstitials/int_01_key.webp', new Set())).toBe('runtime-required');
    });
});
