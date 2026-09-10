import { describe, it, expect, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import { applyCarapaceProtection, isInBioSlime } from './runRelicEffects.js';
import { ThreeGame } from './threeGame.js';
import { SUIT_RELICS } from './runDrops.js';

const relic = SUIT_RELICS.find((item) => item.id === 'chitin_membrane');
function slime(type = 'scatter_slime_puddle') {
    const mesh = new THREE.Object3D(); mesh.userData.type = type; return mesh;
}
function fixture() {
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    vi.useFakeTimers();
    return { player: new THREE.Object3D(), playerVitals: { hp: 100, maxHp: 100 },
        runRelics: [relic], runOverclocks: [], scatterSprites: [slime()], dynamicPuddles: [],
        emitHealthState: vi.fn(), performanceProfile: 'gameplay' };
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('Carapace Membrane', () => {
    it('saves exactly three whole hearts over ten one-heart attacks', () => {
        let credit = 0; let total = 0;
        for (let i = 0; i < 10; i++) {
            const result = applyCarapaceProtection(1, credit, true);
            credit = result.credit; total += result.damage;
        }
        expect(total).toBe(7); expect(credit).toBeCloseTo(0);
    });
    it('distinguishes bio-slime from water, expired hazards, and a different floor', () => {
        const player = new THREE.Vector3();
        expect(isInBioSlime(player, [slime('rain_puddle')])).toBe(false);
        expect(isInBioSlime(player, [slime()])).toBe(true);
        expect(isInBioSlime(player, [], [{ x: 0, z: 0, radius: 1, active: true }])).toBe(true);
        expect(isInBioSlime(player, [], [{ x: 0, z: 0, radius: 1, active: false }])).toBe(false);
        player.y = -5; expect(isInBioSlime(player, [slime()])).toBe(false);
    });
    it('reduces actual runtime HP loss and consumes blocked contact attacks', () => {
        const game = fixture();
        for (let i = 0; i < 10; i++) expect(ThreeGame.prototype.takeDamage.call(game, 1, 'crawler')).toBe(true);
        expect(game.playerVitals.hp).toBe(93);
        expect(window.dispatchEvent.mock.calls.filter(([event]) => event.type === 'player-blocked')).toHaveLength(3);
    });
    it('does not bank protection off slime or against oxygen loss', () => {
        const game = fixture();
        game.scatterSprites = [];
        ThreeGame.prototype.takeDamage.call(game, 10, 'crawler');
        game.scatterSprites = [slime()];
        ThreeGame.prototype.takeDamage.call(game, 10, 'o2-depletion');
        expect(game.playerVitals.hp).toBe(80); expect(game._carapaceArmorCredit).toBe(0);
    });
    it('clears saved protection when unequipped or reset', () => {
        const game = fixture(); game._carapaceArmorCredit = 0.9; game.runRelics = [];
        ThreeGame.prototype.takeDamage.call(game, 1, 'crawler');
        expect(game.playerVitals.hp).toBe(99); expect(game._carapaceArmorCredit).toBe(0);
        game._carapaceArmorCredit = 0.9;
        ThreeGame.prototype.resetRunDrops.call(game);
        expect(game._carapaceArmorCredit).toBe(0);
    });
    it('does not accumulate armor during invulnerability or absorb already shielded damage', () => {
        const game = fixture(); game.iFrameTimer = 1;
        ThreeGame.prototype.takeDamage.call(game, 10, 'crawler');
        expect(game._carapaceArmorCredit).toBeUndefined();
        game.iFrameTimer = 0; game.playerShieldMax = 10; game.playerShieldHp = 10;
        ThreeGame.prototype.takeDamage.call(game, 10, 'crawler');
        expect(game._carapaceArmorCredit).toBe(0); expect(game.playerVitals.hp).toBe(100);
    });
});
