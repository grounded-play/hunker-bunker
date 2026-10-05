import { describe, expect, it } from 'vitest';
import { measureRoomLayout } from './roomLayoutMetrics.js';

describe('room structural signatures', () => {
    it('ignores translation, door glyphs and rotation, but preserves different geometry', () => {
        const a = measureRoomLayout(['..#', '.##']);
        const b = measureRoomLayout(['####', '#.D#', '##.#', '####']);
        expect(a.signature).toBe(b.signature);
        expect(a.signature).not.toBe(measureRoomLayout(['..', '..']).signature);
        expect(a.floorArea).toBe(3);
    });
    it('measures the room separately from external approaches', () => {
        expect(measureRoomLayout(['.....', '.....', '.....'], {
            left: 1, top: 1, right: 3, bottom: 2
        })).toMatchObject({ floorArea: 6, width: 3, height: 2 });
        expect(measureRoomLayout(['###'])).toMatchObject({ floorArea: 0, signature: '' });
    });
});
