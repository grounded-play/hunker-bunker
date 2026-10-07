import { describe, expect, it } from 'vitest';
import { fitEquipmentToSurface, getOperatorEquipmentTransform } from './operatorEquipmentSockets.js';

describe('class and item wearable calibration', () => {
    it('moves the same chest module farther out on the Tank shell', () => {
        const scout = getOperatorEquipmentTransform({ classType: 'SCOUT', itemId: '4142', mount: 'chest_center' });
        const tank = getOperatorEquipmentTransform({ classType: 'TANK', itemId: '4142', mount: 'chest_center' });
        expect(tank.offset[2]).toBeGreaterThan(scout.offset[2]);
        expect(tank.size).toBeGreaterThan(scout.size);
    });

    it('applies item-specific trims on a shared mount', () => {
        const filter = getOperatorEquipmentTransform({ classType: 'ENGINEER', itemId: '4142', mount: 'chest_center' });
        const ballast = getOperatorEquipmentTransform({ classType: 'ENGINEER', itemId: '4160', mount: 'chest_center' });
        expect(ballast.offset).not.toEqual(filter.offset);
        expect(ballast.size).not.toBe(filter.size);
    });
});

// Sprint 51: "scale and place items correctly, make it all fit each model".
// Bone-local offsets buried shoulder, forearm and helmet modules inside bulky
// chassis (the Tank's own pauldrons hid them) and floated them off slim ones.
describe("equipment sits on each model's surface", () => {
    const THREE_PROMISE = import('three');

    async function body({ halfDepth }) {
        const THREE = await THREE_PROMISE;
        const root = new THREE.Group();
        // A torso box: 0.8 wide, 2*halfDepth deep, centred on the spine bone.
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, halfDepth * 2), new THREE.MeshBasicMaterial());
        torso.position.set(0, 1.2, 0);
        root.add(torso);
        const spine = new THREE.Bone();
        spine.name = 'mixamorigSpine2';
        spine.position.set(0, 1.2, 0);
        root.add(spine);
        root.updateMatrixWorld(true);
        return { THREE, root, spine };
    }

    it('puts a chest module on the chest surface, facing out, on any build', async () => {
        for (const halfDepth of [0.12, 0.35]) {
            const { THREE, root, spine } = await body({ halfDepth });
            const item = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.5), new THREE.MeshBasicMaterial());
            const fit = fitEquipmentToSurface({ root, bone: spine, mount: 'chest_center', size: 0.3, model: item });
            const worldZ = fit.worldPosition.z;
            // Outside the chest, but touching it (not floating off it).
            expect(worldZ).toBeGreaterThan(halfDepth);
            expect(worldZ).toBeLessThan(halfDepth + 0.1);
            expect(fit.direction.z).toBeCloseTo(1, 5);
        }
    });

    it('grows modules on bulkier bodies, within limits', async () => {
        const slim = await body({ halfDepth: 0.12 });
        const bulky = await body({ halfDepth: 0.35 });
        const make = (b) => fitEquipmentToSurface({ root: b.root, bone: b.spine, mount: 'chest_center', size: 0.3, model: new b.THREE.Mesh(new b.THREE.BoxGeometry(1, 1, 1)) });
        const a = make(slim);
        const c = make(bulky);
        expect(c.size).toBeGreaterThan(a.size);
        expect(c.size).toBeLessThanOrEqual(0.3 * 1.45);
        expect(a.size).toBeGreaterThanOrEqual(0.3 * 0.85);
    });

    it('falls back to a fixed stand-off when nothing is hit', async () => {
        const THREE = await THREE_PROMISE;
        const root = new THREE.Group();
        const spine = new THREE.Bone();
        spine.name = 'Spine2';
        root.add(spine);
        root.updateMatrixWorld(true);
        const fit = fitEquipmentToSurface({ root, bone: spine, mount: 'back_upper', size: 0.3, model: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)) });
        expect(fit.hit).toBe(false);
        expect(fit.direction.z).toBeCloseTo(-1, 5);
        expect(fit.worldPosition.z).toBeLessThan(0);
    });
});
