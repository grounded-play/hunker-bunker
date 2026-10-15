import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame prop movement and interaction synchronization', () => {
    let game;
    let emitFn;

    beforeEach(() => {
        emitFn = vi.fn();
        game = {
            isMultiplayer: true,
            multiplayerMode: 'coop',
            multiplayerLocalPlayerId: 'player-local',
            netSocket: { emit: emitFn },
            propTransformStates: new Map(),
            propInteractionStates: new Map(),
            _propMoveSequence: 0,
            _remotePropMoveSequences: new Map(),
            _dressingProtocolEnabled: true,
            scatteredProps: new Map(),
            broadcastSharedWorldEvent: ThreeGame.prototype.broadcastSharedWorldEvent,
            handleSharedWorldEvent: ThreeGame.prototype.handleSharedWorldEvent,
            findPropSprite: ThreeGame.prototype.findPropSprite,
            moveProp: ThreeGame.prototype.moveProp,
            applyRemotePropMoved: ThreeGame.prototype.applyRemotePropMoved,
            applyRemotePropInteracted: ThreeGame.prototype.applyRemotePropInteracted
        };
    });

    it('moveProp updates prop, collider, root, records transform, and broadcasts prop-moved', () => {
        const prop = new THREE.Object3D();
        prop.position.set(0, 0, 0);
        prop.userData = {
            key: 'crate_1',
            collider: { position: new THREE.Vector3(0, 0, 0) },
            root: { position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) }
        };

        const result = game.moveProp(prop, { x: 10, y: 0.5, z: 20, rotY: 1.57, emit: true });
        expect(result).toBe(true);

        // Prop position updated
        expect(prop.position.x).toBe(10);
        expect(prop.position.y).toBe(0.5);
        expect(prop.position.z).toBe(20);
        expect(prop.rotation.y).toBeCloseTo(1.57);

        // Collider & root updated
        expect(prop.userData.collider.position.x).toBe(10);
        expect(prop.userData.root.position.x).toBe(10);
        expect(prop.userData.root.rotation.y).toBeCloseTo(1.57);

        // Recorded in propTransformStates
        expect(game.propTransformStates.get('crate_1')).toMatchObject({
            x: 10,
            y: 0.5,
            z: 20,
            rotY: 1.57,
            seq: 1
        });

        // Broadcasted
        expect(emitFn).toHaveBeenCalledWith('worldEvent', {
            event: 'prop-moved',
            detail: {
                id: 'crate_1',
                key: 'crate_1',
                scatterKey: 'crate_1',
                x: 10,
                y: 0.5,
                z: 20,
                rotY: 1.57,
                seq: 1,
                sequence: 1
            }
        });
    });

    it('moveProp with emit: false does not broadcast (used for remote replays)', () => {
        const prop = new THREE.Object3D();
        prop.position.set(0, 0, 0);
        prop.userData = { key: 'crate_1' };

        game.moveProp(prop, { x: 5, z: 5, emit: false });
        expect(prop.position.x).toBe(5);
        expect(prop.position.z).toBe(5);
        expect(emitFn).not.toHaveBeenCalled();
    });

    it('handles remote prop-moved events and applies them locally', () => {
        const prop = new THREE.Object3D();
        prop.position.set(0, 0, 0);
        prop.userData = { key: 'crate_1' };
        game.scatteredProps.set('crate_1', prop);

        const handled = game.handleSharedWorldEvent({
            event: 'prop-moved',
            originId: 'player-remote',
            detail: {
                key: 'crate_1',
                x: 14,
                y: 0,
                z: 28,
                rotY: 3.14,
                seq: 1
            }
        });

        expect(handled).toBe(true);
        expect(prop.position.x).toBe(14);
        expect(prop.position.z).toBe(28);
        expect(prop.rotation.y).toBeCloseTo(3.14);
        expect(game.propTransformStates.get('crate_1')?.x).toBe(14);
    });

    it('drops out-of-order remote prop-moved events', () => {
        const prop = new THREE.Object3D();
        prop.position.set(0, 0, 0);
        prop.userData = { key: 'crate_1' };
        game.scatteredProps.set('crate_1', prop);

        game.applyRemotePropMoved({ key: 'crate_1', x: 20, z: 20, seq: 5 });
        expect(prop.position.x).toBe(20);

        // Older sequence arrives out of order
        const older = game.applyRemotePropMoved({ key: 'crate_1', x: 10, z: 10, seq: 3 });
        expect(older).toBe(false);
        expect(prop.position.x).toBe(20);
    });

    it('handles remote prop-interacted events and stores interaction state', () => {
        const handled = game.handleSharedWorldEvent({
            event: 'prop-interacted',
            originId: 'player-remote',
            detail: {
                key: 'lever_1',
                state: 'pulled',
                fxMode: 'sparks',
                collision: 'disabled',
                x: 12,
                z: 18,
                rotY: 0
            }
        });

        expect(handled).toBe(true);
        expect(game.propInteractionStates.get('lever_1')).toMatchObject({
            state: 'pulled',
            fxMode: 'sparks',
            collision: 'disabled',
            x: 12,
            z: 18
        });
    });

    it('operates identically in PvP mode for complete world parity', () => {
        game.multiplayerMode = 'pvp';

        const prop = new THREE.Object3D();
        prop.position.set(0, 0, 0);
        prop.userData = { key: 'barrel_pvp' };
        game.scatteredProps.set('barrel_pvp', prop);

        // Local move in PvP
        game.moveProp(prop, { x: 8, z: 12, emit: true });
        expect(emitFn).toHaveBeenCalledWith('worldEvent', expect.objectContaining({
            event: 'prop-moved'
        }));

        // Remote move received in PvP
        const handled = game.handleSharedWorldEvent({
            event: 'prop-moved',
            originId: 'player-remote-pvp',
            detail: {
                key: 'barrel_pvp',
                x: 30,
                z: 40,
                seq: 10
            }
        });
        expect(handled).toBe(true);
        expect(prop.position.x).toBe(30);
        expect(prop.position.z).toBe(40);
    });
});
