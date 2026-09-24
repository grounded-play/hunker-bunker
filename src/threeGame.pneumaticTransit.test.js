import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { createTransitNetwork, unlockTransitTerminal, DEFAULT_SANCTUARY_COORDS } from './pneumaticTransit.js';

describe('ThreeGame: Pneumatic Transit Integration (Phase 4)', () => {
    function createMockGame({ inCombat = false, enemies = [], playerPos = { x: 38, y: 0, z: -14 } } = {}) {
        const game = {
            player: { position: new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z) },
            transitNetwork: createTransitNetwork(),
            inCombat,
            enemies,
            showBunkerLine: vi.fn(),
            playThrottledUiError: vi.fn(),
            isGameplayInputActive: () => true,
            activeInteractiveConsole: null,
            activeInteractiveO2Generator: null,
            activeInteractiveBaseTurret: null,
            foundry: null,
            _blackBoxMarkerActive: false,
            _blackBoxState: null,
            activeRewardCache: null,
            playerType: 'SCOUT',
            currentDepthTier: 1
        };
        return game;
    }

    it('surfaces transit terminal in priority interaction candidates when unlocked and player is in range', () => {
        const game = createMockGame();
        unlockTransitTerminal(game.transitNetwork, 'cybersnail');

        const candidates = ThreeGame.prototype.getPriorityInteractionCandidates.call(game);
        const transitCandidate = candidates.find((c) => c.id === 'transit_cybersnail_arena');
        expect(transitCandidate).toBeDefined();
        expect(transitCandidate.label).toContain('SANCTUARY RETURN');
        expect(transitCandidate.distance).toBeCloseTo(0);
    });

    it('shows transit lockdown in candidate label when hostiles are within combat radius', () => {
        const nearEnemy = [{ x: 39, z: -14, hp: 50, dead: false }];
        const game = createMockGame({ enemies: nearEnemy });
        unlockTransitTerminal(game.transitNetwork, 'cybersnail');

        const candidates = ThreeGame.prototype.getPriorityInteractionCandidates.call(game);
        const transitCandidate = candidates.find((c) => c.id === 'transit_cybersnail_arena');
        expect(transitCandidate).toBeDefined();
        expect(transitCandidate.label).toContain('TRANSIT LOCKDOWN');
        expect(transitCandidate.label).toContain('[F LOCKED]');
    });

    it('executes transit and teleports player to Crashed Ship Sanctuary when safe', () => {
        const game = createMockGame();
        unlockTransitTerminal(game.transitNetwork, 'cybersnail');

        const originalWindow = globalThis.window;
        const originalCustomEvent = globalThis.CustomEvent;
        globalThis.window = { dispatchEvent: vi.fn() };
        globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init?.detail; } };

        try {
            const success = ThreeGame.prototype.interactWithTransitTerminal.call(game, 'transit_cybersnail_arena');
            expect(success).toBe(true);
            expect(game.player.position.x).toBe(DEFAULT_SANCTUARY_COORDS.x);
            expect(game.player.position.z).toBe(DEFAULT_SANCTUARY_COORDS.z);
            expect(game.showBunkerLine).toHaveBeenCalledWith(expect.stringContaining('RETURNED TO CRASHED SHIP SANCTUARY'));
            expect(globalThis.window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'transit-executed' }));
        } finally {
            globalThis.window = originalWindow;
            globalThis.CustomEvent = originalCustomEvent;
        }
    });

    it('blocks transit and plays error sound if hostiles are engaged within 12m', () => {
        const nearEnemy = [{ x: 40, z: -14, hp: 50, dead: false }];
        const game = createMockGame({ enemies: nearEnemy });
        unlockTransitTerminal(game.transitNetwork, 'cybersnail');

        const success = ThreeGame.prototype.interactWithTransitTerminal.call(game, 'transit_cybersnail_arena');
        expect(success).toBe(false);
        expect(game.player.position.x).toBe(38); // Did not teleport
        expect(game.playThrottledUiError).toHaveBeenCalled();
        expect(game.showBunkerLine).toHaveBeenCalledWith(expect.stringContaining('TRANSIT LOCKDOWN'));
    });

    it('dynamically binds transit terminal position to procedural boss arena coordinates when unlocked', () => {
        const game = createMockGame({ playerPos: { x: 142.5, y: 0, z: -98.2 } });
        const proceduralArenaPos = { x: 142.5, y: 0, z: -98.2 };

        const unlocked = unlockTransitTerminal(game.transitNetwork, 'cybersnail', { position: proceduralArenaPos });
        expect(unlocked).toBeDefined();
        expect(unlocked.position.x).toBe(142.5);
        expect(unlocked.position.z).toBe(-98.2);

        // Player standing at the procedural arena can immediately interact
        const candidates = ThreeGame.prototype.getPriorityInteractionCandidates.call(game);
        const candidate = candidates.find((c) => c.id === 'transit_cybersnail_arena');
        expect(candidate).toBeDefined();
        expect(candidate.distance).toBeCloseTo(0);
    });
});
