import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { applyOvernight, createOvernightState } from './overnightBridge.js';

function makeGame(overrides = {}) {
    const scatterSprites = [];
    return {
        performanceProfile: 'gameplay',
        chunkSize: 16,
        chunkMeshes: new Map(),
        scene: { add: vi.fn(), remove: vi.fn() },
        scatterSprites,
        camps: [],
        overnightState: createOvernightState(),
        act2: { getState: () => ({ hives: [], camps: [] }) },
        createScatterInstance: vi.fn((placement) => ({
            placement,
            parent: { remove: vi.fn() }
        })),
        applyCampOvernightConditions: ThreeGame.prototype.applyCampOvernightConditions,
        applyOvernightWorldPresence: ThreeGame.prototype.applyOvernightWorldPresence,
        stampOvernightCreep: ThreeGame.prototype.stampOvernightCreep,
        ...overrides
    };
}

const withCreep = (hiveId, creepRings) => applyOvernight(createOvernightState(), {
    camps: [],
    hives: [{ id: hiveId, creepRings }]
});

describe('creep on the ground', () => {
    beforeEach(() => { globalThis.window = { dispatchEvent: vi.fn() }; });

    it('stamps nothing while no hive has spread', () => {
        const game = makeGame({ act2: { getState: () => ({ hives: [{ id: 'hive_suture', x: 4, z: 4 }] }) } });
        expect(game.stampOvernightCreep()).toBe(0);
    });

    it('stamps a patch once a hive has crept', () => {
        const game = makeGame({
            act2: { getState: () => ({ hives: [{ id: 'hive_suture', x: 4, z: 4 }] }) },
            overnightState: withCreep('hive_suture', 2)
        });
        const stamped = game.stampOvernightCreep();
        expect(stamped).toBeGreaterThan(0);
        expect(game.scatterSprites).toHaveLength(stamped);
        for (const call of game.createScatterInstance.mock.calls) {
            expect(['decal_growth_creep_1', 'decal_growth_creep_2']).toContain(call[0].type);
        }
    });

    // Re-stamping is how a reload restores the same damage, so it has to be
    // idempotent or every visit doubles the infestation.
    it('is idempotent: stamping twice leaves one patch', () => {
        const game = makeGame({
            act2: { getState: () => ({ hives: [{ id: 'hive_suture', x: 4, z: 4 }] }) },
            overnightState: withCreep('hive_suture', 1)
        });
        const first = game.stampOvernightCreep();
        const second = game.stampOvernightCreep();
        expect(second).toBe(first);
        expect(game.scatterSprites).toHaveLength(first);
    });

    it('stays out of the menu showroom', () => {
        const game = makeGame({
            performanceProfile: 'menu',
            act2: { getState: () => ({ hives: [{ id: 'hive_suture', x: 4, z: 4 }] }) },
            overnightState: withCreep('hive_suture', 3)
        });
        expect(game.stampOvernightCreep()).toBe(0);
    });
});

describe('camp raid wear', () => {
    beforeEach(() => { globalThis.window = { dispatchEvent: vi.fn() }; });

    it('hands each camp the condition the night left it in', () => {
        const tallow = { id: 'camp_tallow', setOvernightCondition: vi.fn() };
        const vesper = { id: 'camp_vesper', setOvernightCondition: vi.fn() };
        const game = makeGame({
            camps: [tallow, vesper],
            overnightState: applyOvernight(createOvernightState(), {
                camps: [{ id: 'camp_tallow', condition: 'breached', neglectNights: 1 }],
                hives: []
            })
        });

        game.applyCampOvernightConditions();

        expect(tallow.setOvernightCondition).toHaveBeenCalledWith('breached');
        // A camp with no record held: it is secure, not undefined.
        expect(vesper.setOvernightCondition).toHaveBeenCalledWith('secure');
    });

    it('survives camps that predate the condition system', () => {
        const legacy = { id: 'camp_meridian' };
        const game = makeGame({ camps: [legacy] });
        expect(() => game.applyCampOvernightConditions()).not.toThrow();
    });
});

describe('camp medic', () => {
    beforeEach(() => {
        globalThis.window = { dispatchEvent: vi.fn(), AudioManager: { play: vi.fn() } };
        globalThis.CustomEvent = class CustomEvent {
            constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
        };
        globalThis.localStorage = { getItem: () => null, setItem: vi.fn() };
    });

    const medicGame = (fatigueState, canAfford = true) => ({
        fatigueState,
        bank: { canAffordShells: () => canAfford, spendShells: vi.fn() },
        persistFatigueState: vi.fn(),
        treatScarAtCamp: ThreeGame.prototype.treatScarAtCamp
    });

    const scarred = (severity) => ({ version: 1, expeditionsSinceSleep: 0, scars: [{ id: 'TREMOR', severity }] });

    it('walks a scar down one tier and charges for it', () => {
        const game = medicGame(scarred(3));
        expect(game.treatScarAtCamp({ id: 'camp_tallow' }, 'TREMOR')).toBe(true);
        expect(game.fatigueState.scars[0].severity).toBe(2);
        expect(game.bank.spendShells).toHaveBeenCalled();
        expect(game.persistFatigueState).toHaveBeenCalled();
    });

    // The scar is quieter, never gone: that is the whole deal with scars.
    it('never treats a scar below its floor, and never charges for nothing', () => {
        const game = medicGame(scarred(1));
        expect(game.treatScarAtCamp({ id: 'camp_tallow' }, 'TREMOR')).toBe(false);
        expect(game.bank.spendShells).not.toHaveBeenCalled();
    });

    it('refuses politely when the player cannot pay, and takes nothing', () => {
        const game = medicGame(scarred(3), false);
        expect(game.treatScarAtCamp({ id: 'camp_tallow' }, 'TREMOR')).toBe(true);
        expect(game.fatigueState.scars[0].severity).toBe(3);
        expect(game.bank.spendShells).not.toHaveBeenCalled();
    });
});
