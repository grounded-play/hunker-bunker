import { describe, it, expect, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

function fixture() {
    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
    camera.position.set(0, 4, 6);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const enemy = new THREE.Object3D();
    enemy.userData = { isElite: true, hp: 12, scatterKey: 'elite-1' };
    const game = { camera, player: new THREE.Object3D(), performanceProfile: 'gameplay',
        isGameplayInputActive: () => true, hasCompanionFireLane: vi.fn(() => true),
        scatterSprites: [enemy], showBunkerLine: vi.fn() };
    const audio = vi.fn();
    vi.stubGlobal('window', { AudioManager: { playEliteWarning: audio }, dispatchEvent: vi.fn() });
    const tick = (dt = 0.5) => ThreeGame.prototype.updateEliteContactFeedback.call(game, dt);
    return { game, enemy, audio, tick };
}
afterEach(() => vi.unstubAllGlobals());
describe('elite contact feedback', () => {
    it('announces a visible elite once, with independent text and audio', () => {
        const { game, audio, tick } = fixture();
        tick(); tick(13);
        expect(audio).toHaveBeenCalledOnce();
        expect(game.showBunkerLine).toHaveBeenCalledOnce();
        expect(game.showBunkerLine.mock.calls[0][0]).toContain('ELITE CONTACT');
    });
    it('waits for a clear visible contact without consuming its warning', () => {
        const { game, enemy, tick } = fixture();
        enemy.position.set(20, 0, 0); tick();
        enemy.position.set(0, 0, 9); tick(); // Behind camera.
        enemy.position.set(0, 0, 0);
        game.hasCompanionFireLane.mockReturnValue(false); tick();
        expect(game.showBunkerLine).not.toHaveBeenCalled();
        game.hasCompanionFireLane.mockReturnValue(true); tick();
        expect(game.showBunkerLine).toHaveBeenCalledOnce();
    });
    it('spaces different contacts twelve seconds apart and resets on a new run', () => {
        const { game, enemy, tick } = fixture();
        tick();
        const second = enemy.clone(); second.userData.scatterKey = 'elite-2';
        game.scatterSprites.push(second);
        tick(5); expect(game.showBunkerLine).toHaveBeenCalledTimes(1);
        tick(7); expect(game.showBunkerLine).toHaveBeenCalledTimes(2);
        ThreeGame.prototype.resetRunDrops.call(game);
        tick(); expect(game.showBunkerLine).toHaveBeenCalledTimes(3);
    });
    it.each(['isCompanion', 'burstTriggered', 'isBoss', 'isDisplayModel'])(
        'does not alarm for %s', (flag) => {
            const { enemy, game, tick } = fixture(); enemy.userData[flag] = true; tick();
            expect(game.showBunkerLine).not.toHaveBeenCalled();
        });
    it('does not run in the menu, loading screen, or after death', () => {
        const { game, tick } = fixture();
        game.performanceProfile = 'menu'; tick();
        game.performanceProfile = 'gameplay'; game.loadingPaused = true; tick();
        game.loadingPaused = false; game.isPlayerDead = true; tick();
        expect(game.showBunkerLine).not.toHaveBeenCalled();
    });
    it('still provides text when audio is unavailable', () => {
        const { game, tick } = fixture(); window.AudioManager = null; tick();
        expect(game.showBunkerLine).toHaveBeenCalledOnce();
    });
});
