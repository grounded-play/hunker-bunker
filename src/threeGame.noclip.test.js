import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame Noclip and Fast Fly System', () => {
    let game;

    beforeEach(() => {
        // Stub basic DOM and audio
        globalThis.window = globalThis.window || {};
        globalThis.window.dispatchEvent = vi.fn();

        game = Object.create(ThreeGame.prototype);
        game.noclip = false;
        game.noclipSpeedMult = 3.5;
        game.godMode = false;
        game.moveSpeed = 4.0;
        game.health = 100;
        game.maxHealth = 100;
        game.playerVitals = { hp: 100, maxHp: 100, o2: 100 };
        game.emitHealthState = vi.fn();
        game.emitO2State = vi.fn();
        game.playerSprite = { material: { opacity: 1.0, color: new THREE.Color(0xffffff) } };
    });

    it('enables noclip, sets godMode to true, and reduces opacity for ghost visual', () => {
        const active = game.setNoclip(true, 4.0);
        expect(active).toBe(true);
        expect(game.noclip).toBe(true);
        expect(game.godMode).toBe(true);
        expect(game.noclipSpeedMult).toBe(4.0);
        expect(game.playerSprite.material.opacity).toBe(0.65);
        expect(globalThis.window.dispatchEvent).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'noclip-toggled' })
        );
    });

    it('toggles noclip state correctly with toggleNoclip()', () => {
        expect(game.noclip).toBe(false);
        const on = game.toggleNoclip();
        expect(on).toBe(true);
        expect(game.noclip).toBe(true);

        const off = game.toggleNoclip();
        expect(off).toBe(false);
        expect(game.noclip).toBe(false);
        expect(game.playerSprite.material.opacity).toBe(1.0);
    });

    it('takeDamage returns false when noclip is enabled', () => {
        game.setNoclip(true);
        const damaged = game.takeDamage(25, 'hazard');
        expect(damaged).toBe(false);
    });

    it('bypasses canOccupyPosition collision checks during noclip movement', () => {
        game.player = new THREE.Object3D();
        game.player.position.set(10, 0, 10);
        game.keys = { right: true, left: false, up: false, down: false };
        game.virtualInput = { x: 0, z: 0 };
        game.cameraPlanarRight = new THREE.Vector2(1, 0);
        game.cameraPlanarForward = new THREE.Vector2(0, 1);
        game.canOccupyPosition = vi.fn().mockReturnValue(false); // Colliding with wall
        game.getTerrainHeightAt = vi.fn().mockReturnValue(0);
        game.isPlayerDead = false;
        game.isPlayerFalling = false;
        game.isDashing = false;
        game.inRunLootDrops = [];
        game.totalDistanceTravelled = 0;

        game.playerMarker = { position: new THREE.Vector3() };
        game.playerMarkerHeight = 0.5;
        game.isPositionInPuddle = vi.fn().mockReturnValue(false);
        game.updatePlayerSpriteAnimation = vi.fn();
        game.updatePlayerForwardLight = vi.fn();
        game.updatePlayerShield = vi.fn();
        game.updateEchoLocationPulse = vi.fn();

        // With noclip enabled, player moves despite canOccupyPosition returning false
        game.setNoclip(true, 5.0);
        const prevX = game.player.position.x;
        game.updatePlayer(0.1);

        expect(game.player.position.x).toBeGreaterThan(prevX);
    });
});
