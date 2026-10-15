import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import fs from 'node:fs';
import { createPropArticulation } from './propArticulation.js';

function hingedModel() {
    const model = new THREE.Group();
    const door = new THREE.Object3D();
    door.name = 'HB_DOOR_00';
    door.position.set(1, 0, 0);
    door.userData = { hb_motion: 'hinge', hb_axis: [0, 1, 0], hb_open_angle: -Math.PI / 2, hb_open_offset: [0, 0, 0.5], hb_duration: 1 };
    model.add(door);
    return { model, door };
}

describe('createPropArticulation', () => {
    it('is null for a prop without cut-out parts', () => {
        expect(createPropArticulation(new THREE.Group())).toBe(null);
    });

    it('swings a hinge from rest to its open angle and slide, then back', () => {
        const { model, door } = hingedModel();
        const articulation = createPropArticulation(model);
        expect(articulation.state).toBe('closed');
        articulation.toggle();
        expect(articulation.state).toBe('opening');
        while (articulation.update(0.1));
        expect(articulation.state).toBe('open');
        const expected = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
        expect(door.quaternion.angleTo(expected)).toBeLessThan(1e-6);
        expect(door.position.z).toBeCloseTo(0.5);
        articulation.toggle();
        while (articulation.update(0.1));
        expect(articulation.state).toBe('closed');
        expect(door.quaternion.angleTo(new THREE.Quaternion())).toBeLessThan(1e-6);
        expect(door.position.toArray()).toEqual([1, 0, 0]);
    });

    it('reverses a door caught halfway without jumping', () => {
        const { model, door } = hingedModel();
        const articulation = createPropArticulation(model);
        articulation.toggle();
        articulation.update(0.1);
        articulation.update(0.1);
        articulation.update(0.1);
        const before = door.quaternion.clone();
        articulation.toggle();
        articulation.update(0.01);
        expect(door.quaternion.angleTo(before)).toBeLessThan(0.05);
        expect(articulation.state).toBe('closing');
    });

    it('slides a guillotine without introducing rotation', () => {
        const model = new THREE.Group();
        const slab = new THREE.Object3D();
        slab.userData = { hb_motion: 'slide', hb_open_offset: [0, 2.4, 0], hb_duration: 1.2 };
        model.add(slab);
        const articulation = createPropArticulation(model);
        articulation.toggle();
        while (articulation.update(0.1));
        expect(articulation.state).toBe('open');
        expect(slab.position.y).toBeCloseTo(2.4);
        expect(slab.quaternion.angleTo(new THREE.Quaternion())).toBeLessThan(1e-6);
    });

    it('spins a rotor up while working, stops it after, and needs no frames at rest', () => {
        const model = new THREE.Group();
        const rotor = new THREE.Object3D();
        rotor.userData = { hb_motion: 'spin', hb_axis: [1, 0, 0], hb_speed: 4, hb_bob: 0 };
        model.add(rotor);
        const articulation = createPropArticulation(model);
        expect(articulation.update(0.1)).toBe(false);
        articulation.toggle();
        for (let i = 0; i < 10; i += 1) articulation.update(0.1);
        expect(articulation.state).toBe('working');
        expect(rotor.quaternion.angleTo(new THREE.Quaternion())).toBeGreaterThan(0.01);
        articulation.toggle();
        for (let i = 0; i < 10; i += 1) articulation.update(0.1);
        expect(articulation.state).toBe('idle');
        expect(articulation.update(0.1)).toBe(false);
    });
});

describe('articulated runtime props', () => {
    const nodes = (type) => {
        const buffer = fs.readFileSync(`public/3d/runtime/new3ds/${type}.glb`);
        const json = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString('utf8'));
        return json.nodes.filter((node) => node.name?.startsWith('HB_') && node.extras?.hb_motion);
    };

    it('ships each first-batch rig with its moving parts and motion data', () => {
        expect(nodes('life_ribcage_rescue_cabinet').map((node) => node.name)).toEqual(['HB_DOOR_00']);
        expect(nodes('life_confessional').map((node) => node.name).sort()).toEqual(['HB_DOOR_00', 'HB_DOOR_01']);
        expect(nodes('life_seismic_drill')[0].extras.hb_motion).toBe('spin');
        expect(nodes('life_ice_bore_winch')[0].extras.hb_motion).toBe('spin');
        expect(nodes('life_supply_drop_pod').map((node) => node.name)).toEqual(['HB_LID_00']);
        for (const door of [
            ...nodes('life_ribcage_rescue_cabinet'),
            ...nodes('life_confessional'),
            ...nodes('life_supply_drop_pod')
        ]) {
            // Rest pose is closed: the door node carries the closing swing.
            expect(door.rotation, door.name).toBeDefined();
            expect(Math.abs(door.extras.hb_open_angle)).toBeGreaterThan(1.4);
        }
    });
});
