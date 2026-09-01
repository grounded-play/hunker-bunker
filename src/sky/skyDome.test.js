import { describe, expect, it, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createSkyRig } from './skyDome.js';
import { computeSkyState } from './skyState.js';
import { createSkyProfile } from './skyProfile.js';

function stubLoader() {
    const loaded = [];
    return {
        loaded,
        load(url) {
            loaded.push(url);
            const texture = new THREE.Texture();
            texture.userData = { url };
            return texture;
        }
    };
}

const profile = createSkyProfile(77);
const stateAt = (overrides = {}) => computeSkyState({ profile, timeOfDay: 0.5, ...overrides });

let loader;
let rig;
beforeEach(() => {
    loader = stubLoader();
    rig = createSkyRig({ textureLoader: loader });
});

const layerMeshes = () => rig.group.children.filter((c) => c.userData?.layerId);
const meshFor = (id) => layerMeshes().find((m) => m.userData.layerId === id);

describe('createSkyRig construction', () => {
    it('exposes a group that can be added to a scene', () => {
        expect(rig.group).toBeInstanceOf(THREE.Object3D);
    });

    it('builds a base dome that renders behind every textured layer', () => {
        const base = rig.group.children.find((c) => c.userData?.isSkyBase);
        expect(base).toBeDefined();
        const minLayerOrder = Math.min(...layerMeshes().map((m) => m.renderOrder));
        expect(base.renderOrder).toBeLessThan(minLayerOrder);
    });

    it('never writes depth, so world geometry always draws in front of the sky', () => {
        rig.update({ skyState: stateAt(), biomeKey: 'active' });
        for (const child of rig.group.children.filter((c) => c.material)) {
            expect(child.material.depthWrite).toBe(false);
        }
    });

    it('depth-tests the textured layers so world geometry occludes the sky', () => {
        // three.js draws transparent materials after ALL opaque geometry, and
        // renderOrder only sorts within that list -- so without a depth test
        // the sky paints straight over the maze walls.
        rig.update({ skyState: stateAt(), biomeKey: 'active' });
        for (const mesh of layerMeshes()) {
            expect(mesh.material.depthTest).toBe(true);
        }
    });

    it('never depth-tests the base dome, which must fill every unpainted pixel', () => {
        const base = rig.group.children.find((c) => c.userData?.isSkyBase);
        expect(base.material.depthTest).toBe(false);
        expect(base.material.transparent).toBe(false);
    });

    it('straddles the horizon with every horizon band', () => {
        // A band entirely above the horizon line would float; entirely below it
        // would be buried in terrain. Each must cross theta = PI/2.
        for (const id of ['horizon.far', 'horizon.mid', 'horizon.near']) {
            const { thetaStart, thetaLength } = meshFor(id).geometry.parameters;
            expect(thetaStart).toBeLessThan(Math.PI / 2);
            expect(thetaStart + thetaLength).toBeGreaterThan(Math.PI / 2);
        }
    });

    it('subtends a larger arc for nearer horizon bands', () => {
        const arc = (id) => meshFor(id).geometry.parameters.thetaLength;
        expect(arc('horizon.near')).toBeGreaterThan(arc('horizon.mid'));
        expect(arc('horizon.mid')).toBeGreaterThan(arc('horizon.far'));
    });

    it('keeps the upper-band layers clear of the horizon bands', () => {
        const upper = meshFor('highcloud').geometry.parameters;
        const horizonTop = meshFor('horizon.far').geometry.parameters.thetaStart;
        expect(upper.thetaStart + upper.thetaLength).toBeGreaterThan(horizonTop);
    });

    it('opts every sky material out of scene fog', () => {
        rig.update({ skyState: stateAt(), biomeKey: 'active' });
        for (const child of rig.group.children.filter((c) => c.material)) {
            expect(child.material.fog).toBe(false);
        }
    });
});

describe('createSkyRig layer materials', () => {
    beforeEach(() => rig.update({ skyState: stateAt({ timeOfDay: 0 }), biomeKey: 'active' }));

    it('blends the deep field additively', () => {
        expect(meshFor('deepfield').material.blending).toBe(THREE.AdditiveBlending);
    });

    it('alpha-blends the green-keyed horizon cutouts', () => {
        expect(meshFor('horizon.near').material.blending).toBe(THREE.NormalBlending);
    });

    it('attenuates additive layers through colour, not alpha', () => {
        // Additive blending adds src*srcAlpha, and the keyed nebula art is
        // almost fully opaque, so alpha barely attenuates it -- three additive
        // layers at full strength saturate the night sky to white. Scaling RGB
        // is what actually dims them.
        const mesh = meshFor('deepfield');
        expect(mesh.material.opacity).toBe(1);
        expect(mesh.material.color.r).toBeLessThan(1);
        expect(mesh.material.color.r).toBeGreaterThan(0);
    });

    it('dims the additive layers further as the sun rises', () => {
        rig.update({ skyState: stateAt({ timeOfDay: 0 }), biomeKey: 'active' });
        const night = meshFor('deepfield').material.color.r;
        rig.update({ skyState: stateAt({ timeOfDay: 0.5 }), biomeKey: 'active' });
        const noon = meshFor('deepfield').material.color.r;
        expect(noon).toBeLessThan(night);
        expect(noon).toBeGreaterThan(0);
    });

    it('applies the render order from the layer definition', () => {
        expect(meshFor('deepfield').renderOrder).toBeLessThan(meshFor('horizon.far').renderOrder);
    });

    it('tints the horizon mask layers with the sky horizon colour', () => {
        const state = stateAt({ timeOfDay: 0.5 });
        rig.update({ skyState: state, biomeKey: 'active' });
        const { color } = meshFor('horizon.far').material;
        expect(color.r).toBeCloseTo(state.horizonColor.r, 5);
    });
});

