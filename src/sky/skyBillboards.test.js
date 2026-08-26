import { describe, expect, it, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createSkyBillboardPool } from './skyBillboards.js';
import { SKY_SHEETS, frameRectFor } from './skySheets.js';

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

let loader;
let pool;
beforeEach(() => {
    loader = stubLoader();
    pool = createSkyBillboardPool({ textureLoader: loader, capacity: 4 });
});

const entry = (over = {}) => ({
    key: 'a',
    url: '/sky/body_moon_cratered_large.png',
    direction: { x: 0, y: 1, z: 0 },
    angularSize: 0.1,
    blend: 'alpha',
    opacity: 1,
    ...over
});

describe('createSkyBillboardPool', () => {
    it('preallocates its whole capacity so no frame ever allocates a mesh', () => {
        expect(pool.group.children.length).toBe(4);
    });

    it('hides unused slots rather than removing them', () => {
        pool.sync([entry()], 50);
        expect(pool.group.children.filter((c) => c.visible).length).toBe(1);
        expect(pool.group.children.length).toBe(4);
    });

    it('reuses the same meshes across syncs', () => {
        pool.sync([entry()], 50);
        const first = pool.group.children[0];
        pool.sync([entry(), entry({ key: 'b' })], 50);
        expect(pool.group.children[0]).toBe(first);
        expect(pool.group.children.length).toBe(4);
    });

    it('drops entries beyond capacity instead of growing or throwing', () => {
        const entries = Array.from({ length: 9 }, (_, i) => entry({ key: `k${i}` }));
        expect(() => pool.sync(entries, 50)).not.toThrow();
        expect(pool.group.children.filter((c) => c.visible).length).toBe(4);
    });
});

describe('skyBillboard placement', () => {
    it('places a body along its direction at the dome radius', () => {
        pool.sync([entry({ direction: { x: 0, y: 1, z: 0 } })], 50);
        const mesh = pool.group.children[0];
        expect(mesh.position.y).toBeCloseTo(50, 4);
        expect(mesh.position.x).toBeCloseTo(0, 4);
    });

    it('hides anything below the horizon', () => {
        pool.sync([entry({ direction: { x: 0, y: -0.6, z: 0.8 } })], 50);
        expect(pool.group.children[0].visible).toBe(false);
    });

    it('scales the quad with the body angular size', () => {
        pool.sync([entry({ angularSize: 0.05 })], 50);
        const small = pool.group.children[0].scale.x;
        pool.sync([entry({ angularSize: 0.2 })], 50);
        expect(pool.group.children[0].scale.x).toBeGreaterThan(small);
    });

    it('faces each billboard back toward the viewer at the dome centre', () => {
        pool.sync([entry({ direction: { x: 1, y: 0.2, z: 0 } })], 50);
        const mesh = pool.group.children[0];
        const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(mesh.quaternion);
        const viewAxis = mesh.position.clone().normalize();
        // The quad must be face-on to the viewer at the dome centre: its normal
        // lies along the view axis. lookAt points +Z AT the target, so the dot
        // is -1 rather than +1 -- the magnitude is what matters, and the
        // material is DoubleSide so either facing renders.
        expect(Math.abs(normal.dot(viewAxis))).toBeGreaterThan(0.99);
    });
});

describe('skyBillboard materials', () => {
    it('blends emissive bodies additively', () => {
        pool.sync([entry({ url: '/sky/body_sun_primary.png', blend: 'additive' })], 50);
        expect(pool.group.children[0].material.blending).toBe(THREE.AdditiveBlending);
    });

    it('alpha-blends the green-keyed solid bodies', () => {
        pool.sync([entry()], 50);
        expect(pool.group.children[0].material.blending).toBe(THREE.NormalBlending);
    });

    it('never writes depth, and stays behind world geometry', () => {
        pool.sync([entry()], 50);
        const { material } = pool.group.children[0];
        expect(material.depthWrite).toBe(false);
        expect(material.depthTest).toBe(true);
        expect(material.fog).toBe(false);
    });
});

describe('skyBillboard sheet frames', () => {
    const sheet = SKY_SHEETS.sky_fx_comet_longtail;

    it('windows the texture down to the requested frame', () => {
        // frameRectFor takes ELAPSED SECONDS, not progress -- at 12fps this is
        // frame 6 of the comet.
        const rect = frameRectFor(sheet, 6 / sheet.fps);
        pool.sync([entry({ url: '/sky/fx_comet_longtail.png', frameRect: rect })], 50);
        const { map } = pool.group.children[0].material;
        expect(map.repeat.x).toBeCloseTo(rect.repeatX, 6);
        expect(map.offset.x).toBeCloseTo(rect.offsetX, 6);
    });

    it('gives each slot its own texture so two sheets cannot stomp each other', () => {
        // Textures are cached by url; sharing one object between two billboards
        // showing different frames would make them fight over offset.
        const url = '/sky/fx_comet_longtail.png';
        pool.sync([
            entry({ key: 'a', url, frameRect: frameRectFor(sheet, 0) }),
            entry({ key: 'b', url, frameRect: frameRectFor(sheet, 5 / sheet.fps) })
        ], 50);
        const [a, b] = pool.group.children;
        expect(a.material.map).not.toBe(b.material.map);
        expect(a.material.map.offset.x).not.toBeCloseTo(b.material.map.offset.x, 6);
    });
});

describe('skyBillboard async texture loading', () => {
    // TextureLoader.load returns immediately and fills in .image later. Any
    // per-slot copy taken before that lands must still end up with the pixels,
    // or the billboard renders as nothing forever.
    function deferredLoader() {
        const pending = [];
        return {
            pending,
            load(url) {
                const texture = new THREE.Texture();
                texture.userData = { url };
                pending.push(texture);
                return texture;
            },
            finishLoading(width = 2048, height = 1024) {
                for (const texture of pending) {
                    texture.image = { width, height };
                    texture.needsUpdate = true;
                    texture.dispatchEvent?.({ type: 'update' });
                }
            }
        };
    }

    it('still shows the image when the texture finishes loading after the sync', () => {
        const loader = deferredLoader();
        const slow = createSkyBillboardPool({ textureLoader: loader, capacity: 2 });
        slow.sync([entry({ url: '/sky/fx_comet_longtail.png' })], 50);
        loader.finishLoading();
        expect(slow.group.children[0].material.map.image?.width).toBe(2048);
    });

    it('shows the image for two slots sharing one atlas', () => {
        const loader = deferredLoader();
        const slow = createSkyBillboardPool({ textureLoader: loader, capacity: 2 });
        const url = '/sky/fx_comet_longtail.png';
        slow.sync([entry({ key: 'a', url }), entry({ key: 'b', url })], 50);
        loader.finishLoading();
        for (const mesh of slow.group.children) {
            expect(mesh.material.map.image?.width).toBe(2048);
        }
    });
});

describe('skyBillboard disposal', () => {
    it('releases every geometry and material it created', () => {
        pool.sync([entry()], 50);
        const disposed = [];
        for (const child of pool.group.children) {
            child.geometry.dispose = () => disposed.push('geometry');
            child.material.dispose = () => disposed.push('material');
        }
        pool.dispose();
        expect(disposed.length).toBe(8);
        expect(pool.group.children.length).toBe(0);
    });
});
