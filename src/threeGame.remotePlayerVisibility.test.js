import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame remote player visibility', () => {
    it('adds an immediate visible sprite fallback and starts the 3D class overlay', () => {
        const game = {
            remotePlayers: new Map(),
            multiplayerMode: 'pvp',
            playerMaterials: null,
            playerSpriteScale: 1.6,
            scene: { add: vi.fn() },
            setRemoteSpriteFrame: vi.fn(),
            setupRemotePlayer3dOverlay: vi.fn()
        };

        const remote = ThreeGame.prototype.getOrCreateRemotePlayer.call(game, {
            id: 'host-socket',
            callsign: 'TITAN-2',
            opClass: 'ENGINEER',
            spawnX: 9,
            spawnZ: 9
        });

        expect(game.scene.add).toHaveBeenCalledWith(remote.mesh);
        expect(remote.sprite.visible).toBe(true);
        expect(remote.mesh.position).toMatchObject({ x: 9, z: 9 });
        expect(game.remotePlayers.get('host-socket')).toBe(remote);
        expect(game.setupRemotePlayer3dOverlay).toHaveBeenCalledWith(remote);
    });
});
