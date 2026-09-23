import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { CREEP_EFFECTS } from './overnightConsequences.js';

let events;
beforeEach(() => {
    events = [];
    vi.stubGlobal('window', { dispatchEvent: (event) => { events.push({ type: event.type, detail: event.detail }); return true; } });
});
afterEach(() => vi.unstubAllGlobals());

const METHODS = ['getCreepZones', 'updateOvernightCreep', 'getCampCondition', 'getCampSupportCost', 'shoreUpCamp',
    'getCampFavorCost', 'getCampActiveVerbGate', 'canRestAt', 'treatScarAtCamp', 'applyCampOvernightConditions'];

function world(overnightState, extra = {}) {
    const shells = { value: 100 };
    const w = {
        performanceProfile: 'gameplay',
        player: { position: { x: 100, z: 100 } },
        overnightState,
        act2: { getState: () => ({ hives: [{ id: 'hive_suture', x: 100, z: 100, status: 'dormant' }] }) },
        camps: [],
        bank: {
            canAffordShells: (n) => shells.value >= n,
            spendShells: (n) => { shells.value -= n; return true; },
            getState: () => ({})
        },
        takeDamage: vi.fn(),
        persistOvernightState: vi.fn(),
        dayState: { day: 3 },
        ...extra
    };
    for (const method of METHODS) w[method] = ThreeGame.prototype[method];
    return { w, shells };
}

describe('overnight consequences in the runtime', () => {
    it('reads the creep under the carrier, announces it once, and burns at full spread', () => {
        const { w } = world({ version: 1, camps: {}, hives: { hive_suture: { creepRings: 3 } } });
        expect(w.updateOvernightCreep(0.1).rings).toBe(3);
        expect(w._creepHere.speedMultiplier).toBeLessThan(1);
        w.updateOvernightCreep(CREEP_EFFECTS.burnIntervalSeconds);
        expect(w.takeDamage).toHaveBeenCalledWith(1, 'hive-creep', 100, 100);
        expect(events.filter((event) => event.type === 'creep-contact')).toHaveLength(1);
        w.player.position.x = 400;
        expect(w.updateOvernightCreep(0.1)).toBeNull();
        expect(w._creepHere).toBeNull();
    });

    it('prices help by camp condition and closes services past a breach', () => {
        const camp = { id: 'camp_meridian', label: 'MERIDIAN', level: 0 };
        const secure = world({ version: 1, camps: {}, hives: {} }).w;
        const breached = world({ version: 1, camps: { camp_meridian: { condition: 'breached', neglectNights: 1 } }, hives: {} }).w;
        expect(breached.getCampSupportCost(camp)).toBeGreaterThan(secure.getCampSupportCost(camp));
        expect(breached.getCampFavorCost({ id: 'camp_meridian', bond: 1 })).toBeGreaterThan(secure.getCampFavorCost({ id: 'camp_meridian', bond: 1 }));
        expect(breached.canRestAt(camp)).toEqual({ allowed: false, reason: 'camp-unsafe' });
        expect(breached.treatScarAtCamp(camp, 'tremor')).toBe(false);
        const overrun = world({ version: 1, camps: { camp_meridian: { condition: 'overrun' } }, hives: {} }).w;
        expect(overrun.getCampActiveVerbGate(camp)).toEqual({ allowed: false, reason: 'camp_overrun' });
    });

    it('shores up a breached camp one step for shells and persists it', () => {
        const camp = { id: 'camp_tallow', label: 'TALLOW', level: 1 };
        const { w, shells } = world({ version: 1, camps: { camp_tallow: { condition: 'breached', neglectNights: 2 } }, hives: {} });
        expect(w.shoreUpCamp(camp)).toBe(true);
        expect(shells.value).toBe(92);
        expect(w.getCampCondition('camp_tallow')).toBe('strained');
        expect(w.persistOvernightState).toHaveBeenCalled();
        expect(events.find((event) => event.type === 'camp-shored-up').detail).toMatchObject({ from: 'breached', to: 'strained', cost: 8 });
        expect(w.shoreUpCamp(camp)).toBe(false);
    });
});
