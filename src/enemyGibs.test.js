import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { setGoreEnabled } from './featureFlags.js';
import {
    fractureGeometry,
    spawnEnemyGibs,
    spawnPropDebris,
    prewarmEnemyGibs,
    extractGibSource,
    getGibChunks,
    clearGibCache,
    GIB_CHUNK_COUNT
} from './enemyGibs.js';

/** A blob with enough triangles to survive clustering, centred on the origin. */
function testGeometry(segments = 8) {
    return new THREE.SphereGeometry(0.5, segments, segments);
}

function triangleCount(geometry) {
    const geo = geometry.index ? geometry.toNonIndexed() : geometry;
    return geo.getAttribute('position').count / 3;
}

describe('fractureGeometry', () => {
    it('splits a mesh into the requested number of chunks', () => {
        const chunks = fractureGeometry(testGeometry(), 8);
        expect(chunks).toHaveLength(8);
        for (const chunk of chunks) {
            expect(chunk.getAttribute('position').count).toBeGreaterThan(0);
        }
    });

    it('loses no triangles', () => {
        // Every triangle of the corpse has to land in exactly one chunk --
        // dropping any makes the gibs visibly thinner than the enemy was.
        const source = testGeometry();
        const chunks = fractureGeometry(source, 8);
        const total = chunks.reduce((sum, c) => sum + triangleCount(c), 0);
        expect(total).toBe(triangleCount(source));
    });

    it('is deterministic for the same geometry and chunk count', () => {
        const a = fractureGeometry(testGeometry(), 6).map(triangleCount);
        const b = fractureGeometry(testGeometry(), 6).map(triangleCount);
        expect(a).toEqual(b);
    });

    it('gives each chunk its own local origin and a world offset', () => {
        // Chunks are flung independently, so each needs to spin about its own
        // centre rather than the corpse's -- otherwise they orbit the kill.
        const chunks = fractureGeometry(testGeometry(), 4);
        for (const chunk of chunks) {
            expect(chunk.userData.offset).toBeInstanceOf(THREE.Vector3);
            chunk.computeBoundingSphere();
            expect(chunk.boundingSphere.center.length()).toBeLessThan(0.25);
        }
    });

    it('never returns more chunks than there are triangles', () => {
        const tiny = new THREE.BufferGeometry();
        // Two triangles only.
        tiny.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
            0, 0, 0, 1, 0, 0, 0, 1, 0,
            0, 0, 0, 0, 1, 0, -1, 0, 0
        ]), 3));
        const chunks = fractureGeometry(tiny, 8);
        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks.length).toBeLessThanOrEqual(2);
    });

    it('returns an empty list for geometry with no positions', () => {
        expect(fractureGeometry(new THREE.BufferGeometry(), 8)).toEqual([]);
        expect(fractureGeometry(null, 8)).toEqual([]);
    });
});

describe('getGibChunks', () => {
    it('fractures once per enemy type and reuses the result', () => {
        clearGibCache();
        let built = 0;
        const source = () => {
            built += 1;
            return testGeometry();
        };
        const first = getGibChunks('cybersnail', source);
        const second = getGibChunks('cybersnail', source);
        expect(built).toBe(1);
        expect(second).toBe(first);
        expect(first).toHaveLength(GIB_CHUNK_COUNT);
    });

    it('keeps separate entries per enemy type', () => {
        clearGibCache();
        const a = getGibChunks('cybersnail', () => testGeometry());
        const b = getGibChunks('sentinel', () => testGeometry());
        expect(a).not.toBe(b);
    });

    it('caches the miss so a model without geometry is not retried each death', () => {
        clearGibCache();
        let calls = 0;
        const none = () => {
            calls += 1;
            return null;
        };
        expect(getGibChunks('ghost', none)).toEqual([]);
        expect(getGibChunks('ghost', none)).toEqual([]);
        expect(calls).toBe(1);
    });
});

