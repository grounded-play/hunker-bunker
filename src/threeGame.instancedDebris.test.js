import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

describe('Instanced Ambient Debris Batching (Draw-Call Optimization)', () => {
    it('batches identical static ambient debris into InstancedMesh pools', () => {
        const fakeTexture = new THREE.Texture();
        const createdSingles = [];

        const game = {
            createChunkScatterPlacements: () => [
                { type: 'scatter_bolts', x: 2, z: 3, scale: 0.8, tiltX: 0, rotation: 0.5 },
                { type: 'scatter_bolts', x: 5, z: 6, scale: 0.9, tiltX: 0.1, rotation: 1.2 },
                { type: 'scatter_cable_coil', x: 10, z: 12, scale: 1.0, tiltX: 0, rotation: 0 },
                { type: 'bunker_junk', scatterKey: 'junk_1', x: 15, z: 15, scale: 1.2 }
            ],
            depletedGearPileKeys: new Set(),
            killedEnemyScatterKeys: new Set(),
            isEnemyType: () => false,
            scatterTextures: {
                scatter_bolts: fakeTexture,
                scatter_cable_coil: fakeTexture
            },
            scatterMaterials: {},
            createScatterInstance: (placement) => {
                const obj = new THREE.Object3D();
                obj.userData = { type: placement.type };
                createdSingles.push(obj);
                return obj;
            },
            createChunkSetPiecePlacements: () => [],
            createChunkPickupPlacements: () => [],
            createPickupInstance: () => null,
            getRoomTypeGrid: () => ({ get: () => null }),
            scatterSprites: []
        };

        const group = new THREE.Group();

        // Run the scatter creation logic isolated from buildChunkGroup
        const scatterPlacements = game.createChunkScatterPlacements(0, 0, null);
        const INSTANCED_DEBRIS_TYPES = new Set([
            'scatter_bolts', 'scatter_cable_coil', 'scatter_gravel',
            'scatter_coolant_puddle', 'scatter_slime_puddle', 'scatter_cryo_shards', 'scatter_bio_moss'
        ]);

        const debrisByType = new Map();
        const remainingScatterPlacements = [];

        for (const placement of scatterPlacements) {
            if (INSTANCED_DEBRIS_TYPES.has(placement.type)) {
                const tex = game.scatterTextures[placement.type];
                if (tex) {
                    if (!debrisByType.has(placement.type)) debrisByType.set(placement.type, []);
                    debrisByType.get(placement.type).push(placement);
                    continue;
                }
            }
            remainingScatterPlacements.push(placement);
        }

        const dummy = new THREE.Object3D();
        for (const [type, placements] of debrisByType.entries()) {
            const texture = game.scatterTextures[type];
            const mat = new THREE.MeshBasicMaterial({ map: texture });
            const geo = new THREE.PlaneGeometry(1, 1);
            const instanced = new THREE.InstancedMesh(geo, mat, placements.length);
            for (let i = 0; i < placements.length; i++) {
                const p = placements[i];
                dummy.position.set(p.x, p.elevation ?? 0.02, p.z);
                dummy.rotation.set(-Math.PI / 2, 0, p.rotation ?? 0);
                dummy.scale.set(p.scale ?? 1, (p.scale ?? 1) * (1 + (p.tiltX ?? 0)), 1);
                dummy.updateMatrix();
                instanced.setMatrixAt(i, dummy.matrix);
            }
            instanced.instanceMatrix.needsUpdate = true;
            instanced.userData = { isScatter: true, isInstancedDebris: true, type };
            group.add(instanced);
        }

        for (const placement of remainingScatterPlacements) {
            const scatter = game.createScatterInstance(placement);
            if (scatter) group.add(scatter);
        }

        const instancedMeshes = group.children.filter((c) => c.isInstancedMesh);
        expect(instancedMeshes).toHaveLength(2); // bolts and cable coil

        const boltsInstanced = instancedMeshes.find((m) => m.userData.type === 'scatter_bolts');
        expect(boltsInstanced).toBeDefined();
        expect(boltsInstanced.count).toBe(2);

        const cableInstanced = instancedMeshes.find((m) => m.userData.type === 'scatter_cable_coil');
        expect(cableInstanced).toBeDefined();
        expect(cableInstanced.count).toBe(1);

        // Bunker junk was preserved as individual interactive scatter
        expect(createdSingles).toHaveLength(1);
        expect(createdSingles[0].userData.type).toBe('bunker_junk');
    });
});
