import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SurvivorCamp } from './camp.js';

// Session 2026-10-06: "I tried to drop the companion off, but they didn't
// stay". A settled survivor now stays at the camp as a resident figure.
describe('settled survivors stay', () => {
    const camp = () => ({
        id: 'camp_meridian',
        status: 'alive',
        workersVisible: true,
        campWorkerGroup: new THREE.Group(),
        campWorkers: [],
        createCampWorkerFigure: () => new THREE.Object3D()
    });

    it('adds the survivor as a settler resident, once', () => {
        const c = camp();
        const worker = SurvivorCamp.prototype.addSettlerResident.call(c, 'Ada Voss');
        expect(worker.resident).toEqual({ name: 'Ada Voss', role: 'settler' });
        expect(c.campWorkerGroup.children).toContain(worker.mesh);
        expect(SurvivorCamp.prototype.addSettlerResident.call(c, 'Ada Voss')).toBeNull();
        expect(c.campWorkers).toHaveLength(1);
    });
});