describe('extractGibSource', () => {
    it('returns null when the visual has no mesh', () => {
        expect(extractGibSource(null)).toBeNull();
        expect(extractGibSource(new THREE.Group())).toBeNull();
    });

    it('bakes the mesh transform into the root local frame', () => {
        // The GLB is normalised and yawed inside the visual root, so raw mesh
        // geometry is the wrong size and orientation. Chunks must come back in
        // the root's frame or the gibs spawn at the wrong scale.
        const root = new THREE.Group();
        const inner = new THREE.Group();
        inner.scale.setScalar(4);
        inner.position.set(1, 0, 0);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
        inner.add(mesh);
        root.add(inner);
        root.updateMatrixWorld(true);

        const source = extractGibSource(root);
        expect(source).not.toBeNull();
        source.geometry.computeBoundingBox();
        const size = source.geometry.boundingBox.getSize(new THREE.Vector3());
        expect(size.x).toBeCloseTo(4, 5);
        const centre = source.geometry.boundingBox.getCenter(new THREE.Vector3());
        expect(centre.x).toBeCloseTo(1, 5);
    });

    it('is unaffected by the root own transform', () => {
        // Only what is *inside* the root counts; the root itself is re-applied
        // to the gib group at spawn time, so baking it here would double it.
        const build = (rootScale) => {
            const root = new THREE.Group();
            root.scale.setScalar(rootScale);
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial());
            root.add(mesh);
            root.updateMatrixWorld(true);
            const source = extractGibSource(root);
            source.geometry.computeBoundingBox();
            return source.geometry.boundingBox.getSize(new THREE.Vector3()).x;
        };
        expect(build(1)).toBeCloseTo(build(0.05), 5);
    });

    it('merges every mesh in the visual', () => {
        const root = new THREE.Group();
        for (let i = 0; i < 3; i++) {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
            mesh.position.x = i * 3;
            root.add(mesh);
        }
        root.updateMatrixWorld(true);
        const source = extractGibSource(root);
        const boxTris = 12;
        expect(source.geometry.getAttribute('position').count / 3).toBe(boxTris * 3);
    });
});

describe('spawnEnemyGibs', () => {
    function fakeGame() {
        return {
            scene: new THREE.Group(),
            transientEffects: [],
            spawnTextureBurstEffect: vi.fn()
        };
    }

    function fakeSprite() {
        const root = new THREE.Group();
        root.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial()));
        root.updateMatrixWorld(true);
        return {
            userData: { type: 'cybersnail', enemy3dVisual: { root } }
        };
    }

    beforeEach(() => {
        clearGibCache();
        vi.stubGlobal('window', { localStorage: null });
        setGoreEnabled(true);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('spawns chunks and registers one transient effect', () => {
        const game = fakeGame();
        expect(spawnEnemyGibs(game, fakeSprite())).toBe(true);
        expect(game.transientEffects).toHaveLength(1);
        expect(game.scene.children.length).toBeGreaterThan(0);
    });

    it('declines when gore is disabled', () => {
        setGoreEnabled(false);
        const game = fakeGame();
        expect(spawnEnemyGibs(game, fakeSprite())).toBe(false);
        expect(game.transientEffects).toHaveLength(0);
        expect(game.scene.children).toHaveLength(0);
    });

    it('declines when the enemy has no 3D visual', () => {
        // Sprite-only enemies (model still loading, or a type with no GLB)
        // must fall through to the plain death burst, not throw.
        const game = fakeGame();
        expect(spawnEnemyGibs(game, { userData: { type: 'cybersnail' } })).toBe(false);
        expect(spawnEnemyGibs(game, null)).toBe(false);
        expect(spawnEnemyGibs(null, fakeSprite())).toBe(false);
    });

    it('does not dispose shared chunk geometry when a corpse expires', () => {
        // Chunks are cached per enemy type; disposing them with the first
        // corpse would blank every later death of that type.
        const game = fakeGame();
        spawnEnemyGibs(game, fakeSprite());
        const chunks = getGibChunks('cybersnail', () => null);
        const effect = game.transientEffects[0];
        effect.dispose();
        for (const chunk of chunks) {
            expect(chunk.getAttribute('position').count).toBeGreaterThan(0);
        }
    });

    it('reuses the cached fracture across repeated deaths', () => {
        const game = fakeGame();
        spawnEnemyGibs(game, fakeSprite());
        const first = getGibChunks('cybersnail', () => null);
        spawnEnemyGibs(game, fakeSprite());
        expect(getGibChunks('cybersnail', () => null)).toBe(first);
        expect(game.transientEffects).toHaveLength(2);
    });

    it('biases chunk velocity along the killing blow', () => {
        const game = fakeGame();
        spawnEnemyGibs(game, fakeSprite(), { direction: { x: 1, z: 0 } });
        const group = game.scene.children.find((c) => c.isGroup);
        expect(group.children.length).toBeGreaterThan(0);
        // Step the sim and confirm the debris field drifts downrange.
        const effect = game.transientEffects[0];
        effect.update(0.2);
        const meanX = group.children.reduce((s, c) => s + c.position.x, 0) / group.children.length;
        expect(meanX).toBeGreaterThan(0);
    });
});

