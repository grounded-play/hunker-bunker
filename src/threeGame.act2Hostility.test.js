import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

// Owner, 2026-10-07, after a 17-minute Act 2 run on the Deck with zero hits
// taken: "enemy were not hitting my player ... we need to take damage".
// Hive kinship had made every wild enemy ignore the player for all of Act 2.
function act2Game() {
    const game = Object.create(ThreeGame.prototype);
    Object.assign(game, {
        act2: { getPhase: () => 'dish', getState: () => ({}) },
        player: { position: new THREE.Vector3(0, 0, 0) },
        isPlayerDead: false,
        isMultiplayer: false,
        canEnemyTargetPlayer: () => true
    });
    return game;
}

const enemy = (type, userData = {}) => ({ position: new THREE.Vector3(1, 0, 0), userData: { type, ...userData } });

describe('Act 2 enemies are dangerous', () => {
    it('a wild enemy hunts the player in Act 2 without being shot first', () => {
        const game = act2Game();
        for (const type of ['alien_proto_crawler', 'mycelium_stalker', 'sporesnail', 'cybersnail']) {
            const sprite = enemy(type);
            expect(game.isHiveKinPassive(sprite), type).toBe(false);
            expect(game.selectSnailTarget(sprite, null)?.type, type).toBe('player');
        }
    });

    it('a companion stays at your side', () => {
        expect(act2Game().isHiveKinPassive(enemy('cybersnail', { isCompanion: true }))).toBe(true);
    });
});
