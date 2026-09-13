import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { ThreeGame } from './threeGame.js';

// Playtest P0-3: an unrecovered black box must never hide the primary objective.
//
// No jsdom in this suite (repo idiom), so window/CustomEvent are stubbed with
// the smallest surface updateLoopStep actually touches.
let emitted;
beforeEach(() => {
    emitted = [];
    globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init?.detail; } };
    globalThis.window = { dispatchEvent: (e) => { emitted.push(e); return true; } };
});
afterEach(() => {
    delete globalThis.window;
    delete globalThis.CustomEvent;
});
function stub(overrides = {}) {
    return Object.assign(Object.create(ThreeGame.prototype), {
        _blackBoxMarkerActive: false,
        _blackBoxState: null,
        _lastLoopStepKey: null,
        ...overrides
    });
}

describe('loop step secondary objective', () => {
    it('reports no secondary when there is no black box', () => {
        expect(stub().getLoopSecondary()).toBeNull();
    });

    it('reports the black box as secondary, never as the primary step', () => {
        const game = stub({ _blackBoxMarkerActive: true, _blackBoxState: { x: 1, z: 2 } });
        expect(game.getLoopSecondary()).toMatchObject({ key: 'blackbox' });
    });

    it('needs both the marker and the state, so a cleared box stops reporting', () => {
        expect(stub({ _blackBoxMarkerActive: true, _blackBoxState: null }).getLoopSecondary()).toBeNull();
    });

    it('emits the secondary alongside the primary', () => {
        const game = stub({
            _blackBoxMarkerActive: true,
            _blackBoxState: { x: 0, z: 0 },
            getLoopStep: () => ({ key: 'explore', label: 'EXPLORE · BANK SALVAGE' })
        });
        game.updateLoopStep(true);
        const detail = emitted[0].detail;
        expect(detail.key).toBe('explore');
        expect(detail.secondary.key).toBe('blackbox');
    });

    it('re-emits when only the secondary changes, so a recovered box clears', () => {
        const game = stub({
            _blackBoxMarkerActive: true,
            _blackBoxState: { x: 0, z: 0 },
            getLoopStep: () => ({ key: 'explore', label: 'EXPLORE' })
        });
        game.updateLoopStep();
        game._blackBoxMarkerActive = false;   // recovered; primary unchanged
        game.updateLoopStep();
        expect(emitted).toHaveLength(2);
        expect(emitted[1].detail.secondary).toBeNull();
    });
});