describe('prewarmEnemyGibs', () => {
    it('fills the cache so the first death does not pay for the fracture', () => {
        clearGibCache();
        const root = new THREE.Group();
        root.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial()));
        root.updateMatrixWorld(true);

        expect(prewarmEnemyGibs('cybersnail', root)).toBe(true);
        // A later call must hit the cache rather than re-walking the mesh.
        let rebuilt = 0;
        const chunks = getGibChunks('cybersnail', () => {
            rebuilt += 1;
            return null;
        });
        expect(rebuilt).toBe(0);
        expect(chunks.length).toBeGreaterThan(0);
    });

    it('is a safe no-op without a type or root', () => {
        expect(prewarmEnemyGibs(null, new THREE.Group())).toBe(false);
        expect(prewarmEnemyGibs('cybersnail', null)).toBe(false);
    });
});

describe('spawnPropDebris', () => {
    function fakeGame() {
        return { scene: new THREE.Group(), transientEffects: [], spawnTextureBurstEffect: vi.fn() };
    }
    function fakeProp() {
        const root = new THREE.Group();
        root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
        root.updateMatrixWorld(true);
        // Props carry world3dRoot rather than enemy3dVisual.
        return { userData: { scatterKey: 'prop_storage_drum', world3dRoot: root } };
    }

    beforeEach(() => {
        clearGibCache();
        vi.stubGlobal('window', { localStorage: null });
        setGoreEnabled(true);
    });
    afterEach(() => vi.unstubAllGlobals());

    it('breaks a world prop into chunks from its world3dRoot', () => {
        const game = fakeGame();
        expect(spawnPropDebris(game, fakeProp())).toBe(true);
        expect(game.transientEffects).toHaveLength(1);
    });

    it('still breaks props when gore is switched off', () => {
        // A player disabling gore is asking not to see blood, not asking
        // crates to stop breaking. Regression guard for that distinction.
        setGoreEnabled(false);
        const game = fakeGame();
        expect(spawnPropDebris(game, fakeProp())).toBe(true);
        expect(game.transientEffects).toHaveLength(1);
    });

    it('but enemies still respect the gore setting', () => {
        setGoreEnabled(false);
        const game = fakeGame();
        const root = new THREE.Group();
        root.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial()));
        root.updateMatrixWorld(true);
        expect(spawnEnemyGibs(game, { userData: { type: 'cybersnail', enemy3dVisual: { root } } })).toBe(false);
    });

    it('declines for a prop with no 3D model so the caller can poof instead', () => {
        const game = fakeGame();
        expect(spawnPropDebris(game, { userData: { scatterKey: 'flat_sprite' } })).toBe(false);
    });
});
