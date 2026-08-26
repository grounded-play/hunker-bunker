import { describe, expect, it } from 'vitest';
import {
    SKY_SHEETS,
    frameIndexForSkySheet,
    frameRectForSkySheet,
    isSkySheetFinished
} from './skySheets.js';

describe('SKY_SHEETS', () => {
    it('defines all ten animations as exact GPU-safe grids', () => {
        expect(Object.keys(SKY_SHEETS)).toHaveLength(10);
        for (const definition of Object.values(SKY_SHEETS)) {
            expect(definition.columns * definition.rows).toBe(definition.frames);
            expect(definition.width).toBe(definition.columns * definition.cellWidth);
            expect(definition.height).toBe(definition.rows * definition.cellHeight);
            expect(Math.max(definition.width, definition.height)).toBeLessThanOrEqual(4096);
            expect(definition.fps).toBe(12);
        }
    });

    it('maps frame indices left-to-right and then top-to-bottom', () => {
        const definition = SKY_SHEETS.sky_fx_comet_longtail;
        expect(frameRectForSkySheet(definition, 0)).toMatchObject({ column: 0, row: 0, u: 0, v: 0 });
        expect(frameRectForSkySheet(definition, 3)).toMatchObject({ column: 3, row: 0 });
        expect(frameRectForSkySheet(definition, 4)).toMatchObject({ column: 0, row: 1 });
        expect(frameRectForSkySheet(definition, 7)).toMatchObject({ column: 3, row: 1 });
    });

    it('loops only loop-mode sheets', () => {
        const satellite = SKY_SHEETS.sky_fx_satellite_tumble;
        expect(frameIndexForSkySheet(satellite, satellite.frames / satellite.fps)).toBe(0);

        const comet = SKY_SHEETS.sky_fx_comet_longtail;
        expect(frameIndexForSkySheet(comet, 99)).toBe(comet.frames - 1);
        expect(isSkySheetFinished(comet, comet.frames / comet.fps)).toBe(true);
        expect(isSkySheetFinished(satellite, 99)).toBe(false);
    });

    it('holds hold-mode sheets on their final frame', () => {
        const spore = SKY_SHEETS.sky_fx_spore_bloom_zenith;
        expect(frameIndexForSkySheet(spore, 99)).toBe(spore.frames - 1);
        expect(isSkySheetFinished(spore, 99)).toBe(false);
    });
});
