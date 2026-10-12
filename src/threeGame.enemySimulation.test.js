import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

// Owner, 2026-10-07 (Sprint 52 decision 1): enemies you cannot see stay
// static -- no AI, no pathfinding -- until their chunk is on screen or a
// player is near. Bosses and ship raiders always run.
describe('offscreen enemies stay static', () => {
    function setup({ visibleChunk = false, at = [40, 0], userData = {} } = {}) {
        const game = Object.create(ThreeGame.prototype);
        const chunk = new THREE.Group();
        chunk.visible = visibleChunk;
        const enemy = new THREE.Sprite();
        enemy.position.set(at[0], 0, at[1]);
        enemy.userData = { type: 'cybersnail', ...userData };
        chunk.add(enemy);
        Object.assign(game, { player: { position: new THREE.Vector3(0, 0, 0) }, remotePlayers: new Map() });
        return { game, enemy };
    }

    it('runs an enemy whose chunk is on screen', () => {
        const { game, enemy } = setup({ visibleChunk: true });
        expect(game.isEnemySimulationActive(enemy)).toBe(true);
    });

    it('holds an offscreen enemy far from every player', () => {
        const { game, enemy } = setup();
        expect(game.isEnemySimulationActive(enemy)).toBe(false);
    });

    it('runs an offscreen enemy close to the player, or to a squadmate', () => {
        expect(setup({ at: [10, 0] }).game.isEnemySimulationActive(setup({ at: [10, 0] }).enemy)).toBe(true);
        const { game, enemy } = setup();
        game.remotePlayers.set('p2', { mesh: { position: new THREE.Vector3(38, 0, 2) } });
        expect(game.isEnemySimulationActive(enemy)).toBe(true);
    });

    it('always runs bosses, ship raiders and enraged enemies', () => {
        for (const userData of [{ isBoss: true }, { prioritizeShip: true }, { enraged: true }]) {
            const { game, enemy } = setup({ userData });
            expect(game.isEnemySimulationActive(enemy)).toBe(true);
        }
    });
});

// Sprint 52 A3: props in a hidden chunk skip their per-frame bob, fade and
// model scan; nothing about them can be seen until the chunk shows, and they
// are updated on that first frame.
describe('hidden-chunk props skip per-frame work', () => {
    const game = Object.create(ThreeGame.prototype);
    game.isEnemyType = (type) => type === 'cybersnail';
    game.isCrawler = () => false;
    game.isSentinel = () => false;
    const inChunk = (visible, type) => {
        const chunk = new THREE.Group();
        chunk.visible = visible;
        const sprite = new THREE.Sprite();
        sprite.userData = { type };
        chunk.add(sprite);
        return sprite;
    };

    it('skips a prop whose chunk is hidden', () => {
        expect(game.shouldSkipHiddenScatter(inChunk(false, 'prop_camp_crate'))).toBe(true);
        expect(game.shouldSkipHiddenScatter(inChunk(true, 'prop_camp_crate'))).toBe(false);
    });

    it('never skips an enemy here: the near-player rule decides for those', () => {
        expect(game.shouldSkipHiddenScatter(inChunk(false, 'cybersnail'))).toBe(false);
    });
});
