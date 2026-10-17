import { describe, expect, it, vi } from 'vitest';
import {
    SECTOR_ZERO_OBJECTIVES,
    SECTOR_ZERO_PHASES,
    SectorZeroTutorialManager
} from './sectorZeroTutorial.js';

describe('SectorZeroTutorialManager', () => {
    it('initializes and starts at Phase 1 (BOOT)', () => {
        const onPhaseChange = vi.fn();
        const manager = new SectorZeroTutorialManager({ onPhaseChange });
        manager.start();

        expect(manager.getCurrentPhase()).toBe(SECTOR_ZERO_PHASES.BOOT);
        expect(manager.isActive).toBe(true);
        expect(onPhaseChange).toHaveBeenCalledWith(SECTOR_ZERO_PHASES.BOOT);
        expect(manager.getObjectiveInfo().label).toContain('STAND & MOVE');
    });

    it('advances through Phase 1 upon moving', () => {
        const manager = new SectorZeroTutorialManager();
        manager.start();

        // Not enough movement
        expect(manager.handleEvent('player-moved', { distance: 1.0, movedMs: 500 })).toBe(false);
        expect(manager.getCurrentPhase()).toBe(SECTOR_ZERO_PHASES.BOOT);

        // Sufficient movement
        expect(manager.handleEvent('player-moved', { distance: 3.5, movedMs: 2200 })).toBe(true);
        expect(manager.getCurrentPhase()).toBe(SECTOR_ZERO_PHASES.WEAPON);
    });

    it('advances through Phase 2 upon equipping sidearm and clearing barrier', () => {
        const manager = new SectorZeroTutorialManager();
        manager.start();
        manager.handleEvent('player-moved', { distance: 3.5 });

        // Barrier cannot be shot before weapon is equipped
        manager.handleEvent('barrier-shot', {});
        expect(manager.getCurrentPhase()).toBe(SECTOR_ZERO_PHASES.WEAPON);

        // Equip weapon
        manager.handleEvent('weapon-equipped', {});
        expect(manager.flags.hasEquippedWeapon).toBe(true);

        // Shoot barrier
        expect(manager.handleEvent('barrier-shot', {})).toBe(true);
        expect(manager.getCurrentPhase()).toBe(SECTOR_ZERO_PHASES.SALVAGE);
        expect(manager.isDoorUnlocked('airlock_door_1')).toBe(true);
    });

    it('advances through Phase 3 upon collecting salvage and banking at console', () => {
        const manager = new SectorZeroTutorialManager();
        manager.start();
        manager.handleEvent('player-moved', { distance: 3.5 });
        manager.handleEvent('weapon-equipped', {});
        manager.handleEvent('barrier-shot', {});

        // Deposit fails before collecting
        manager.handleEvent('console-deposited', { scrap: 0 });
        expect(manager.getCurrentPhase()).toBe(SECTOR_ZERO_PHASES.SALVAGE);

        // Collect salvage then bank
        manager.handleEvent('salvage-collected', { scrap: 15 });
        expect(manager.handleEvent('console-deposited', { scrap: 15 })).toBe(true);
        expect(manager.getCurrentPhase()).toBe(SECTOR_ZERO_PHASES.COMBAT);
        expect(manager.isDoorUnlocked('salvage_bay_door')).toBe(true);
    });

    it('advances through Phase 4 upon eliminating the tutorial enemy', () => {
        const manager = new SectorZeroTutorialManager();
        manager.start();
        manager.handleEvent('player-moved', { distance: 3.5 });
        manager.handleEvent('weapon-equipped', {});
        manager.handleEvent('barrier-shot', {});
        manager.handleEvent('salvage-collected', {});
        manager.handleEvent('console-deposited', {});

        expect(manager.handleEvent('enemy-killed', { enemyType: 'alien_proto_crawler' })).toBe(true);
        expect(manager.getCurrentPhase()).toBe(SECTOR_ZERO_PHASES.DEPARTURE);
        expect(manager.isDoorUnlocked('perimeter_blast_gate')).toBe(true);
    });

    it('completes tutorial on departure gate crossing', () => {
        const onComplete = vi.fn();
        const manager = new SectorZeroTutorialManager({ onComplete });
        manager.start();
        manager.handleEvent('player-moved', { distance: 3.5 });
        manager.handleEvent('weapon-equipped', {});
        manager.handleEvent('barrier-shot', {});
        manager.handleEvent('salvage-collected', {});
        manager.handleEvent('console-deposited', {});
        manager.handleEvent('enemy-killed', { enemyType: 'alien_proto_crawler' });

        expect(manager.handleEvent('gate-crossed', {})).toBe(true);
        expect(manager.getCurrentPhase()).toBe(SECTOR_ZERO_PHASES.COMPLETE);
        expect(manager.isActive).toBe(false);
        expect(onComplete).toHaveBeenCalled();
    });

    it('exposes objective information for every authored phase', () => {
        for (const phase of Object.values(SECTOR_ZERO_PHASES)) {
            if (phase === SECTOR_ZERO_PHASES.COMPLETE) continue;
            expect(SECTOR_ZERO_OBJECTIVES[phase]).toBeDefined();
            expect(SECTOR_ZERO_OBJECTIVES[phase].label).toBeTruthy();
            expect(SECTOR_ZERO_OBJECTIVES[phase].hint).toBeTruthy();
        }
    });

    it('does not let unrelated world events bypass authored gates', () => {
        const manager = new SectorZeroTutorialManager();
        manager.start();
        manager.handleEvent('player-moved', { distance: 3.5 });
        expect(manager.handleEvent('obstacle-destroyed', { obstacleId: 'random_crate' })).toBe(false);
        manager.handleEvent('weapon-equipped');
        expect(manager.handleEvent('obstacle-destroyed', { obstacleId: 'random_crate' })).toBe(false);
        expect(manager.handleEvent('obstacle-destroyed', { obstacleId: 'jammed_hydraulic_cable' })).toBe(true);
        manager.handleEvent('salvage-collected');
        manager.handleEvent('console-deposited');
        expect(manager.handleEvent('enemy-killed', { enemyType: 'cybersnail' })).toBe(false);
        expect(manager.handleEvent('enemy-killed', { enemyType: 'tutorial_crawler' })).toBe(true);
    });

    it('resets completion flags and unlocked doors when restarted', () => {
        const manager = new SectorZeroTutorialManager();
        manager.start();
        manager.handleEvent('player-moved', { distance: 3.5 });
        manager.handleEvent('weapon-equipped');
        manager.handleEvent('barrier-shot');
        expect(manager.isDoorUnlocked('airlock_door_1')).toBe(true);
        manager.start();
        expect(manager.getCurrentPhase()).toBe(SECTOR_ZERO_PHASES.BOOT);
        expect(manager.flags.hasEquippedWeapon).toBe(false);
        expect(manager.isDoorUnlocked('airlock_door_1')).toBe(false);
    });
});
