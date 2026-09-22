import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame menu showroom floor & presentation', () => {
    let origDoc;

    beforeEach(() => {
        origDoc = globalThis.document;
        const mockCtx = {
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 1,
            fillRect: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            stroke: vi.fn(),
            arc: vi.fn(),
            createRadialGradient: vi.fn(() => ({
                addColorStop: vi.fn()
            }))
        };
        const mockCanvas = {
            width: 512,
            height: 512,
            getContext: vi.fn(() => mockCtx)
        };
        globalThis.document = {
            createElement: vi.fn((tag) => {
                if (tag === 'canvas') return mockCanvas;
                return {};
            })
        };
    });

    afterEach(() => {
        globalThis.document = origDoc;
    });

    // The grid tiles: the menu panel is a wide strip and the showcase patrol
    // walks the operative far off the spawn tile, so a single clamped texture
    // ran out and left the deck half black.
    it('creates a repeating menu grid texture in SRGB', () => {
        const fake = {
            maxTextureAnisotropy: 4
        };
        const texture = ThreeGame.prototype.createMenuGridTexture.call(fake);
        expect(texture).toBeDefined();
        expect(texture.isCanvasTexture).toBe(true);
        expect(texture.wrapS).toBe(THREE.RepeatWrapping);
        expect(texture.wrapT).toBe(THREE.RepeatWrapping);
        expect(texture.repeat.x).toBeGreaterThan(1);
        expect(texture.repeat.x).toBe(texture.repeat.y);
        expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    });

    // Rings stay on their own decal so they can sit under the operative
    // wherever the patrol goes, instead of being pinned to the spawn tile.
    it('creates a clamped reticle texture for the tracking rings', () => {
        const texture = ThreeGame.prototype.createMenuReticleTexture.call({ maxTextureAnisotropy: 4 });
        expect(texture.isCanvasTexture).toBe(true);
        expect(texture.wrapS).toBe(THREE.ClampToEdgeWrapping);
        expect(texture.wrapT).toBe(THREE.ClampToEdgeWrapping);
        expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    });

    it('anchors the grid and reticle to the operative, snapping the grid to whole cells', () => {
        const mk = () => ({
            position: {
                x: 0, y: 0, z: 0,
                set: vi.fn(function (x, y, z) { this.x = x; this.y = y; this.z = z; })
            }
        });
        const floorMesh = mk();
        const reticle = mk();
        floorMesh.position.set = floorMesh.position.set.bind(floorMesh.position);
        reticle.position.set = reticle.position.set.bind(reticle.position);
        const fake = {
            menuShowroomFloor: floorMesh,
            menuShowroomReticle: reticle,
            player: { position: { x: 4937.8, z: 4924.4 } },
            getSpawnTile: () => ({ x: 4925, y: 4925 })
        };

        ThreeGame.prototype.positionMenuShowroomFloor.call(fake);

        // Grid snaps to whole cells so the repeat phase never slides underfoot.
        const CELL = 1.5;
        const isOnCell = (v) => Math.abs(v / CELL - Math.round(v / CELL)) < 1e-6;
        expect(isOnCell(floorMesh.position.x)).toBe(true);
        expect(isOnCell(floorMesh.position.z)).toBe(true);
        // ...and never drifts further than half a cell from the operative.
        expect(Math.abs(floorMesh.position.x - 4937.8)).toBeLessThanOrEqual(CELL / 2);
        expect(Math.abs(floorMesh.position.z - 4924.4)).toBeLessThanOrEqual(CELL / 2);
        // Reticle sits exactly under the operative, not on the spawn tile.
        expect(reticle.position.x).toBeCloseTo(4937.8, 5);
        expect(reticle.position.z).toBeCloseTo(4924.4, 5);
    });

    it('positions menu showroom floor precisely at y = -0.005', () => {
        const floorMesh = {
            position: {
                x: 0,
                y: 0,
                z: 0,
                set: vi.fn((x, y, z) => {
                    floorMesh.position.x = x;
                    floorMesh.position.y = y;
                    floorMesh.position.z = z;
                })
            }
        };
        const fake = {
            menuShowroomFloor: floorMesh,
            getSpawnTile: () => ({ x: 100, y: 200 })
        };
        ThreeGame.prototype.positionMenuShowroomFloor.call(fake);
        expect(floorMesh.position.set).toHaveBeenCalled();
        expect(floorMesh.position.y).toBe(-0.005);
    });
});
