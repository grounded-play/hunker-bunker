/**
 * Sector 0: Impact Zone (Gated Interactive Onboarding Preamble)
 * Replaces old passive text timeouts with an authored, sequential micro-slice.
 *
 * Implements the 5-phase progressive onboarding pipeline:
 * Phase 1: Reboot & Diagnostics (WASD Locomotion)
 * Phase 2: Weapon Acquisition & Destructible Barrier (Aim & Shoot)
 * Phase 3: Economy & Survival (Magnet Salvage & Terminal Banking)
 * Phase 4: Proving Ground Threat (Safe Single-Enemy Combat Stagger)
 * Phase 5: Blast Gate Clearance (Transition into Procedural Maze)
 */

export const SECTOR_ZERO_PHASES = Object.freeze({
    BOOT: 'phase_1_boot',
    WEAPON: 'phase_2_weapon',
    SALVAGE: 'phase_3_salvage',
    COMBAT: 'phase_4_combat',
    DEPARTURE: 'phase_5_departure',
    COMPLETE: 'phase_complete'
});

export const SECTOR_ZERO_OBJECTIVES = Object.freeze({
    [SECTOR_ZERO_PHASES.BOOT]: {
        id: 'sector0:boot',
        label: 'DIAGNOSTICS: STAND & MOVE',
        target: 1,
        hint: 'Use WASD or Left Stick to calibrate motor servos'
    },
    [SECTOR_ZERO_PHASES.WEAPON]: {
        id: 'sector0:weapon',
        label: 'SECURITY: ARM & CLEAR OBSTACLE',
        target: 1,
        hint: 'Equip sidearm and shoot jammed hydraulic cable'
    },
    [SECTOR_ZERO_PHASES.SALVAGE]: {
        id: 'sector0:salvage',
        label: 'LIFE SUPPORT: RECOVER & BANK SALVAGE',
        target: 1,
        hint: 'Collect salvage cache and deposit at console to restore O₂'
    },
    [SECTOR_ZERO_PHASES.COMBAT]: {
        id: 'sector0:combat',
        label: 'PROVING GROUND: NEUTRALIZE THREAT',
        target: 1,
        hint: 'Aim and fire to crack hostiles carapace'
    },
    [SECTOR_ZERO_PHASES.DEPARTURE]: {
        id: 'sector0:departure',
        label: 'SECTOR 9: PROCEED PAST BLAST GATE',
        target: 1,
        hint: 'Perimeter verified. Gate 9 opened to deep crust'
    }
});

export class SectorZeroTutorialManager {
    constructor({ game = null, onPhaseChange = null, onComplete = null } = {}) {
        this.game = game;
        this.onPhaseChange = onPhaseChange;
        this.onComplete = onComplete;
        this._resetState();
    }

    _resetState() {
        this.currentPhase = SECTOR_ZERO_PHASES.BOOT;
        this.isActive = false;
        this.phaseProgress = 0;
        this.unlockedDoors = new Set();
        this.flags = {
            hasMoved: false,
            hasEquippedWeapon: false,
            hasClearedBarrier: false,
            hasCollectedSalvage: false,
            hasBankedConsole: false,
            hasDefeatedSnail: false,
            hasPassedGate: false
        };
    }

    start() {
        // A manager may survive a redeploy. Tutorial state may not.
        this._resetState();
        this.isActive = true;
        this._syncObjective(this.currentPhase);
        this.onPhaseChange?.(this.currentPhase);
        return this.currentPhase;
    }

    getCurrentPhase() {
        return this.currentPhase;
    }

    getObjectiveInfo() {
        return SECTOR_ZERO_OBJECTIVES[this.currentPhase] ?? null;
    }

    /**
     * Notify event from game simulation.
     */
    handleEvent(eventName, payload = {}) {
        if (!this.isActive || this.currentPhase === SECTOR_ZERO_PHASES.COMPLETE) {
            return false;
        }

        switch (this.currentPhase) {
            case SECTOR_ZERO_PHASES.BOOT:
                if (eventName === 'player-moved' && (payload.distance >= 3.0 || payload.movedMs >= 2000)) {
                    this.flags.hasMoved = true;
                    return this._advancePhase(SECTOR_ZERO_PHASES.WEAPON);
                }
                break;

            case SECTOR_ZERO_PHASES.WEAPON:
                if (eventName === 'weapon-equipped') {
                    this.flags.hasEquippedWeapon = true;
                }
                if (this.flags.hasEquippedWeapon
                    && (eventName === 'barrier-shot'
                        || (eventName === 'obstacle-destroyed' && payload.obstacleId === 'jammed_hydraulic_cable'))) {
                    this.flags.hasClearedBarrier = true;
                    this.unlockedDoors.add('airlock_door_1');
                    return this._advancePhase(SECTOR_ZERO_PHASES.SALVAGE);
                }
                break;

            case SECTOR_ZERO_PHASES.SALVAGE:
                if (eventName === 'salvage-collected') {
                    this.flags.hasCollectedSalvage = true;
                }
                if (eventName === 'console-deposited' && (this.flags.hasCollectedSalvage || (payload.scrap ?? payload.amount ?? 0) >= 10)) {
                    this.flags.hasBankedConsole = true;
                    this.unlockedDoors.add('salvage_bay_door');
                    return this._advancePhase(SECTOR_ZERO_PHASES.COMBAT);
                }
                break;

            case SECTOR_ZERO_PHASES.COMBAT:
                if ((eventName === 'enemy-killed' || (eventName === 'enemy-hit' && payload.hpRemaining <= 0))
                    && ['alien_proto_crawler', 'tutorial_crawler'].includes(payload.enemyType ?? payload.type)) {
                    this.flags.hasDefeatedSnail = true;
                    this.unlockedDoors.add('perimeter_blast_gate');
                    return this._advancePhase(SECTOR_ZERO_PHASES.DEPARTURE);
                }
                break;

            case SECTOR_ZERO_PHASES.DEPARTURE:
                if (eventName === 'gate-crossed' || eventName === 'entered-procedural-sector') {
                    this.flags.hasPassedGate = true;
                    this._advancePhase(SECTOR_ZERO_PHASES.COMPLETE);
                    this.isActive = false;
                    this.onComplete?.();
                    return true;
                }
                break;
        }

        return false;
    }

    _advancePhase(nextPhase) {
        this._resolveCurrentObjective();
        this.currentPhase = nextPhase;
        this.phaseProgress = 0;
        this._syncObjective(nextPhase);
        this.onPhaseChange?.(nextPhase);
        return true;
    }

    _syncObjective(phase) {
        const obj = SECTOR_ZERO_OBJECTIVES[phase];
        if (!obj) return;
        if (typeof window !== 'undefined' && window.objectiveRegistry?.trackObjective) {
            window.objectiveRegistry.trackObjective({
                id: obj.id,
                source: 'sector0',
                label: obj.label,
                current: 0,
                target: obj.target,
                priority: 95
            });
        }
    }

    _resolveCurrentObjective() {
        const obj = SECTOR_ZERO_OBJECTIVES[this.currentPhase];
        if (!obj) return;
        if (typeof window !== 'undefined' && window.objectiveRegistry?.resolveObjective) {
            window.objectiveRegistry.resolveObjective(obj.id, 'complete');
        }
    }

    isDoorUnlocked(doorId) {
        return this.unlockedDoors.has(doorId);
    }
}
