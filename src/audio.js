// src/audio.js

const AudioContext = window.AudioContext || window.webkitAudioContext;
export const audioCtx = new AudioContext();

export class AudioManager {
    static buffers = {};
    static images = {};
    static globalMuted = false;
    static masterVolume = 1.0;
    
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
        this.masterGain.gain.setTargetAtTime(muted ? 0 : this.masterVolume, audioCtx.currentTime, 0.1);
    }

    static setChannelVolume(channel, volume = 1.0) {
        const numeric = Number(volume);
        const clamped = Number.isFinite(numeric) ? Math.min(1, Math.max(0, numeric)) : 1;
        
        if (channel === 'master') {
            this.masterVolume = clamped;
            if (!this.globalMuted) {
                this.masterGain.gain.setTargetAtTime(clamped, audioCtx.currentTime, 0.05);
            }
            return;
        }

        const gainNode = channel === 'music'
            ? this.musicGain
            : (channel === 'vfx' || channel === 'sfx')
                ? this.sfxGain
                : null;

        if (!gainNode) return;
        gainNode.gain.setTargetAtTime(clamped, audioCtx.currentTime, 0.05);
    }

    static setMix(mix = {}) {
        if (mix.master !== undefined) this.setChannelVolume('master', mix.master);
        else if (mix.world !== undefined) this.setChannelVolume('master', mix.world);

        if (mix.music !== undefined) this.setChannelVolume('music', mix.music);

        if (mix.vfx !== undefined) this.setChannelVolume('vfx', mix.vfx);
        else if (mix.sfx !== undefined) this.setChannelVolume('vfx', mix.sfx);
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

        // Intercept hover requests for procedurally synthesized blips
        if (key === 'ui_hover') {
            this.playProceduralHover(options);
            return null;
        }

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

        // Optional stereo panning
        let lastNode = gainNode;
        if (options.pan !== undefined && Number.isFinite(options.pan)) {
            const panner = audioCtx.createStereoPanner();
            panner.pan.value = Math.max(-1, Math.min(1, options.pan));
            gainNode.connect(panner);
            lastNode = panner;
        }

        // Connect to appropriate bus
        if (bus === 'world') {
            lastNode.connect(this.sfxGain); // Route environment/world sounds to SFX/VFX
        } else if (bus === 'music') {
            lastNode.connect(this.musicGain);
        } else {
            lastNode.connect(this.sfxGain);
        }

        source.start(0);
        return { source, gainNode };
    }

    static playProceduralHover(options = {}) {
        if (this.globalMuted || !this.isUnlocked) return;
        
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        // Pure sine wave for a deep, warm sub-bass hum that sits "under" the UI
        osc.type = 'sine';
        
        // Low base frequency (~100Hz, G2) with subtle organic shifts
        let startFreq = 100;
        if (options.varyPitch !== false) {
            startFreq *= (0.92 + Math.random() * 0.16); // +/- 8% shift
        }
        
        const duration = 0.28; // Original slower thrum/hum length (280ms)
        const endFreq = startFreq * 0.85; // Slide down slightly
        
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.linearRampToValueAtTime(endFreq, now + duration);
        
        // Gentle hum volume envelope (attack + decay) with slight amplitude shift
        const baseVol = options.volume !== undefined ? options.volume : 0.05; // Faint base volume
        const vol = baseVol * (0.9 + Math.random() * 0.2); // +/- 10% volume shift
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(vol, now + duration * 0.2); // 56ms linear attack
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        osc.start(now);
        osc.stop(now + duration + 0.05);
    }

    static playProceduralLoot(type, rarity = 'basic') {
        if (this.globalMuted || !this.isUnlocked) return;
        
        const now = audioCtx.currentTime;
        
        // Determine multiplier/enhancement based on rarity
        let rarityMult = 1.0;
        let pitchMult = 1.0;
        let isLegendary = false;
        
        switch(rarity) {
            case 'uncommon':
                rarityMult = 1.25;
                pitchMult = 1.1;
                break;
            case 'rare':
                rarityMult = 1.5;
                pitchMult = 1.2;
                break;
            case 'legendary':
                rarityMult = 1.8;
                pitchMult = 1.35;
                isLegendary = true;
                break;
        }

        const pitchRandom = 0.95 + Math.random() * 0.1; // +/- 5% subtle shift to avoid repeated feel
        pitchMult *= pitchRandom;

        const volBase = (0.18 * rarityMult) * (0.9 + Math.random() * 0.2); // +/- 10% volume shift
        
        if (type === 'coin') {
            // Quick ascending double chime
            const playChime = (freq, delay, vol) => {
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                osc.connect(gainNode);
                gainNode.connect(this.sfxGain);
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq * pitchMult, now + delay);
                
                gainNode.gain.setValueAtTime(vol, now + delay);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);
                
                osc.start(now + delay);
                osc.stop(now + delay + 0.2);
            };
            
            playChime(587.33, 0, volBase); // D5
            playChime(783.99, 0.05, volBase); // G5
            
            if (isLegendary) {
                playChime(987.77, 0.1, volBase * 0.9); // B5
                playChime(1174.66, 0.15, volBase * 0.8); // D6
            }
        } 
        else if (type === 'health') {
            // Smooth warm swell (low to high slide)
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            osc.type = 'sine';
            const duration = 0.3 * rarityMult;
            const startFreq = 261.63; // C4
            const endFreq = 523.25; // C5
            
            osc.frequency.setValueAtTime(startFreq * pitchMult, now);
            osc.frequency.exponentialRampToValueAtTime(endFreq * pitchMult, now + duration);
            
            gainNode.gain.setValueAtTime(0.001, now);
            gainNode.gain.linearRampToValueAtTime(volBase, now + duration * 0.3);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            osc.start(now);
            osc.stop(now + duration + 0.02);
            
            // For rare/legendary, layer a harmony note
            if (rarity === 'rare' || isLegendary) {
                const subOsc = audioCtx.createOscillator();
                const subGain = audioCtx.createGain();
                subOsc.connect(subGain);
                subGain.connect(this.sfxGain);
                subOsc.type = 'sine';
                subOsc.frequency.setValueAtTime(startFreq * 1.25 * pitchMult, now); // E4 major third
                subOsc.frequency.exponentialRampToValueAtTime(endFreq * 1.25 * pitchMult, now + duration);
                
                subGain.gain.setValueAtTime(0.001, now);
                subGain.gain.linearRampToValueAtTime(volBase * 0.7, now + duration * 0.3);
                subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
                subOsc.start(now);
                subOsc.stop(now + duration + 0.02);
            }
        } 
        else if (type === 'ammo') {
            // Mid-low frequency mechanical clack/sweep down
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            osc.type = 'triangle';
            const duration = 0.12 * rarityMult;
            const startFreq = 380;
            const endFreq = 90;
            
            osc.frequency.setValueAtTime(startFreq * pitchMult, now);
            osc.frequency.exponentialRampToValueAtTime(endFreq * pitchMult, now + duration);
            
            gainNode.gain.setValueAtTime(volBase * 1.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            osc.start(now);
            osc.stop(now + duration + 0.02);
            
            // Double click for mechanical feel
            const clickOsc = audioCtx.createOscillator();
            const clickGain = audioCtx.createGain();
            clickOsc.connect(clickGain);
            clickGain.connect(this.sfxGain);
            
            clickOsc.type = 'sawtooth';
            clickOsc.frequency.setValueAtTime(180, now + 0.04);
            clickGain.gain.setValueAtTime(volBase * 0.8, now + 0.04);
            clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04 + 0.06);
            
            clickOsc.start(now + 0.04);
            clickOsc.stop(now + 0.11);
        } 
        else if (type === 'weapon') {
            // Energetic power-up arpeggio
            const duration = 0.08 * rarityMult;
            const playStep = (freq, startOffset) => {
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                osc.connect(gainNode);
                gainNode.connect(this.sfxGain);
                
                osc.type = isLegendary ? 'sawtooth' : 'triangle';
                osc.frequency.setValueAtTime(freq * pitchMult, now + startOffset);
                osc.frequency.exponentialRampToValueAtTime(freq * 1.5 * pitchMult, now + startOffset + duration);
                
                gainNode.gain.setValueAtTime(volBase * 0.7, now + startOffset);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
                
                osc.start(now + startOffset);
                osc.stop(now + startOffset + duration + 0.01);
            };
            
            playStep(440, 0); // A4
            playStep(554.37, 0.05); // C#5
            playStep(659.25, 0.1); // E5
            playStep(880, 0.15); // A5
            
            if (isLegendary) {
                playStep(1108.73, 0.2); // C#6
                playStep(1318.51, 0.25); // E6
                playStep(1760, 0.3); // A6
            }
        }
    }

    static playProceduralFootstep(suitType) {
        if (this.globalMuted || !this.isUnlocked) return;
        
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        let pitchRandom = 0.85 + Math.random() * 0.3; // +/- 15% random pitch
        let volRandom = 0.8 + Math.random() * 0.4;    // +/- 20% random volume
        
        if (suitType === 'SCOUT') {
            // Light metallic tap
            osc.type = 'sine';
            const duration = 0.04;
            const startFreq = 220 * pitchRandom;
            const endFreq = 100 * pitchRandom;
            
            osc.frequency.setValueAtTime(startFreq, now);
            osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
            
            gainNode.gain.setValueAtTime(0.02 * volRandom, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            osc.start(now);
            osc.stop(now + duration + 0.01);
            
            // Tiny high-frequency metallic tick
            const tick = audioCtx.createOscillator();
            const tickGain = audioCtx.createGain();
            tick.connect(tickGain);
            tickGain.connect(this.sfxGain);
            tick.type = 'triangle';
            tick.frequency.setValueAtTime(2500, now);
            tickGain.gain.setValueAtTime(0.005 * volRandom, now);
            tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
            tick.start(now);
            tick.stop(now + 0.012);
        } 
        else if (suitType === 'TANK') {
            // Heavy metallic clunk
            osc.type = 'triangle';
            const duration = 0.09;
            const startFreq = 85 * pitchRandom;
            const endFreq = 40 * pitchRandom;
            
            osc.frequency.setValueAtTime(startFreq, now);
            osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
            
            gainNode.gain.setValueAtTime(0.09 * volRandom, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            osc.start(now);
            osc.stop(now + duration + 0.01);
            
            // Secondary low-mid ringing note to simulate heavy armor resonating
            const reson = audioCtx.createOscillator();
            const resonGain = audioCtx.createGain();
            reson.connect(resonGain);
            resonGain.connect(this.sfxGain);
            reson.type = 'sine';
            reson.frequency.setValueAtTime(170 * pitchRandom, now);
            resonGain.gain.setValueAtTime(0.03 * volRandom, now);
            resonGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            reson.start(now);
            reson.stop(now + 0.07);
        } 
        else { // ENGINEER
            // Tech-medium step with high-freq chirp
            osc.type = 'sine';
            const duration = 0.06;
            const startFreq = 140 * pitchRandom;
            const endFreq = 60 * pitchRandom;
            
            osc.frequency.setValueAtTime(startFreq, now);
            osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
            
            gainNode.gain.setValueAtTime(0.04 * volRandom, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            osc.start(now);
            osc.stop(now + duration + 0.01);
            
            // Small tech chirp
            const chirp = audioCtx.createOscillator();
            const chirpGain = audioCtx.createGain();
            chirp.connect(chirpGain);
            chirpGain.connect(this.sfxGain);
            chirp.type = 'sine';
            chirp.frequency.setValueAtTime(1200 * pitchRandom, now);
            chirp.frequency.exponentialRampToValueAtTime(800 * pitchRandom, now + 0.02);
            chirpGain.gain.setValueAtTime(0.007 * volRandom, now);
            chirpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
            chirp.start(now);
            chirp.stop(now + 0.022);
        }
    }

    static playProceduralJunkBurst(junkType = 'bunker_junk') {
        if (this.globalMuted || !this.isUnlocked) return;
        
        const now = audioCtx.currentTime;
        let pitchRandom = 0.9 + Math.random() * 0.2; // +/- 10% variation
        
        // Scale parameters based on rarity type
        let rarityMult = 1.0;
        if (junkType.includes('uncommon')) rarityMult = 1.2;
        else if (junkType.includes('rare')) rarityMult = 1.4;
        else if (junkType.includes('legendary')) rarityMult = 1.7;
        
        // 1. Low Thump (Explosion element)
        const thumpOsc = audioCtx.createOscillator();
        const thumpGain = audioCtx.createGain();
        thumpOsc.connect(thumpGain);
        thumpGain.connect(this.sfxGain);
        thumpOsc.type = 'triangle';
        
        const baseStartThump = junkType.includes('legendary') ? 100 : 130;
        const startThump = baseStartThump * pitchRandom;
        const endThump = 35 * pitchRandom;
        const thumpDuration = 0.18 * rarityMult;
        
        thumpOsc.frequency.setValueAtTime(startThump, now);
        thumpOsc.frequency.exponentialRampToValueAtTime(endThump, now + thumpDuration);
        
        thumpGain.gain.setValueAtTime(0.24 * rarityMult, now);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, now + thumpDuration);
        
        thumpOsc.start(now);
        thumpOsc.stop(now + thumpDuration + 0.02);
        
        // 2. Mid Squish (Wet filter/frequency modulation sweep)
        const squishOsc = audioCtx.createOscillator();
        const squishGain = audioCtx.createGain();
        squishOsc.connect(squishGain);
        squishGain.connect(this.sfxGain);
        squishOsc.type = 'sine';
        
        const startSquish = 550 * pitchRandom;
        const endSquish = 90 * pitchRandom;
        const squishDuration = 0.11 * rarityMult;
        
        squishOsc.frequency.setValueAtTime(startSquish, now);
        squishOsc.frequency.exponentialRampToValueAtTime(endSquish, now + squishDuration);
        
        squishGain.gain.setValueAtTime(0.12 * rarityMult, now);
        squishGain.gain.exponentialRampToValueAtTime(0.001, now + squishDuration);
        
        squishOsc.start(now);
        squishOsc.stop(now + squishDuration + 0.02);
        
        // 3. High Pop (Crisp contact pop transient)
        const popOsc = audioCtx.createOscillator();
        const popGain = audioCtx.createGain();
        popOsc.connect(popGain);
        popGain.connect(this.sfxGain);
        popOsc.type = 'triangle';
        
        const startPop = (junkType.includes('legendary') ? 3000 : 2400) * pitchRandom;
        const endPop = 700 * pitchRandom;
        const popDuration = 0.016 * rarityMult;
        
        popOsc.frequency.setValueAtTime(startPop, now);
        popOsc.frequency.exponentialRampToValueAtTime(endPop, now + popDuration);
        
        popGain.gain.setValueAtTime(0.15 * rarityMult, now);
        popGain.gain.exponentialRampToValueAtTime(0.001, now + popDuration);
        
        popOsc.start(now);
        popOsc.stop(now + popDuration + 0.01);
    }

    static setMusicTension(level = 'exploring') {
        if (!this.isUnlocked) return;
        const targets = {
            safe:      { music: 0.03, world: 0.6, ambientRate: 0.7 },
            exploring: { music: 0.05, world: 1.0, ambientRate: 1.0 },
            threatened: { music: 0.09, world: 1.3, ambientRate: 1.4 }
        };
        const cfg = targets[level] ?? targets.exploring;
        const t = audioCtx.currentTime + 1.2; // 1.2s crossfade
        this.musicGain.gain.linearRampToValueAtTime(cfg.music * this.masterVolume, t);
        this.worldGain.gain.linearRampToValueAtTime(cfg.world * this.masterVolume, t);
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
