import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SurvivorCamp, CAMP_CLEARING_RADIUS, CAMP_FLOOR_SIZE, CAMP_INTERACT_RADIUS, CAMP_SIGNATURE_PROPS } from './camp.js';

describe('SurvivorCamp', () => {
    it('uses a crash-site-style clearing with structures spread across it', () => {
        const groundMaterial = new THREE.MeshBasicMaterial();
        const camp = new SurvivorCamp(new THREE.Scene(), { groundMaterial });
        camp.reveal(0, 0);
        const floor = camp.group.children.find((child) => child.userData?.kind === 'camp-floor');

        expect(floor.geometry.parameters).toMatchObject({ width: CAMP_FLOOR_SIZE, height: CAMP_FLOOR_SIZE });
        expect(CAMP_CLEARING_RADIUS).toBeGreaterThanOrEqual(4);
        expect(Math.max(...camp.tents.map((tent) => Math.hypot(tent.position.x, tent.position.z)))).toBeGreaterThan(2.5);
    });
    it('stays hidden until revealed and is not interactable', () => {
        const camp = new SurvivorCamp(new THREE.Scene(), { id: 'camp_meridian', label: 'CAMP MERIDIAN' });
        camp.build(80, 40);
        expect(camp.isRevealed).toBe(false);
        expect(camp.group.visible).toBe(false);
        expect(camp.isWithinInteractRange(80, 40)).toBe(false);
    });

    it('reveals with a position and interact range', () => {
        const camp = new SurvivorCamp(new THREE.Scene(), { id: 'camp_tallow', label: 'CAMP TALLOW' });
        camp.reveal(80, 40);
        expect(camp.isRevealed).toBe(true);
        expect(camp.getPosition()).toEqual({ x: 80, z: 40 });
        expect(camp.isWithinInteractRange(80, 40)).toBe(true);
        expect(camp.isWithinInteractRange(80 + CAMP_INTERACT_RADIUS + 1, 40)).toBe(false);
    });

    it('aid shows the vessel section; cull chars the camp but keeps the section', () => {
        const camp = new SurvivorCamp(new THREE.Scene(), { id: 'camp_vesper', label: 'CAMP VESPER' });
        camp.reveal(0, 0);
        expect(camp.section.visible).toBe(false);

        camp.setAided(true);
        expect(camp.section.visible).toBe(true);

        camp.setDestroyed(true);
        expect(camp.destroyed).toBe(true);
        expect(camp.section.visible).toBe(true); // the queen keeps the ship
        expect(camp.beacon.color.getHex()).toBe(0xff5a2a); // embers, not beacon
        expect(camp.tents.every((t) => t.rotation.z !== 0)).toBe(true);
    });

    it('burns a distress flare until first contact douses it', () => {
        const camp = new SurvivorCamp(new THREE.Scene(), { id: 'camp_meridian', label: 'CAMP MERIDIAN' });
        camp.reveal(10, 10);
        expect(camp.signalColumn.visible).toBe(true);

        camp.setDiscovered(true);
        expect(camp.discovered).toBe(true);
        expect(camp.signalColumn.visible).toBe(false);

        // Rediscovering an undiscovered-but-culled camp never relights it.
        camp.setDiscovered(false);
        camp.setDestroyed(true);
        expect(camp.signalColumn.visible).toBe(false);
        camp.setDiscovered(false);
        expect(camp.signalColumn.visible).toBe(false);
    });

    it('locks down visibly at suspicion 50 and never repaints a culled camp', () => {
        const camp = new SurvivorCamp(new THREE.Scene(), { id: 'camp_tallow', label: 'CAMP TALLOW' });
        camp.reveal(20, 20);
        camp.setLevel(1); // barricades exist
        expect(camp.lockdownStrobe.visible).toBe(false);

        camp.setSuspicion(49);
        expect(camp.isLockedDown).toBe(false);
        camp.setSuspicion(50);
        expect(camp.isLockedDown).toBe(true);
        expect(camp.lockdownStrobe.visible).toBe(true);
        expect(camp.barricades[0].material.color.getHex()).toBe(0x7a3026);

        camp.setSuspicion(10);
        expect(camp.isLockedDown).toBe(false);
        expect(camp.lockdownStrobe.visible).toBe(false);
        expect(camp.barricades[0].material.color.getHex()).toBe(0x55606a);

        camp.setDestroyed(true);
        camp.setSuspicion(90);
        expect(camp.isLockedDown).toBe(false);
        expect(camp.lockdownStrobe.visible).toBe(false);
        expect(camp.barricades[0].material.color.getHex()).toBe(0x2c2a26); // stays charred
    });

    it('tracks the fortified crossing once when support level reaches the threshold', () => {
        const camp = new SurvivorCamp(new THREE.Scene(), { id: 'camp_vesper', label: 'CAMP VESPER' });
        camp.reveal(0, 0);
        expect(camp.wasFortified).toBe(false);

        camp.setLevel(1);
        expect(camp.wasFortified).toBe(false);

        camp.setLevel(2);
        expect(camp.wasFortified).toBe(true);

        camp.setLevel(3);
        expect(camp.wasFortified).toBe(true);

        // Dropping back below the threshold re-arms the one-shot so a later
        // re-crossing reads as a fresh event rather than staying silent.
        camp.setLevel(1);
        expect(camp.wasFortified).toBe(false);
        camp.setLevel(2);
        expect(camp.wasFortified).toBe(true);
    });

    it('assigns the final camp to the player class mirror with living workers', () => {
        const camp = new SurvivorCamp(new THREE.Scene(), {
            id: 'camp_vesper',
            label: 'CAMP VESPER',
            playerType: 'SCOUT'
        });
        camp.reveal(4, 4);
        expect(camp.leaderClass).toBe('Scout');
        expect(camp.leaderName).toBe('Sister Martha');
        expect(camp.leaderIsBoss).toBe(true);
        expect(camp.campWorkers).toHaveLength(2);
        expect(camp.campWorkers.every((worker) => worker.mesh.visible)).toBe(true);

        camp.setStatus('turned');
        expect(camp.npcSprite.scale.x).toBeGreaterThan(1.5);
        expect(camp.campWorkers.every((worker) => worker.mesh.visible)).toBe(true);
    });

    it('builds one distinct signature-prop sprite per faction, positioned inside the clearing', () => {
        for (const campId of Object.keys(CAMP_SIGNATURE_PROPS)) {
            const camp = new SurvivorCamp(new THREE.Scene(), { id: campId, label: campId });
            camp.reveal(0, 0);
            const specs = CAMP_SIGNATURE_PROPS[campId];
            expect(Object.keys(camp.signatureProps)).toHaveLength(specs.length);
            for (const spec of specs) {
                const sprite = camp.signatureProps[spec.id];
                expect(sprite).toBeInstanceOf(THREE.Sprite);
                expect(sprite.userData).toMatchObject({ kind: 'camp-signature-prop', campId, propId: spec.id });
                expect(sprite.position.x).toBeCloseTo(spec.x);
                expect(sprite.position.z).toBeCloseTo(spec.z);
                expect(Math.hypot(spec.x, spec.z)).toBeLessThan(CAMP_CLEARING_RADIUS + 1);
                expect(camp.group.children).toContain(sprite);
            }
        }
    });

    it('never throws building a signature prop before its queued art file exists', () => {
        // The asset files in CAMP_SIGNATURE_PROPS are queued but not yet
        // rendered (see docs/sprint-23-room-juice-and-dressing-assets.md §8);
        // loadKeyedTexture's fallback path must make that visually inert,
        // not broken.
        expect(() => {
            const camp = new SurvivorCamp(new THREE.Scene(), { id: 'camp_vesper', label: 'CAMP VESPER' });
            camp.reveal(0, 0);
        }).not.toThrow();
    });
});
