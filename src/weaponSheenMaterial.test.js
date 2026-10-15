import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { applyWeaponSheen, disposeWeaponSheen, sheenFactor } from './weaponSheenMaterial.js';

describe('fitted weapon sheen', () => {
    it('isolates instances, preserves textures and restores factory color without cumulative tint', () => {
        const texture = new THREE.Texture();
        const source = new THREE.MeshStandardMaterial({ color: '#8294a8', map: texture });
        const template = new THREE.Group();
        template.add(new THREE.Mesh(new THREE.BoxGeometry(), source));
        const first = template.clone(true);
        const second = template.clone(true);
        const base = source.color.clone();
        applyWeaponSheen(first, '#ff6262');
        applyWeaponSheen(second, '#58efff');
        const a = first.children[0].material;
        const b = second.children[0].material;
        expect(a).not.toBe(b);
        expect(a).not.toBe(source);
        expect(a.map).toBe(texture);
        expect(source.color.equals(base)).toBe(true);
        applyWeaponSheen(first, '#58efff');
        expect(a.color.equals(b.color)).toBe(true);
        applyWeaponSheen(first, '#ffffff');
        expect(a.color.equals(base)).toBe(true);
        expect(b.color.equals(base)).toBe(false);
        const release = vi.spyOn(a, 'dispose');
        const releaseSource = vi.spyOn(source, 'dispose');
        disposeWeaponSheen(first);
        expect(release).toHaveBeenCalledOnce();
        expect(releaseSource).not.toHaveBeenCalled();
    });

    it('handles multi-material weapons and keeps a later-mounted charm untinted', () => {
        const materials = [new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial()];
        const weapon = new THREE.Group();
        weapon.add(new THREE.Mesh(new THREE.BoxGeometry(), materials));
        applyWeaponSheen(weapon, '#ff6262');
        const charm = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: '#ffffff' }));
        weapon.add(charm);
        applyWeaponSheen(weapon, '#58efff');
        const expected = sheenFactor('#58efff').getHexString();
        expect(weapon.children[0].material.every((m) => m.color.getHexString() === expected)).toBe(true);
        expect(charm.material.color.getHexString()).toBe('ffffff');
    });

    // A straight multiply by a saturated sheen zeroed whole colour channels
    // (Bunker 404 magenta killed green, Black Ice took 60% of the light), so
    // painted detail flattened into one wash of the sheen colour.
    it('tints without wiping out a channel or burying the paintwork in shadow', () => {
        for (const sheen of ['#d946ef', '#ea580c', '#84cc16', '#14b8a6', '#58efff', '#ff6262']) {
            const f = sheenFactor(sheen);
            expect(Math.min(f.r, f.g, f.b), sheen).toBeGreaterThan(0.4);
        }
        const blackIce = sheenFactor('#45556b');
        expect(Math.max(blackIce.r, blackIce.g, blackIce.b)).toBeGreaterThan(0.65);
        const rescue = sheenFactor('#ff6262');
        expect(rescue.r).toBeGreaterThan(rescue.g);
        expect(sheenFactor('#ffffff').getHex()).toBe(0xffffff);
    });
});
