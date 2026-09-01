import { describe, expect, it } from 'vitest';
import { SKY_SHEETS, SKY_SHEET_PLAYBACK, frameIndexForSkySheet, frameRectFor } from './skySheets.js';

// Deliberately a separate file from skySheets.test.js: this branch is edited by
// several agents at once and that file has already been rewritten underneath a
// previous version of these checks. Keeping the contract assertions under their
// own name means a concurrent rewrite of one does not silently delete the other.

describe('sky sheet texture budget', () => {
    it('keeps every sheet inside 4096 in both dimensions', () => {
        // Over MAX_TEXTURE_SIZE a texture fails to upload rather than
        // degrading, and 8192 is a realistic floor on older hardware -- the
        // original single-row strips were 8192 wide with no headroom.
        for (const [id, definition] of Object.entries(SKY_SHEETS)) {
            expect(definition.width, `${id} width`).toBeLessThanOrEqual(4096);
            expect(definition.height, `${id} height`).toBeLessThanOrEqual(4096);
        }
    });

    it('points every sheet at a texture under the sky asset directory', () => {
        for (const [id, definition] of Object.entries(SKY_SHEETS)) {
            expect(definition.url, id).toMatch(/^\/sky\/[a-z0-9_]+\.png$/);
        }
    });

    it('only uses playback modes the runtime implements', () => {
        const known = Object.values(SKY_SHEET_PLAYBACK);
        for (const definition of Object.values(SKY_SHEETS)) {
            expect(known).toContain(definition.playback);
        }
    });
});

describe('sky sheet frame walk', () => {
    const comet = SKY_SHEETS.sky_fx_comet_longtail;
    const duration = (d) => d.frames / d.fps;

    it('never returns a frame outside the sheet, at any time', () => {
        for (const [id, definition] of Object.entries(SKY_SHEETS)) {
            for (let t = -1; t < duration(definition) * 2.5; t += 0.02) {
                const frame = frameIndexForSkySheet(definition, t);
                expect(frame, id).toBeGreaterThanOrEqual(0);
                expect(frame, id).toBeLessThanOrEqual(definition.frames - 1);
            }
        }
    });

    it('advances monotonically through a once-mode sheet', () => {
        let previous = -1;
        for (let t = 0; t <= duration(comet); t += 0.01) {
            const frame = frameIndexForSkySheet(comet, t);
            expect(frame).toBeGreaterThanOrEqual(previous);
            previous = frame;
        }
    });

    it('starts on the first frame and ends on the last', () => {
        expect(frameIndexForSkySheet(comet, 0)).toBe(0);
        expect(frameIndexForSkySheet(comet, duration(comet))).toBe(comet.frames - 1);
    });

    it('visits every single frame rather than skipping any', () => {
        const seen = new Set();
        for (let t = 0; t <= duration(comet); t += 1 / (comet.fps * 4)) {
            seen.add(frameIndexForSkySheet(comet, t));
        }
        expect(seen.size).toBe(comet.frames);
    });

    it('sizes each uv window to exactly one cell', () => {
        for (const [id, definition] of Object.entries(SKY_SHEETS)) {
            const rect = frameRectFor(definition, 0);
            expect(rect.repeatX, id).toBeCloseTo(1 / definition.columns, 6);
            expect(rect.repeatY, id).toBeCloseTo(1 / definition.rows, 6);
        }
    });

    it('keeps every uv window inside the texture', () => {
        for (const [id, definition] of Object.entries(SKY_SHEETS)) {
            for (let frame = 0; frame < definition.frames; frame += 1) {
                const rect = frameRectFor(definition, frame / definition.fps);
                expect(rect.offsetX, id).toBeGreaterThanOrEqual(0);
                expect(rect.offsetY, id).toBeGreaterThanOrEqual(-1e-9);
                expect(rect.offsetX + rect.repeatX, id).toBeLessThanOrEqual(1 + 1e-9);
                expect(rect.offsetY + rect.repeatY, id).toBeLessThanOrEqual(1 + 1e-9);
            }
        }
    });

    it('wraps a loop-mode sheet back to its first frame', () => {
        const tumble = SKY_SHEETS.sky_fx_satellite_tumble;
        expect(tumble.playback).toBe(SKY_SHEET_PLAYBACK.LOOP);
        expect(frameIndexForSkySheet(tumble, duration(tumble))).toBe(0);
    });

    it('parks a hold-mode sheet on its final frame indefinitely', () => {
        const bloom = SKY_SHEETS.sky_fx_spore_bloom_zenith;
        expect(bloom.playback).toBe(SKY_SHEET_PLAYBACK.HOLD);
        expect(frameIndexForSkySheet(bloom, duration(bloom) * 10)).toBe(bloom.frames - 1);
    });
});
