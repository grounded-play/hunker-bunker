import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CaveEntrance, CAVE_INTERACT_RADIUS } from './caveEntrance.js';

describe('CaveEntrance', () => {
    it('stays hidden until revealed', () => {
        const scene = new THREE.Scene();
        const cave = new CaveEntrance(scene);
        cave.build(120, 210);
        expect(cave.isRevealed).toBe(false);
        expect(cave.group.visible).toBe(false);
        // Not interactable while hidden.
        expect(cave.isWithinInteractRange(cave.pos.x, cave.pos.z)).toBe(false);
    });

    it('reveals, exposes a position, and becomes interactable up close', () => {
        const scene = new THREE.Scene();
        const cave = new CaveEntrance(scene);
        cave.reveal(120, 210);
        expect(cave.isRevealed).toBe(true);
        expect(cave.group.visible).toBe(true);

        const pos = cave.getPosition();
        expect(pos).toEqual({ x: 120, z: 210 });

        expect(cave.isWithinInteractRange(pos.x, pos.z)).toBe(true);
        expect(cave.isWithinInteractRange(pos.x + CAVE_INTERACT_RADIUS + 1, pos.z)).toBe(false);
        expect(cave.distanceTo(pos.x + 3, pos.z + 4)).toBeCloseTo(5, 5);
    });

    it('ramps the bio glow and mouth opacity once revealed', () => {
        const scene = new THREE.Scene();
        const cave = new CaveEntrance(scene);
        cave.reveal(0, 0);
        expect(cave.light.intensity).toBe(0);
        cave.update(2.5); // past the ramp
        expect(cave.light.intensity).toBeGreaterThan(0.3);
        expect(cave.mouthMat.opacity).toBeGreaterThan(0.8);
    });

    it('revealInstant powers it on immediately (restored save)', () => {
        const scene = new THREE.Scene();
        const cave = new CaveEntrance(scene);
        cave.revealInstant(0, 0);
        expect(cave.isRevealed).toBe(true);
        expect(cave.mouthMat.opacity).toBeGreaterThan(0.8);
    });

    it('reset hides it and zeroes the glow', () => {
        const scene = new THREE.Scene();
        const cave = new CaveEntrance(scene);
        cave.revealInstant(4, 4);
        cave.reset();
        expect(cave.isRevealed).toBe(false);
        expect(cave.group.visible).toBe(false);
        expect(cave.light.intensity).toBe(0);
        expect(cave.distanceTo(4, 4)).toBe(Infinity);
    });
});
