import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { applyCableSway, isCableSwayType, setCableSwayTime } from './cableSway.js';

function cableModel({
    type = 'prop_wall_cable_tray_swag',
    sourceMaterial = new THREE.MeshStandardMaterial()
} = {}) {
    const geometry = new THREE.CylinderGeometry(0.05, 0.05, 2.0, 6, 8);
    // Align so height extends from y = 0 to y = 2
    geometry.translate(0, 1.0, 0);
    const mesh = new THREE.Mesh(geometry, sourceMaterial);
    mesh.name = 'Cables';
    const model = new THREE.Group();
    model.userData = { modelType: type };
    model.add(mesh);
    return { model, mesh, geometry, sourceMaterial };
}

describe('cableSway', () => {
    it('identifies recognized cable sway props', () => {
        expect(isCableSwayType('prop_wall_cable_tray_swag')).toBe(true);
        expect(isCableSwayType('life_fungal_cable_bundle')).toBe(true);
        expect(isCableSwayType('life_ceiling_collapse')).toBe(true);
        expect(isCableSwayType('life_wind_mast')).toBe(true);
        expect(isCableSwayType('base_console')).toBe(false);
    });

    it('attaches hbSway buffer attribute and patches material for recognized prop', () => {
        const { model, mesh, sourceMaterial } = cableModel({ type: 'prop_wall_cable_tray_swag' });
        const patchedCount = applyCableSway(model, 'prop_wall_cable_tray_swag');
        expect(patchedCount).toBe(1);
        expect(mesh.material).not.toBe(sourceMaterial);

        const swayAttr = mesh.geometry.getAttribute('hbSway');
        expect(swayAttr).toBeDefined();
        expect(swayAttr.itemSize).toBe(1);

        // For catenary swag, lowest points (y near 0) have higher sway weight than top points (y near 2)
        const count = swayAttr.count;
        let maxWeight = 0;
        let minWeight = 1;
        for (let i = 0; i < count; i += 1) {
            const w = swayAttr.getX(i);
            if (w > maxWeight) maxWeight = w;
            if (w < minWeight) minWeight = w;
        }
        expect(maxWeight).toBeGreaterThan(0.5);
        expect(minWeight).toBe(0);
    });

    it('shares one patched material between copies of the same source material', () => {
        const sourceMaterial = new THREE.MeshStandardMaterial();
        const a = cableModel({ sourceMaterial, type: 'life_fungal_cable_bundle' });
        const b = cableModel({ sourceMaterial, type: 'life_fungal_cable_bundle' });
        b.mesh.geometry = a.mesh.geometry;

        applyCableSway(a.model, 'life_fungal_cable_bundle');
        applyCableSway(b.model, 'life_fungal_cable_bundle');
        expect(a.mesh.material).toBe(b.mesh.material);
    });

    it('injects vertex shader uniforms and responds to setCableSwayTime', () => {
        const { model, mesh } = cableModel({ type: 'prop_wall_cable_tray_swag' });
        applyCableSway(model, 'prop_wall_cable_tray_swag');

        const shader = {
            uniforms: {},
            vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>',
            fragmentShader: ''
        };
        mesh.material.onBeforeCompile(shader);

        expect(shader.vertexShader).toContain('attribute float hbSway;');
        expect(shader.vertexShader).toContain('uniform float uCableSwayTime;');
        expect(shader.vertexShader).toContain('transformed.x += sin(hbT)');
        expect(shader.vertexShader).toContain('USE_INSTANCING');

        setCableSwayTime(14.5);
        expect(shader.uniforms.uCableSwayTime.value).toBe(14.5);
    });

    it('ignores props not marked for cable sway', () => {
        const model = new THREE.Group();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
        model.add(mesh);
        expect(applyCableSway(model, 'base_console')).toBe(0);
        expect(mesh.geometry.getAttribute('hbSway')).toBeUndefined();
    });
});
