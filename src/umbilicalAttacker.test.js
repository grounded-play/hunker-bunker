import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { UmbilicalAttacker } from './3d/umbilicalAttacker.js';

describe('UmbilicalAttacker', () => {
    function createMockAttacker(options = {}) {
        const root = new THREE.Group();
        root.position.set(0, 0, 0);
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial()
        );
        root.add(mesh);

        return new UmbilicalAttacker({
            scene: root,
            animations: []
        }, {
            root,
            x: 0,
            y: 0,
            z: 0,
            hp: 50,
            detectionRadius: 10,
            strikeRadius: 3,
            attackDamage: 15,
            ...options
        });
    }

    it('initializes with default combat stats and root group', () => {
        const attacker = createMockAttacker();
        expect(attacker.isAlive).toBe(true);
        expect(attacker.hp).toBe(50);
        expect(attacker.state).toBe('IDLE');
        expect(attacker.detectionRadius).toBe(10);
        expect(attacker.strikeRadius).toBe(3);
    });

    it('transitions from IDLE to TRACKING when player enters detection radius', () => {
        const attacker = createMockAttacker();
        const farPlayer = { x: 50, y: 0, z: 50 };
        attacker.update(0.1, farPlayer);
        expect(attacker.state).toBe('IDLE');

        const nearPlayer = { x: 6, y: 0, z: 0 };
        attacker.update(0.1, nearPlayer);
        expect(attacker.state).toBe('TRACKING');
    });

    it('transitions to ANTICIPATION and strikes when player is within strike radius', () => {
        const attacker = createMockAttacker({ strikeRadius: 4.0 });
        const closePlayer = { x: 2, y: 0, z: 0 };

        // 1. Enters strike range -> goes to ANTICIPATION
        attacker.update(0.1, closePlayer);
        expect(attacker.state).toBe('ANTICIPATION');

        // 2. Advance time past anticipation duration (0.45s)
        const onDamagePlayer = vi.fn();
        attacker.update(0.5, closePlayer, { onDamagePlayer });

        expect(attacker.state).toBe('STRIKE');
        expect(onDamagePlayer).toHaveBeenCalledWith(expect.objectContaining({
            damage: 15,
            infection: 0.15
        }));
    });

    it('takes damage, flashes, and transitions to DEAD upon depletion', () => {
        const attacker = createMockAttacker({ hp: 40 });
        attacker.takeDamage(15);
        expect(attacker.hp).toBe(25);
        expect(attacker.flashTimer).toBeGreaterThan(0);
        expect(attacker.isAlive).toBe(true);

        attacker.takeDamage(30);
        expect(attacker.hp).toBe(0);
        expect(attacker.isAlive).toBe(false);
        expect(attacker.state).toBe('DEAD');
    });
});
