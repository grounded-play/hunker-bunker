import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { deriveCues, planAudio, muxArgs, CUE_LAYERS, FPS } from './build-ending-audio.mjs';

const manifest = JSON.parse(readFileSync('scripts/blender/manifests/ending-shots.json', 'utf8'));

describe('ending audio cue derivation', () => {
    it('reads the palette the brief names in backticks', () => {
        const cue = deriveCues({ id: 'X', assets: 'beds; `human_cold` dominant', startFrame: 0, endFrame: 23 }, { id: 'S' });
        expect(cue.bed).toBe('human_cold');
    });

    it('falls back to room tone when the brief names no palette', () => {
        expect(deriveCues({ id: 'X', assets: 'some crates', startFrame: 0, endFrame: 1 }, { id: 'S' }).bed).toBe('room_tone');
    });

    it('derives spot cues from the action text', () => {
        const cue = deriveCues({ id: 'X', action: 'The ramp opens as the scanner sweeps', assets: '', startFrame: 0, endFrame: 1 }, { id: 'S' });
        expect(cue.spot).toEqual(expect.arrayContaining(['scanner_sweep', 'door_movement']));
    });

    it('distinguishes a hard cut from a carried tail', () => {
        const hard = deriveCues({ id: 'X', transition: 'Hard cut on sweep', startFrame: 0, endFrame: 1 }, { id: 'S' });
        const soft = deriveCues({ id: 'Y', transition: 'Slow dissolve', startFrame: 0, endFrame: 1 }, { id: 'S' });
        expect(hard.transition).toBe('hard_cut');
        expect(soft.transition).toBe('carry_over');
    });

    it('counts duration inclusively at the project frame rate', () => {
        const cue = deriveCues({ id: 'X', startFrame: 0, endFrame: 23 }, { id: 'S' });
        expect(cue.seconds).toBeCloseTo(24 / FPS, 2);
    });

    it('covers every shot in the real manifest', () => {
        const plan = planAudio(manifest);
        expect(plan.cues).toHaveLength(20);
        expect(plan.totalSeconds).toBeGreaterThan(30);
    });

    it('names the three layers a finished cut needs', () => {
        expect(CUE_LAYERS).toEqual(['bed', 'spot', 'transition']);
    });
});

describe('mux', () => {
    it('copies the video stream rather than re-encoding the render', () => {
        const args = muxArgs('in.webm', 'a.opus', 'out.webm');
        expect(args).toEqual(expect.arrayContaining(['-c:v', 'copy']));
    });

    it('clips to the shorter input so a long bed cannot extend the picture', () => {
        expect(muxArgs('v', 'a', 'o')).toContain('-shortest');
    });
});
