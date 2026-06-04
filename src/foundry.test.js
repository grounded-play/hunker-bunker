import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { FabricationFoundry, foundryWorldPosition, INTERACT_RADIUS } from './foundry.js';

describe('FabricationFoundry', () => {
    it('computes an explicit discovered world position', () => {
        expect(foundryWorldPosition(9, 9)).toEqual({ x: 9, z: 9 });
    });

    it('stays hidden until revealed', () => {
        const scene = new THREE.Scene();
        const f = new FabricationFoundry(scene);
        f.build(9, 9);
        expect(f.isRevealed).toBe(false);
        expect(f.group.visible).toBe(false);
        // Not interactable while hidden.
        expect(f.isWithinInteractRange(f.pos.x, f.pos.z)).toBe(false);
    });

    it('reveals, exposes a position, and becomes interactable up close', () => {
        const scene = new THREE.Scene();
        const f = new FabricationFoundry(scene);
        f.reveal(9, 9);
        expect(f.isRevealed).toBe(true);
        expect(f.group.visible).toBe(true);

        const pos = f.getPosition();
        expect(pos).toEqual(foundryWorldPosition(9, 9));

        // Standing on it -> in range; far away -> out of range.
        expect(f.isWithinInteractRange(pos.x, pos.z)).toBe(true);
        expect(f.isWithinInteractRange(pos.x + INTERACT_RADIUS + 1, pos.z)).toBe(false);
        expect(f.distanceTo(pos.x + 3, pos.z + 4)).toBeCloseTo(5, 5);
    });

    it('powers up the work light + panel over time once revealed', () => {
        const scene = new THREE.Scene();
        const f = new FabricationFoundry(scene);
        f.reveal(0, 0);
        expect(f.light.intensity).toBe(0);
        f.update(2.0); // past the ramp
        expect(f.light.intensity).toBeGreaterThan(0.4);
        expect(f.panelMat.opacity).toBeGreaterThan(0.5);
    });

    it('revealInstant powers it on immediately (returning player)', () => {
        const scene = new THREE.Scene();
        const f = new FabricationFoundry(scene);
        f.revealInstant(0, 0);
        expect(f.isRevealed).toBe(true);
        expect(f.light.intensity).toBeGreaterThan(0.5);
        expect(f.panelMat.opacity).toBeGreaterThan(0.5);
    });
});
