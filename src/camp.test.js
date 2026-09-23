import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SurvivorCamp, CAMP_CLEARING_RADIUS, CAMP_FLOOR_SIZE, CAMP_INTERACT_RADIUS, CAMP_SIGNATURE_PROPS, getCampPathNodes } from './camp.js';

describe('SurvivorCamp', () => {
    it('anchors the whole set piece at the sampled terrain height', () => {
        const scene = new THREE.Scene();
        const camp = new SurvivorCamp(scene, { id: 'camp_meridian' });
        camp.reveal(8, 12, 2.75);
        expect(camp.group.position).toMatchObject({ x: 8, y: 2.75, z: 12 });
        expect(camp.getPosition()).toEqual({ x: 8, z: 12 });
    });

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

    it('uses existing lived-in props to show each camp aftermath', () => {
        const camp = new SurvivorCamp(new THREE.Scene(), { id: 'camp_meridian' });
        camp.build(0, 0);

        camp.setStatus('robbed');
        expect(camp.propSprites.crates.visible).toBe(false);
        expect(camp.propSprites.bedrolls.visible).toBe(false);
        expect(camp.propSprites.laundry.visible).toBe(true);
        expect(camp.propSprites.grave.visible).toBe(false);

        camp.setStatus('recruited');
        expect(camp.propSprites.laundry.visible).toBe(false);
        expect(camp.propSprites.bedrolls.visible).toBe(false);

        camp.setStatus('culled');
        expect(camp.propSprites.grave.visible).toBe(true);
    });

    it('supplies distinct faction-tailored waypoint nodes per camp', () => {
        const meridianNodes = getCampPathNodes('camp_meridian');
        const tallowNodes = getCampPathNodes('camp_tallow');
        const vesperNodes = getCampPathNodes('camp_vesper');

        expect(meridianNodes.length).toBeGreaterThanOrEqual(4);
        expect(tallowNodes.length).toBeGreaterThanOrEqual(4);
        expect(vesperNodes.length).toBeGreaterThanOrEqual(4);
        // Different factions have different patrol targets (generator vs shrine vs turret)
        expect(meridianNodes).not.toEqual(tallowNodes);
        expect(tallowNodes).not.toEqual(vesperNodes);
    });

    it('tracks player proximity, turns to face, and pauses patrol during standoff', () => {
        const camp = new SurvivorCamp(new THREE.Scene(), { id: 'camp_vesper' });
        camp.reveal(0, 0);

        // Leader starts at pos (0.8, 0.6)
        // Player approaches from the south at (0.8, 2.5) -> dz > 0
        camp.update(0.016, { x: 0.8, y: 0, z: 2.5 });
        expect(camp.isInteractingWithPlayer).toBe(true);
        expect(camp.npcFacingRow).toBe(0); // South

        // Player moves east of leader at (3.5, 0.6) -> dx > 0
        camp.update(0.016, { x: 3.5, y: 0, z: 0.6 });
        expect(camp.npcFacingRow).toBe(2); // East

        // Player moves away beyond 5m -> resumes patrol
        camp.update(0.016, { x: 20, y: 0, z: 20 });
        expect(camp.isInteractingWithPlayer).toBe(false);
    });

    it('applies cadence and spore twitches when turned', () => {
        const camp = new SurvivorCamp(new THREE.Scene(), { id: 'camp_tallow' });
        camp.reveal(0, 0);
        camp.setStatus('turned');

        camp.update(0.05, { x: 20, y: 0, z: 20 });
        expect(camp.npcSprite).toBeTruthy();
        expect(Number.isFinite(camp.npcSprite.position.y)).toBe(true);
    });
});

describe('overnight condition dressing', () => {
    const buildCamp = (level = 3) => {
        const camp = new SurvivorCamp(new THREE.Scene(), { id: 'camp_tallow' });
        camp.reveal(0, 0, 0);
        camp.level = level;
        return camp;
    };

    it('starts secure and ignores conditions it does not know', () => {
        const camp = buildCamp();
        expect(camp.overnightCondition).toBe('secure');
        camp.setOvernightCondition('not-a-condition');
        expect(camp.overnightCondition).toBe('secure');
    });

    // The point of the dressing: you can read a camp's night across the
    // clearing, without opening a menu.
    it('thins the defences the player paid for, one step at a time', () => {
        const camp = buildCamp(3);
        const standing = () => camp.sandbagSprites.filter((s) => s.visible).length;
        camp.updatePropVisuals();
        expect(standing()).toBe(3);
        camp.setOvernightCondition('strained');
        expect(standing()).toBe(2);
        camp.setOvernightCondition('breached');
        expect(standing()).toBe(1);
        camp.setOvernightCondition('overrun');
        expect(standing()).toBe(0);
    });

    it('takes the stores at breached and the fire at overrun', () => {
        const camp = buildCamp();
        camp.setOvernightCondition('breached');
        expect(camp.propSprites.crates.visible).toBe(false);
        // The fire is still burning: the camp is damaged, not dead.
        expect(camp.propSprites.cookfire.material.map).toBe(camp.texCookfireLit);
        camp.setOvernightCondition('overrun');
        expect(camp.propSprites.cookfire.material.map).toBe(camp.texCookfireDoused);
    });

    it('empties the camp only once it is abandoned', () => {
        const camp = buildCamp();
        camp.setOvernightCondition('overrun');
        expect(camp.propSprites.laundry.visible).toBe(true);
        camp.setOvernightCondition('abandoned');
        expect(camp.propSprites.laundry.visible).toBe(false);
    });

    it('recovers its dressing when the camp is resupplied and holds', () => {
        const camp = buildCamp(3);
        camp.setOvernightCondition('overrun');
        camp.setOvernightCondition('secure');
        expect(camp.sandbagSprites.filter((s) => s.visible).length).toBe(3);
        expect(camp.propSprites.crates.visible).toBe(true);
    });
});
