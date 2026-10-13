import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { REST_PHASES, createDayState } from './dayCycle.js';
import { beginCarry, createCarryState, installCarriedObject } from './carrySystem.js';
import { ensureFirstNightBaseState } from './firstNightBase.js';

function stubs() {
    globalThis.CustomEvent = class CustomEvent {
        constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    };
    globalThis.window = { dispatchEvent: vi.fn() };
}

function installedCarryState() {
    let { state, plan } = ensureFirstNightBaseState(createCarryState('run-test'), { shipX: 100, shipZ: 200 });
    state = beginCarry(state, state.worldObjects[0].instanceId, 'local').state;
    return installCarriedObject(state, plan.installSocket, { carrierPlayerId: 'local' }).state;
}

const bunkerGame = (overrides = {}) => ({
    dayState: createDayState(),
    _activeCampQuest: null,
    carryState: installedCarryState(),
    canRestAt: ThreeGame.prototype.canRestAt,
    getBunkerRestPoint: ThreeGame.prototype.getBunkerRestPoint,
    getRestPointAt: ThreeGame.prototype.getRestPointAt,
    ...overrides
});

describe('bunker cot rest point', () => {
    beforeEach(() => stubs());

    it('anchors the recovered cot to its installed ship berth transform', () => {
        const point = bunkerGame().getBunkerRestPoint();
        expect(point.id).toBe('bunker_cot');
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.z)).toBe(true);
    });

    it('offers rest only within reach of the cot', () => {
        const game = bunkerGame();
        const cot = game.getBunkerRestPoint();
        expect(game.getRestPointAt(cot.x, cot.z)?.id).toBe('bunker_cot');
        // Standing across the base is not standing at the bed.
        expect(game.getRestPointAt(cot.x + 40, cot.z)).toBe(null);
    });

    // The whole point of Phase 5b: one rule, asked by every bed. The cot must
    // not grow a second opinion about when sleeping is allowed.
    it('defers to the same canRestNow rule the camp verb uses', () => {
        const midRest = bunkerGame({
            dayState: { ...createDayState(), phase: REST_PHASES.RESTING }
        });
        const cot = midRest.getBunkerRestPoint();
        expect(midRest.getRestPointAt(cot.x, cot.z)).toBe(null);

        const busy = bunkerGame({ _activeCampQuest: { id: 'contract' } });
        expect(busy.getRestPointAt(cot.x, cot.z)).toBe(null);
    });

    it('carries the next day so the prompt can name it', () => {
        const game = bunkerGame();
        const cot = game.getBunkerRestPoint();
        expect(game.getRestPointAt(cot.x, cot.z).nextDay).toBe(2);

        const later = bunkerGame({ dayState: { ...createDayState(), day: 6 } });
        expect(later.getRestPointAt(cot.x, cot.z).nextDay).toBe(7);
    });

    it('is inert for invalid player positions', () => {
        const game = bunkerGame();
        expect(game.getRestPointAt(Number.NaN, Number.NaN)).toBe(null);
    });
});

// Session 2026-10-06: "the night sleep isn't working, I don't see a bed".
// setupBunkerCot ran once, at construction, on the menu profile -- where
// getSpawnTile() is the empty showroom chunk (100, 100) -- so the cot stood in
// the showroom while the rest trigger sat, invisible, beside the real spawn.
describe('the bunker cot stands where you can sleep', () => {
    beforeEach(() => stubs());

    const cotGame = (overrides = {}) => {
        const sprite = { position: { x: 3300, y: 0.7, z: 3300, set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, visible: true, material: { visible: true } };
        return bunkerGame({
            performanceProfile: 'gameplay',
            bunkerCotSprite: sprite,
            syncBunkerCot: ThreeGame.prototype.syncBunkerCot,
            ...overrides
        });
    };

    it('moves the cot to the rest point once gameplay is running', () => {
        const game = cotGame();
        game.syncBunkerCot();
        const cot = game.getBunkerRestPoint();
        expect(game.bunkerCotSprite.position.x).toBe(cot.x);
        expect(game.bunkerCotSprite.position.z).toBe(cot.z);
        expect(game.getRestPointAt(game.bunkerCotSprite.position.x, game.bunkerCotSprite.position.z)?.id).toBe('bunker_cot');
    });

    it('follows the authoritative installed socket transform', () => {
        const game = cotGame();
        game.syncBunkerCot();
        const cot = game.carryState.installed.find(({ definitionId }) => definitionId === 'cot_bed');
        cot.transform = { ...cot.transform, x: 400, z: 50 };
        game.syncBunkerCot();
        expect(game.bunkerCotSprite.position.x).toBe(400);
        expect(game.bunkerCotSprite.position.z).toBe(50);
    });

    it('keeps the 3D cot on the sprite, shown only with it', () => {
        const root = { position: { set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, rotation: { y: 0 }, visible: true };
        const game = cotGame({ bunkerCot3d: root });
        game.bunkerCotSprite.visible = false;
        game.syncBunkerCot();
        expect(root.position.x).toBe(game.bunkerCotSprite.position.x);
        expect(game.bunkerCotSprite.visible).toBe(true);
        expect(root.visible).toBe(true);
    });

    it('says why the cot refuses instead of staying silent', () => {
        const busy = cotGame({ _activeCampQuest: { id: 'contract' }, getRestRefusalAt: ThreeGame.prototype.getRestRefusalAt });
        const cot = busy.getBunkerRestPoint();
        expect(busy.getRestRefusalAt(cot.x, cot.z)).toBe('active_quest');
        expect(busy.getRestRefusalAt(cot.x + 40, cot.z)).toBe(null);
        const free = cotGame({ getRestRefusalAt: ThreeGame.prototype.getRestRefusalAt });
        expect(free.getRestRefusalAt(cot.x, cot.z)).toBe(null);
    });
});
