import { describe, expect, it } from 'vitest';
import { analyzePlaytestLog } from './playtest-navigation-report.js';

describe('playtest navigation report', () => {
    it('summarizes navigation inputs and chunk readability', () => {
        const report = analyzePlaytestLog({ entries: [
            { elapsedMs: 60000, message: 'Action: RADAR SCAN (Tab/F)' },
            { elapsedMs: 90000, message: 'Action: RADAR SCAN (Tab/F)' },
            { elapsedMs: 120000, message: 'Action: DASH (Shift)' },
            { elapsedMs: 120000, message: 'Chunk generated {"landform":"maze","tiles":{"floor":60,"void":40}}' },
            { elapsedMs: 120000, message: 'Chunk generated {"landform":"canyon","tiles":{"floor":100,"void":0}}' }
        ] }, 'fixture');

        expect(report).toMatchObject({
            source: 'fixture', durationMinutes: 2, radarScans: 2,
            radarScansPerMinute: 1, dashes: 1, radarToDashRatio: 2,
            chunks: 2, landforms: { maze: 1, canyon: 1 },
            mazeFraction: 0.5, voidTileFraction: 0.2
        });
    });
});
