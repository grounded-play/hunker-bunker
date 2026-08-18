import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { openDebugTileGrid, closeDebugTileGrid, TILE_GRID_MODULES } from './debugTileGrid.js';

describe('Wing 2: Architectural & Canyon Tile Grid', () => {
    let game;

    beforeEach(() => {
        globalThis.window = globalThis.window || {};
        globalThis.document = globalThis.document || {
            createElement: () => ({
                getContext: () => ({
                    fillRect: () => {},
                    strokeRect: () => {},
                    fillText: () => {},
                    beginPath: () => {},
                    moveTo: () => {},
                    lineTo: () => {},
                    stroke: () => {}
                })
            })
        };

        game = {
            scene: new THREE.Scene(),
            player: { position: new THREE.Vector3() },
            setGodMode: vi.fn()
        };
    });

    it('defines full catalog of 16 modules covering canyon edges, rooms, camps, hives, and doors', () => {
        expect(TILE_GRID_MODULES.length).toBe(16);
        const types = TILE_GRID_MODULES.map(m => m.type);
        expect(types).toContain('canyon_edge');
        expect(types).toContain('canyon_corner');
        expect(types).toContain('survivor_camp');
        expect(types).toContain('hive_heart');
        expect(types).toContain('door_blast_closed');
        expect(types).toContain('ring_barrier_locked');
    });

    it('opens tile grid, attaches root group to scene, and positions player at staging origin', async () => {
        const success = await openDebugTileGrid(game);
        expect(success).toBe(true);

        const group = game.scene.getObjectByName('debug-tile-grid');
        expect(group).toBeTruthy();
        expect(group.children.length).toBeGreaterThan(16); // lighting + 16 modules
        expect(game.player.position.x).toBe(11000);
        expect(game.setGodMode).toHaveBeenCalledWith(true);
    });

    it('closes tile grid cleanly and disposes root geometry', async () => {
        await openDebugTileGrid(game);
        expect(game.scene.getObjectByName('debug-tile-grid')).toBeTruthy();

        const closed = closeDebugTileGrid(game);
        expect(closed).toBe(true);
        expect(game.scene.getObjectByName('debug-tile-grid')).toBeFalsy();
    });
});
