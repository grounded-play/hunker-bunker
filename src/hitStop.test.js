import { describe, expect, it } from 'vitest';
import { createHitStopManager, HIT_STOP_PRESETS, HitStopManager } from './hitStop.js';

describe('HitStopManager', () => {
    it('initializes in an inactive state with timescale 1.0', () => {
        const manager = createHitStopManager();
        expect(manager.isActive()).toBe(false);
        expect(manager.update(16)).toBe(1.0);
    });

    it('triggers a hit-stop freeze window', () => {
        const manager = new HitStopManager();
        manager.trigger(50, 0.0);
        expect(manager.isActive()).toBe(true);

        // First tick inside window should return freezeScale (0.0)
        const scale = manager.update(20);
        expect(scale).toBe(0.0);
        expect(manager.isActive()).toBe(true);

        // Next tick completing the window
        const finalScale = manager.update(35);
        expect(finalScale).toBe(1.0);
        expect(manager.isActive()).toBe(false);
    });

    it('supports slow-motion dilation instead of full freeze', () => {
        const manager = new HitStopManager();
        manager.trigger(100, 0.2);
        expect(manager.update(50)).toBe(0.2);
        expect(manager.update(60)).toBe(1.0);
    });

    it('re-triggering takes the higher duration without shortening an active freeze', () => {
        const manager = new HitStopManager();
        manager.trigger(40);
        manager.trigger(80);
        expect(manager.remainingMs).toBe(80);

        manager.trigger(20); // Lower duration does not overwrite longer
        expect(manager.remainingMs).toBe(80);
    });

    it('exposes authored presets for light, medium, heavy, and boss impacts', () => {
        expect(HIT_STOP_PRESETS.LIGHT).toBe(35);
        expect(HIT_STOP_PRESETS.MEDIUM).toBe(50);
        expect(HIT_STOP_PRESETS.HEAVY).toBe(75);
        expect(HIT_STOP_PRESETS.BOSS_STAGGER).toBe(120);
    });

    it('allows immediate reset', () => {
        const manager = new HitStopManager();
        manager.trigger(120);
        expect(manager.isActive()).toBe(true);
        manager.reset();
        expect(manager.isActive()).toBe(false);
        expect(manager.update(16)).toBe(1.0);
    });
});
