import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

function texturedRoot() {
    const map = new THREE.Texture();
    map.needsUpdate = true;
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ map })));
    return { root, map };
}

function game(profile) {
    return {
        performanceProfile: profile,
        renderer: { compileAsync: vi.fn(() => Promise.resolve()), initTexture: vi.fn() },
        camera: {},
        scene: {},
        getTextureUploadQueue: ThreeGame.prototype.getTextureUploadQueue,
        prewarmLateModel: ThreeGame.prototype.prewarmLateModel,
        compileLateModel: ThreeGame.prototype.compileLateModel,
        prewarmMountedChunk: ThreeGame.prototype.prewarmMountedChunk
    };
}

describe('late models upload their textures across frames', () => {
    // 2026-10-16 freeze probe: textures uploaded on first draw, all in one frame.
    it('waits in gameplay until the queue has uploaded the model textures', async () => {
        const g = game('gameplay');
        const { root, map } = texturedRoot();
        let done = false;
        const pending = g.prewarmLateModel(root).then(() => { done = true; });
        await new Promise((r) => setTimeout(r, 0));
        expect(done).toBe(false);
        g.textureUploads.drain(3);
        await pending;
        expect(g.renderer.initTexture).toHaveBeenCalledWith(map);
    });

    it('never holds a menu model on the queue, which only gameplay drains', async () => {
        const g = game('menu');
        const { root } = texturedRoot();
        await g.prewarmLateModel(root);
        expect(g.textureUploads).toBeUndefined();
        expect(g.renderer.initTexture).not.toHaveBeenCalled();
    });

    it('prewarms a chunk mounted during play, but not during deploy staging', () => {
        const staging = game('gameplay');
        staging.inputEnabled = false;
        staging.chunkMeshes = new Map([['0,0', texturedRoot().root]]);
        staging.prewarmMountedChunk('0,0');
        expect(staging.renderer.compileAsync).not.toHaveBeenCalled();

        const playing = game('gameplay');
        playing.inputEnabled = true;
        playing.chunkMeshes = new Map([['0,0', texturedRoot().root]]);
        playing.prewarmMountedChunk('0,0');
        expect(playing.textureUploads.size).toBe(1);
    });
});
