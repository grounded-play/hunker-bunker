import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

describe('overlapping interaction target selection', () => {
    function gameWithOverlap() {
        return {
            player: { position: new THREE.Vector3(9, 0, 5) },
            activeInteractiveConsole: { tileX: 9, tileZ: 5, consoleOffset: { x: 0, z: 0 } },
            activeInteractiveO2Generator: null,
            activeInteractiveBaseTurret: null,
            foundry: null,
            _blackBoxMarkerActive: true,
            _blackBoxState: { x: 9.2, z: 5 },
            getActiveO2GeneratorPosition: vi.fn(),
            interactWithConsole: vi.fn(() => true),
            interactWithO2Generator: vi.fn(() => true),
            interactWithBaseTurret: vi.fn(() => true),
            interactWithFoundry: vi.fn(),
            interactWithBlackBox: vi.fn(() => true)
        };
    }

    it('keeps the optional black box behind the primary station regardless of distance', () => {
        const game = gameWithOverlap();
        const candidates = ThreeGame.prototype.getPriorityInteractionCandidates.call(game);
        expect(candidates.map((candidate) => candidate.id)).toEqual(['ship-console', 'black-box']);
        expect(candidates[1].secondary).toBe(true);
    });

    it('cycles deterministically and announces the selected target', () => {
        const game = gameWithOverlap();
        game.getPriorityInteractionCandidates = () => ThreeGame.prototype.getPriorityInteractionCandidates.call(game);
        game.showBunkerLine = vi.fn();
        const originalWindow = globalThis.window;
        const originalCustomEvent = globalThis.CustomEvent;
        globalThis.window = { dispatchEvent: vi.fn() };
        globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init?.detail; } };
        try {
            expect(ThreeGame.prototype.cycleInteractionTarget.call(game)).toBe(true);
            expect(game._interactionTargetIndex).toBe(1);
            expect(game.showBunkerLine).toHaveBeenCalledWith(expect.stringContaining('BLACK BOX (OPTIONAL)'));
        } finally {
            globalThis.window = originalWindow;
            globalThis.CustomEvent = originalCustomEvent;
        }
    });

    it('activates only one fallback interaction per press', () => {
        const first = vi.fn(() => true);
        const second = vi.fn(() => true);
        const game = {
            isGameplayInputActive: () => true,
            interactWithMayorTina: () => false,
            getPriorityInteractionCandidates: () => [],
            interactWithBunkerBlastDoorButton: () => false,
            interactWithProceduralDoor: () => false,
            interactWithMazeAccessSource: () => false,
            interactWithLoreTerminal: first,
            interactWithCaveEntrance: second,
            interactWithAct2Camp: vi.fn(), interactWithScientist: vi.fn(),
            interactWithHiveSite: vi.fn(), interactWithCampQuestObject: vi.fn(),
            interactWithWanderer: vi.fn(), interactWithHoleTile: vi.fn(),
            interactWithPocketClimbPoint: vi.fn(), interactWithBiomechanicalDoor: vi.fn(),
            playThrottledUiError: vi.fn()
        };
        ThreeGame.prototype.triggerGameplayInteract.call(game);
        expect(first).toHaveBeenCalledOnce();
        expect(second).not.toHaveBeenCalled();
    });

    // Session 2026-10-06 (solo, Deck): the camp showed "SETTLE SURVIVOR" but
    // every press re-opened the lore terminal beside it, whose modal then took
    // input before the camp check ran. A terminal you have read yields.
    describe('a read lore terminal does not shadow the camp', () => {
        const fallbackGame = ({ lore, camp }) => ({
            isGameplayInputActive: () => true,
            interactWithMayorTina: () => false,
            getPriorityInteractionCandidates: () => [],
            interactWithBunkerBlastDoorButton: () => false,
            interactWithProceduralDoor: () => false,
            interactWithMazeAccessSource: () => false,
            interactWithLoreTerminal: lore,
            interactWithCaveEntrance: () => false,
            interactWithAct2Camp: camp,
            interactWithBunkerCot: () => false, interactWithScientist: () => false,
            interactWithHiveSite: () => false, interactWithCampQuestObject: () => false,
            interactWithWanderer: () => false, interactWithHoleTile: () => false,
            interactWithPocketClimbPoint: () => false, interactWithBiomechanicalDoor: () => false,
            interactWithCustomBiomechProp: () => false,
            playThrottledUiError: vi.fn()
        });

        it('settles at the camp instead of re-opening a terminal already read', () => {
            const lore = vi.fn(({ unreadOnly } = {}) => !unreadOnly);
            const camp = vi.fn(() => true);
            ThreeGame.prototype.triggerGameplayInteract.call(fallbackGame({ lore, camp }));
            expect(camp).toHaveBeenCalledOnce();
            expect(lore).toHaveBeenCalledTimes(1);
            expect(lore).toHaveBeenCalledWith({ unreadOnly: true });
        });

        it('still reads an unread terminal first, and re-reads one when nothing else is there', () => {
            const unread = vi.fn(() => true);
            const camp = vi.fn(() => true);
            ThreeGame.prototype.triggerGameplayInteract.call(fallbackGame({ lore: unread, camp }));
            expect(camp).not.toHaveBeenCalled();

            const reread = vi.fn(({ unreadOnly } = {}) => !unreadOnly);
            ThreeGame.prototype.triggerGameplayInteract.call(fallbackGame({ lore: reread, camp: () => false }));
            expect(reread).toHaveBeenLastCalledWith({ unreadOnly: false });
        });

        it('reports whether the terminal opened', () => {
            const sprite = { userData: { type: 'lore_terminal', loreKey: 'drop_ration_ledger', loreText: '' }, position: new THREE.Vector3(0, 0, 0) };
            const game = {
                isGameplayInputActive: () => true,
                player: { position: new THREE.Vector3(1, 0, 0) },
                scatterSprites: [sprite],
                _readLoreKeys: new Set(['drop_ration_ledger'])
            };
            const originalWindow = globalThis.window;
            globalThis.window = { dispatchEvent: vi.fn(), AudioManager: null };
            try {
                expect(ThreeGame.prototype.interactWithLoreTerminal.call(game, { unreadOnly: true })).toBe(false);
                expect(ThreeGame.prototype.interactWithLoreTerminal.call(game)).toBe(true);
            } finally {
                globalThis.window = originalWindow;
            }
        });
    });
});
