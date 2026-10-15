/**
 * Hyper-Localized Point-Source Audio Emitter System.
 * Manages 3D positional acoustic emitters anchored to world landmarks,
 * structures (camps, forges, generators, shrines), and biological hazards (hive egg sacs).
 *
 * Implements smooth distance-based rolloff, stereo panning, dynamic gain interpolation,
 * and lifecycle management with zero frame-rate hitches.
 */

export class PointAudioEmitter {
    constructor({
        id,
        x = 0,
        z = 0,
        soundKey,
        maxDistance = 14,
        rolloff = 1.2,
        baseVolume = 0.45,
        active = true
    } = {}) {
        this.id = id || `emitter_${Math.random().toString(36).slice(2, 9)}`;
        this.x = Number.isFinite(x) ? x : 0;
        this.z = Number.isFinite(z) ? z : 0;
        this.soundKey = soundKey;
        this.maxDistance = Math.max(1, Number(maxDistance) || 14);
        this.rolloff = Math.max(0.1, Number(rolloff) || 1.0);
        this.baseVolume = typeof baseVolume === 'number' && Number.isFinite(baseVolume)
            ? Math.max(0, Math.min(1.0, baseVolume))
            : 0.45;
        this.active = Boolean(active);

        this.voice = null;
        this.currentGain = 0;
    }

    setPosition(x, z) {
        if (Number.isFinite(x)) this.x = x;
        if (Number.isFinite(z)) this.z = z;
    }

    /**
     * Compute normalized distance attenuation: (1 - d / maxDistance) ^ rolloff
     */
    calculateAttenuation(distance) {
        if (distance >= this.maxDistance) return 0;
        const normalized = Math.max(0, Math.min(1, distance / this.maxDistance));
        return Math.pow(1 - normalized, this.rolloff);
    }

    /**
     * Update emitter audio state based on listener proximity.
     */
    update(listenerX, listenerZ, audioManager, _game) {
        if (!this.active || !this.soundKey || !Number.isFinite(listenerX) || !Number.isFinite(listenerZ)) {
            if (this.voice) this.stopVoice();
            return;
        }

        const distance = Math.hypot(listenerX - this.x, listenerZ - this.z);

        if (distance > this.maxDistance) {
            if (this.voice) {
                this.stopVoice();
            }
            this.currentGain = 0;
            return;
        }

        const attenuation = this.calculateAttenuation(distance);
        const targetVolume = this.baseVolume * attenuation;
        this.currentGain = targetVolume;

        const audioMgr = audioManager || globalThis.window?.AudioManager || globalThis.AudioManager;
        if (!audioMgr) return;

        const spatial = audioMgr.resolveSpatial?.({
            worldX: this.x,
            worldZ: this.z,
            x: this.x,
            z: this.z
        });

        const effectiveGain = targetVolume * (spatial?.gain ?? 1.0);

        if (!this.voice) {
            // Initiate looping point-source voice
            const playOpts = {
                loop: true,
                worldX: this.x,
                worldZ: this.z,
                volume: effectiveGain,
                bus: 'world'
            };
            this.voice = audioMgr.play?.(this.soundKey, playOpts) ?? null;
        } else {
            // Update existing voice gain and panning smoothly
            if (this.voice.gainNode?.gain) {
                const now = audioMgr.audioCtx?.currentTime ?? 0;
                try {
                    this.voice.gainNode.gain.setValueAtTime(effectiveGain, now);
                } catch {
                    this.voice.gainNode.gain.value = effectiveGain;
                }
            }
            if (this.voice.panner?.pan && spatial && Number.isFinite(spatial.pan)) {
                const now = audioMgr.audioCtx?.currentTime ?? 0;
                try {
                    this.voice.panner.pan.setValueAtTime(spatial.pan, now);
                } catch {
                    this.voice.panner.pan.value = spatial.pan;
                }
            }
        }
    }

    /**
     * Stop and recycle active audio voice.
     */
    stopVoice(fadeSeconds = 0.25) {
        if (!this.voice) return;
        const v = this.voice;
        this.voice = null;

        try {
            if (v.gainNode?.gain) {
                const now = globalThis.window?.AudioManager?.audioCtx?.currentTime ?? 0;
                v.gainNode.gain.setValueAtTime(v.gainNode.gain.value, now);
                v.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);
            }
            setTimeout(() => {
                try { v.source?.stop?.(); } catch { /* ignore */ }
            }, Math.round((fadeSeconds + 0.05) * 1000));
        } catch {
            try { v.source?.stop?.(); } catch { /* ignore */ }
        }
    }

    /**
     * Teardown and clean up emitter.
     */
    dispose() {
        this.stopVoice(0.05);
        this.active = false;
    }
}

