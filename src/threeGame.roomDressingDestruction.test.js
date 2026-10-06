import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { ROOM_BUILD_CATALOG, stampRoomBuild, buildRoomInstanceFromBuild } from './roomBuilds.js';
import { assignRoomThemes } from './roomThemes.js';
import { bindRoomContent } from './roomContent.js';
import { planRoomPopulation } from './roomPopulation.js';
import { buildRoomDressingGroup } from './roomDressingRenderer.js';

function createMockChunkRoom() {
    const build = ROOM_BUILD_CATALOG.find((b) => b.id === 'armory_cage') || ROOM_BUILD_CATALOG[0];
    let state = 12345;
    const random = () => (state = (state * 16807) % 2147483647) / 2147483647;
    const stamp = stampRoomBuild(build, random, { openings: { south: { open: true, offset: 8 } } });
    const [themed] = assignRoomThemes([buildRoomInstanceFromBuild(build, stamp, { chunkX: 1, chunkY: 1 })], { biome: 'bunker', depthTier: 1, random });
    const room = { ...themed, contentPlan: bindRoomContent(themed, build, { chunkSize: stamp.grid.length, activeQuests: [] }) };
    room.populationPlan = planRoomPopulation(room, stamp.grid, random);
    return { room, grid: stamp.grid };
}

describe('ThreeGame instanced room dressing destruction (G3.1)', () => {
    it('spawns destructible colliders for eligible non-structural props', () => {
        const { room, grid } = createMockChunkRoom();
        const group = new THREE.Group();
        const fakeGame = {
            chunkSize: grid.length,
            scatterSprites: [],
            brokenPropScatterKeys: new Set()
        };

        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            ThreeGame.prototype.addRoomDressing.call(fakeGame, group, 1, 1, { roomInstances: [room] }, grid);
        } finally {
            warn.mockRestore();
        }

        const destructible = fakeGame.scatterSprites.filter((s) => s.userData.isDestructibleProp);
        expect(destructible.length).toBeGreaterThan(0);
        for (const s of destructible) {
            expect(s.userData.isRoomDressingCollider).toBe(true);
            expect(s.userData.dressingId).toBeTruthy();
            expect(s.userData.scatterKey).toBe(s.userData.dressingId);
            expect(s.userData.propHp).toBeGreaterThan(0);
            expect(s.userData.maxPropHp).toBe(s.userData.propHp);
            expect(s.parent).toBe(group);
        }
    });

    it('damages and zero-scales instance matrix on break without disposing shared geometry or material', () => {
        const fakeGame = {
            scatterSprites: [],
            pickupMeshes: [],
            brokenPropScatterKeys: new Set(),
            audioAt: vi.fn(),
            spawnDamagePip: vi.fn(),
            spawnGearPoofEffect: vi.fn(),
            spawnDestructiblePropDrops: vi.fn(),
            damageScatterProp: ThreeGame.prototype.damageScatterProp,
            breakScatterProp: ThreeGame.prototype.breakScatterProp
        };

        const geom = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshBasicMaterial({ color: 0x888888 });
        const geomDispose = vi.spyOn(geom, 'dispose');
        const matDispose = vi.spyOn(mat, 'dispose');

        const batch = new THREE.InstancedMesh(geom, mat, 3);
        const initialMatrix = new THREE.Matrix4().makeTranslation(10, 0, 10);
        batch.setMatrixAt(1, initialMatrix);
        batch.instanceMatrix.needsUpdate = false;

        const parentGroup = new THREE.Group();
        const collider = new THREE.Object3D();
        collider.position.set(10, 0, 10);
        collider.userData = {
            isScatter: true,
            isDestructibleProp: true,
            isRoomDressingCollider: true,
            dressingId: 'test_room:dressing:clutter:1',
            scatterKey: 'test_room:dressing:clutter:1',
            propHp: 3,
            maxPropHp: 3,
            dressingBatch: batch,
            dressingIndex: 1,
            dressingItem: {
                batchInstances: [{ batch, index: 1 }]
            }
        };
        parentGroup.add(collider);
        fakeGame.scatterSprites.push(collider);

        // Deal 1 damage: should not break
        const hit = fakeGame.damageScatterProp(collider, 1);
        expect(hit).toBe(false);
        expect(collider.userData.propHp).toBe(2);
        expect(fakeGame.scatterSprites).toContain(collider);

        const initialVersion = batch.instanceMatrix.version;

        // Deal fatal damage: should break and zero-scale matrix
        const eventSpy = vi.fn();
        if (typeof window !== 'undefined') window.addEventListener('destructible-prop-broken', eventSpy);

        const fatal = fakeGame.damageScatterProp(collider, 5);
        expect(fatal).toBe(true);

        // Collider removed from scene & list
        expect(fakeGame.scatterSprites).not.toContain(collider);
        expect(collider.parent).toBeNull();
        expect(fakeGame.spawnDestructiblePropDrops).toHaveBeenCalledWith(collider, []);
        expect(fakeGame.breakScatterProp(collider)).toBe(false);
        expect(fakeGame.spawnDestructiblePropDrops).toHaveBeenCalledTimes(1);

        // Matrix zero-scaled
        const readMatrix = new THREE.Matrix4();
        batch.getMatrixAt(1, readMatrix);
        expect(readMatrix.getMaxScaleOnAxis()).toBe(0);
        expect(readMatrix.elements[0]).toBe(0);
        expect(readMatrix.elements[5]).toBe(0);
        expect(readMatrix.elements[10]).toBe(0);
        expect(batch.instanceMatrix.version).toBeGreaterThan(initialVersion);

        // Broken prop scatter key persisted
        expect(fakeGame.brokenPropScatterKeys.has('test_room:dressing:clutter:1')).toBe(true);

        // Shared WebGL assets must NOT be disposed
        expect(geomDispose).not.toHaveBeenCalled();
        expect(matDispose).not.toHaveBeenCalled();
    });

    it('persists destroyed state and initializes zero matrix on re-mounting room dressing', async () => {
        const dummyGeom = new THREE.BoxGeometry(1, 1, 1);
        const dummyMat = new THREE.MeshBasicMaterial();
        const dummyRoot = new THREE.Mesh(dummyGeom, dummyMat);

        const items = [
            { id: 'room_1:dressing:clutter:0', layer: 'clutter', type: 'prop_crate', x: 2, y: 2, scale: 1 },
            { id: 'room_1:dressing:clutter:1', layer: 'clutter', type: 'prop_crate', x: 5, y: 5, scale: 1 }
        ];

        const brokenKeys = new Set(['room_1:dressing:clutter:1']);

        const group = await buildRoomDressingGroup(items, {
            loadModel: async () => dummyRoot,
            loadDecalTexture: async () => null,
            isDestroyed: (id) => brokenKeys.has(id)
        });

        expect(group).toBeTruthy();
        const batch = group.children.find((c) => c.isInstancedMesh);
        expect(batch).toBeTruthy();

        const m0 = new THREE.Matrix4();
        const m1 = new THREE.Matrix4();
        batch.getMatrixAt(0, m0);
        batch.getMatrixAt(1, m1);

        // First item is alive (non-zero scale)
        expect(m0.getMaxScaleOnAxis()).toBeGreaterThan(0.5);
        // Second item was destroyed in persistence (zero scale on all axes)
        expect(m1.getMaxScaleOnAxis()).toBe(0);
        expect(m1.elements[0]).toBe(0);
        expect(m1.elements[5]).toBe(0);
        expect(m1.elements[10]).toBe(0);
    });
});
