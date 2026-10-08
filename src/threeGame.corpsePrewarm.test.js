import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

// Owner log 2026-10-07: a kill froze the frame while the corpse model's
// shader compiled. The corpse was prewarmed, then its materials were cloned
// and made transparent -- a different program than the one prewarmed.
describe('corpse model prewarm', () => {
    it('prewarms the corpse exactly as it will be drawn', async () => {
        const game = Object.create(ThreeGame.prototype);
        const group = new THREE.Group();
        const corpse = new THREE.Sprite(new THREE.SpriteMaterial());
        group.add(corpse);
        let seen = null;
        Object.assign(game, {
            corpses: [corpse],
            createWorld3dModel: async () => {
                const root = new THREE.Group();
                root.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
                return root;
            },
            prewarmLateModel: async (root) => {
                const mesh = root.children[0];
                seen = { transparent: mesh.material.transparent, material: mesh.material };
            },
            syncCorpse3d: () => {}
        });
        await game.attachCorpse3d(corpse, 'cybersnail_dead', null);
        const drawn = corpse.userData.corpse3d.children[0].material;
        expect(seen.transparent).toBe(true);
        expect(seen.material).toBe(drawn);
    });

    it('compiles late models against the gameplay composer target', async () => {
        const game = Object.create(ThreeGame.prototype);
        const oldTarget = { name: 'old-target' };
        const gameplayTarget = { name: 'composer-target' };
        const root = new THREE.Group();
        const setRenderTarget = vi.fn();
        const compileAsync = vi.fn(async () => {});
        Object.assign(game, {
            camera: {},
            scene: {},
            composer: { readBuffer: gameplayTarget },
            performanceProfile: 'gameplay',
            gameplayPostProcessingEnabled: true,
            renderer: {
                compileAsync,
                getRenderTarget: () => oldTarget,
                setRenderTarget
            }
        });

        await game.prewarmLateModel(root);

        expect(setRenderTarget).toHaveBeenNthCalledWith(1, gameplayTarget);
        expect(compileAsync).toHaveBeenCalledWith(root, game.camera, game.scene);
        expect(setRenderTarget).toHaveBeenLastCalledWith(oldTarget);
    });
});
