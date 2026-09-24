import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

beforeEach(() => {
    vi.stubGlobal('window', {
        dispatchEvent: () => true,
        objectiveRegistry: { getHistory: () => [], trackObjective: vi.fn(), resolveObjective: vi.fn() },
        AudioManager: { play: vi.fn() }
    });
});
afterEach(() => vi.unstubAllGlobals());

const METHODS = ['getDeathReportData', 'getExpeditionReportData', 'triggerCryoShatter'];

function game(overrides = {}) {
    const g = {
        isPlayerDead: true,
        _lastDeathReason: 'boss_cryosnail',
        crashedShips: [{ tileX: 9, tileZ: 11 }],
        _blackBoxState: { active: true, x: 39, z: 51, salvage: { tech: 3, coin: 1, med: 0 } },
        bank: { getState: () => ({ tech: 0, med: 0, coin: 0 }) },
        getCurrentPackageGoal: () => 'o2Bubble',
        getGoalBuildCost: () => ({ tech: 10, med: 5, coin: 5 }),
        runOverclocks: [{ id: 'cryo_rime' }],
        runRelics: [],
        _expeditionReportItems: [],
        scatterSprites: [],
        spawnPhysicalBurst: vi.fn(),
        applyPlayerDamageToEnemy: vi.fn(),
        ...overrides
    };
    for (const method of METHODS) g[method] = ThreeGame.prototype[method];
    return g;
}

describe('the death report in the runtime', () => {
    it('names the cause, the black box salvage and distance, and sends the player to recover it first', () => {
        const death = game().getDeathReportData();
        expect(death.cause).toEqual({ key: 'ui.death.cause.enemy', params: { enemyKey: 'ui.death.enemy.boss_cryosnail' } });
        expect(death.field).toEqual({ key: 'ui.death.field.black_box', params: { meters: 50 }, parts: [{ resource: 'tech', amount: 3 }, { resource: 'coin', amount: 1 }] });
        expect(death.next).toEqual({ key: 'ui.death.next.recover_black_box', params: { meters: 50 } });
    });

    it('points at an affordable ship goal when nothing waits in the field', () => {
        const g = game({ _blackBoxState: { active: true, x: 9, z: 11, salvage: {} }, bank: { getState: () => ({ tech: 10, med: 5, coin: 5 }) } });
        expect(g.getDeathReportData().next).toEqual({ key: 'ui.death.next.build_goal', params: { goalKey: 'ui.console_terminal.o2_generator_module' } });
    });

    it('has no death lines when the operator is alive (an extraction)', () => {
        expect(game({ isPlayerDead: false }).getDeathReportData()).toBeNull();
        expect(game({ isPlayerDead: false }).getExpeditionReportData().death).toBeNull();
    });

    it('counts Cryo Shatter activations and their damage for the build line', () => {
        const g = game({ _runBuildTelemetry: {} });
        const target = { position: { x: 0, z: 0 }, userData: {} };
        const near = { position: { x: 1, z: 0 }, parent: {}, userData: { type: 'cybersnail', hp: 100 } };
        g.scatterSprites = [target, near];
        g.isEnemyType = () => true;
        g.triggerCryoShatter(target);
        g.triggerCryoShatter(target);
        const telemetry = g._runBuildTelemetry.cryo_shatter;
        expect(telemetry.activations).toBe(2);
        expect(telemetry.damage).toBeGreaterThan(0);
        expect(telemetry.damage).toBe(g.applyPlayerDamageToEnemy.mock.calls.reduce((sum, call) => sum + call[1], 0));
        const report = g.getExpeditionReportData();
        expect(report.build.key).toBe('ui.death.build.cryo_shatter');
        expect(report.build.params.count).toBe(2);
    });

    it('lists the equipped components when no synergy fired', () => {
        expect(game({ _runBuildTelemetry: {} }).getExpeditionReportData().build)
            .toEqual({ key: 'ui.death.build.equipped', params: { dropKeys: ['ui.relics.cryo_rime.name'], dropIds: ['cryo_rime'] } });
    });
});
