import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
    VENT_TYPES,
    GEYSER_DAMAGE_RADIUS,
    GEYSER_DAMAGE_AMOUNT,
    planChunkVents,
    planChunkFloorFog,
    AmbientVentSystem,
    FloorFogSystem
} from './ambientVentsAndFog.js';

describe('Sprint 53 L2 & L3: Ambient Vents & Floor Fog', () => {
    const mockRoomUtility = {
        role: 'utility',
        center: { x: 10, y: 10 },
        interior: Array.from({ length: 25 }, (_, i) => ({ x: 5 + (i % 5), y: 5 + Math.floor(i / 5) }))
    };

    const mockRoomCryo = {
        role: 'cryo-lab',
        center: { x: 20, y: 20 },
        interior: Array.from({ length: 20 }, (_, i) => ({ x: 18 + (i % 4), y: 18 + Math.floor(i / 4) }))
    };

    const mockRoomBio = {
        role: 'hive',
        center: { x: 30, y: 30 },
        interior: Array.from({ length: 20 }, (_, i) => ({ x: 28 + (i % 4), y: 28 + Math.floor(i / 4) }))
    };

    it('plans biome-appropriate vents across room roles (L2)', () => {
        const activeVents = planChunkVents({
            chunkX: 0,
            chunkY: 0,
            rooms: [mockRoomUtility],
            condition: null,
            seed: 123
        });
        expect(activeVents.length).toBeGreaterThan(0);
        expect(activeVents[0].type).toBe(VENT_TYPES.STEAM);

        const cryoVents = planChunkVents({
            chunkX: 0,
            chunkY: 0,
            rooms: [mockRoomCryo],
            condition: null,
            seed: 123
        });
        expect(cryoVents.length).toBeGreaterThan(0);
        expect(cryoVents[0].type).toBe(VENT_TYPES.CRYO);

        const bioVents = planChunkVents({
            chunkX: 0,
            chunkY: 0,
            rooms: [mockRoomBio],
            condition: null,
            seed: 123
        });
        expect(bioVents.length).toBeGreaterThan(0);
        expect(bioVents[0].type).toBe(VENT_TYPES.SPORE);
    });

    it('plans fissure geysers when expedition condition is geothermal (L2)', () => {
        const geoVents = planChunkVents({
            chunkX: 0,
            chunkY: 0,
            rooms: [mockRoomUtility],
            landform: 'canyon',
            condition: 'geothermal',
            seed: 456
        });
        expect(geoVents.length).toBeGreaterThan(0);
        expect(geoVents.some(v => v.type === VENT_TYPES.GEYSER)).toBe(true);
    });

    it('plans floor fog in large rooms (>= 16 tiles) and canyons (L3)', () => {
        const smallRoom = {
            interior: [{ x: 1, y: 1 }, { x: 1, y: 2 }]
        };
        const fogPatches = planChunkFloorFog({
            chunkX: 1,
            chunkY: 1,
            rooms: [mockRoomUtility, smallRoom],
            landform: 'canyon',
            biome: 'cryo'
        });
        // 1 for large room, 1 for canyon landform, none for smallRoom
        expect(fogPatches.length).toBe(2);
        expect(fogPatches[0].chunkKey).toBe('1,1');
        expect(fogPatches[0].density).toBeGreaterThan(0.2);
    });

    it('AmbientVentSystem mounts instanced meshes and pulses dynamic light on bursts (L2)', () => {
        const scene = new THREE.Scene();
        const ventSys = new AmbientVentSystem(scene);
        const group = new THREE.Group();

        ventSys.buildChunkVents(group, 0, 0, { roomInstances: [mockRoomUtility] }, null, null, null);

        // Group has grate and plume instanced meshes
        const plumeMesh = group.children.find(c => c.userData?.isVentPlumePool);
        expect(plumeMesh).toBeDefined();

        const fakeGame = {
            chunkMeshes: new Map([['0,0', group]]),
            takeDamage: vi.fn()
        };

        // Run update during day
        ventSys.update(0.016, 500, { x: 7, y: 0, z: 7 }, fakeGame, 1.0);
        expect(ventSys.plumeMaterial.uniforms.uDayBlend.value).toBe(1.0);

        // Run update during night (dayBlend = 0.0)
        ventSys.update(0.016, 1000, { x: 7, y: 0, z: 7 }, fakeGame, 0.0);
        expect(ventSys.plumeMaterial.uniforms.uDayBlend.value).toBe(0.0);

        ventSys.dispose();
    });

    it('deals telegraphed heat damage if player stands inside erupting geyser (L2)', () => {
        const scene = new THREE.Scene();
        const ventSys = new AmbientVentSystem(scene);
        const group = new THREE.Group();

        ventSys.buildChunkVents(group, 0, 0, { roomInstances: [mockRoomUtility] }, null, 'canyon', { condition: 'geothermal' });

        const geyser = [...ventSys.activeVents.values()].find(v => v.type === VENT_TYPES.GEYSER);
        expect(geyser).toBeDefined();
        expect(GEYSER_DAMAGE_RADIUS).toBeGreaterThan(1.0);

        const fakeGame = {
            chunkMeshes: new Map([['0,0', group]]),
            takeDamage: vi.fn()
        };

        // Simulate a time when geyser is bursting
        // cycleTime = (timeSec + phase) % interval < burstDuration
        const targetTimeSec = (geyser.interval - geyser.phase + 0.5) % geyser.interval;
        const nowMs = targetTimeSec * 1000;

        // Player is far away -> no damage
        ventSys.update(0.016, nowMs, { x: geyser.x + 10, y: 0, z: geyser.z + 10 }, fakeGame, 0.5);
        expect(fakeGame.takeDamage).not.toHaveBeenCalled();

        // Player stands directly on geyser during burst -> takes damage
        ventSys.update(0.016, nowMs, { x: geyser.x, y: 0, z: geyser.z }, fakeGame, 0.5);
        expect(fakeGame.takeDamage).toHaveBeenCalledWith(GEYSER_DAMAGE_AMOUNT, 'geothermal-fissure', geyser.x, geyser.z);

        ventSys.dispose();
    });

    // Owner log 2026-10-07 (desktop, ANGLE/D3D11): 2-10 s frozen frames.
    // three bakes the count of VISIBLE point lights into every lit shader, so
    // a vent light toggled with .visible made every material in view compile a
    // new program each time a burst started or ended. Idle = intensity 0.
    it('keeps its vent lights in the scene at a constant count, burst or idle', () => {
        const scene = new THREE.Scene();
        const ventSys = new AmbientVentSystem(scene);
        const group = new THREE.Group();
        ventSys.buildChunkVents(group, 0, 0, { roomInstances: [mockRoomUtility] }, null, 'canyon', { condition: 'geothermal' });
        const geyser = [...ventSys.activeVents.values()].find(v => v.type === VENT_TYPES.GEYSER);
        const fakeGame = { chunkMeshes: new Map([['0,0', group]]), takeDamage: vi.fn() };
        const visibleLights = () => ventSys.lightPool.filter((light) => light.visible).length;
        expect(visibleLights()).toBe(ventSys.maxDynamicLights);
        const bursting = ((geyser.interval - geyser.phase + 0.5) % geyser.interval) * 1000;
        ventSys.update(0.016, bursting, { x: 99, y: 0, z: 99 }, fakeGame, 0.5);
        expect(visibleLights()).toBe(ventSys.maxDynamicLights);
        expect(ventSys.lightPool.some((light) => light.intensity > 0)).toBe(true);
        const quiet = ((geyser.interval - geyser.phase + geyser.interval * 0.95) % geyser.interval) * 1000;
        ventSys.update(0.016, quiet, { x: 99, y: 0, z: 99 }, fakeGame, 0.5);
        expect(visibleLights()).toBe(ventSys.maxDynamicLights);
        ventSys.clear();
        expect(visibleLights()).toBe(ventSys.maxDynamicLights);
        expect(ventSys.lightPool.every((light) => light.intensity === 0)).toBe(true);
        ventSys.dispose();
    });

    it('FloorFogSystem updates dayBlend and thickens at night (L3)', () => {
        const fogSys = new FloorFogSystem();
        const group = new THREE.Group();

        fogSys.buildChunkFloorFog(group, 0, 0, { roomInstances: [mockRoomUtility], biome: 'active' }, null, null, null);
        const fogMesh = group.children.find(c => c.userData?.isFloorFogPool);
        expect(fogMesh).toBeDefined();

        fogSys.update(0.016, 2000, 0.0); // Night
        expect(fogSys.fogMaterial.uniforms.uDayBlend.value).toBe(0.0);

        fogSys.dispose();
    });
});
