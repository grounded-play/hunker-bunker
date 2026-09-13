import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ACT2_ENDING_CUTSCENES } from '../src/act2.js';
import { outputName, planRenders, frameCount, sequenceSlug, cameraName } from './render-ending-shots.mjs';

const manifest = JSON.parse(readFileSync('scripts/blender/manifests/ending-shots.json', 'utf8'));

describe('ending shot render plan', () => {
    it('names every output exactly as the game resolves it', () => {
        // The whole point: a render that lands on a filename the game never
        // asks for is indistinguishable from no render at all.
        const shipped = new Set(Object.values(ACT2_ENDING_CUTSCENES));
        for (const sequence of manifest.sequences) {
            expect(shipped, `${sequence.id} would render to an unreferenced name`)
                .toContain(outputName(sequence).replace(/\.webm$/, ''));
        }
    });

    it('covers the five endings that have no shipped video', () => {
        const ids = manifest.sequences.map((s) => s.id).sort();
        expect(ids).toEqual([
            'ALIEN_EXODUS', 'EMPTY_HUSK', 'FAILED_CARRIER',
            'MOTHERSHIP_INFECTION', 'OUTED_ESCAPE'
        ]);
    });

    it('reports every real scene as present', () => {
        const plan = planRenders(manifest);
        expect(plan.problems).toEqual([]);
        expect(plan.shots).toHaveLength(20);
    });

    it('collects all problems rather than stopping at the first', () => {
        const plan = planRenders(manifest, { exists: () => false });
        expect(plan.problems).toHaveLength(20);
    });

    it('counts frames inclusively', () => {
        expect(frameCount({ startFrame: 0, endFrame: 42 })).toBe(43);
        expect(frameCount({ startFrame: 10, endFrame: 10 })).toBe(1);
    });

    it('treats a reversed or absent range as unusable instead of negative', () => {
        expect(frameCount({ startFrame: 40, endFrame: 10 })).toBe(0);
        expect(frameCount({})).toBe(0);
        expect(frameCount(null)).toBe(0);
    });

    it('maps a sequence id to its on-disk folder', () => {
        expect(sequenceSlug({ id: 'ALIEN_EXODUS' })).toBe('alien_exodus');
    });

    it('converts a hyphenated shot id to the underscore camera name', () => {
        // The brief writes MI-01; the production scenes name cameras CAM_MI_01.
        // Getting this wrong renders whatever camera was last active instead of
        // failing, so it is worth pinning.
        expect(cameraName({ id: 'MI-01' })).toBe('CAM_MI_01');
        expect(cameraName({ id: 'EH-04' })).toBe('CAM_EH_04');
    });

    it('targets the production scene, never the empty per-shot shell', () => {
        const plan = planRenders(manifest);
        for (const shot of plan.shots) {
            expect(shot.blend).toMatch(/blender-prerenders\/scenes\/ending_/);
        }
    });
});
