import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { createFatigueState } from './fatigue.js';
import { blackBoxStore } from './blackBox.js';

// GAP-PV-01: the first Steam Deck PvP session entered at 2 hearts because
// campaign fatigue (and a missing hull upgrade) carried into the duel.
beforeEach(() => {
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    if (typeof globalThis.CustomEvent === 'undefined') {
        globalThis.CustomEvent = class CustomEvent {
            constructor(type, init = {}) {
                this.type = type;
                this.detail = init.detail;
            }
        };
    }
});
afterEach(() => vi.unstubAllGlobals());

function operator({ hullLevel = 0, fatigued = false, playerType = 'SCOUT', plating = false } = {}) {
    const fatigueState = createFatigueState();
    if (fatigued) fatigueState.expeditionsSinceSleep = 4;
    const game = {
        playerType,
        fatigueState,
        playerVitals: { hp: 99, maxHp: 99 },
        loadoutMods: { maxHealthBonus: 1 },
        bank: {
            getUnlocks: () => ({}),
            getO2GeneratorLevel: () => 0,
            getState: () => ({ hullExpansionLevel: hullLevel }),
            isSkillUnlocked: () => plating
        },
        applyWeaponUpgrades: vi.fn(),
        updatePlayerUpgradeVisuals: vi.fn(),
        updateGoalModuleVisualState: vi.fn(),
        ensureO2BubbleVisualState: vi.fn(),
        emitVitalsState: vi.fn()
    };
    game.syncPersistentUpgrades = ThreeGame.prototype.syncPersistentUpgrades;
    game.setupMultiplayerNetwork = ThreeGame.prototype.setupMultiplayerNetwork;
    return game;
}

describe('PvP hearts are the same for every operator', () => {
    it('ignores fatigue, hull, class plating and equipment in PvP', () => {
        const worn = operator({ fatigued: true });
        const kitted = operator({ hullLevel: 2, playerType: 'TANK', plating: true });
        for (const game of [worn, kitted]) {
            game.isMultiplayer = true;
            game.multiplayerMode = 'pvp';
            game.syncPersistentUpgrades();
        }
        expect(worn.playerVitals.maxHp).toBe(4);
        expect(kitted.playerVitals.maxHp).toBe(4);
    });

    it('keeps the campaign rules everywhere else', () => {
        const worn = operator({ fatigued: true });
        worn.syncPersistentUpgrades();
        expect(worn.playerVitals.maxHp).toBe(3); // 3 base + 1 equipment - 1 long-dark fatigue
        const squad = operator({ fatigued: true });
        squad.isMultiplayer = true;
        squad.multiplayerMode = 'coop';
        squad.syncPersistentUpgrades();
        expect(squad.playerVitals.maxHp).toBe(3);
    });

    it('restores fresh full 4 hearts when joining PvP regardless of prior solo damage', () => {
        const damaged = operator({ fatigued: true });
        damaged.playerVitals.hp = 1;
        damaged.setupMultiplayerNetwork({ mode: 'pvp' });
        expect(damaged.playerVitals.maxHp).toBe(4);
        expect(damaged.playerVitals.hp).toBe(4);
    });

    it('clears missions and run modifiers on PvP entry (GAP-PV-05)', () => {
        const game = operator();
        game.currentRunModifier = { id: 'camp_paranoia', cards: [{ key: 'camp_paranoia' }] };
        const setRunCards = vi.fn();
        game.bunkerDirector = { setRunCards };
        game.clearMission = vi.fn();
        game.setupMultiplayerNetwork({ mode: 'pvp' });
        expect(game.currentRunModifier).toBeNull();
        expect(setRunCards).toHaveBeenCalledWith({ seed: 'default', cards: [], effects: {} });
        expect(game.clearMission).toHaveBeenCalled();
    });
});

describe('PvP spawn protection and death rules', () => {
    it('blocks damage while spawn invulnerability timer is active', () => {
        const game = {
            isPlayerDead: false,
            isPlayerDowned: false,
            performanceProfile: 'gameplay',
            godMode: false,
            noclip: false,
            cinematicLock: false,
            isInPocket: false,
            iFrameTimer: 0,
            spawnInvulnerabilityTimer: 2.5
        };
        const damaged = ThreeGame.prototype.takeDamage.call(game, 1, 'pvp-rival');
        expect(damaged).toBe(false);
    });

    it('does not record a black box on PvP death', () => {
        const recordSpy = vi.spyOn(blackBoxStore, 'recordDeath');
        const game = {
            isMultiplayer: true,
            multiplayerMode: 'pvp',
            playerType: 'TANK',
            maxDepthTierReached: 0,
            getSessionInventory: () => ({ weapon: 0, coin: 0, health: 0 }),
            getDepthTierName: () => 'SURFACE',
            closeConsoleModal: vi.fn(),
            clearBlackBoxMarker: vi.fn(),
            showBunkerLine: vi.fn(),
            buildLineDirectorContext: () => ({ register: {} })
        };
        ThreeGame.prototype.handleDeath.call(game, 'pvp-rival');
        expect(recordSpy).not.toHaveBeenCalled();
        recordSpy.mockRestore();
    });
});

describe('Bunker blast door sequence and debounce', () => {
    it('increments sequence on local toggle and attaches it to broadcast event', () => {
        const broadcasts = [];
        const game = {
            bunkerBlastDoorState: { open: false, targetY: 1.4 },
            isMultiplayer: true,
            spawnTextureBurstEffect: vi.fn(),
            broadcastSharedWorldEvent: (event, payload) => broadcasts.push({ event, payload })
        };
        ThreeGame.prototype.toggleBunkerBlastDoor.call(game);
        expect(game._bunkerBlastDoorSequence).toBe(1);
        expect(broadcasts).toHaveLength(1);
        expect(broadcasts[0].payload.seq).toBe(1);
        expect(broadcasts[0].payload.open).toBe(true);
    });

    it('rejects stale out-of-order remote door events', () => {
        const toggles = [];
        const game = {
            _bunkerBlastDoorSequence: 3,
            _appliedWorldEvents: new Set(),
            bunkerBlastDoorState: { open: true },
            toggleBunkerBlastDoor: (opts) => toggles.push(opts)
        };
        const accepted = ThreeGame.prototype.handleSharedWorldEvent.call(game, {
            event: 'bunker-door-toggled',
            detail: { seq: 2, open: false }
        });
        expect(accepted).toBe(false);
        expect(toggles).toHaveLength(0);
    });
});
