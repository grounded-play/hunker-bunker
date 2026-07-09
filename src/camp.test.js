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
