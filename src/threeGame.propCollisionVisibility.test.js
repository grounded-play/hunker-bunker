import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

describe('prop and ship module collision visibility verification (GAP-RN-02)', () => {
    function setupGameWithProp(propOverrides = {}) {
        const game = Object.create(ThreeGame.prototype);
        game.playerRadius = 0.3;
        game.isInPocket = false;
        game.getTileType = () => '.';
        game.isHoleTile = () => false;

        const scene = new THREE.Scene();
        const prop = new THREE.Object3D();
        prop.position.set(5, 0, 5);
        prop.userData = {
            isSolidProp: true,
            collisionRadius: 0.5,
            ...propOverrides.userData
        };
        if (propOverrides.visible !== undefined) {
            prop.visible = propOverrides.visible;
        }

        scene.add(prop);
        game.scatterSprites = [prop];
        return { game, prop, scene };
    }

    it('blocks movement when 2D sprite prop is visible and solid', () => {
        const { game } = setupGameWithProp({ visible: true });
        // Target at prop position (5, 5)
        expect(game.canOccupyPosition(5, 5)).toBe(false);
        // Far away from prop (10, 10)
        expect(game.canOccupyPosition(10, 10)).toBe(true);
    });

    it('blocks movement when 2D sprite is hidden but replaced by an active, visible 3D model with parent', () => {
        const world3dParent = new THREE.Group();
        const world3dRoot = new THREE.Object3D();
        world3dRoot.visible = true;
        world3dParent.add(world3dRoot);

        const { game } = setupGameWithProp({
            visible: false,
            userData: {
                replacedBy3d: true,
                world3dRoot
            }
        });

        // The 3D model is active and mounted, so the solid collider should be active
        expect(game.canOccupyPosition(5, 5)).toBe(false);
    });

    it('does NOT block movement when 2D sprite is hidden and 3D model is hidden (culled)', () => {
        const world3dParent = new THREE.Group();
        const world3dRoot = new THREE.Object3D();
        world3dRoot.visible = false; // Culled or hidden!
        world3dParent.add(world3dRoot);

        const { game } = setupGameWithProp({
            visible: false,
            userData: {
                replacedBy3d: true,
                world3dRoot
            }
        });

        // No invisible wall! Movement is allowed
        expect(game.canOccupyPosition(5, 5)).toBe(true);
    });

    it('does NOT block movement when 2D sprite is hidden and 3D model is detached (parent is null)', () => {
        const world3dRoot = new THREE.Object3D();
        world3dRoot.visible = true;
        // Not added to any parent! world3dRoot.parent is null

        const { game } = setupGameWithProp({
            visible: false,
            userData: {
                replacedBy3d: true,
                world3dRoot
            }
        });

        // Detached 3D model cannot create an invisible wall
        expect(game.canOccupyPosition(5, 5)).toBe(true);
    });

    it('does NOT block movement when 2D sprite is hidden and world3dRoot is missing', () => {
        const { game } = setupGameWithProp({
            visible: false,
            userData: {
                replacedBy3d: true,
                world3dRoot: null
            }
        });

        expect(game.canOccupyPosition(5, 5)).toBe(true);
    });

    it('evaluates crashed ship module collision based on 3D root visibility and mounting', () => {
        const game = Object.create(ThreeGame.prototype);
        game.playerRadius = 0.3;
        game.isInPocket = false;
        game.getTileType = () => '.';
        game.isHoleTile = () => false;

        const scene = new THREE.Scene();
        const o2Module3d = new THREE.Object3D();
        scene.add(o2Module3d);

        const ship = {
            isVisible: true,
            tileX: 10,
            tileZ: 10,
            width: 1.0,
            consoleOffset: { x: 50, z: 50 }, // Keep console far away
            o2ModuleX: 20,
            o2ModuleZ: 20,
            o2ModuleSprite: {
                visible: false,
                userData: { replacedBy3d: true }
            },
            o2Module3d
        };
        game.crashedShips = [ship];

        // Case 1: o2Module3d is attached and visible -> blocks position at (20, 20)
        o2Module3d.visible = true;
        expect(game.canOccupyPosition(20, 20)).toBe(false);

        // Case 2: o2Module3d is culled/hidden -> no invisible collision at (20, 20)
        o2Module3d.visible = false;
        expect(game.canOccupyPosition(20, 20)).toBe(true);

        // Case 3: o2Module3d is removed from scene -> parent is null -> no invisible collision
        o2Module3d.visible = true;
        scene.remove(o2Module3d);
        expect(game.canOccupyPosition(20, 20)).toBe(true);
    });
});
