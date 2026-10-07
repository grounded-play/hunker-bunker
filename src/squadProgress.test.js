import { describe, expect, it } from 'vitest';
import { extractSquadProgress, mergeSquadProgress, squadProgressSignature } from './squadProgress.js';
import { BankManager } from './bank.js';

// Owner, 2026-10-07: "if one player unlocks O2 both get it ... in PvE / co-op.
// PvP it's just they don't share."
const bankState = (overrides = {}) => ({
    o2GeneratorLevel: 0, foundryActivated: false,
    unlocks: { o2Bubble: false, hullExpansion: false, radarNode: false, reactorCompressor: false },
    hullExpansionLevel: 0, radarNodeLevel: 0, reactorCompressorLevel: 0,
    tier2Unlocks: { suitThermal: false, deconFilters: false, stimCache: false, fallHardening: false },
    baseTurretUnlocked: false, baseTurretLevel: 1,
    tech: 50, coin: 9,
    ...overrides
});

describe('squad progress is shared in co-op', () => {
    it('takes the higher level and any unlock from a squadmate, never resources', () => {
        const mine = bankState({ o2GeneratorLevel: 1, unlocks: { o2Bubble: true, hullExpansion: false, radarNode: false, reactorCompressor: false } });
        const theirs = extractSquadProgress(bankState({ o2GeneratorLevel: 2, foundryActivated: true, tech: 999 }));
        const { state, changed } = mergeSquadProgress(mine, theirs);
        expect(changed).toBe(true);
        expect(state.o2GeneratorLevel).toBe(2);
        expect(state.foundryActivated).toBe(true);
        expect(state.unlocks.o2Bubble).toBe(true);
        expect(state.tech).toBe(50);
        expect(theirs.tech).toBeUndefined();
    });

    it('never takes progress away, and reports no change when nothing is new', () => {
        const mine = bankState({ o2GeneratorLevel: 3, foundryActivated: true });
        const { state, changed } = mergeSquadProgress(mine, extractSquadProgress(bankState({ o2GeneratorLevel: 1 })));
        expect(changed).toBe(false);
        expect(state.o2GeneratorLevel).toBe(3);
        expect(state.foundryActivated).toBe(true);
    });

    it('signs progress so unchanged state is not re-sent', () => {
        expect(squadProgressSignature(bankState())).toBe(squadProgressSignature(bankState({ tech: 1 })));
        expect(squadProgressSignature(bankState())).not.toBe(squadProgressSignature(bankState({ o2GeneratorLevel: 1 })));
    });

    it('applies through the bank without charging anything', () => {
        const store = new Map();
        const bank = new BankManager({ storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } });
        bank.deposit({ tech: 5 });
        expect(bank.applySquadProgress(extractSquadProgress(bankState({ o2GeneratorLevel: 1, foundryActivated: true })))).toBe(true);
        expect(bank.getState().o2GeneratorLevel).toBe(1);
        expect(bank.getState().foundryActivated).toBe(true);
        expect(bank.getState().tech).toBe(5);
        expect(bank.applySquadProgress(extractSquadProgress(bankState({ o2GeneratorLevel: 1 })))).toBe(false);
    });
});
