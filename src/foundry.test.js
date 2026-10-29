import { describe, it, expect, vi } from 'vitest';
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

    it('stays powered off when revealed with powered: false', () => {
        const scene = new THREE.Scene();
        const f = new FabricationFoundry(scene);
        f.reveal(0, 0, { powered: false });
        expect(f.isRevealed).toBe(true);
        expect(f.isPowered()).toBe(false);
        f.update(2.0);
        // Offline is the same light as a red fault pulse: a second light would
        // change the light count and recompile every lit shader.
        expect(f.light.color.getHex()).toBe(0xff4422);
        expect(f.light.intensity).toBeGreaterThan(0);
        expect(f.panelMat.opacity).toBe(0);
        let lights = 0;
        scene.traverse((object) => { if (object.isLight) lights += 1; });
        expect(lights).toBe(1);

        f.setPowered(true);
        expect(f.isPowered()).toBe(true);
        f.update(2.0);
        expect(f.light.color.getHex()).toBe(0x8ef0ff);
        expect(f.light.intensity).toBeGreaterThan(0.4);
    });

    it('swaps in the 3D model and hides the blocky placeholder', async () => {
        const scene = new THREE.Scene();
        const mockModel = new THREE.Group();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        mockModel.add(mesh);
        const loadModel = vi.fn(async (type) => {
            expect(type).toBe('prop_fabricator_workstation');
            return mockModel;
        });

        const f = new FabricationFoundry(scene, { loadModel });
        f.build(0, 0);

        // Placeholder is initially visible before async load resolves
        expect(f.placeholderGroup.visible).toBe(true);

        await vi.waitFor(() => expect(f.model3d).toBe(mockModel));
        expect(f.placeholderGroup.visible).toBe(false);
        expect(f.group.children).toContain(mockModel);
    });
});