/**
 * Manages spatial ambient point emitters across expeditions, camps, and hives.
 */
export class PointAudioEmitterManager {
    constructor() {
        this.emitters = new Map();
    }

    addEmitter(config) {
        if (!config) return null;
        const emitter = config instanceof PointAudioEmitter ? config : new PointAudioEmitter(config);
        this.emitters.set(emitter.id, emitter);
        return emitter;
    }

    removeEmitter(id) {
        const emitter = this.emitters.get(id);
        if (emitter) {
            emitter.dispose();
            this.emitters.delete(id);
            return true;
        }
        return false;
    }

    getEmitter(id) {
        return this.emitters.get(id) || null;
    }

    /**
     * Synchronize camp landmarks and biome hive sacs into dedicated emitters.
     */
    syncCampsAndHives(camps = [], hives = []) {
        // 1. Sync camp landmarks
        if (Array.isArray(camps)) {
            for (const camp of camps) {
                if (!camp?.id) continue;
                const cx = camp?.pos?.x ?? camp?.tileX ?? camp?.x;
                const cz = camp?.pos?.z ?? camp?.tileZ ?? camp?.z;
                if (!Number.isFinite(cx) || !Number.isFinite(cz)) continue;

                if (camp.id === 'camp_tallow') {
                    this.upsertEmitter('camp_tallow_forge', {
                        x: cx, z: cz,
                        soundKey: 'amb_point_tallow_forge',
                        maxDistance: 14,
                        rolloff: 1.2,
                        baseVolume: 0.45
                    });
                } else if (camp.id === 'camp_vesper') {
                    this.upsertEmitter('camp_vesper_generator', {
                        x: cx, z: cz,
                        soundKey: 'amb_point_vesper_generator',
                        maxDistance: 12,
                        rolloff: 1.4,
                        baseVolume: 0.42
                    });
                } else if (camp.id === 'camp_meridian') {
                    this.upsertEmitter('camp_meridian_chimes', {
                        x: cx, z: cz,
                        soundKey: 'amb_point_meridian_chimes',
                        maxDistance: 16,
                        rolloff: 1.0,
                        baseVolume: 0.40
                    });
                }
            }
        }

        // 2. Sync living hive bio-sacs
        if (Array.isArray(hives)) {
            for (let i = 0; i < hives.length; i++) {
                const hive = hives[i];
                if (!hive) continue;
                const isDestroyed = hive.status === 'destroyed' || hive.destroyed;
                const hiveId = `hive_sac_${hive.id ?? i}`;

                if (isDestroyed) {
                    this.removeEmitter(hiveId);
                    continue;
                }

                const hx = hive?.pos?.x ?? hive?.tileX ?? hive?.x;
                const hz = hive?.pos?.z ?? hive?.tileZ ?? hive?.z;
                if (!Number.isFinite(hx) || !Number.isFinite(hz)) continue;

                this.upsertEmitter(hiveId, {
                    x: hx, z: hz,
                    soundKey: 'amb_point_hive_sac',
                    maxDistance: 10,
                    rolloff: 1.5,
                    baseVolume: 0.44
                });
            }
        }
    }

    upsertEmitter(id, config) {
        let emitter = this.emitters.get(id);
        if (!emitter) {
            emitter = new PointAudioEmitter({ id, ...config });
            this.emitters.set(id, emitter);
        } else {
            emitter.setPosition(config.x, config.z);
            if (config.soundKey) emitter.soundKey = config.soundKey;
            if (config.maxDistance) emitter.maxDistance = config.maxDistance;
            if (config.rolloff) emitter.rolloff = config.rolloff;
            if (config.baseVolume !== undefined) emitter.baseVolume = config.baseVolume;
        }
        return emitter;
    }

    /**
     * Update all emitters against the listener position.
     */
    update(listenerPosition, audioManager, game) {
        const lx = listenerPosition?.x ?? 0;
        const lz = listenerPosition?.z ?? 0;

        for (const emitter of this.emitters.values()) {
            emitter.update(lx, lz, audioManager, game);
        }
    }

    /**
     * Tear down all managed emitters.
     */
    dispose() {
        for (const emitter of this.emitters.values()) {
            emitter.dispose();
        }
        this.emitters.clear();
    }
}
