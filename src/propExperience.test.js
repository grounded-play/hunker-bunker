import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
    PROP_EXPERIENCE_PROFILES,
    createPropExperience,
    getPropExperienceProfile,
    isDynamicPropExperienceType,
    isEnvironmentExperienceType
} from './propExperience.js';
import { WORLD_3D_MODELS } from './world3dOverlay.js';

describe('prop experience registry', () => {
    it('classifies terminals as dynamic and the rest of the environment by behavior', () => {
        expect(isDynamicPropExperienceType('prop_diagnostic_console')).toBe(true);
        expect(getPropExperienceProfile('arch_pillar_buttress_01').behaviors).toContain('structural');
        expect(getPropExperienceProfile('prop_cave_spores').behaviors).toContain('ambient');
        expect(getPropExperienceProfile('prop_camp_crate').behaviors).toContain('inspect');
        expect(isEnvironmentExperienceType('npc_queen')).toBe(false);
        expect(getPropExperienceProfile('npc_queen')).toBeNull();
        expect(Object.isFrozen(PROP_EXPERIENCE_PROFILES)).toBe(true);
    });

    it('leaves no registered environment model without an experience classification', () => {
        const environmentTypes = Object.keys(WORLD_3D_MODELS).filter(isEnvironmentExperienceType);
        expect(environmentTypes.length).toBeGreaterThanOrEqual(205);
        expect(environmentTypes.filter((type) => !getPropExperienceProfile(type))).toEqual([]);
    });

    it('clones shared materials per interactive instance and restores them on dispose', () => {
        const root = new THREE.Group();
        const model = new THREE.Group();
        const shared = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x000000 });
        const first = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), shared);
        const second = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), shared);
        model.add(first, second);
        root.add(model);

        const experience = createPropExperience(root, model, 'prop_diagnostic_console');
        expect(first.material).toBe(second.material);
        expect(first.material).not.toBe(shared);
        const clonedMaterial = first.material;
        vi.spyOn(clonedMaterial, 'dispose');

        experience.acknowledge();
        experience.update(0.1);
        expect(first.material.emissive.getHex()).not.toBe(0x000000);
        expect(experience.state).toBe('acknowledging');

        for (let i = 0; i < 6; i++) experience.update(0.1);
        expect(first.material.emissive.getHex()).toBe(0x000000);
        experience.dispose();
        expect(first.material).toBe(shared);
        expect(second.material).toBe(shared);
        expect(clonedMaterial.dispose).toHaveBeenCalledOnce();
    });

    it('does not allocate a controller for an ambient-only prop', () => {
        const root = new THREE.Group();
        const model = new THREE.Group();
        root.add(model);
        expect(createPropExperience(root, model, 'prop_cave_spores')).toBeNull();
    });

    it('modulates emissive intensity on flickering corridor props and broken fixtures', () => {
        for (const type of ['life_cochlear_intercom', 'life_ribcage_rescue_cabinet', 'life_fuse_bypass_panel', 'prop_terminal_ruptured']) {
            const root = new THREE.Group();
            const model = new THREE.Group();
            const mat = new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xffa648, emissiveIntensity: 1.0 });
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
            model.add(mesh);
            root.add(model);

            const exp = createPropExperience(root, model, type);
            expect(exp).not.toBeNull();
            expect(mesh.material).not.toBe(mat);

            const initialIntensity = mesh.material.emissiveIntensity;
            let varied = false;
            for (let i = 0; i < 20; i++) {
                exp.update(0.05);
                if (Math.abs(mesh.material.emissiveIntensity - initialIntensity) > 0.01) {
                    varied = true;
                    break;
                }
            }
            expect(varied).toBe(true);
            exp.dispose();
            expect(mesh.material).toBe(mat);
        }
    });
});
