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
        const readTarget = { name: 'composer-read-target' };
        const writeTarget = { name: 'composer-write-target' };
        const root = new THREE.Group();
        const setRenderTarget = vi.fn();
        const compileAsync = vi.fn(async () => {});
        Object.assign(game, {
            camera: {},
            scene: {},
            composer: { readBuffer: readTarget, writeBuffer: writeTarget },
            performanceProfile: 'gameplay',
            gameplayPostProcessingEnabled: true,
            renderer: {
                compileAsync,
                getRenderTarget: () => oldTarget,
                setRenderTarget
            }
        });

        await game.prewarmLateModel(root);

        expect(setRenderTarget).toHaveBeenNthCalledWith(1, readTarget);
        expect(setRenderTarget).toHaveBeenNthCalledWith(2, writeTarget);
        expect(compileAsync).toHaveBeenCalledTimes(2);
        expect(compileAsync).toHaveBeenNthCalledWith(1, root, game.camera, game.scene);
        expect(compileAsync).toHaveBeenNthCalledWith(2, root, game.camera, game.scene);
        expect(setRenderTarget).toHaveBeenLastCalledWith(oldTarget);
    });

    it('prewarms the textured kill-burst and corpse fallback sprites', async () => {
        const game = Object.create(ThreeGame.prototype);
        const spark = new THREE.SpriteMaterial({ map: new THREE.Texture(), transparent: true });
        const corpse = new THREE.SpriteMaterial({ map: new THREE.Texture(), transparent: true });
        const prewarmLateModel = vi.fn(async () => {});
        Object.assign(game, {
            scatterMaterials: { fx_spark_burst: spark, cybersnail_dead: corpse },
            prewarmLateModel
        });

        const root = await game.prewarmKillEffectShaders();

        expect(prewarmLateModel).toHaveBeenCalledWith(root);
        expect(root.children.some((child) => child.isSprite && child.material.map === spark.map)).toBe(true);
        expect(root.children.some((child) => child.isSprite && child.material.map === corpse.map)).toBe(true);
        expect(game.killEffectShaderWarmup).toBe(root);
    });

    it('prewarms and retains the exact gib skin variant once per enemy type', async () => {
        const game = Object.create(ThreeGame.prototype);
        const enemyRoot = new THREE.Group();
        const sourceMaterial = new THREE.MeshPhysicalMaterial({ transparent: false });
        enemyRoot.add(new THREE.Mesh(new THREE.BoxGeometry(), sourceMaterial));
        const prewarmLateModel = vi.fn(async () => {});
        game.prewarmLateModel = prewarmLateModel;

        const first = await game.prewarmEnemyGibShaders('test_enemy', enemyRoot);
        const second = await game.prewarmEnemyGibShaders('test_enemy', enemyRoot);

        expect(first).toBe(second);
        expect(prewarmLateModel).toHaveBeenCalledTimes(1);
        expect(first.children).toHaveLength(2);
        expect(first.children[0].material).not.toBe(sourceMaterial);
        expect(first.children[0].material.isMeshPhysicalMaterial).toBe(true);
        expect(first.children[0].material.transparent).toBe(true);
        expect(first.children[1].material.isMeshBasicMaterial).toBe(true);
    });
});
