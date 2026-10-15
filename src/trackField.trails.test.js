import { describe, it, expect } from 'vitest';
import {
    slimeColorFor,
    slimeLifeFor,
    trackAlpha,
    createTrackField
} from './trackField.js';

describe('Enemy Trails & Snail Biome Slime Dynamics', () => {
    it('assigns distinctive bioluminescent hex colors across creature types', () => {
        expect(slimeColorFor('cryo_snail')).toBe(0xa3e2ff); // Freezing ice ribbon
        expect(slimeColorFor('spore_snail')).toBe(0x55ff55); // Emerald toxic slime
        expect(slimeColorFor('cyber_snail')).toBe(0x1e1b18); // Scorched petroleum
        expect(slimeColorFor('mech_crawler')).toBe(0x1e1b18);
        expect(slimeColorFor('standard_snail')).toBe(0x2fb8e0); // Cyan glow
        expect(slimeColorFor('')).toBe(0x2fb8e0);
    });

    it('assigns lingering lifetimes matching master plan specifications', () => {
        expect(slimeLifeFor('standard_snail', false)).toBe(18); // 18s standard
        expect(slimeLifeFor('cryo_snail', false)).toBe(22); // 22s frostbite
        expect(slimeLifeFor('spore_snail', false)).toBe(24); // 24s toxic spore
        expect(slimeLifeFor('cyber_snail', false)).toBe(25); // 25s scorched oil
        expect(slimeLifeFor('boss_cybersnail', true)).toBe(45); // 45s alpha boss wake
        expect(slimeLifeFor('stalker_crawler', false)).toBe(16); // 16s claw gouges
        expect(slimeLifeFor('charger', false)).toBe(16);
    });

    it('follows decay and evaporation curve without abrupt popping', () => {
        const baseAlpha = 0.8;
        const life = 20.0;

        // In the first 65% of lifespan (with fadeThreshold = 0.65), alpha remains at base value
        expect(trackAlpha(baseAlpha, 0, life, 0.65)).toBe(baseAlpha);
        expect(trackAlpha(baseAlpha, 5, life, 0.65)).toBe(baseAlpha);
        expect(trackAlpha(baseAlpha, 12.9, life, 0.65)).toBe(baseAlpha);

        // After 65%, alpha linearly ramps down to 0
        const midDecay = trackAlpha(baseAlpha, 16.5, life, 0.65); // 82.5% of life
        expect(midDecay).toBeLessThan(baseAlpha);
        expect(midDecay).toBeGreaterThan(0);
        expect(midDecay).toBeCloseTo(baseAlpha * 0.5, 1);

        // At or beyond 100% of life, mark is completely transparent
        expect(trackAlpha(baseAlpha, 20.0, life, 0.65)).toBe(0);
        expect(trackAlpha(baseAlpha, 25.0, life, 0.65)).toBe(0);
    });

    it('retains spent smears in pooled track field without leaking slots', () => {
        const tf = createTrackField({ smearCapacity: 64 });
        expect(tf.smears.capacity).toBe(64);

        const slot = tf.addSmear({
            x: 15,
            z: 25,
            dirX: 1,
            dirZ: 0,
            size: 1.2,
            color: slimeColorFor('spore_snail'),
            alpha: 0.45,
            life: slimeLifeFor('spore_snail'),
            now: 100
        });

        expect(slot).toBeGreaterThanOrEqual(0);
        expect(slot).toBeLessThan(64);

        // Update with time delta: mark stays alive
        tf.update(105);
        expect(tf.smears.born[slot]).toBe(100);
        expect(tf.smears.life[slot]).toBe(24);
    });
});
