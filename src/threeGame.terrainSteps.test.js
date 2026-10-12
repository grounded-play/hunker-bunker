import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

// Playthrough 2026-10-07 ("just boxes"): raised floor steps wore the wall
// texture, so they read as grey crates on the floor. They are floor plates.
describe('terrain steps look like floor plates', () => {
    it('draws steps with the floor plate texture, not the wall texture', () => {
        const game = Object.create(ThreeGame.prototype);
        const floorTex = new THREE.Texture();
        Object.assign(game, {
            chunkSize: 8,
            terrainStepGeometry: new THREE.BoxGeometry(1, 0.08, 1),
            wallMaterial: new THREE.MeshStandardMaterial({ map: new THREE.Texture() }),
            terrainFloorPlateTexture: floorTex
        });
        const grid = Array.from({ length: 8 }, () => Array(8).fill('.'));
        const group = new THREE.Group();
        game.addTerrainStepDressing(group, 0, 0, grid, 'ruins');
        const steps = group.children.find((child) => child.userData?.isTerrainStep);
        expect(steps).toBeTruthy();
        expect(steps.material).not.toBe(game.wallMaterial);
        expect(steps.material.map).toBe(floorTex);
    });
});
