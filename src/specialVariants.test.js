import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SPECIAL_VARIANTS, applySpecialVariant } from './specialVariants.js';
import { QUEST_OBJECTS } from './questObjects.js';
import { MYSTERY_BOX_KINDS } from './mysteryBoxes.js';

// Owner, 2026-10-07: "use current models and texture or color change them to
// make them the specials". A quest object or mystery box reuses a shipped
// model, so it is recoloured and rim-lit to stop reading as the room's
// ordinary prop of the same model.
function makeModel(material) {
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    root.add(mesh);
    return { root, mesh };
}

describe('special variants', () => {
    it('recolours a copy, never the shared template material', () => {
        const template = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const { root, mesh } = makeModel(template);
        applySpecialVariant(root, 'quest_reactor_valves');
        expect(mesh.material).not.toBe(template);
        expect(template.color.getHex()).toBe(0xffffff);
        expect(mesh.material.color.getHex()).not.toBe(0xffffff);
        expect(mesh.material.emissive.getHex()).not.toBe(0x000000);
    });

    it('shares one recoloured material between every instance of a variant', () => {
        const template = new THREE.MeshStandardMaterial();
        const a = makeModel(template);
        const b = makeModel(template);
        applySpecialVariant(a.root, 'mystery_courier_case');
        applySpecialVariant(b.root, 'mystery_courier_case');
        expect(a.mesh.material).toBe(b.mesh.material);
        const c = makeModel(template);
        applySpecialVariant(c.root, 'mystery_quarantine_crate');
        expect(c.mesh.material).not.toBe(a.mesh.material);
    });

    it('rim-lights in the accent colour, with one shader for every variant', () => {
        const { root, mesh } = makeModel(new THREE.MeshStandardMaterial());
        applySpecialVariant(root, 'quest_lost_probe');
        const shader = { uniforms: {}, fragmentShader: 'void main() {\n#include <opaque_fragment>\n}' };
        mesh.material.onBeforeCompile(shader);
        expect(shader.fragmentShader).toContain('hbSpecialRim');
        expect(shader.uniforms.hbSpecialRimColor.value.getHex()).toBe(SPECIAL_VARIANTS.quest_lost_probe.rim);
        const other = makeModel(new THREE.MeshStandardMaterial());
        applySpecialVariant(other.root, 'quest_reactor_valves');
        expect(other.mesh.material.customProgramCacheKey()).toBe(mesh.material.customProgramCacheKey());
    });

    it('leaves unlit materials and unknown variants alone', () => {
        const basic = new THREE.MeshBasicMaterial();
        const { root, mesh } = makeModel(basic);
        expect(applySpecialVariant(root, 'nope')).toBe(0);
        applySpecialVariant(root, 'quest_lost_probe');
        expect(mesh.material.onBeforeCompile).toBe(basic.onBeforeCompile);
    });

    it('has a variant for every quest object and mystery box', () => {
        for (const entry of Object.values(QUEST_OBJECTS)) {
            const part = entry.target ?? entry.landmark;
            expect(SPECIAL_VARIANTS[part.model], part.model).toBeTruthy();
        }
        for (const kind of Object.values(MYSTERY_BOX_KINDS)) expect(SPECIAL_VARIANTS[kind.model], kind.model).toBeTruthy();
    });
});
