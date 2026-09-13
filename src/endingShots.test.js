import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
    extractShots, validateShots, parseFrameRange, parseLensMm, parseSets
} from '../scripts/extract-ending-shots.mjs';

const DOC = 'docs/planning/blender-ending-scene-blocks-and-shot-list-2026-09-12.md';

describe('shot-table parsing', () => {
    it('reads frames from the trailing half of a timing cell', () => {
        expect(parseFrameRange('1:18-3:06 / 43-78')).toEqual({ startFrame: 43, endFrame: 78 });
        expect(parseFrameRange('0:00-1:18 / 0-42')).toEqual({ startFrame: 0, endFrame: 42 });
    });

    it('tolerates en dashes, which markdown editors insert silently', () => {
        expect(parseFrameRange('0:00–1:18 / 0–42')).toEqual({ startFrame: 0, endFrame: 42 });
    });

    it('returns null rather than guessing at an unparsable range', () => {
        // A guessed frame range renders the wrong length of shot and nobody
        // notices until the cut is assembled.
        expect(parseFrameRange('TBD')).toBeNull();
        expect(parseFrameRange('5:00 / 90-10')).toBeNull();
    });

    it('reads a lens in mm from free prose', () => {
        expect(parseLensMm('28 mm-equivalent wide, low track right')).toBe(28);
        expect(parseLensMm('85 mm collar close-up, shallow focus')).toBe(85);
        expect(parseLensMm('extreme orbital wide, static')).toBeNull();
    });

    it('reads every set named on a primary-sets line', () => {
        expect(parseSets('**Primary sets:** SET-D then SET-A.')).toEqual(['SET-D', 'SET-A']);
        expect(parseSets('**Primary set:** SET-A with ballistic partition installed.')).toEqual(['SET-A']);
    });
});

describe('against the live brief', () => {
    const sequences = extractShots(readFileSync(DOC, 'utf8'));

    it('parses all five ending sequences', () => {
        // The five endings with no cutscene, per the asset gap audit.
        expect(sequences).toHaveLength(5);
        expect(sequences.map((s) => s.id)).toEqual([
            'MOTHERSHIP_INFECTION', 'ALIEN_EXODUS', 'OUTED_ESCAPE', 'FAILED_CARRIER', 'EMPTY_HUSK'
        ]);
    });

    it('gives every sequence shots and a set', () => {
        for (const seq of sequences) {
            expect(seq.shots.length, `${seq.id} has no shots`).toBeGreaterThan(0);
            expect(seq.sets.length, `${seq.id} declares no set`).toBeGreaterThan(0);
        }
    });

    it('keeps shot ids unique across the whole brief', () => {
        const ids = sequences.flatMap((s) => s.shots.map((sh) => sh.id));
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('gives every shot a usable frame range', () => {
        const bad = sequences.flatMap((s) => s.shots)
            .filter((sh) => sh.startFrame === null)
            .map((sh) => sh.id);
        expect(bad, `shots with unparsable frame ranges: ${bad}`).toEqual([]);
    });

    it('reports which shots still lack a lens rather than silently defaulting', () => {
        // Surfaces gaps in the brief without editing it. EH-04 currently has
        // none; the scene builder falls back to a documented default and logs.
        const problems = validateShots(sequences).filter((p) => p.includes('lens'));
        expect(problems.every((p) => /^[A-Z]{2,3}-\d{2}: no lens/.test(p))).toBe(true);
    });
});