describe('createSkyRig updates', () => {
    it('reuses meshes across frames instead of rebuilding the sky', () => {
        rig.update({ skyState: stateAt(), biomeKey: 'active' });
        const first = layerMeshes().length;
        const identity = meshFor('horizon.far');
        for (let i = 0; i < 10; i += 1) {
            rig.update({ skyState: stateAt({ timeOfDay: i / 10 }), biomeKey: 'active' });
        }
        expect(layerMeshes().length).toBe(first);
        expect(meshFor('horizon.far')).toBe(identity);
    });

    it('loads each texture once, not once per frame', () => {
        for (let i = 0; i < 5; i += 1) {
            rig.update({ skyState: stateAt(), biomeKey: 'active' });
        }
        expect(new Set(loader.loaded).size).toBe(loader.loaded.length);
    });

    it('swaps the horizon texture when the player crosses into another biome', () => {
        rig.update({ skyState: stateAt(), biomeKey: 'active' });
        const before = meshFor('horizon.far').material.map.userData.url;
        rig.update({ skyState: stateAt(), biomeKey: 'cryo' });
        const after = meshFor('horizon.far').material.map.userData.url;
        expect(after).not.toBe(before);
        expect(after).toContain('glacier');
    });

    it('hides a layer the state has faded out rather than deleting its mesh', () => {
        rig.update({ skyState: stateAt({ timeOfDay: 0 }), biomeKey: 'active' });
        expect(meshFor('deepfield').visible).toBe(true);
        rig.update({ skyState: { ...stateAt(), starOpacity: 0 }, biomeKey: 'active' });
        expect(meshFor('deepfield').visible).toBe(false);
    });

    it('keeps the rig centred on the camera so the far plane never clips it', () => {
        rig.update({
            skyState: stateAt(),
            biomeKey: 'active',
            cameraPosition: new THREE.Vector3(120, 3, -45)
        });
        expect(rig.group.position.x).toBeCloseTo(120, 5);
        expect(rig.group.position.z).toBeCloseTo(-45, 5);
    });

    it('offsets layer texture uv by camera position scaled by that layer parallax', () => {
        rig.update({
            skyState: stateAt(),
            biomeKey: 'active',
            cameraPosition: new THREE.Vector3(100, 0, 0)
        });
        const near = Math.abs(meshFor('horizon.near').material.map.offset.x);
        const far = Math.abs(meshFor('horizon.far').material.map.offset.x);
        expect(near).toBeGreaterThan(far);
    });
});

describe('createSkyRig animation', () => {
    const advance = (rigRef, seconds, state) => rigRef.update({
        skyState: state, biomeKey: 'active', delta: seconds
    });

    it('gives the animated layers a shader material and the still ones a basic one', () => {
        rig.update({ skyState: stateAt({ timeOfDay: 0.5 }), biomeKey: 'active' });
        expect(meshFor('highcloud').material).toBeInstanceOf(THREE.ShaderMaterial);
        expect(meshFor('horizon.far').material).not.toBeInstanceOf(THREE.ShaderMaterial);
    });

    it('advances cloud time as frames elapse, so the sky actually moves', () => {
        const state = stateAt({ timeOfDay: 0.5 });
        advance(rig, 0.5, state);
        const first = meshFor('highcloud').material.uniforms.uTime.value;
        advance(rig, 0.5, state);
        expect(meshFor('highcloud').material.uniforms.uTime.value).toBeGreaterThan(first);
    });

    it('feeds wind speed from the sky state into the cloud shader', () => {
        const state = stateAt({ timeOfDay: 0.5 });
        advance(rig, 0.016, state);
        expect(meshFor('highcloud').material.uniforms.uWindSpeed.value)
            .toBeCloseTo(state.wind.speed, 6);
    });

    it('never writes parallax onto the shared cached texture', () => {
        rig.update({
            skyState: stateAt({ timeOfDay: 0.5 }),
            biomeKey: 'active',
            cameraPosition: new THREE.Vector3(200, 0, 0)
        });
        const mesh = meshFor('highcloud');
        expect(mesh.material.uniforms.uParallax.value).not.toBe(0);
        expect(mesh.material.uniforms.uMap.value.offset.x).toBe(0);
    });
});

