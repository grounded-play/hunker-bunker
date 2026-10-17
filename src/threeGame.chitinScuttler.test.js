import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { CHITIN_SCUTTLER, scuttlerTuning } from './chitinScuttler.js';
import { ENEMY_3D_MODELS } from './enemy3dOverlay.js';

function sprite(type, extra = {}) {
    return {
        position: { x: 0, z: 0 },
        material: { color: { setHex: vi.fn() } },
        userData: { type, crawlerState: 'alert', windupTimer: 0, attackCooldown: 0, ...extra }
    };
}

function game() {
    const fake = Object.create(ThreeGame.prototype);
    Object.assign(fake, {
        player: { position: { x: 3, z: 0 } },
        isPlayerDead: false,
        getTileType: () => '.',
        faceSpriteFromDir: vi.fn(),
        isHiveKinPassive: () => false,
        takeDamage: vi.fn(() => true)
    });
    return fake;
}

describe('chitin scuttler in the game', () => {
    it('is an enemy that runs the crawler AI', () => {
        const g = Object.create(ThreeGame.prototype);
        expect(g.isEnemyType('chitin_scuttler')).toBe(true);
        expect(g.isCrawler('chitin_scuttler')).toBe(true);
        expect(g.isCrawler('crawler')).toBe(true);
        expect(ENEMY_3D_MODELS.chitin_scuttler?.url).toBe(ENEMY_3D_MODELS.crawler.url);
        expect(ENEMY_3D_MODELS.chitin_scuttler.height).toBeLessThan(ENEMY_3D_MODELS.crawler.height);
    });

    it('winds up faster than a crawler', () => {
        const g = game();
        globalThis.window = { dispatchEvent: vi.fn() };
        const crawler = sprite('crawler');
        const scuttler = sprite('chitin_scuttler', { crawlerTuning: scuttlerTuning() });
        g.updateCrawlerBehavior(crawler, 0.2);
        g.updateCrawlerBehavior(scuttler, 0.2);
        expect(crawler.userData.crawlerState).toBe('alert');
        expect(scuttler.userData.crawlerState).toBe('charging');
        delete globalThis.window;
    });

    it('reports its own hits as a scuttler (death report, contact drops)', () => {
        const g = game();
        g.player.position = { x: 0.3, z: 0 };
        const events = [];
        globalThis.window = { dispatchEvent: (e) => events.push(e), AudioManager: { play: vi.fn() } };
        globalThis.CustomEvent ??= class CustomEvent { constructor(type, o = {}) { this.type = type; this.detail = o.detail; } };
        const scuttler = sprite('chitin_scuttler', { crawlerState: 'charging', chargeTimer: 0, chargeDirX: 1, chargeDirZ: 0, crawlerTuning: scuttlerTuning() });
        g.updateCrawlerBehavior(scuttler, 0.01);
        expect(g.takeDamage).toHaveBeenCalledWith(1, 'chitin_scuttler', expect.any(Number), expect.any(Number));
        expect(scuttler.userData.attackCooldown).toBe(CHITIN_SCUTTLER.attackCooldown);
        delete globalThis.window;
    });

    it('can be spawned from the debug console (it shares the crawler sprite)', () => {
        const g = Object.create(ThreeGame.prototype);
        const created = [];
        Object.assign(g, {
            player: { position: { x: 0, z: 0 } },
            scatterMaterials: { crawler: {} },
            chunkSize: 32,
            chunkMeshes: new Map(),
            scene: { add: vi.fn() },
            scatterSprites: [],
            createScatterInstance: (placement) => { created.push(placement.type); return { userData: {} }; }
        });
        expect(g.spawnEnemyInstance('chitin_scuttler')).toBeTruthy();
        expect(created).toEqual(['chitin_scuttler']);
    });
});
