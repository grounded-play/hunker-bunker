import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { openDebugBossArenas, closeDebugBossArenas, BOSS_ENCOUNTERS } from './debugBossArenas.js';

describe('Wing 3: Boss & Encounter Proving Grounds', () => {
    let game;

    beforeEach(() => {
        globalThis.window = globalThis.window || {};
        globalThis.document = globalThis.document || {
            createElement: () => ({
                getContext: () => ({
                    fillRect: () => {},
                    strokeRect: () => {},
                    fillText: () => {}
                })
            })
        };

        game = {
            scene: new THREE.Scene(),
            player: { position: new THREE.Vector3() },
            setGodMode: vi.fn()
        };
    });

    it('contains all 5 canonical boss encounters and phase configs', () => {
        expect(BOSS_ENCOUNTERS.length).toBe(5);
        const types = BOSS_ENCOUNTERS.map(e => e.bossType);
        expect(types).toContain('boss_queen');
        expect(types).toContain('boss_cryo_behemoth');
        expect(types).toContain('boss_sporesnail');
        expect(types).toContain('mycelium_stalker');
        expect(types).toContain('boss_cybersnail');
    });

    it('opens boss arenas and teleports player to first arena control platform', async () => {
        const success = await openDebugBossArenas(game);
        expect(success).toBe(true);

        const group = game.scene.getObjectByName('debug-boss-arenas');
        expect(group).toBeTruthy();
        expect(group.children.length).toBeGreaterThan(5);
        expect(game.player.position.x).toBe(13000);
        expect(game.setGodMode).toHaveBeenCalledWith(true);
    });

    it('closes boss arenas and removes from scene', async () => {
        await openDebugBossArenas(game);
        expect(game.scene.getObjectByName('debug-boss-arenas')).toBeTruthy();

        const closed = closeDebugBossArenas(game);
        expect(closed).toBe(true);
        expect(game.scene.getObjectByName('debug-boss-arenas')).toBeFalsy();
    });
});
