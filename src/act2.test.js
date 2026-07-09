import { describe, it, expect } from 'vitest';
import {
    Act2Manager,
    ACT2_CAMP_IDS,
    ACT2_CAMP_LABELS,
    ACT2_LINES,
    deriveAct2Phase,
    normalizeAct2State
} from './act2.js';

function memoryStorage() {
    const map = new Map();
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k)
    };
}

describe('deriveAct2Phase', () => {
    it('is dormant until begun', () => {
        expect(deriveAct2Phase({})).toBe('dormant');
        expect(deriveAct2Phase({ uplinkSilenced: true })).toBe('dormant');
    });

    it('walks the ladder in order', () => {
        const s = { begun: true };
        expect(deriveAct2Phase(s)).toBe('gestation');
        s.uplinkSilenced = true;
        expect(deriveAct2Phase(s)).toBe('dish');
        s.dishBuilt = true;
        expect(deriveAct2Phase(s)).toBe('camps_help');
        s.camps = ACT2_CAMP_IDS.map((id) => ({ id, aided: true }));
        expect(deriveAct2Phase(s)).toBe('camps_betray');
        s.camps.forEach((c) => { c.destroyed = true; });
        expect(deriveAct2Phase(s)).toBe('launch_ready');
        s.departed = true;
        expect(deriveAct2Phase(s)).toBe('departed');
    });

    it('stays in camps_help until every camp is aided', () => {
        const s = {
            begun: true,
            uplinkSilenced: true,
            dishBuilt: true,
            camps: ACT2_CAMP_IDS.map((id, i) => ({ id, aided: i < 2 }))
        };
        expect(deriveAct2Phase(s)).toBe('camps_help');
    });
});

describe('Act2Manager', () => {
    it('round-trips through storage and fires phase transitions', () => {
        const storage = memoryStorage();
        const transitions = [];
        const m = new Act2Manager({ storage, onTransition: (from, to) => transitions.push(`${from}->${to}`) });
        expect(m.getPhase()).toBe('dormant');

        m.begin();
        m.silenceUplink();
        m.buildDish();
        for (const id of ACT2_CAMP_IDS) m.setCampPosition(id, 10, 20);
        for (const id of ACT2_CAMP_IDS) m.aidCamp(id);
        for (const id of ACT2_CAMP_IDS) m.destroyCamp(id);
        m.depart();

        expect(transitions).toEqual([
            'dormant->gestation',
            'gestation->dish',
            'dish->camps_help',
            'camps_help->camps_betray',
            'camps_betray->launch_ready',
            'launch_ready->departed'
        ]);

        // A fresh manager over the same storage restores everything.
        const m2 = new Act2Manager({ storage });
        expect(m2.getPhase()).toBe('departed');
        expect(m2.getState().camps.every((c) => c.x === 10 && c.z === 20)).toBe(true);
    });

    it('cannot destroy a camp that was never aided', () => {
        const m = new Act2Manager({ storage: memoryStorage() });
        m.begin();
        m.silenceUplink();
        m.buildDish();
        m.destroyCamp(ACT2_CAMP_IDS[0]);
        expect(m.getState().camps[0].destroyed).toBe(false);
    });

    it('normalizes corrupt saves to a safe default', () => {
        const storage = memoryStorage();
        storage.setItem('hb_act2_v1', '{not json');
        const m = new Act2Manager({ storage });
        expect(m.getPhase()).toBe('dormant');
        expect(normalizeAct2State(null).camps).toHaveLength(3);
    });

    it('has labels and lines for every beat', () => {
        for (const id of ACT2_CAMP_IDS) expect(ACT2_CAMP_LABELS[id]).toBeTruthy();
        for (const key of ['intro', 'uplinkSilenced', 'dishBuilt', 'allAided', 'allCulled']) {
            expect(ACT2_LINES[key]?.length).toBeGreaterThan(0);
        }
    });
});
