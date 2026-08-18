import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { openDebugCampSimulator, closeDebugCampSimulator, CAMP_SCENARIOS } from './debugCampSimulator.js';

describe('Wing 4: Survivor Camp & Outpost Testing Lab', () => {
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

    it('contains all 4 camp lifecycle scenarios', () => {
        expect(CAMP_SCENARIOS.length).toBe(4);
        const states = CAMP_SCENARIOS.map(c => c.state);
        expect(states).toContain('dark');
        expect(states).toContain('active');
        expect(states).toContain('siege');
        expect(states).toContain('overrun');
    });

    it('opens camp simulator and teleports player to first camp', async () => {
        const success = await openDebugCampSimulator(game);
        expect(success).toBe(true);

        const group = game.scene.getObjectByName('debug-camp-simulator');
        expect(group).toBeTruthy();
        expect(group.children.length).toBeGreaterThan(4);
        expect(game.player.position.x).toBe(15000);
        expect(game.setGodMode).toHaveBeenCalledWith(true);
    });

    it('closes camp simulator cleanly', async () => {
        await openDebugCampSimulator(game);
        expect(game.scene.getObjectByName('debug-camp-simulator')).toBeTruthy();

        const closed = closeDebugCampSimulator(game);
        expect(closed).toBe(true);
        expect(game.scene.getObjectByName('debug-camp-simulator')).toBeFalsy();
    });
});
