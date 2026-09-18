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

    it('creates menu grid texture with clamped edges and SRGB color space', () => {
        const fake = {
            maxTextureAnisotropy: 4
        };
        const texture = ThreeGame.prototype.createMenuGridTexture.call(fake);
        expect(texture).toBeDefined();
        expect(texture.isCanvasTexture).toBe(true);
        expect(texture.wrapS).toBe(THREE.ClampToEdgeWrapping);
        expect(texture.wrapT).toBe(THREE.ClampToEdgeWrapping);
        expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
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