describe('createSkyRig celestial bodies', () => {
    const bodyMeshes = () => rig.group.children
        .find((c) => c.name === 'skyBillboards')?.children ?? [];

    it('mounts a billboard pool inside the rig', () => {
        expect(rig.group.children.some((c) => c.name === 'skyBillboards')).toBe(true);
    });

    it('renders the seeded bodies that skyState emits', () => {
        // These assets shipped long before anything drew them; the state was
        // computed every frame and thrown away.
        const state = stateAt({ timeOfDay: 0 });
        expect(state.bodies.length).toBeGreaterThan(0);
        rig.update({ skyState: state, biomeKey: 'active' });
        expect(bodyMeshes().filter((m) => m.visible).length).toBeGreaterThan(0);
    });

    it('advances the billboard clock so procedural surfaces animate', () => {
        const state = stateAt({ timeOfDay: 0 });
        rig.update({ skyState: state, biomeKey: 'active', delta: 1 });
        const first = bodyMeshes().find((m) => m.visible)?.material.uniforms.uTime.value;
        rig.update({ skyState: state, biomeKey: 'active', delta: 1 });
        expect(bodyMeshes().find((m) => m.visible).material.uniforms.uTime.value)
            .toBeGreaterThan(first);
    });

    it('loads a texture for each visible body', () => {
        rig.update({ skyState: stateAt({ timeOfDay: 0 }), biomeKey: 'active' });
        for (const mesh of bodyMeshes().filter((m) => m.visible)) {
            expect(mesh.material.uniforms.uMap.value).toBeTruthy();
        }
    });
});

describe('createSkyRig transients', () => {
    const billboardMeshes = () => rig.group.children
        .find((c) => c.name === 'skyBillboards')?.children ?? [];

    const withTransient = (over = {}) => ({
        ...stateAt({ timeOfDay: 0 }),
        transients: [{
            key: 'scheduled:1',
            sheetId: 'sky_fx_comet_longtail',
            progress: 0.5,
            elapsedInTransient: 10,
            angularSize: 0.2,
            direction: { x: 0, y: 0.8, z: 0.6 },
            ...over
        }]
    });

    it('renders an active transient as a billboard', () => {
        rig.update({ skyState: withTransient(), biomeKey: 'active' });
        const comet = billboardMeshes().find(
            (m) => m.userData.sourceUrl === '/sky/fx_comet_longtail.png'
        );
        expect(comet).toBeDefined();
        expect(comet.visible).toBe(true);
    });

    it('windows the atlas to a single frame rather than showing the whole grid', () => {
        rig.update({ skyState: withTransient(), biomeKey: 'active' });
        const comet = billboardMeshes().find(
            (m) => m.userData.sourceUrl === '/sky/fx_comet_longtail.png'
        );
        // The frame window is a material uniform now, not a texture offset.
        expect(comet.material.uniforms.uRectA.value.z).toBeCloseTo(0.25, 6);
        expect(comet.material.uniforms.uRectA.value.w).toBeCloseTo(0.5, 6);
    });

    it('blends transients additively', () => {
        rig.update({ skyState: withTransient(), biomeKey: 'active' });
        const comet = billboardMeshes().find(
            (m) => m.userData.sourceUrl === '/sky/fx_comet_longtail.png'
        );
        expect(comet.material.blending).toBe(THREE.AdditiveBlending);
    });

    it('shows transients alongside the celestial bodies, not instead of them', () => {
        const state = withTransient();
        rig.update({ skyState: state, biomeKey: 'active' });
        const visible = billboardMeshes().filter((m) => m.visible);
        expect(visible.length).toBeGreaterThan(1);
    });

    it('clears the transient once it has finished', () => {
        rig.update({ skyState: withTransient(), biomeKey: 'active' });
        rig.update({ skyState: { ...stateAt({ timeOfDay: 0 }), transients: [] }, biomeKey: 'active' });
        const comet = billboardMeshes().find(
            (m) => m.userData.sourceUrl === '/sky/fx_comet_longtail.png' && m.visible
        );
        expect(comet).toBeUndefined();
    });
});

describe('createSkyRig disposal', () => {
    it('releases every geometry and material it created', () => {
        rig.update({ skyState: stateAt(), biomeKey: 'active' });
        const disposed = [];
        for (const child of rig.group.children) {
            if (!child.geometry) continue;
            child.geometry.dispose = () => disposed.push('geometry');
            child.material.dispose = () => disposed.push('material');
        }
        const expected = rig.group.children.filter((c) => c.geometry).length * 2;
        rig.dispose();
        expect(disposed.length).toBe(expected);
        expect(rig.group.children.length).toBe(0);
    });
});
