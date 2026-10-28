import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { LORE_DROPS } from './loreDrops.js';

describe('3D Lore Drops Presentation & Animation', () => {
    function createMockGame() {
        const game = Object.create(ThreeGame.prototype);
        game.scene = new THREE.Scene();
        game.loreDrops = [];
        game.scatterMaterials = {
            lore_terminal: { map: new THREE.Texture(), clone: () => ({ color: new THREE.Color(), map: true }) }
        };
        game.deferWorld3dReplacement = vi.fn();
        game.setupWorld3dReplacement = vi.fn();
        game.world3dMixers = new Set();
        game.player = { position: new THREE.Vector3(10, 0, 10) };
        game.isPlayerDead = false;
        return game;
    }

    it('spawns a lore drop with glowing ground circle and links 3D replacement', () => {
        const game = createMockGame();
        const drop = LORE_DROPS.find((d) => d.key === 'drop_horizon_badge') || LORE_DROPS[0];
        const sprite = game.spawnLoreDropSprite(drop, 5, 8);

        expect(sprite).toBeTruthy();
        expect(game.loreDrops.length).toBe(1);

        const entry = game.loreDrops[0];
        expect(entry.glowGroup).toBeInstanceOf(THREE.Group);
        expect(entry.groundRing).toBeInstanceOf(THREE.Mesh);
        expect(entry.groundDisc).toBeInstanceOf(THREE.Mesh);
        expect(entry.baseY).toBe(0.16);

        // Ground ring and disc are children of the glowGroup
        expect(entry.glowGroup.children).toContain(entry.groundRing);
        expect(entry.glowGroup.children).toContain(entry.groundDisc);

        // Position initialized
        expect(entry.glowGroup.position.x).toBe(5);
        expect(entry.glowGroup.position.z).toBe(8);

        // Setup world 3D replacement was called for drop_horizon_badge
        expect(game.setupWorld3dReplacement).toHaveBeenCalledWith(sprite, drop.key);
    });

    it('updates hover floating, continuous spin, and pulsing glow circle on delta', () => {
        const game = createMockGame();
        const drop = LORE_DROPS[0];
        const sprite = game.spawnLoreDropSprite(drop, 2, 3);
        const entry = game.loreDrops[0];

        // Simulate attached 3D root
        const mock3dRoot = new THREE.Group();
        sprite.userData.world3dRoot = mock3dRoot;

        const initialRingRotZ = entry.groundRing.rotation.z;
        const initialRootRotY = mock3dRoot.rotation.y;

        game.updateLoreDrops(0.1);

        // 3D root rotated and hovered
        expect(mock3dRoot.rotation.y).toBeGreaterThan(initialRootRotY);
        expect(entry.groundRing.rotation.z).toBeGreaterThan(initialRingRotZ);
        expect(sprite.position.y).toBeGreaterThan(0.1);
        expect(mock3dRoot.position.y).toBe(sprite.position.y);
        expect(entry.groundRing.material.opacity).toBeGreaterThan(0);
    });

    it('collects lore drop and cleanly cleans up 3D root and ground glow group', () => {
        const game = createMockGame();
        const drop = LORE_DROPS[0];
        const sprite = game.spawnLoreDropSprite(drop, 1, 1);
        const entry = game.loreDrops[0];

        const mock3dRoot = new THREE.Group();
        sprite.userData.world3dRoot = mock3dRoot;
        game.scene.add(mock3dRoot);

        expect(game.scene.children).toContain(entry.glowGroup);
        expect(game.scene.children).toContain(sprite);
        expect(game.scene.children).toContain(mock3dRoot);

        game.collectLoreDrop(0);

        expect(game.loreDrops.length).toBe(0);
        expect(game.scene.children).not.toContain(entry.glowGroup);
        expect(game.scene.children).not.toContain(sprite);
        expect(game.scene.children).not.toContain(mock3dRoot);
    });
});
