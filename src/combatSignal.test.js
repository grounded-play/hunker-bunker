import { describe, expect, it } from 'vitest';
import { CombatSignal, DEFAULT_COMBAT_WINDOW_SECONDS } from './combatSignal.js';

describe('CombatSignal', () => {
    it('stays active for four quiet seconds and then clears', () => {
        const signal = new CombatSignal();

        expect(signal.mark('player-damaged')).toMatchObject({ active: true, changed: true });
        expect(signal.update(DEFAULT_COMBAT_WINDOW_SECONDS - 0.01)).toMatchObject({ active: true, changed: false });
        expect(signal.update(0.01)).toMatchObject({ active: false, changed: true });
    });

    it('refreshes its window without emitting another transition', () => {
        const signal = new CombatSignal();

        signal.mark('enemy-targeted-player');
        signal.update(3.5);
        expect(signal.mark('hostile-hit')).toEqual({ active: true, changed: false, source: 'hostile-hit' });
        expect(signal.update(3.9).active).toBe(true);
        expect(signal.update(0.1).active).toBe(false);
    });

    it('ignores invalid and negative frame deltas', () => {
        const signal = new CombatSignal({ windowSeconds: 1 });
        signal.mark();

        signal.update(-4);
        signal.update(Number.NaN);
        expect(signal.active).toBe(true);
        expect(signal.remainingSeconds).toBe(1);
    });
});
