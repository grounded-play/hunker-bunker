import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { BankManager } from './bank.js';
import { ExplorationTracker } from './mapSystem.js';
import { FabricationFoundry } from './foundry.js';

function createMockGame() {
    const scene = new THREE.Scene();
    const bank = new BankManager();
    const explorationTracker = new ExplorationTracker();
    const player = new THREE.Object3D();
    player.position.set(0, 0, 0);

    const game = {
        scene,
        bank,
        player,
        explorationTracker,
        isPlayerDead: false,
        cameraPlanarRight: new THREE.Vector2(1, 0),
        cameraPlanarForward: new THREE.Vector2(0, 1),
        runEntropy: 42,
        foundry: new FabricationFoundry(scene, { powered: false, loadModel: vi.fn(async () => new THREE.Group()) }),
        _foundryPromptActive: false,
        _hasFoundryPart: false,
        _foundryPowered: false,
        _foundryPartActive: false,
        _foundryPartPosition: null,
        _foundryPartMarker: null,
        _foundryPartPromptActive: false,
        _foundryPartElapsed: 0,
        getActiveShip: () => ({ tileX: 0, tileZ: 0 }),
        getBiomeAnchorPosition: () => ({ x: 0, z: 0 }),
        isSnailTileWalkable: () => true,
        canOccupyPosition: () => true,
        isGameplayInputActive: () => true,
        isAct2Active: () => false,
        triggerCameraShake: vi.fn(),
        showBunkerLine: vi.fn(),
        planarAngleTo: ThreeGame.prototype.planarAngleTo,
        createSeededRandom: ThreeGame.prototype.createSeededRandom,
        hashTile: ThreeGame.prototype.hashTile,
        chooseFoundryDiscoveryPosition: () => ({ x: 10, z: 12 }),
        chooseFoundryPartPosition: ThreeGame.prototype.chooseFoundryPartPosition,
        ensureFoundryPartSpawned: ThreeGame.prototype.ensureFoundryPartSpawned,
        createFoundryPartMarker: ThreeGame.prototype.createFoundryPartMarker,
        updateFoundryPart: ThreeGame.prototype.updateFoundryPart,
        updateFoundryPartPrompt: ThreeGame.prototype.updateFoundryPartPrompt,
        interactWithFoundryPart: ThreeGame.prototype.interactWithFoundryPart,
        installFoundryPart: ThreeGame.prototype.installFoundryPart,
        removeFoundryPartMarker: ThreeGame.prototype.removeFoundryPartMarker,
        clearFoundryPart: ThreeGame.prototype.clearFoundryPart,
        isFoundryPowered: ThreeGame.prototype.isFoundryPowered,
        hasFoundryPart: ThreeGame.prototype.hasFoundryPart,
        revealFoundry: ThreeGame.prototype.revealFoundry,
        interactWithFoundry: ThreeGame.prototype.interactWithFoundry,
        getRadarCompassState: ThreeGame.prototype.getRadarCompassState
    };

    return game;
}

