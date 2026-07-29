import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// docs/faction-verb-matrix.md: UI wiring for the Phase 8.1 active verbs
// (getActionableCampAt's 'active-verb' branch, getCampActiveVerbGate,
// activateCampVerb). Follows the established
// ThreeGame.prototype.method.call(fakeThis, ...) pattern
// (see threeGame.campQuests.test.js).

let originalWindow;
let dispatchedEvents;

function stubWindow() {
    dispatchedEvents = [];
    globalThis.window = {
        dispatchEvent: (event) => dispatchedEvents.push(event),
        AudioManager: { play: () => {} }
    };
}

function eventsOfType(type) {
    return dispatchedEvents.filter((event) => event.type === type);
}

function makeFakeBank(state = {}) {
    return {
        state: { med: 3, tech: 3, coin: 3, ...state },
        getState() { return this.state; },
        spendShells: vi.fn(),
        save: vi.fn()
    };
}

function makeFakeThis(overrides = {}) {
    return {
        bank: makeFakeBank(),
        playerVitals: { hp: 1, maxHp: 3 },
        weaponClipAmmo: 0,
        weaponClipSize: 6,
        healPlayer: vi.fn(),
        getCampRecord: () => ({ status: 'alive', bond: 5 }),
        getCampVerbRuntimeEffects: () => ({ humanityDecayMultiplier: 1 }),
        getMeridianCompassTarget: () => ({ mode: 'meridian-camp', label: 'MERIDIAN FIX: TEST', x: 5, z: 5 }),
        spawnGearPoofEffect: vi.fn(),
        getCampActiveVerbGate: ThreeGame.prototype.getCampActiveVerbGate,
        ...overrides
    };
}

describe('getCampActiveVerbGate', () => {
    beforeEach(() => {
        originalWindow = globalThis.window;
        stubWindow();
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('allows activation when affordable, off cooldown, and not yet used', () => {
        const fakeThis = makeFakeThis();
        const gate = ThreeGame.prototype.getCampActiveVerbGate.call(fakeThis, { id: 'camp_tallow' });
        expect(gate).toEqual({ allowed: true, reason: null });
    });

    it('blocks when the camp cannot afford its verb cost', () => {
        const fakeThis = makeFakeThis({ bank: makeFakeBank({ med: 0 }) });
        const gate = ThreeGame.prototype.getCampActiveVerbGate.call(fakeThis, { id: 'camp_tallow' });
        expect(gate).toEqual({ allowed: false, reason: 'insufficient_resources' });
    });

    it('blocks a second Meridian route-intel use (once-per-ring collapses to once-per-camp)', () => {
        const fakeThis = makeFakeThis();
        ThreeGame.prototype.activateCampVerb.call(fakeThis, { id: 'camp_meridian', pos: { x: 0, z: 0 } });
        const gate = ThreeGame.prototype.getCampActiveVerbGate.call(fakeThis, { id: 'camp_meridian' });
        expect(gate).toEqual({ allowed: false, reason: 'ring_already_pinged' });
    });
});

describe('activateCampVerb', () => {
    beforeEach(() => {
        originalWindow = globalThis.window;
        stubWindow();
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('Tallow TRIAGE spends 1 med and fully heals the player', () => {
        const fakeThis = makeFakeThis();
        const result = ThreeGame.prototype.activateCampVerb.call(fakeThis, { id: 'camp_tallow', pos: { x: 1, z: 1 } });

        expect(result).toBe(true);
        expect(fakeThis.bank.state.med).toBe(2);
        expect(fakeThis.healPlayer).toHaveBeenCalledWith(3);
        expect(eventsOfType('camp-verb-activated')).toHaveLength(1);
        expect(eventsOfType('camp-verb-activated')[0].detail).toMatchObject({ campId: 'camp_tallow', verbId: 'triage', degraded: false });
    });

    it('Vesper FIELD RESUPPLY spends 1 coin, refills the clip, and dispatches a reserve-ammo top-up', () => {
        const fakeThis = makeFakeThis();
        ThreeGame.prototype.activateCampVerb.call(fakeThis, { id: 'camp_vesper', pos: { x: 2, z: 2 } });

        expect(fakeThis.bank.state.coin).toBe(2);
        expect(fakeThis.weaponClipAmmo).toBe(fakeThis.weaponClipSize);
        expect(eventsOfType('camp-verb-resupply')).toHaveLength(1);
    });

    it('Meridian ROUTE INTEL spends 1 tech and sets a 20s compass lock toward the nearest fix', () => {
        const fakeThis = makeFakeThis();
        ThreeGame.prototype.activateCampVerb.call(fakeThis, { id: 'camp_meridian', pos: { x: 3, z: 3 } });

        expect(fakeThis.bank.state.tech).toBe(2);
        expect(fakeThis._meridianCompassLock).toMatchObject({ mode: 'meridian-camp', x: 5, z: 5 });
        expect(fakeThis._meridianCompassLock.expiresAt).toBeGreaterThan(0);
    });

    it('Meridian ROUTE INTEL is degraded (no compass lock set) when the camp has been robbed', () => {
        const fakeThis = makeFakeThis({ getCampRecord: () => ({ status: 'robbed', bond: 5 }) });
        ThreeGame.prototype.activateCampVerb.call(fakeThis, { id: 'camp_meridian', pos: { x: 3, z: 3 } });

        expect(fakeThis._meridianCompassLock).toBeUndefined();
        expect(eventsOfType('camp-verb-activated')[0].detail.degraded).toBe(true);
        // still costs the resource -- a robbed informant still takes the payment
        expect(fakeThis.bank.state.tech).toBe(2);
    });

    it('denies activation without spending anything when the camp cannot afford it', () => {
        const fakeThis = makeFakeThis({ bank: makeFakeBank({ coin: 0 }) });
        const result = ThreeGame.prototype.activateCampVerb.call(fakeThis, { id: 'camp_vesper', pos: { x: 0, z: 0 } });

        expect(result).toBe(true);
        expect(fakeThis.bank.state.coin).toBe(0);
        expect(eventsOfType('camp-verb-denied')).toHaveLength(1);
        expect(eventsOfType('camp-verb-denied')[0].detail.reason).toBe('insufficient_resources');
        expect(eventsOfType('camp-verb-activated')).toHaveLength(0);
    });

    it('enforces the Vesper cooldown across repeated activations', () => {
        const fakeThis = makeFakeThis();
        ThreeGame.prototype.activateCampVerb.call(fakeThis, { id: 'camp_vesper', pos: { x: 0, z: 0 } });
        const secondAttempt = ThreeGame.prototype.activateCampVerb.call(fakeThis, { id: 'camp_vesper', pos: { x: 0, z: 0 } });

        expect(secondAttempt).toBe(true);
        expect(eventsOfType('camp-verb-denied')).toHaveLength(1);
        expect(eventsOfType('camp-verb-denied')[0].detail.reason).toBe('on_cooldown');
        // only charged once, not twice
        expect(fakeThis.bank.state.coin).toBe(2);
    });
});
