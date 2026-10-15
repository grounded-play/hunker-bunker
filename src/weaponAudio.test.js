import { describe, it, expect, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { GAME_SOUNDSETS, selectSoundsetVariant } from './data/gameSoundsets.js';

describe('Weapon Audio Routing & Soundsets', () => {
    // Instantiate ThreeGame prototype stub for pure function testing
    const game = Object.create(ThreeGame.prototype);

    it('resolves weapon fire sounds across kinetic and energy archetypes', () => {
        expect(game.resolveWeaponFireSound('scatter_rep')).toBe('weapon_fire_shotgun');
        expect(game.resolveWeaponFireSound(null, { id: 'siege_breaker' })).toBe('weapon_fire_shotgun');

        expect(game.resolveWeaponFireSound('neon_smg')).toBe('weapon_fire_smg');
        expect(game.resolveWeaponFireSound('talon_sidearm')).toBe('weapon_fire_smg');

        expect(game.resolveWeaponFireSound('rail_marksman')).toBe('weapon_fire_railgun');
        expect(game.resolveWeaponFireSound(null, { id: 'marksman_heavy' })).toBe('weapon_fire_railgun');

        expect(game.resolveWeaponFireSound('cryo_lance')).toBe('weapon_fire_cryo');
        expect(game.resolveWeaponFireSound(null, { id: 'frost_thrower' })).toBe('weapon_fire_cryo');

        expect(game.resolveWeaponFireSound('tesla_lock')).toBe('weapon_fire_tesla');
        expect(game.resolveWeaponFireSound('arc_cannon')).toBe('weapon_fire_tesla');

        expect(game.resolveWeaponFireSound('pulse_carbine')).toBe('weapon_fire_carbine');
        expect(game.resolveWeaponFireSound('battle_rifle')).toBe('weapon_fire_carbine');

        expect(game.resolveWeaponFireSound('mk1_sidearm')).toBe('weapon_fire_sidearm');
        expect(game.resolveWeaponFireSound('standard_pistol')).toBe('weapon_fire_sidearm');
    });

    it('resolves tracer flyby whooshes and snaps matched to cosmetic profiles', () => {
        expect(game.resolveTracerFlybySound('deep_frost_4205')).toBe('tracer_flyby_frost');
        expect(game.resolveTracerFlybySound('cyan_tracer')).toBe('tracer_flyby_frost');

        expect(game.resolveTracerFlybySound('rust_and_bone_4212')).toBe('tracer_flyby_heavy');
        expect(game.resolveTracerFlybySound('heavy_slug')).toBe('tracer_flyby_heavy');

        expect(game.resolveTracerFlybySound('hive_chitin_4219')).toBe('tracer_flyby_chitin');
        expect(game.resolveTracerFlybySound('acid_needle')).toBe('tracer_flyby_chitin');

        expect(game.resolveTracerFlybySound('standard_ballistic')).toBe('tracer_flyby_ballistic');
        expect(game.resolveTracerFlybySound(null)).toBe('tracer_flyby_ballistic');
    });

    it('validates all weapon fire and tracer soundsets with pitch variation ranges', () => {
        const weaponKeys = [
            'weapon_fire_shotgun', 'weapon_fire_carbine', 'weapon_fire_smg',
            'weapon_fire_railgun', 'weapon_fire_cryo', 'weapon_fire_tesla'
        ];

        for (const key of weaponKeys) {
            const set = GAME_SOUNDSETS[key];
            expect(set).toBeDefined();
            expect(set.variants.length).toBeGreaterThanOrEqual(3);
            expect(set.fallback).toBeDefined();
            expect(set.pitch).toBeDefined();
            expect(set.pitch[0]).toBeLessThanOrEqual(set.pitch[1]);

            // Test non-repeating random selection
            const roll1 = selectSoundsetVariant(set, { random: vi.fn(() => 0.1) });
            expect(roll1).not.toBeNull();
            expect(set.variants).toContain(roll1.key);

            const roll2 = selectSoundsetVariant(set, {
                random: vi.fn(() => 0.9),
                lastVariant: roll1.key
            });
            expect(roll2).not.toBeNull();
            expect(roll2.key).not.toBe(roll1.key);
        }

        const tracerKeys = [
            'tracer_flyby_ballistic', 'tracer_flyby_frost',
            'tracer_flyby_heavy', 'tracer_flyby_chitin'
        ];

        for (const key of tracerKeys) {
            const set = GAME_SOUNDSETS[key];
            expect(set).toBeDefined();
            expect(set.variants.length).toBeGreaterThanOrEqual(2);
            expect(set.fallback).toBeDefined();
        }
    });
});