describe('Foundry Power Core & Locked State Workflow', () => {
    let mockAudio;

    beforeEach(() => {
        globalThis.CustomEvent = class CustomEvent {
            constructor(type, options = {}) {
                this.type = type;
                this.detail = options.detail;
            }
        };
        mockAudio = {
            play: vi.fn()
        };
        globalThis.window = {
            dispatchEvent: vi.fn(),
            AudioManager: mockAudio
        };
    });

    it('starts unpowered without the part, locks interaction, plays negative audio and guides player to part', () => {
        const game = createMockGame();

        expect(game.isFoundryPowered()).toBe(false);
        expect(game.hasFoundryPart()).toBe(false);

        // Reveal the foundry in the world
        game.revealFoundry({ instant: true });
        expect(game.foundry.isRevealed).toBe(true);
        expect(game.foundry.isPowered()).toBe(false);

        // It automatically spawned the part and registered landmark on map
        expect(game._foundryPartActive).toBe(true);
        expect(game._foundryPartPosition).toBeDefined();
        const partLandmark = game.explorationTracker.getLandmarks().find((l) => l.id === 'foundry_part');
        expect(partLandmark).toBeDefined();
        expect(partLandmark.revealOnMap).toBe(true);
        expect(partLandmark.type).toBe('foundry_part');

        // Player stands at the foundry and tries to access it
        const fp = game.foundry.getPosition();
        game.player.position.set(fp.x, 0, fp.z);

        const result = game.interactWithFoundry();
        expect(result).toBe(false);

        // Negative audio played
        expect(mockAudio.play).toHaveBeenCalledWith('terminal_deny', expect.objectContaining({ volume: 0.75 }));

        // Guidance event fired with coordinates
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'foundry-locked-access',
            detail: expect.objectContaining({
                x: game._foundryPartPosition.x,
                z: game._foundryPartPosition.z
            })
        }));

        // Does NOT open the fabrication bay
        expect(window.dispatchEvent).not.toHaveBeenCalledWith(expect.objectContaining({
            type: 'open-fabrication-bay'
        }));

        // Compass points to the part
        const compass = game.getRadarCompassState();
        expect(compass.active).toBe(true);
        expect(compass.mode).toBe('foundry_part');
        expect(compass.label).toBe('FOUNDRY POWER CORE');
    });

    it('allows picking up the power core and updates the objective back to the foundry', () => {
        const game = createMockGame();
        game.revealFoundry({ instant: true });

        const partPos = game._foundryPartPosition;
        expect(partPos).toBeDefined();

        // Move player to the power core position
        game.player.position.set(partPos.x, 0, partPos.z);

        // Interact to pick up the core
        const pickupResult = game.interactWithFoundryPart();
        expect(pickupResult).toBe(true);
        expect(game.hasFoundryPart()).toBe(true);
        expect(game._foundryPartActive).toBe(false);

        // Part landmark removed from map
        const landmarkAfter = game.explorationTracker.getLandmarks().find((l) => l.id === 'foundry_part');
        expect(landmarkAfter).toBeUndefined();

        // Audio and event fired
        expect(mockAudio.play).toHaveBeenCalledWith('ui_boot', expect.anything());
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'foundry-part-acquired'
        }));

        // Compass now points player back to the foundry to install
        const compass = game.getRadarCompassState();
        expect(compass.active).toBe(true);
        expect(compass.mode).toBe('foundry');
        expect(compass.label).toBe('INSTALL FOUNDRY CORE');
    });

    it('installs the core, restores power, turns on foundry visuals/audio and opens the fabrication bay', () => {
        const game = createMockGame();
        game.revealFoundry({ instant: true });

        // Player collected part
        game._hasFoundryPart = true;

        // Player returns to foundry
        const fp = game.foundry.getPosition();
        game.player.position.set(fp.x, 0, fp.z);

        const result = game.interactWithFoundry();
        expect(result).toBe(true);

        // Foundry is now powered and bank is activated
        expect(game.isFoundryPowered()).toBe(true);
        expect(game.bank.isFoundryActivated()).toBe(true);
        expect(game.foundry.isPowered()).toBe(true);
        expect(game.hasFoundryPart()).toBe(false);

        // Activation audio
        expect(mockAudio.play).toHaveBeenCalledWith('generator_complete', expect.anything());
        expect(mockAudio.play).toHaveBeenCalledWith('ui_boot', expect.anything());

        // Events fired
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'foundry-power-restored'
        }));
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'open-fabrication-bay',
            detail: expect.objectContaining({ source: 'surface-foundry' })
        }));
    });

    // A light added mid-run changes the light count and recompiles every lit
    // shader (a multi-second stall on D3D11): the lock and its core add none.
    it('lights nothing new: the Foundry keeps one light and the core has none', () => {
        const game = createMockGame();
        game.revealFoundry({ instant: true });
        let lights = 0;
        game.scene.traverse((object) => { if (object.isLight) lights += 1; });
        expect(lights).toBe(1);
        expect(game._foundryPartMarker).toBeTruthy();
    });

    // Squad progress carries bank.foundryActivated, so a squadmate's install
    // powers this machine and retires the core here too.
    it("powers up when a squadmate installs the core", () => {
        const game = createMockGame();
        game.revealFoundry({ instant: true });
        expect(game._foundryPartMarker).toBeTruthy();
        game.bank.setFoundryActivated(true);
        game.updateFoundryPart(0.016);
        expect(game.foundry.isPowered()).toBe(true);
        expect(game._foundryPartMarker).toBeNull();
        expect(game._foundryPartActive).toBe(false);
        expect(game.explorationTracker.getLandmarks().find((l) => l.id === 'foundry_part')).toBeUndefined();
    });
});
