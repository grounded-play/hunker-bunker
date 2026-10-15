import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PointAudioEmitter, PointAudioEmitterManager } from './pointAudioEmitter.js';

describe('PointAudioEmitter', () => {
    let mockAudioManager;
    let mockGame;

    beforeEach(() => {
        mockAudioManager = {
            play: vi.fn(() => ({
                source: { stop: vi.fn() },
                gainNode: { gain: { setValueAtTime: vi.fn(), value: 0.5, linearRampToValueAtTime: vi.fn() } },
                panner: { pan: { setValueAtTime: vi.fn(), value: 0 } }
            })),
            resolveSpatial: vi.fn(() => ({ gain: 0.9, pan: 0.25, audible: true })),
            audioCtx: { currentTime: 1.0 }
        };

        mockGame = {
            audioAt: vi.fn(() => ({ volume: 0.5 }))
        };
    });

    it('initializes with default and custom properties', () => {
        const emitter = new PointAudioEmitter({
            id: 'forge_1',
            x: 10,
            z: 20,
            soundKey: 'amb_point_tallow_forge',
            maxDistance: 14,
            rolloff: 1.2,
            baseVolume: 0.45
        });

        expect(emitter.id).toBe('forge_1');
        expect(emitter.x).toBe(10);
        expect(emitter.z).toBe(20);
        expect(emitter.soundKey).toBe('amb_point_tallow_forge');
        expect(emitter.maxDistance).toBe(14);
        expect(emitter.rolloff).toBe(1.2);
        expect(emitter.baseVolume).toBe(0.45);
        expect(emitter.active).toBe(true);
    });

    it('calculates nonlinear distance attenuation correctly', () => {
        const emitter = new PointAudioEmitter({
            maxDistance: 10,
            rolloff: 2.0,
            baseVolume: 1.0
        });

        expect(emitter.calculateAttenuation(0)).toBe(1.0);
        expect(emitter.calculateAttenuation(5)).toBeCloseTo(0.25); // (1 - 0.5)^2 = 0.25
        expect(emitter.calculateAttenuation(10)).toBe(0);
        expect(emitter.calculateAttenuation(15)).toBe(0);
    });

    it('starts audio playback when player enters range', () => {
        const emitter = new PointAudioEmitter({
            id: 'generator_1',
            x: 0,
            z: 0,
            soundKey: 'amb_point_vesper_generator',
            maxDistance: 12,
            rolloff: 1.4,
            baseVolume: 0.4
        });

        emitter.update(2, 2, mockAudioManager, mockGame);

        expect(mockAudioManager.play).toHaveBeenCalledWith(
            'amb_point_vesper_generator',
            expect.objectContaining({
                loop: true,
                worldX: 0,
                worldZ: 0,
                bus: 'world'
            })
        );
        expect(emitter.voice).toBeDefined();
        expect(emitter.currentGain).toBeGreaterThan(0);
    });

    it('stops voice when player moves out of range', () => {
        const emitter = new PointAudioEmitter({
            id: 'chimes_1',
            x: 0,
            z: 0,
            soundKey: 'amb_point_meridian_chimes',
            maxDistance: 10
        });

        emitter.update(2, 0, mockAudioManager, mockGame);
        expect(emitter.voice).not.toBeNull();

        // Move player beyond max distance
        emitter.update(25, 25, mockAudioManager, mockGame);
        expect(emitter.voice).toBeNull();
        expect(emitter.currentGain).toBe(0);
    });

    it('disposes cleanly and stops playing voice', () => {
        const emitter = new PointAudioEmitter({
            x: 0,
            z: 0,
            soundKey: 'amb_point_tallow_forge',
            maxDistance: 15
        });

        emitter.update(0, 0, mockAudioManager, mockGame);
        expect(emitter.voice).not.toBeNull();
        emitter.dispose();

        expect(emitter.voice).toBeNull();
        expect(emitter.active).toBe(false);
    });
});

describe('PointAudioEmitterManager', () => {
    let manager;
    let mockAudioManager;

    beforeEach(() => {
        manager = new PointAudioEmitterManager();
        mockAudioManager = {
            play: vi.fn(() => ({
                source: { stop: vi.fn() },
                gainNode: { gain: { setValueAtTime: vi.fn(), value: 0.5 } }
            })),
            resolveSpatial: vi.fn(() => ({ gain: 1.0, pan: 0 })),
            audioCtx: { currentTime: 0 }
        };
    });

    it('synchronizes camp landmarks and living hives', () => {
        const camps = [
            { id: 'camp_tallow', pos: { x: 10, z: 20 } },
            { id: 'camp_vesper', pos: { x: -30, z: 40 } },
            { id: 'camp_meridian', pos: { x: 50, z: -10 } }
        ];

        const hives = [
            { id: 'alpha_hive', pos: { x: 100, z: 100 }, status: 'alive' },
            { id: 'dead_hive', pos: { x: 200, z: 200 }, status: 'destroyed' }
        ];

        manager.syncCampsAndHives(camps, hives);

        expect(manager.getEmitter('camp_tallow_forge')).toBeDefined();
        expect(manager.getEmitter('camp_tallow_forge').soundKey).toBe('amb_point_tallow_forge');
        expect(manager.getEmitter('camp_vesper_generator')).toBeDefined();
        expect(manager.getEmitter('camp_vesper_generator').soundKey).toBe('amb_point_vesper_generator');
        expect(manager.getEmitter('camp_meridian_chimes')).toBeDefined();
        expect(manager.getEmitter('camp_meridian_chimes').soundKey).toBe('amb_point_meridian_chimes');

        expect(manager.getEmitter('hive_sac_alpha_hive')).toBeDefined();
        expect(manager.getEmitter('hive_sac_dead_hive')).toBeNull();
    });

    it('updates all emitters against listener position', () => {
        manager.addEmitter({
            id: 'test_emitter',
            x: 0,
            z: 0,
            soundKey: 'amb_point_tallow_forge',
            maxDistance: 10
        });

        manager.update({ x: 2, z: 2 }, mockAudioManager);
        expect(mockAudioManager.play).toHaveBeenCalled();
    });

    it('disposes all emitters on manager disposal', () => {
        manager.addEmitter({ id: 'e1', x: 0, z: 0, soundKey: 'amb_point_tallow_forge' });
        manager.addEmitter({ id: 'e2', x: 5, z: 5, soundKey: 'amb_point_vesper_generator' });

        manager.dispose();
        expect(manager.emitters.size).toBe(0);
    });
});
