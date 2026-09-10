import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

const { loadAsync } = vi.hoisted(() => ({ loadAsync: vi.fn() }));
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
    GLTFLoader: class {
        setMeshoptDecoder() { return this; }
        loadAsync(url) { return loadAsync(url); }
    }
}));

let createWorld3dModel;
let getAssetLoadReport;
beforeEach(async () => {
    vi.resetModules();
    loadAsync.mockReset();
    vi.stubGlobal('window', {});
    ({ createWorld3dModel } = await import('./world3dOverlay.js'));
    ({ getAssetLoadReport } = await import('./assetLoadTelemetry.js'));
});
afterEach(() => vi.unstubAllGlobals());

function template() {
    const scene = new THREE.Group();
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), new THREE.MeshStandardMaterial()));
    return { scene };
}

describe('world model loading diagnostics', () => {
    it('shares in-flight loads without marking asynchronous waiting as synchronous work', async () => {
        let resolveLoad;
        loadAsync.mockImplementation(() => new Promise((resolve) => { resolveLoad = resolve; }));
        const first = createWorld3dModel('base_console');
        const second = createWorld3dModel('base_console');
        expect(loadAsync).toHaveBeenCalledOnce();
        expect(window.__hbPerfPhaseStack ?? []).toHaveLength(0);
        expect(window.__hbPerfPhaseHistory ?? []).toHaveLength(0);
        resolveLoad(template());
        const [a, b] = await Promise.all([first, second]);
        expect(a.children[0]).not.toBe(b.children[0]);
        expect(new THREE.Box3().setFromObject(a).getSize(new THREE.Vector3()).y).toBeCloseTo(1.05);
        expect(window.__hbPerfPhaseHistory.map((span) => span.phase)).toEqual([
            'world-model:clone', 'world-model:prepare', 'world-model:clone', 'world-model:prepare'
        ]);
        expect(window.__hbPerfPhaseHistory[0].context).toMatchObject({ type: 'base_console' });
        expect(window.__hbPerfPhaseStack).toHaveLength(0);
        expect(getAssetLoadReport()).toEqual([expect.objectContaining({
            group: 'world-model', attempts: 1, cacheHits: 1, failures: 0, lastStatus: 'loaded'
        })]);
    });

    it('reports a failure and evicts the rejected template so the next request can recover', async () => {
        loadAsync.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(template());
        await expect(createWorld3dModel('base_console')).rejects.toThrow('offline');
        expect(getAssetLoadReport()[0]).toMatchObject({ failures: 1, lastError: 'offline' });
        await expect(createWorld3dModel('base_console')).resolves.toBeInstanceOf(THREE.Group);
        expect(loadAsync).toHaveBeenCalledTimes(2);
        expect(getAssetLoadReport()[0]).toMatchObject({ attempts: 2, failures: 1, lastStatus: 'loaded', lastError: null });
    });

    it('closes its synchronous span if the decoded scene cannot be cloned', async () => {
        loadAsync.mockResolvedValueOnce({ scene: null });
        await expect(createWorld3dModel('base_console')).rejects.toThrow();
        expect(window.__hbPerfPhaseStack).toHaveLength(0);
        expect(window.__hbPerfPhaseHistory[0].phase).toBe('world-model:clone');
    });
});
