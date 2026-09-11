import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { ENEMY_STATS, ENEMY_VARIANTS, getEnemyStats, pickEnemyVariant } from './data/enemies.js';
import { ENEMY_3D_MODELS } from './enemy3dOverlay.js';

// Guards the variant wiring added after an audit found that sentinel_A,
// sentinel_B and alien_proto_crawler_A never spawned: every spawn site emits
// the family name, so the alternate meshes existed only in the 3D catalog and
// the debug showroom. See docs/planning/enemy-variant-spawning-2026-09-10.md.
describe('enemy model variants', () => {
    it('gives every variant a mesh in the 3D catalog', () => {
        for (const [family, pool] of Object.entries(ENEMY_VARIANTS)) {
            expect(pool.length, family).toBeGreaterThan(1);
            for (const variant of pool) {
                expect(ENEMY_3D_MODELS[variant]?.url, variant).toBeTruthy();
            }
        }
    });

    // The membership rule: a family's pool is exactly the keys carrying their
    // own ENEMY_STATS entry. Without this, adding a variant to the pool and
    // forgetting its stats would silently hand it the generic base numbers.
    it('gives every variant its own authored stats', () => {
        for (const pool of Object.values(ENEMY_VARIANTS)) {
            for (const variant of pool) {
                expect(ENEMY_STATS[variant], variant).toBeDefined();
            }
        }
    });

    // `sentinel` is absent from ENEMY_STATS on purpose -- that absence is the
    // evidence the bare family was never meant to spawn as itself.
    it('keeps the sentinel family out of its own pool', () => {
        expect(ENEMY_VARIANTS.sentinel).not.toContain('sentinel');
        expect(ENEMY_STATS.sentinel).toBeUndefined();
    });

    it('always resolves a family to a real variant, never to the family', () => {
        for (let i = 0; i < 200; i += 1) {
            expect(ENEMY_VARIANTS.sentinel).toContain(pickEnemyVariant('sentinel', i * 3.7));
        }
    });

    it('passes through types that have no variant pool', () => {
        expect(pickEnemyVariant('cybersnail', 4)).toBe('cybersnail');
        expect(pickEnemyVariant('boss_queen', 91.5)).toBe('boss_queen');
    });

    // Co-op builds each peer's sprite locally from shared placement data, so a
    // Math.random() pick would show the two players different meshes.
    it('is deterministic for a given seed', () => {
        for (const seed of [0, 1, -12.25, 3781.5, 0.0001]) {
            expect(pickEnemyVariant('sentinel', seed)).toBe(pickEnemyVariant('sentinel', seed));
        }
    });

    it('actually uses both sentinel variants across a spread of positions', () => {
        const seen = new Set();
        for (let i = 0; i < 300; i += 1) seen.add(pickEnemyVariant('sentinel', i * 31 + i * 17));
        expect(seen.size).toBe(2);
    });

    // The bug this fixes: keying stats off the family handed every sentinel the
    // fallback, leaving the authored 4/5 HP variants unreachable.
    it('resolves sentinel HP from the variant rather than the fallback', () => {
        const fallback = { maxHp: 3, speed: 0 };
        const rolled = ENEMY_VARIANTS.sentinel.map((v) => getEnemyStats(v, fallback).maxHp);
        expect(rolled).toEqual([4, 5]);
        expect(rolled.every((hp) => hp !== fallback.maxHp)).toBe(true);
    });

    // The variants originally shipped as byte-identical copies of their base
    // export, so resolving to sentinel_A looked exactly like resolving to
    // sentinel and the whole variant system was invisible in play. The meshes
    // are now derived by scripts/blender/build_enemy_variant_meshes.py.
    it('renders a mesh that is actually distinct from the family base', async () => {
        const digest = async (url) => {
            const file = new URL(`../public${url}`, import.meta.url);
            return createHash('sha256').update(await readFile(file)).digest('hex');
        };
        for (const [family, pool] of Object.entries(ENEMY_VARIANTS)) {
            const seen = new Map();
            for (const variant of pool) {
                seen.set(variant, await digest(ENEMY_3D_MODELS[variant].url));
            }
            // Against each other...
            expect(new Set(seen.values()).size, family).toBe(pool.length);
            // ...and against the family's own mesh when it has one it does not
            // share, which is the case the original bug hid.
            const baseUrl = ENEMY_3D_MODELS[family]?.url;
            if (baseUrl && !pool.some((v) => ENEMY_3D_MODELS[v].url === baseUrl)) {
                const baseDigest = await digest(baseUrl);
                for (const [variant, hash] of seen) {
                    expect(hash, `${variant} duplicates ${family}`).not.toBe(baseDigest);
                }
            }
        }
    });
});
