import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { TextureUploadQueue, collectMaterialTextures } from './textureUploadQueue.js';

function texture() {
    const t = new THREE.Texture();
    t.needsUpdate = true;
    return t;
}

function meshWith(material) {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.BufferGeometry(), material));
    return group;
}

describe('texture upload queue', () => {
    it('finds material and shader-uniform textures, skipping unloaded ones', () => {
        const map = texture();
        const normalMap = texture();
        const uniformTex = texture();
        const notLoaded = new THREE.Texture();
        const root = new THREE.Group();
        root.add(meshWith(new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap: notLoaded })));
        root.add(meshWith(new THREE.ShaderMaterial({ uniforms: { tex: { value: uniformTex } } })));
        expect(collectMaterialTextures(root)).toEqual(new Set([map, normalMap, uniformTex]));
    });

    // 2026-10-16 freeze probe: up to 39 textures uploaded inside one render call.
    it('uploads within a per-frame budget instead of all at once', () => {
        let clock = 0;
        const upload = vi.fn(() => { clock += 2; });
        const queue = new TextureUploadQueue({ upload, now: () => clock });
        const textures = Array.from({ length: 10 }, texture);
        const root = new THREE.Group();
        for (const t of textures) root.add(meshWith(new THREE.MeshBasicMaterial({ map: t })));
        queue.enqueue(root);
        expect(queue.drain(4)).toBe(2);
        expect(queue.size).toBe(8);
    });

    it('always uploads at least one per frame, and resolves a root once its textures are up', async () => {
        const upload = vi.fn();
        const queue = new TextureUploadQueue({ upload, now: () => 0 });
        const a = texture();
        const b = texture();
        const done = vi.fn();
        queue.enqueue(meshWith(new THREE.MeshBasicMaterial({ map: a, alphaMap: b }))).then(done);
        queue.drain(0);
        await Promise.resolve();
        expect(done).not.toHaveBeenCalled();
        queue.drain(0);
        await Promise.resolve();
        expect(done).toHaveBeenCalled();
        expect(upload).toHaveBeenCalledTimes(2);
    });

    it('does not queue or upload a texture twice', async () => {
        const upload = vi.fn();
        const queue = new TextureUploadQueue({ upload, now: () => 0 });
        const shared = texture();
        queue.enqueue(meshWith(new THREE.MeshBasicMaterial({ map: shared })));
        queue.enqueue(meshWith(new THREE.MeshBasicMaterial({ map: shared })));
        expect(queue.size).toBe(1);
        queue.drain(10);
        await expect(queue.enqueue(meshWith(new THREE.MeshBasicMaterial({ map: shared })))).resolves.toBeUndefined();
        expect(upload).toHaveBeenCalledTimes(1);
    });
});
