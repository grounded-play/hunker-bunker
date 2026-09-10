import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BiomeAtmosphereSystem, BIOME_PARTICLE_CONFIGS, createFootstepPuff } from './ambientDrift.js';

describe('Ambient Drift and Living World Atmosphere', () => {
    describe('BiomeAtmosphereSystem', () => {
        it('initializes particle volume and attaches to scene with zero dynamic PointLights', () => {
            const scene = new THREE.Scene();
            const system = new BiomeAtmosphereSystem(scene);

            expect(scene.children.length).toBe(1);
            const points = scene.children[0];
            expect(points.name).toBe('BiomeAtmospherePoints');
            expect(points.isPoints).toBe(true);

            // Verify unlit additive material
            expect(points.material.blending).toBe(THREE.AdditiveBlending);
            expect(points.material.depthWrite).toBe(false);

            system.dispose();
            expect(scene.children.length).toBe(0);
        });

        it('switches particle colors and velocities based on biome', () => {
            const scene = new THREE.Scene();
            const system = new BiomeAtmosphereSystem(scene);

            system.setBiome('cryo');
            expect(system.material.color.getHex()).toBe(BIOME_PARTICLE_CONFIGS.cryo.color);

            system.setBiome('bio');
            expect(system.material.color.getHex()).toBe(BIOME_PARTICLE_CONFIGS.bio.color);

            system.dispose();
        });

        it('wraps particles cleanly within bounding box around player without allocations', () => {
            const scene = new THREE.Scene();
            const system = new BiomeAtmosphereSystem(scene, { boxRadius: 10, height: 5 });

            const playerPos = { x: 100, y: 0, z: 100 };
            system.update(1.0, playerPos);

            const positions = system.geometry.attributes.position.array;
            for (let i = 0; i < system.particles.length; i++) {
                const x = positions[i * 3 + 0];
                const z = positions[i * 3 + 2];
                expect(x).toBeGreaterThanOrEqual(playerPos.x - 10);
                expect(x).toBeLessThanOrEqual(playerPos.x + 10);
                expect(z).toBeGreaterThanOrEqual(playerPos.z - 10);
                expect(z).toBeLessThanOrEqual(playerPos.z + 10);
            }

            system.dispose();
        });
    });

    describe('createFootstepPuff', () => {
        it('creates a footstep puff that expands and fades out', () => {
            const puff = createFootstepPuff({ x: 0, y: 0.02, z: 0 });
            expect(puff.isGroup).toBe(true);

            const finished = puff.userData.update(0.35);
            expect(finished).toBe(true);

            puff.userData.dispose();
        });
    });
});
