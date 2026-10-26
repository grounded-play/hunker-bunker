import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
    COMMON_CORPSE_3D_TYPES,
    corpse3dTypeForEnemy,
    prepareCorpse3dModel,
    prewarmCommonCorpse3dTemplates,
    prewarmCorpse3dTemplate
} from './corpse3d.js';

describe('corpse 3D shader preparation', () => {
    it('clones shared materials once and makes the exact variants fade-ready', () => {
        const source = new THREE.MeshStandardMaterial();
        const root = new THREE.Group();
        root.add(
            new THREE.Mesh(new THREE.BoxGeometry(), source),
            new THREE.Mesh(new THREE.BoxGeometry(), source)
        );

        prepareCorpse3dModel(root);

        expect(root.children[0].material).not.toBe(source);
        expect(root.children[0].material).toBe(root.children[1].material);
        expect(root.children[0].material.transparent).toBe(true);
    });

    it('maps regular and boss enemies with retained corpse warmups', () => {
        expect(COMMON_CORPSE_3D_TYPES).toEqual([
            'cybersnail_dead',
            'cryosnail_dead',
            'sporesnail_dead',
            'boss_cybersnail_dead',
            'boss_cryosnail_dead'
        ]);
        expect(corpse3dTypeForEnemy('cybersnail')).toBe('cybersnail_dead');
        expect(corpse3dTypeForEnemy('boss_cybersnail')).toBe('boss_cybersnail_dead');
        expect(corpse3dTypeForEnemy('boss_cryosnail')).toBe('boss_cryosnail_dead');
        expect(corpse3dTypeForEnemy('boss_sporesnail')).toBeNull();
        expect(corpse3dTypeForEnemy('crawler')).toBeNull();
    });

    it('compiles and retains only one warmup per type', async () => {
        const root = new THREE.Group();
        root.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
        const loadModel = vi.fn(async () => root);
        const game = {
            camera: {},
            scene: {},
            renderer: { compileAsync: vi.fn(async () => {}) }
        };

        const first = await prewarmCorpse3dTemplate(game, 'cybersnail_dead', loadModel);
        const second = await prewarmCorpse3dTemplate(game, 'cybersnail_dead', loadModel);

        expect(first).toBe(root);
        expect(second).toBe(root);
        expect(loadModel).toHaveBeenCalledTimes(1);
        expect(game.renderer.compileAsync).toHaveBeenCalledTimes(1);
        expect(game.renderer.compileAsync).toHaveBeenCalledWith(root, game.camera, game.scene);
    });

    it('warms the common roster serially so the driver handles one compile at a time', async () => {
        const order = [];
        const loadModel = vi.fn(async (type) => {
            order.push(`load:${type}`);
            const root = new THREE.Group();
            root.userData.type = type;
            root.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
            return root;
        });
        const game = {
            camera: {},
            scene: {},
            renderer: {
                compileAsync: vi.fn(async (root) => {
                    order.push(`compile:${root.userData.type}`);
                })
            }
        };

        const roots = await prewarmCommonCorpse3dTemplates(game, loadModel);

        expect(roots).toHaveLength(5);
        expect(order).toEqual(COMMON_CORPSE_3D_TYPES.flatMap((type) => [
            `load:${type}`,
            `compile:${type}`
        ]));
    });
});
