import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SurvivorCamp, CAMP_INTERACT_RADIUS } from './camp.js';

describe('SurvivorCamp', () => {
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
});
