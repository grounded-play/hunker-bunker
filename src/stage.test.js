import { describe, expect, it } from 'vitest';
import {
    STAGE_WIDTH,
    STAGE_HEIGHT,
    SAFE_FRAME_HUD,
    SAFE_FRAME_TEXT,
    TEXT_FLOOR_PX,
    computeStageTransform,
    toStagePoint,
    isInsideSafeFrame
} from './stage.js';

describe('stage constants', () => {
    it('locks the canonical 16:10 logical stage and safe-frame tokens', () => {
        expect(STAGE_WIDTH).toBe(1280);
        expect(STAGE_HEIGHT).toBe(800);
        expect(SAFE_FRAME_HUD).toBe(32);
        expect(SAFE_FRAME_TEXT).toBe(48);
        expect(TEXT_FLOOR_PX).toBe(18);
    });
});

describe('computeStageTransform', () => {
    it('is identity at native Steam Deck resolution', () => {
        expect(computeStageTransform(1280, 800)).toEqual({
            scale: 1,
            stageWidth: 1280,
            stageHeight: 800,
            offsetX: 0,
            offsetY: 0
        });
    });

    it('scales uniformly on a 16:10 host with no matte', () => {
        const t = computeStageTransform(2560, 1600);
        expect(t.scale).toBe(2);
        expect(t.stageWidth).toBe(2560);
        expect(t.stageHeight).toBe(1600);
        expect(t.offsetX).toBe(0);
        expect(t.offsetY).toBe(0);
    });

    it('pillarboxes a 16:9 host without stretching', () => {
        const t = computeStageTransform(1920, 1080);
        expect(t.scale).toBeCloseTo(1080 / 800, 10);
        expect(t.stageHeight).toBeCloseTo(1080, 10);
        expect(t.stageWidth).toBeCloseTo(1280 * (1080 / 800), 10);
        expect(t.offsetY).toBe(0);
        expect(t.offsetX).toBeCloseTo((1920 - 1280 * (1080 / 800)) / 2, 10);
    });

    it('mattes the sides heavily on an ultrawide host', () => {
        const t = computeStageTransform(3440, 1440);
        expect(t.scale).toBeCloseTo(1440 / 800, 10);
        expect(t.offsetY).toBe(0);
        expect(t.offsetX).toBeGreaterThan(300);
        expect(t.stageWidth / t.stageHeight).toBeCloseTo(1.6, 10);
    });

    it('letterboxes a taller-than-16:10 host', () => {
        const t = computeStageTransform(1280, 1024);
        expect(t.scale).toBe(1);
        expect(t.offsetX).toBe(0);
        expect(t.offsetY).toBe((1024 - 800) / 2);
    });

    it('returns the identity transform for degenerate host sizes', () => {
        for (const [w, h] of [[0, 800], [1280, 0], [-5, 600], [NaN, 800], [1280, Infinity]]) {
            expect(computeStageTransform(w, h)).toEqual({
                scale: 1,
                stageWidth: 1280,
                stageHeight: 800,
                offsetX: 0,
                offsetY: 0
            });
        }
    });
});

describe('toStagePoint', () => {
    it('maps the host stage origin to logical 0,0', () => {
        const t = computeStageTransform(1920, 1080);
        const p = toStagePoint(t.offsetX, 0, t);
        expect(p.x).toBeCloseTo(0, 8);
        expect(p.y).toBeCloseTo(0, 8);
        expect(p.inside).toBe(true);
    });

    it('maps the host stage center to logical 640,400', () => {
        const t = computeStageTransform(3440, 1440);
        const p = toStagePoint(t.offsetX + t.stageWidth / 2, t.offsetY + t.stageHeight / 2, t);
        expect(p.x).toBeCloseTo(640, 8);
        expect(p.y).toBeCloseTo(400, 8);
        expect(p.inside).toBe(true);
    });

    it('flags matte clicks as outside the stage', () => {
        const t = computeStageTransform(3440, 1440);
        const p = toStagePoint(10, 700, t);
        expect(p.inside).toBe(false);
        expect(p.x).toBeLessThan(0);
    });
});

describe('isInsideSafeFrame', () => {
    it('accepts points inside the margin and rejects the bleed', () => {
        expect(isInsideSafeFrame(640, 400, SAFE_FRAME_HUD)).toBe(true);
        expect(isInsideSafeFrame(31, 400, SAFE_FRAME_HUD)).toBe(false);
        expect(isInsideSafeFrame(640, 799, SAFE_FRAME_HUD)).toBe(false);
        expect(isInsideSafeFrame(48, 48, SAFE_FRAME_TEXT)).toBe(true);
        expect(isInsideSafeFrame(47, 400, SAFE_FRAME_TEXT)).toBe(false);
    });
});
