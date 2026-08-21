import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
    captureHardwareCapabilities,
    createGpuMemoryTracker,
    estimateGeometryBytes,
    estimateGpuMemory,
    estimateTextureBytes
} from './gpuMemoryBudget.js';

describe('GPU memory estimates', () => {
    it('counts typed geometry buffers and shared resources once', () => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
        geometry.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2]), 1));
        const texture = new THREE.DataTexture(new Uint8Array(4 * 4 * 4), 4, 4);
        texture.generateMipmaps = false;
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const scene = new THREE.Scene();
        scene.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));

        const result = estimateGpuMemory({ scene });
        expect(estimateGeometryBytes(geometry)).toBe(42);
        expect(result).toMatchObject({
            geometryBytes: 42,
            textureBytes: 64,
            uniqueGeometries: 1,
            uniqueMaterials: 1,
            uniqueTextures: 1
        });
    });

    it('uses exact compressed mip payload sizes', () => {
        const texture = new THREE.CompressedTexture([
            { data: new Uint8Array(32), width: 8, height: 8 },
            { data: new Uint8Array(8), width: 4, height: 4 }
        ], 8, 8);
        expect(estimateTextureBytes(texture)).toBe(40);
    });

    it('deduplicates texture clones that share one GPU upload source', () => {
        const texture = new THREE.DataTexture(new Uint8Array(4 * 4 * 4), 4, 4);
        texture.generateMipmaps = false;
        const clone = texture.clone();
        clone.offset.set(0.5, 0.5);
        const scene = new THREE.Scene();
        scene.add(
            new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ map: texture })),
            new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ map: clone }))
        );

        expect(estimateGpuMemory({ scene })).toMatchObject({
            textureBytes: 64,
            uniqueTextures: 1,
            uniqueTextureObjects: 2
        });
    });

    it('includes composer targets and a lower-bound default framebuffer', () => {
        const target = new THREE.WebGLRenderTarget(10, 20, { depthBuffer: true });
        target.texture.image = { width: 10, height: 20 };
        target.texture.generateMipmaps = false;
        const renderer = {
            getContext: () => ({ drawingBufferWidth: 100, drawingBufferHeight: 50 })
        };
        const result = estimateGpuMemory({
            scene: new THREE.Scene(),
            renderer,
            composer: { readBuffer: target, writeBuffer: target }
        });

        expect(result.renderTargetBytes).toBe(1600); // RGBA8 + depth
        expect(result.defaultFramebufferBytes).toBe(40_000);
        expect(result.estimatedBytes).toBe(41_600);
    });

    it('caches expensive scans until the sample interval elapses', () => {
        let time = 0;
        const tracker = createGpuMemoryTracker({ now: () => time, sampleIntervalMs: 2000 });
        const scene = new THREE.Scene();
        const first = tracker.snapshot({ scene });
        scene.add(new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial()));
        expect(tracker.snapshot({ scene })).toBe(first);

        time = 2000;
        expect(tracker.snapshot({ scene })).not.toBe(first);
    });

    it('captures coarse hardware limits without requiring debug renderer access', () => {
        const gl = {
            MAX_TEXTURE_SIZE: 1,
            MAX_RENDERBUFFER_SIZE: 2,
            getExtension: vi.fn(() => null),
            getParameter: vi.fn((constant) => constant === 1 ? 8192 : 4096)
        };
        expect(captureHardwareCapabilities({
            renderer: { getContext: () => gl },
            navigatorObject: { hardwareConcurrency: 8, deviceMemory: 16 },
            isSteamDeck: true
        })).toMatchObject({
            isSteamDeck: true,
            logicalCores: 8,
            deviceMemoryGb: 16,
            gpuVendor: null,
            gpuRenderer: null,
            softwareRenderer: false,
            powerPreference: 'high-performance',
            maxTextureSize: 8192,
            maxRenderbufferSize: 4096
        });
    });
});
