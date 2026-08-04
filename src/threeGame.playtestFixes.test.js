import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('Log1 playtest regressions', () => {
    beforeEach(() => {
        globalThis.window = {
            dispatchEvent: vi.fn(),
            AudioManager: { play: vi.fn() }
        };
        globalThis.CustomEvent = class CustomEvent {
            constructor(type, options = {}) {
                this.type = type;
                this.detail = options.detail;
            }
        };
    });

    it('dispatches foundry-discovered only on the first reveal', () => {
        const foundry = {
            isRevealed: false,
            built: true,
            getPosition: () => ({ x: 4, z: 8 }),
            revealInstant: vi.fn(() => { foundry.isRevealed = true; }),
            reveal: vi.fn(() => { foundry.isRevealed = true; })
        };
        const game = {
            foundry,
            player: { position: { x: 4, z: 10 } },
            getActiveShip: () => null
        };

        ThreeGame.prototype.revealFoundry.call(game, { instant: true });
        ThreeGame.prototype.revealFoundry.call(game, { instant: true });

        expect(foundry.revealInstant).toHaveBeenCalledTimes(1);
        expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
        expect(window.dispatchEvent.mock.calls[0][0]).toMatchObject({
            type: 'foundry-discovered',
            detail: { x: 4, z: 8, distance: 2 }
        });
    });

    it('lets the player escape a telegraphed Cryosnail shockwave', () => {
        const game = {
            player: { position: { x: 5, z: 0 } },
            isPlayerDead: false,
            takeDamage: vi.fn(),
            applyPlayerSlow: vi.fn()
        };
        const boss = { position: { x: 0, z: 0 } };

        expect(ThreeGame.prototype.resolveCryosnailShockwave.call(game, boss)).toBe(false);
        expect(game.takeDamage).not.toHaveBeenCalled();

        game.player.position.x = 4;
        expect(ThreeGame.prototype.resolveCryosnailShockwave.call(game, boss)).toBe(true);
        expect(game.takeDamage).toHaveBeenCalledWith(1, 'frost-shockwave', 0, 0);
        expect(game.applyPlayerSlow).toHaveBeenCalledWith(3);
    });
});
