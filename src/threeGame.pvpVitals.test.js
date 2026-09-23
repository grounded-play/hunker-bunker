import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { createFatigueState } from './fatigue.js';

// GAP-PV-01: the first Steam Deck PvP session entered at 2 hearts because
// campaign fatigue (and a missing hull upgrade) carried into the duel.
beforeEach(() => vi.stubGlobal('window', {}));
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
        ensureO2BubbleVisualState: vi.fn()
    };
    game.syncPersistentUpgrades = ThreeGame.prototype.syncPersistentUpgrades;
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
});
