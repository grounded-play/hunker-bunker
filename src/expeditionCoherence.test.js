import { describe, it, expect, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { chooseDirectorAction } from './director.js';
import { SUIT_RELICS, WEAPON_OVERCLOCKS, rollEnemyLootDrop, computeActiveSynergies } from './runDrops.js';
import { crossingGuidance, expeditionDebrief } from './expeditionFeedback.js';
import { createRelicPickup, disposeExpeditionEffect, createImpactBurst } from './expeditionVfx.js';

afterEach(() => vi.unstubAllGlobals());
describe('expedition coherence regressions', () => {
    it('does not re-charge a duplicate capacity relic', () => {
        vi.stubGlobal('window', { dispatchEvent: vi.fn() });
        const game = { runRelics: [], runOverclocks: [], playerVitals: { o2: 100, maxO2: 100 }, emitO2State: vi.fn() };
        const item = SUIT_RELICS.find((r) => r.id === 'punctured_lung');
        expect(ThreeGame.prototype.equipRunDrop.call(game, item)).toBe(true);
        expect(ThreeGame.prototype.equipRunDrop.call(game, item)).toBe(false);
        expect(game.playerVitals.maxO2).toBe(60);
        expect(game.runRelics).toHaveLength(1);
    });
    it('cleans equipment before vitals on a full respawn, preserving it on a continuation', () => {
        const stop = new Error('stop after vitals boundary');
        const sequence = [];
        const game = { resetRunDrops: () => sequence.push('gear'), resetVitalsForRun: () => { sequence.push('vitals'); throw stop; } };
        expect(() => ThreeGame.prototype.respawnPlayer.call(game)).toThrow(stop);
        expect(sequence).toEqual(['gear', 'vitals']);
        sequence.length = 0;
        expect(() => ThreeGame.prototype.respawnPlayer.call(game, { resetRunState: false })).toThrow(stop);
        expect(sequence).toEqual(['vitals']);
    });
    it('removes and disposes uncollected loot on run reset', () => {
        vi.stubGlobal('window', { dispatchEvent: vi.fn() });
        const scene = new THREE.Scene();
        const pickup = createRelicPickup({ type: 'relic', rarity: 'rare' });
        scene.add(pickup);
        const dispose = vi.spyOn(pickup.children[0].geometry, 'dispose');
        const game = { inRunLootDrops: [pickup] };
        ThreeGame.prototype.resetRunDrops.call(game);
        expect(game.inRunLootDrops).toEqual([]);
        expect(scene.children).toHaveLength(0);
        expect(dispose).toHaveBeenCalledOnce();
    });
    it('selects only useful unowned gear, including an exhausted rarity pool', () => {
        const live = [...WEAPON_OVERCLOCKS, ...SUIT_RELICS].filter((r) => r.implemented !== false);
        const remaining = live.at(-1);
        const excludedIds = live.filter((r) => r !== remaining).map((r) => r.id);
        expect(rollEnemyLootDrop(() => 0, { excludedIds })).toBe(remaining);
        expect(rollEnemyLootDrop(() => 0, { excludedIds: live.map((r) => r.id) })).toBeNull();
        expect(computeActiveSynergies([{ element: 'cryo' }, { element: 'tesla' }, { element: 'bio' }])).toEqual([]);
    });
    it('eases director pressure at critical oxygen without removing low-health mercy', () => {
        expect(chooseDirectorAction({ o2Frac: 0.2, hpFrac: 1, depth: 100 }, () => 0)).toBe('none');
        expect(chooseDirectorAction({ o2Frac: 0.2, hpFrac: 0.2 }, () => 0)).toBe('mercy');
        expect(chooseDirectorAction({ o2Frac: 0.8, hpFrac: 1 }, () => 0)).toBe('patrol');
    });
    it('feeds the director oxygen as a fraction of modified capacity', () => {
        const tick = vi.fn();
        const game = { bunkerDirector: { tick }, player: {}, snailsEnabled: true,
            isGameplayInputActive: () => true, syncRunModifierCards() {}, getRunCardEffects: () => ({}),
            getActiveO2GeneratorDistance: () => 10, playerVitals: { o2: 30, maxO2: 60, hp: 100, maxHp: 100 } };
        ThreeGame.prototype.updateBunkerDirector.call(game, 1);
        expect(tick.mock.calls[0][1].o2Frac).toBe(0.5);
    });
    it('gives contextual guidance and truthful retention copy', () => {
        expect(crossingGuidance({ o2: 10, maxO2: 60 })).toContain('reserve');
        expect(expeditionDebrief({ reason: 'o2-depletion', buildCount: 2 })).toContain('expire');
        expect(expeditionDebrief({ reason: 'o2-depletion' })).toContain('oxygen security');
        expect(expeditionDebrief({ victory: true })).toContain('Review your loadout');
    });
    it('owns pickup geometry independently and uses occluding 3D impacts', () => {
        const first = createRelicPickup({ type: 'overclock' });
        const second = createRelicPickup({ type: 'relic' });
        expect(first.children[0].geometry).not.toBe(second.children[0].geometry);
        const impact = createImpactBurst(() => 0.5);
        expect(impact.children).toHaveLength(7);
        expect(impact.children.every((c) => c.material.depthTest)).toBe(true);
        [first, second, impact].forEach(disposeExpeditionEffect);
    });
});
