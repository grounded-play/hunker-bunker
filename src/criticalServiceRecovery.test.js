import { describe, expect, it, vi } from 'vitest';
import {
    CRITICAL_SERVICE_TYPES,
    isCriticalService,
    getCriticalServiceDescriptor,
    createCriticalServiceWreck,
    registerCriticalServiceWreck,
    handleCriticalServiceDestruction,
    serializeCriticalServiceWrecks,
    restoreCriticalServiceWrecks
} from './criticalServiceRecovery.js';
import { findNearestInteractableProp, interactWithCustomProp } from './propInteractions.js';
import { ThreeGame } from './threeGame.js';

describe('criticalServiceRecovery', () => {
    it('accurately identifies critical services across explicit flags and standard types', () => {
        expect(isCriticalService({ userData: { isCriticalService: true } })).toBe(true);
        expect(isCriticalService({ userData: { isCampService: true } })).toBe(true);
        expect(isCriticalService({ userData: { isQuestCritical: true } })).toBe(true);
        expect(isCriticalService({ userData: { type: CRITICAL_SERVICE_TYPES.LORE_TERMINAL } })).toBe(true);
        expect(isCriticalService({ userData: { type: CRITICAL_SERVICE_TYPES.CAMP_SALVAGE_CONSOLE } })).toBe(true);
        expect(isCriticalService({ userData: { type: 'prop_crate' } })).toBe(false);
        expect(isCriticalService(null)).toBe(false);
    });

    it('extracts descriptor preserving prompt, custom interact logic and metadata', () => {
        const customInteract = vi.fn(() => true);
        const sprite = {
            userData: {
                criticalService: {
                    serviceType: 'salvage_bank',
                    serviceId: 'camp:console:1',
                    label: 'Salvage Console',
                    prompt: '[E] BANK SALVAGE',
                    onInteract: customInteract,
                    questKey: 'main_quest_1'
                }
            }
        };

        const desc = getCriticalServiceDescriptor(sprite);
        expect(desc).toBeDefined();
        expect(desc.serviceType).toBe('salvage_bank');
        expect(desc.serviceId).toBe('camp:console:1');
        expect(desc.label).toBe('Salvage Console');
        expect(desc.wreckPrompt).toContain('SALVAGE DAMAGED BANK SALVAGE');
        expect(desc.onInteract).toBe(customInteract);
        expect(desc.questKey).toBe('main_quest_1');
    });

    it('creates an accessible non-blocking wreck with stable ID and preserved interaction', () => {
        const onInteractSpy = vi.fn(() => true);
        const originalProp = {
            position: { x: 12.5, y: 0, z: 8.5 },
            userData: {
                scatterKey: 'room_plan:terminal_primary',
                type: 'lore_terminal',
                criticalService: {
                    label: 'Mission Terminal',
                    prompt: '[E] DECRYPT MISSION TELEMETRY',
                    onInteract: onInteractSpy
                }
            }
        };

        const game = { showBunkerLine: vi.fn() };
        const wreck = createCriticalServiceWreck(game, originalProp);

        expect(wreck).toBeDefined();
        expect(wreck.position.x).toBe(12.5);
        expect(wreck.position.z).toBe(8.5);
        expect(wreck.userData.isCriticalServiceWreck).toBe(true);
        expect(wreck.userData.isSolidProp).toBe(false); // Non-blocking: accessible to player
        expect(wreck.userData.scatterKey).toBe('room_plan:terminal_primary:wreck');
        expect(wreck.userData.interactionSpec.canInteract).toBe(true);

        // Test interaction execution through wreck spec
        const result = wreck.userData.interactionSpec.onInteract(game, wreck);
        expect(result).toBe(true);
        expect(onInteractSpy).toHaveBeenCalledWith(game, wreck);

        const registered = registerCriticalServiceWreck(game, wreck);
        expect(registered).toBe(true);
        expect(game.scatterSprites).toContain(wreck);
        expect(game.criticalServiceWrecks.get('room_plan:terminal_primary:wreck')).toBeDefined();
    });

    it('directly invokes handleCriticalServiceDestruction for critical services and ignores non-critical props', () => {
        const game = { showBunkerLine: vi.fn(), scatterSprites: [], criticalServiceWrecks: new Map() };
        const nonCritical = { userData: { type: 'prop_crate' } };
        expect(handleCriticalServiceDestruction(game, nonCritical)).toBeNull();

        const critical = {
            position: { x: 3, y: 0, z: 4 },
            userData: {
                scatterKey: 'crit_1',
                isCriticalService: true,
                type: CRITICAL_SERVICE_TYPES.QUARANTINE_SEAL
            }
        };
        const wreck = handleCriticalServiceDestruction(game, critical);
        expect(wreck).toBeDefined();
        expect(wreck.userData.scatterKey).toBe('crit_1:wreck');
        expect(game.showBunkerLine).toHaveBeenCalledWith('SERVICE DAMAGED: EMERGENCY INTERFACE ACTIVE IN WRECKAGE.');
    });

    it('integrates with findNearestInteractableProp and interactWithCustomProp', () => {
        const interactSpy = vi.fn(() => true);
        const wreck = {
            position: { x: 5, y: 0.08, z: 5 },
            userData: {
                isScatter: true,
                isCriticalServiceWreck: true,
                scatterKey: 'service:wreck:1',
                interactionSpec: {
                    canInteract: true,
                    interactPrompt: '[E] SALVAGE DAMAGED DATA SLATE',
                    onInteract: interactSpy
                }
            }
        };

        const game = {
            player: { position: { x: 5.5, y: 0, z: 5 } },
            scatterSprites: [wreck]
        };

        const nearest = findNearestInteractableProp(game, 2.0);
        expect(nearest).toBeDefined();
        expect(nearest.sprite).toBe(wreck);
        expect(nearest.spec.interactPrompt).toBe('[E] SALVAGE DAMAGED DATA SLATE');

        const success = interactWithCustomProp(game, nearest);
        expect(success).toBe(true);
        expect(interactSpy).toHaveBeenCalledWith(game, wreck);
        expect(wreck.userData.hasBeenInteracted).toBe(true);
    });

    it('spawns an accessible wreck on prop break via ThreeGame.breakScatterProp', () => {
        const game = {
            scatterSprites: [],
            brokenPropScatterKeys: new Set(),
            criticalServiceWrecks: new Map(),
            spawnDestructiblePropDrops: vi.fn(),
            spawnGearPoofEffect: vi.fn(),
            showBunkerLine: vi.fn()
        };

        const originalService = {
            position: { x: 10, y: 0, z: 20 },
            userData: {
                isScatter: true,
                isDestructibleProp: true,
                scatterKey: 'camp_service:salvage_bank',
                isCriticalService: true,
                criticalService: {
                    serviceType: 'camp_salvage_console',
                    label: 'Camp Console',
                    prompt: '[E] ACCESS CONSOLE',
                    onInteract: vi.fn(() => true)
                }
            }
        };

        game.scatterSprites.push(originalService);

        const broken = ThreeGame.prototype.breakScatterProp.call(game, originalService);
        expect(broken).toBe(true);
        expect(originalService.userData.burstTriggered).toBe(true);
        expect(game.scatterSprites).not.toContain(originalService);

        // The surviving accessible wreck must now be in scatterSprites
        const survivingWreck = game.scatterSprites.find((s) => s.userData?.isCriticalServiceWreck);
        expect(survivingWreck).toBeDefined();
        expect(survivingWreck.userData.scatterKey).toBe('camp_service:salvage_bank:wreck');
        expect(survivingWreck.userData.isSolidProp).toBe(false);
        expect(survivingWreck.position.x).toBe(10);
        expect(survivingWreck.position.z).toBe(20);
        expect(game.criticalServiceWrecks.has('camp_service:salvage_bank:wreck')).toBe(true);
    });

    it('serializes and restores critical service wrecks across chunk/save cycles', () => {
        const game = {
            criticalServiceWrecks: new Map([
                ['camp_beacon:wreck', {
                    scatterKey: 'camp_beacon:wreck',
                    originalScatterKey: 'camp_beacon',
                    serviceType: 'objective_beacon',
                    serviceId: 'beacon_1',
                    x: 14,
                    z: 22,
                    interacted: true
                }]
            ]),
            scatterSprites: []
        };

        const serialized = serializeCriticalServiceWrecks(game);
        expect(serialized).toHaveLength(1);
        expect(serialized[0].serviceType).toBe('objective_beacon');

        const newGame = { scatterSprites: [], criticalServiceWrecks: new Map() };
        const restored = restoreCriticalServiceWrecks(newGame, serialized);

        expect(restored).toHaveLength(1);
        expect(restored[0].userData.scatterKey).toBe('camp_beacon:wreck');
        expect(restored[0].userData.hasBeenInteracted).toBe(true);
        expect(newGame.scatterSprites).toContain(restored[0]);
    });
});
