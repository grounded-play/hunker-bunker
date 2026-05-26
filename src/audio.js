// src/audio.js

const AudioContext = window.AudioContext || window.webkitAudioContext;
export const audioCtx = new AudioContext();

export class AudioManager {
    static buffers = {};
    static images = {};
    static globalMuted = false;
    
    // Persistent sources for looping background
    static ambientSource = null;
    static musicSource = null;

    // Gain nodes for volume control
    static masterGain = audioCtx.createGain();
    static sfxGain = audioCtx.createGain();
    static worldGain = audioCtx.createGain();
    static musicGain = audioCtx.createGain();

    static isUnlocked = false;
    static randInterval = null;

    static init() {
        this.masterGain.connect(audioCtx.destination);
        this.sfxGain.connect(this.masterGain);
        this.worldGain.connect(this.masterGain);
        this.musicGain.connect(this.masterGain);
        
        // Base volume mix
        this.masterGain.gain.value = 1.0;
        this.sfxGain.gain.value = 1.0;
        this.worldGain.gain.value = 1.0;
        this.musicGain.gain.value = 1.0;
    }

    static async unlock() {
        if (!this.isUnlocked) {
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
            this.isUnlocked = true;
            this.startAmbience();
        }
    }

    static toggleMute(muted) {
        this.globalMuted = muted;
        this.masterGain.gain.setTargetAtTime(muted ? 0 : 1.0, audioCtx.currentTime, 0.1);
    }

    static setChannelVolume(channel, volume = 1.0) {
        const numeric = Number(volume);
        const clamped = Number.isFinite(numeric) ? Math.min(1, Math.max(0, numeric)) : 1;
        const gainNode = channel === 'world'
            ? this.worldGain
            : channel === 'music'
                ? this.musicGain
                : channel === 'sfx'
                    ? this.sfxGain
                    : null;

        if (!gainNode) return;
        gainNode.gain.setTargetAtTime(clamped, audioCtx.currentTime, 0.05);
    }

    static setMix(mix = {}) {
        if (mix.world !== undefined) this.setChannelVolume('world', mix.world);
        if (mix.music !== undefined) this.setChannelVolume('music', mix.music);
        if (mix.sfx !== undefined) this.setChannelVolume('sfx', mix.sfx);
    }

    static async loadAssets(manifest, onProgress) {
        const total = manifest.audio.length + manifest.images.length;
        let loaded = 0;

        const updateProgress = (itemName) => {
            loaded++;
            if (onProgress) onProgress((loaded / total) * 100, itemName);
        };

        // Load Images
        const imagePromises = manifest.images.map(url => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.images[url] = img;
                    updateProgress(url);
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`Failed to load image: ${url}`);
                    updateProgress(url);
                    resolve();
                };
                img.src = url;
            });
        });

        // Load Audio
        const audioPromises = manifest.audio.map(async item => {
            try {
                const response = await fetch(item.url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                this.buffers[item.key] = audioBuffer;
                updateProgress(item.url);
            } catch (e) {
                console.warn(`Failed to load audio: ${item.url}`, e);
                updateProgress(item.url);
            }
        });

        await Promise.all([...imagePromises, ...audioPromises]);
    }

    static play(key, options = {}) {
        if (this.globalMuted) return null;

        // Collect all keys that match 'key' exactly or are numbered variations like 'key1', 'key2'
        const matchingKeys = Object.keys(this.buffers).filter(k => k === key || (k.startsWith(key) && /^\d+$/.test(k.slice(key.length))));
        if (matchingKeys.length === 0) return null;

        // Pick a random variation
        const selectedKey = matchingKeys[Math.floor(Math.random() * matchingKeys.length)];

        const source = audioCtx.createBufferSource();
        source.buffer = this.buffers[selectedKey];
        
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = options.volume !== undefined ? options.volume : 1.0;
        
        if (options.detune) source.detune.value = options.detune;
        
        let pbRate = options.playbackRate !== undefined ? options.playbackRate : 1.0;
        const requestedBus = typeof options.bus === 'string' ? options.bus.toLowerCase() : null;
        const inferredBus = key.startsWith('amb_')
            ? 'world'
            : key.startsWith('mainbg_')
                ? 'music'
                : (options.isBg ? 'music' : 'sfx');
        const bus = requestedBus === 'world' || requestedBus === 'music' || requestedBus === 'sfx'
            ? requestedBus
            : inferredBus;

        // Subtle pitch variation for SFX if not explicitly disabled
        if (bus === 'sfx' && options.varyPitch !== false) {
             pbRate *= (0.95 + Math.random() * 0.1); // +/- 5%
        }
        source.playbackRate.value = pbRate;
        
        if (options.loop) source.loop = true;

        source.connect(gainNode);
        
        // Connect to appropriate bus
        if (bus === 'world') {
            gainNode.connect(this.worldGain);
        } else if (bus === 'music') {
            gainNode.connect(this.musicGain);
        } else {
            gainNode.connect(this.sfxGain);
        }

        source.start(0);
        return { source, gainNode };
    }

    static startAmbience() {
        if (this.ambientSource) return; // Already playing

        // Play Drone
        const drone = this.play('amb_bunker_loop', { volume: 0.005, loop: true, bus: 'world', varyPitch: false });
        if (drone) this.ambientSource = drone.source;

        // Play Music
        const music = this.play('mainbg_music', { volume: 0.05, loop: true, bus: 'music', varyPitch: false });
        if (music) this.musicSource = music.source;

        // Start random ambient pings (drips, metal stress)
        if (!this.randInterval) {
            this.randInterval = setInterval(() => {
                if (this.globalMuted || Math.random() > 0.6) return; // 40% chance to play something

                const types = ['amb_drip', 'amb_metal_stress'];
                const key = types[Math.floor(Math.random() * types.length)];
                
                this.play(key, { 
                    bus: 'world',
                    volume: 0.15 + (Math.random() * 0.1),
                    playbackRate: 0.8 + (Math.random() * 0.4) // randomize pitch slightly
                });
            }, 5000); // Check every 5 seconds
        }
    }
}

AudioManager.init();
