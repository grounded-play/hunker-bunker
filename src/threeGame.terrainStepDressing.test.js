import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { LANDFORMS } from './landforms.js';

describe('terrain step dressing', () => {
    const openGrid = Array.from({ length: 8 }, () => '.'.repeat(8));

    it.each([LANDFORMS.MAZE, LANDFORMS.FIELD])('does not scatter raised square plates through %s floors', (landform) => {
        const group = new THREE.Group();
        ThreeGame.prototype.addTerrainStepDressing.call({
            terrainStepGeometry: new THREE.BoxGeometry(1, 0.08, 1),
            wallMaterial: new THREE.MeshBasicMaterial()
        }, group, 0, 0, openGrid, landform);

        expect(group.children).toHaveLength(0);
    });
});
