import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

// A corpse with a GLB (cybersnail_dead) draws the model; the sprite keeps the
// shell-pickup, fade and fog state, and the model follows it to disposal.
describe('3D corpses', () => {
    const makeGame = (createWorld3dModel) => {
        const scene = new THREE.Scene();
        const game = {
            scene,
            corpses: [],
            scatterMaterials: {
                cybersnail_dead: new THREE.SpriteMaterial({ opacity: 1 }),
                cryosnail_dead: new THREE.SpriteMaterial({ opacity: 1 })
            },
            createWorld3dModel,
            getFogOfWarVisibility: () => 1,
            applyFogOfWarOpacity: () => {}
        };
        for (const name of ['spawnEnemyCorpse', 'attachCorpse3d', 'syncCorpse3d', 'disposeCorpse3d', 'updateCorpses', 'clearCorpses']) {
            game[name] = ThreeGame.prototype[name];
        }
        return game;
    };
    const enemy = (type) => {
        const sprite = new THREE.Sprite();
        sprite.position.set(3, 0.4, -2);
        sprite.userData = { type };
        return sprite;
    };
    const model = () => {
        const root = new THREE.Group();
        root.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
        return root;
    };

    it('draws cybersnail corpses as the GLB and hides the billboard', async () => {
        const root = model();
        const game = makeGame(vi.fn(async () => root));
        game.spawnEnemyCorpse(enemy('cybersnail'));
        await vi.waitFor(() => expect(game.corpses[0].userData.corpse3d).toBe(root));
        const corpse = game.corpses[0];
        expect(game.createWorld3dModel).toHaveBeenCalledWith('cybersnail_dead');
        expect(corpse.material.visible).toBe(false);
        expect(root.parent).toBe(game.scene);
        expect(root.position.x).toBe(3);
        expect(root.position.z).toBe(-2);
        // Solid at rest, despite the billboard's 0.85 resting opacity.
        expect(root.children[0].material.opacity).toBeCloseTo(1);
    });

    it('fades and removes the model with its corpse', async () => {
        const root = model();
        const game = makeGame(vi.fn(async () => root));
        game.spawnEnemyCorpse(enemy('cybersnail'));
        await vi.waitFor(() => expect(game.corpses[0].userData.corpse3d).toBe(root));
        game.updateCorpses(16);
        expect(root.children[0].material.opacity).toBeLessThan(1);
        game.updateCorpses(10);
        expect(game.corpses).toHaveLength(0);
        expect(root.parent).toBeNull();
    });

    it('keeps the billboard for corpses without a model, and when loading fails', async () => {
        const game = makeGame(vi.fn(async () => null));
        game.spawnEnemyCorpse(enemy('cryosnail'));
        expect(game.createWorld3dModel).not.toHaveBeenCalled();
        expect(game.corpses[0].material.visible).toBe(true);

        game.spawnEnemyCorpse(enemy('cybersnail'));
        await vi.waitFor(() => expect(game.createWorld3dModel).toHaveBeenCalled());
        await Promise.resolve();
        expect(game.corpses[1].material.visible).toBe(true);
    });

    it('clearCorpses removes models too', async () => {
        const root = model();
        const game = makeGame(vi.fn(async () => root));
        game.spawnEnemyCorpse(enemy('cybersnail'));
        await vi.waitFor(() => expect(game.corpses[0].userData.corpse3d).toBe(root));
        game.clearCorpses();
        expect(root.parent).toBeNull();
    });
});
