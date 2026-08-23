import { describe, expect, it, vi, afterEach } from 'vitest';
import { ThreeGame } from './threeGame.js';

// docs/design/one-more-ring-design-pillars.md item 1 (Sprint 28): the
// remaining two Depth Contract capabilities left unwired in the first Lane A
// pass (salvage multiplier, director aggression) -- filled in this pass.
// Same Function.prototype.call() pattern as threeGame.chunkMountBudget.test.js
// (no live WebGL context here).
describe('ThreeGame.collectSnailShell salvage multiplier (Depth Contract wiring)', () => {
    let originalWindow;
    afterEach(() => {
        if (originalWindow) globalThis.window = originalWindow;
        originalWindow = undefined;
    });

    function buildFakeGameInstance(currentDepthTier = 0) {
        originalWindow = globalThis.window;
        globalThis.window = { AudioManager: { play: vi.fn() }, dispatchEvent: vi.fn(), CustomEvent: globalThis.CustomEvent ?? class {
            constructor(type, init) { this.type = type; this.detail = init?.detail; }
        } };
        return {
            currentDepthTier,
            bank: { addShells: vi.fn(), getShells: vi.fn(() => 0) },
            spawnGearPoofEffect: vi.fn()
        };
    }

    it('applies no multiplier at the surface (ring 1, baseline)', () => {
        const fake = buildFakeGameInstance(0);
        const corpse = { userData: { shellValue: 10, collected: false }, position: { x: 0, z: 0 } };

        ThreeGame.prototype.collectSnailShell.call(fake, corpse);

        expect(fake.bank.addShells).toHaveBeenCalledWith(10);
    });

    it('applies the real ring salvage multiplier at depth, rounded to a whole shell count', () => {
        const fake = buildFakeGameInstance(2); // depthTier 2 -> ring 3, salvageMultiplier 1.6
        const corpse = { userData: { shellValue: 10, collected: false }, position: { x: 0, z: 0 } };

        ThreeGame.prototype.collectSnailShell.call(fake, corpse);

        expect(fake.bank.addShells).toHaveBeenCalledWith(16);
    });

    it('never collects the same corpse twice', () => {
        const fake = buildFakeGameInstance(0);
        const corpse = { userData: { shellValue: 10, collected: true }, position: { x: 0, z: 0 } };

        ThreeGame.prototype.collectSnailShell.call(fake, corpse);

        expect(fake.bank.addShells).not.toHaveBeenCalled();
    });

    it('defaults an undefined shellValue to 1 before scaling, same as before this wiring', () => {
        const fake = buildFakeGameInstance(4); // depthTier 4 -> ring 5, salvageMultiplier 3.0
        const corpse = { userData: { collected: false }, position: { x: 0, z: 0 } };

        ThreeGame.prototype.collectSnailShell.call(fake, corpse);

        expect(fake.bank.addShells).toHaveBeenCalledWith(3);
    });
});

describe('ThreeGame.updateBunkerDirector aggression bonus (Depth Contract wiring)', () => {
    it('supplies the real ring directorAggressionBonus in the director snapshot', () => {
        const tickSpy = vi.fn(() => null);
        const fake = {
            bunkerDirector: { tick: tickSpy },
            player: {},
            isPlayerDead: false,
            snailsEnabled: true,
            isGameplayInputActive: () => true,
            lineDirector: { tick: vi.fn() },
            syncRunModifierCards: vi.fn(),
            getRunCardEffects: () => ({}),
            getO2GeneratorState: () => ({ isOnline: false, radius: 0 }),
            getActiveO2GeneratorDistance: () => 0,
            playerVitals: { hp: 3, maxHp: 3, o2: 100 },
            currentRunModifier: null,
            currentDepthTier: 3, // -> ring 4, directorAggressionBonus 2
            executeDirectorAction: vi.fn()
        };

        ThreeGame.prototype.updateBunkerDirector.call(fake, 0.1);

        expect(tickSpy).toHaveBeenCalledTimes(1);
        const [, snapshot] = tickSpy.mock.calls[0];
        expect(snapshot.aggressionBonus).toBe(2);
    });

    it('is 0 at the surface (ring 1, baseline, no change from before this wiring)', () => {
        const tickSpy = vi.fn(() => null);
        const fake = {
            bunkerDirector: { tick: tickSpy },
            player: {},
            isPlayerDead: false,
            snailsEnabled: true,
            isGameplayInputActive: () => true,
            lineDirector: { tick: vi.fn() },
            syncRunModifierCards: vi.fn(),
            getRunCardEffects: () => ({}),
            getO2GeneratorState: () => ({ isOnline: false, radius: 0 }),
            getActiveO2GeneratorDistance: () => 0,
            playerVitals: { hp: 3, maxHp: 3, o2: 100 },
            currentRunModifier: null,
            currentDepthTier: 0,
            executeDirectorAction: vi.fn()
        };

        ThreeGame.prototype.updateBunkerDirector.call(fake, 0.1);

        const [, snapshot] = tickSpy.mock.calls[0];
        expect(snapshot.aggressionBonus).toBe(0);
    });
});
