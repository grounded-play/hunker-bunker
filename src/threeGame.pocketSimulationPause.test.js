import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// Regression coverage for the pocket simulation-bleed bug (docs/superpowers
// /specs/2026-07-27-wfc-tile-maze-generation-design.md, Phase 2 §1):
// surface-only systems (enemy AI, hazards, prompts) used to keep running
// unconditionally in render()'s per-frame dispatch even while the player
// was in a pocket, because enterPocket only ever changes player.position.y
// — X/Z stay identical to the hole's surface coordinates — and almost
// nothing else in the file checks isInPocket.

const SURFACE_ONLY_METHODS = [
    'updateBunkerBlastDoor', 'updateBiomeEnvironment', 'updateWeather', 'updateDayNightCycle',
    'updateTerminalClockTick', 'updatePickups', 'updateScatter', 'updateCorpses', 'updateLoreDrops',
    'updateBuildSiteBeacon', 'updateConsoles', 'updateLoreTerminals', 'updateFoundryPrompt',
    'updateCaveEntrance', 'updateAct2', 'updateCamps', 'updateHiveSites', 'updateInfectionPressure',
    'updateHazardZoneDamage', 'updateCampQuest', 'updateShipVisualState', 'updateBlackBoxMarker',
    'updateRunModifierEffects', 'updateBunkerDirector'
];

const ALWAYS_ON_METHODS = [
    'updateSprintState', 'updateTankRegen', 'updateEngineerTurret', 'updateRadarScans', 'updatePlayer', 'updateWeaponState', 'updateProjectiles',
    'updateCamera', 'syncVisibleChunks', 'updateCompanions', 'updateTransientEffects',
    'updateHiddenPlayerMarker', 'updateVitals', 'updateO2StartupSequence', 'updateLoopStep'
];

function makeFakeGame(isInPocket) {
    const game = {
        performanceProfile: 'gameplay',
        lastTime: 0,
        hitstopTimer: 0,
        loadingPaused: false,
        isInPocket,
        hasBlockingGameplayOverlay: () => false,
        renderer: { render: vi.fn() },
        scene: {},
        camera: {},
        baseLights: { update: vi.fn() },
        foundry: { update: vi.fn() },
        updatePocketContent: vi.fn()
    };
    for (const name of [...SURFACE_ONLY_METHODS, ...ALWAYS_ON_METHODS]) {
        game[name] = vi.fn();
    }
    return game;
}

describe('render() — pocket simulation pause', () => {
    it('never calls surface-only systems while isInPocket, and calls updatePocketContent instead', () => {
        const game = makeFakeGame(true);
        ThreeGame.prototype.render.call(game);

        for (const name of SURFACE_ONLY_METHODS) {
            expect(game[name], name).not.toHaveBeenCalled();
        }
        expect(game.updatePocketContent).toHaveBeenCalled();
        for (const name of ALWAYS_ON_METHODS) {
            expect(game[name], name).toHaveBeenCalled();
        }
    });

    it('calls every surface-only system as normal when not in a pocket', () => {
        const game = makeFakeGame(false);
        ThreeGame.prototype.render.call(game);

        for (const name of SURFACE_ONLY_METHODS) {
            expect(game[name], name).toHaveBeenCalled();
        }
        expect(game.updatePocketContent).not.toHaveBeenCalled();
        for (const name of ALWAYS_ON_METHODS) {
            expect(game[name], name).toHaveBeenCalled();
        }
    });
});
