import { describe, it, expect } from 'vitest';
import {
    parseSilences, speechSpans, classifySpans, splitIntoLines,
    MIN_TAKE_SEC, MAX_TAKE_SEC
} from './segment-vo-takes.mjs';

describe('parseSilences', () => {
    it('pulls start/end pairs out of ffmpeg stderr', () => {
        const stderr = [
            '[silencedetect @ 0x1] silence_start: 1.5',
            '[silencedetect @ 0x1] silence_end: 2.7 | silence_duration: 1.2',
            '[silencedetect @ 0x1] silence_start: 4.0',
            '[silencedetect @ 0x1] silence_end: 5.1 | silence_duration: 1.1'
        ].join('\n');
        expect(parseSilences(stderr)).toEqual({ starts: [1.5, 4.0], ends: [2.7, 5.1] });
    });

    it('returns empty lists for output with no silences (a wall-to-wall take)', () => {
        expect(parseSilences('no silence here')).toEqual({ starts: [], ends: [] });
    });
});

describe('speechSpans', () => {
    it('returns the gaps between silences, not the silences', () => {
        const spans = speechSpans({ starts: [2, 6], ends: [3, 7] }, 9);
        expect(spans).toEqual([
            { start: 0, end: 2, duration: 2 },
            { start: 3, end: 6, duration: 3 },
            { start: 7, end: 9, duration: 2 }
        ]);
    });

    it('drops sub-threshold blips (breaths, lip noise, false starts)', () => {
        const spans = speechSpans({ starts: [0.2, 2], ends: [1, 3] }, 4);
        expect(spans.every((s) => s.duration >= MIN_TAKE_SEC)).toBe(true);
        expect(spans).toEqual([{ start: 1, end: 2, duration: 1 }, { start: 3, end: 4, duration: 1 }]);
    });

    it('closes the final span at the file duration', () => {
        expect(speechSpans({ starts: [1], ends: [2] }, 5).at(-1)).toEqual({ start: 2, end: 5, duration: 3 });
    });
});

describe('classifySpans', () => {
    it('marks over-long spans as chatter so slating never becomes a line take', () => {
        const out = classifySpans([
            { start: 0, end: 21, duration: 21 },  // the 20s+ slate both sessions open with
            { start: 22, end: 23, duration: 1 }
        ]);
        expect(out.map((s) => s.kind)).toEqual(['chatter', 'take']);
    });

    it('keeps a span exactly at the ceiling as a take', () => {
        expect(classifySpans([{ duration: MAX_TAKE_SEC }])[0].kind).toBe('take');
    });
});

describe('splitIntoLines', () => {
    it('splits at the longest pauses, preserving recording order', () => {
        // Two takes, a long pause, two takes: the long pause is the line break.
        const spans = [
            { start: 0, end: 1, duration: 1 },
            { start: 1.2, end: 2.2, duration: 1 },
            { start: 10, end: 11, duration: 1 },
            { start: 11.2, end: 12.2, duration: 1 }
        ];
        const lines = splitIntoLines(spans, 2);
        expect(lines).toHaveLength(2);
        expect(lines[0].map((s) => s.start)).toEqual([0, 1.2]);
        expect(lines[1].map((s) => s.start)).toEqual([10, 11.2]);
    });

    it('does not reorder takes by duration (the bug that produced singleton outlier lines)', () => {
        const spans = [
            { start: 0, end: 5, duration: 5 },
            { start: 5.1, end: 6, duration: 0.9 },
            { start: 20, end: 21, duration: 1 }
        ];
        const flat = splitIntoLines(spans, 2).flat();
        expect(flat.map((s) => s.start)).toEqual([0, 5.1, 20]);
    });

    it('handles fewer spans than expected lines without crashing', () => {
        expect(splitIntoLines([{ start: 0, end: 1, duration: 1 }], 6)).toEqual([[{ start: 0, end: 1, duration: 1 }]]);
    });

    it('returns nothing for an empty session', () => {
        expect(splitIntoLines([], 6)).toEqual([]);
    });
});
