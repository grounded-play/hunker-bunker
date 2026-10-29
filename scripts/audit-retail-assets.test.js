import { describe, expect, it } from 'vitest';
import {
    classifyPublicAsset,
    dataKeyedAssetReferences,
    extractAssetReferences,
    jsonReportMatches,
    normalizeTextAssetContent
} from './audit-retail-assets.js';

describe('retail asset audit', () => {
    it('normalizes checkout-specific line endings before measuring text assets', () => {
        expect(normalizeTextAssetContent('one\r\ntwo\rthree\n')).toBe('one\ntwo\nthree\n');
    });

    it('accepts an equivalent tracked report with Windows line endings', () => {
        const report = { version: 1, measured: { publicBytes: 42 } };
        const windowsJson = `${JSON.stringify(report, null, 2).replace(/\n/g, '\r\n')}\r\n`;

        expect(jsonReportMatches(windowsJson, report)).toBe(true);
    });

    it('extracts root-relative runtime assets and strips query/hash suffixes', () => {
        expect(extractAssetReferences(`
            const image = '/sprites/player.png?v=2';
            background: url("/ui/frame.webp#main");
            const model = '/3d/runtime/engineer-rigged-gestures.glb';
            import local from './module.js';
        `)).toEqual([
            '3d/runtime/engineer-rigged-gestures.glb',
            'sprites/player.png',
            'ui/frame.webp'
        ]);
    });

    it('credits index.html menu artwork installed as bare names in the --asset-* map', () => {
        expect(extractAssetReferences(`
            var menuArtwork = {
              '--asset-gear-vault-main': 'gear_vault_main.webp',
              '--asset-briefing-menu-bg': 'menu_bg_v3.webp'
            };
            const label = 'not-an-asset.webp';
        `)).toEqual(['gear_vault_main.webp', 'menu_bg_v3.webp']);
    });

    it('credits the world-expansion models resolved from their data ids', () => {
        const refs = dataKeyedAssetReferences();
        expect(refs).toHaveLength(80);
        for (const ref of refs) expect(ref).toMatch(/^3d\/runtime\/new3ds\/[a-z0-9_]+\.glb$/);
    });

    it('classifies explicit references as runtime required', () => {
        expect(classifyPublicAsset('odd/location.png', new Set(['odd/location.png']))).toBe('runtime-required');
        expect(classifyPublicAsset('3d/runtime/surfaces/tex_floor_deck_drain_a_albedo.ktx2', new Set())).toBe('runtime-required');
        expect(classifyPublicAsset('3d/runtime/decals/decal_alien_tracks_a_detail.ktx2', new Set())).toBe('runtime-required');
    });

    it('keeps source/reference and generated intermediates out of runtime classification', () => {
        expect(classifyPublicAsset('art/concepts/ship.png', new Set())).toBe('source-reference');
        expect(classifyPublicAsset('art/player-preview.png', new Set())).toBe('source-reference');
        expect(classifyPublicAsset('art/generated/frame.png', new Set())).toBe('generated-intermediate');
    });

    it('recognizes generated song interstitials as intentional runtime media', () => {
        expect(classifyPublicAsset('interstitials/int_01_key.webp', new Set())).toBe('runtime-required');
    });

    it('recognizes data-keyed world dressing families as runtime media', () => {
        for (const asset of [
            'door_bio.png',
            'decal_machine_cult_shrine.png',
            'prop_iron_guild_dogtags.png',
            'scatter_horizon_black_box.png'
        ]) {
            expect(classifyPublicAsset(asset, new Set())).toBe('runtime-required');
        }
    });
});
