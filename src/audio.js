const AudioContextClass = (typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null) || globalThis.AudioContext || class MockAudioCtx {
    constructor() {
        this.destination = {};
        this.currentTime = 0;
        this.state = 'running';
    }
    createGain() {
        return {
            gain: { value: 1, setTargetAtTime: () => {}, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
            connect: () => {}
        };
    }
    createOscillator() {
        return {
            type: 'sine',
            frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
            connect: () => {},
            start: () => {},
            stop: () => {}
        };
    }
    createBiquadFilter() {
        return {
            type: 'lowpass',
            frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
            Q: { setValueAtTime: () => {} },
            connect: () => {}
        };
    }
    createBufferSource() {
        return { buffer: null, playbackRate: { value: 1 }, detune: { value: 0 }, connect: () => {}, start: () => {}, stop: () => {} };
    }
    resume() { return Promise.resolve(); }
};
export const audioCtx = new AudioContextClass();

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
    static voiceGain = audioCtx.createGain();
    // Tension multiplier sits between the music sources and the user music
    // slider (musicGain) so runtime intensity and the user mix no longer fight.
    static musicTensionGain = audioCtx.createGain();

    static voiceVolume = 1.0;
    static voiceEnabled = true;

    static isUnlocked = false;
    static randInterval = null;
    static _lastMetalStressAt = 0;

    // Active looping music track + the context it represents (for crossfading).
    static activeMusic = null;
    static _pendingMusicContext = null;
    static _musicFadeSeconds = 1.6;

    static init() {
        this.masterGain.connect(audioCtx.destination);
        this.sfxGain.connect(this.masterGain);
        this.worldGain.connect(this.masterGain);
        this.musicGain.connect(this.masterGain);
        this.voiceGain.connect(this.masterGain);
        this.musicTensionGain.connect(this.musicGain);

        // Base volume mix
        this.masterGain.gain.value = 1.0;
        this.sfxGain.gain.value = 1.0;
        this.worldGain.gain.value = 1.0;
        this.musicGain.gain.value = 1.0;
        this.voiceGain.gain.value = 1.0;
        // Start mid-tension so music is clearly audible from the first frame.
        this.musicTensionGain.gain.value = 0.6;
    }

    static async unlock() {
        if (!this.isUnlocked) {
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
            this.isUnlocked = true;
            if (typeof window !== 'undefined' && window.hbLog) {
                window.hbLog('AUDIO', 'info', 'AudioContext unlocked', { state: audioCtx.state });
            }
        }
    }

    static toggleMute(muted) {
        this.globalMuted = muted;
        this.masterGain.gain.setTargetAtTime(muted ? 0 : this.masterVolume, audioCtx.currentTime, 0.1);
        if (typeof window !== 'undefined' && window.hbLog) {
            window.hbLog('AUDIO', 'info', `Global mute set to: ${muted}`);
        }
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
            : channel === 'voice'
                ? this.voiceGain
                : (channel === 'vfx' || channel === 'sfx')
                    ? this.sfxGain
                    : null;

        if (!gainNode) return;
        gainNode.gain.setTargetAtTime(clamped, audioCtx.currentTime, 0.05);
        if (channel === 'voice') this.voiceVolume = clamped;
    }

    static setMix(mix = {}) {
        if (mix.master !== undefined) this.setChannelVolume('master', mix.master);
        else if (mix.world !== undefined) this.setChannelVolume('master', mix.world);

        if (mix.music !== undefined) this.setChannelVolume('music', mix.music);
        if (mix.voice !== undefined) this.setChannelVolume('voice', mix.voice);
        if (mix.voiceEnabled !== undefined) this.voiceEnabled = Boolean(mix.voiceEnabled);

        if (mix.vfx !== undefined) this.setChannelVolume('vfx', mix.vfx);
        else if (mix.sfx !== undefined) this.setChannelVolume('vfx', mix.sfx);
    }

    static async loadAssets(manifest, onProgress) {
        const total = manifest.audio.length + manifest.images.length;
        let loaded = 0;
        if (typeof window !== 'undefined' && window.hbLog) {
            window.hbLog('AUDIO', 'info', `Loading assets manifest (${manifest.audio.length} audio, ${manifest.images.length} images)`);
        }

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
                img.src = assetUrl(url);
            });
        });

        // Load Audio
        const audioPromises = manifest.audio.map(async item => {
            try {
                const audioBuffer = await this.decodeAudioAsset(item.url);
                this.buffers[item.key] = audioBuffer;
                updateProgress(item.url);
            } catch (e) {
                if (item.fallbackUrl) {
                    try {
                        const fallbackBuffer = await this.decodeAudioAsset(item.fallbackUrl);
                        this.buffers[item.key] = fallbackBuffer;
                        updateProgress(item.url);
                        return;
                    } catch (fallbackError) {
                        console.warn(`Failed to load audio: ${item.url}; fallback also failed: ${item.fallbackUrl}`, fallbackError);
                    }
                } else {
                    console.warn(`Failed to load audio: ${item.url}`, e);
                }
                updateProgress(item.url);
            }
        });

        await Promise.all([...imagePromises, ...audioPromises]);
        if (typeof window !== 'undefined' && window.hbLog) {
            window.hbLog('AUDIO', 'info', `Asset manifest loading finished (${loaded}/${total} loaded)`);
        }
    }

    static async decodeAudioAsset(url) {
        const response = await fetch(assetUrl(url));
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} while loading ${url}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return audioCtx.decodeAudioData(arrayBuffer);
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
            : key.startsWith('voice_')
                ? 'voice'
                : key.startsWith('mainbg_')
                    ? 'music'
                    : (options.isBg ? 'music' : 'sfx');
        const bus = requestedBus === 'world' || requestedBus === 'music' || requestedBus === 'sfx' || requestedBus === 'voice'
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
        let panner = null;
        if (options.pan !== undefined && Number.isFinite(options.pan)) {
            panner = audioCtx.createStereoPanner();
            panner.pan.value = Math.max(-1, Math.min(1, options.pan));
            gainNode.connect(panner);
            lastNode = panner;
        }

        // Connect to appropriate bus
        if (bus === 'world') {
            lastNode.connect(this.worldGain); // Environment/ambient loops use the world bus
        } else if (bus === 'music') {
            lastNode.connect(this.musicTensionGain); // Music routes through the tension multiplier
        } else if (bus === 'voice') {
            lastNode.connect(this.voiceGain); // Character Voice Audio bus
        } else {
            lastNode.connect(this.sfxGain);
        }

        source.start(0);
        return { source, gainNode, panner };
    }

    static playVoiceForMessage(speakerInfo = {}, messageText = '') {
        if (this.globalMuted || !this.isUnlocked || !this.voiceEnabled) return null;
        if (this.voiceGain.gain.value <= 0.001) return null;

        const speakerName = String(typeof speakerInfo === 'string' ? speakerInfo : (speakerInfo.name || speakerInfo.speaker || '')).toUpperCase();
        const text = String(messageText || (typeof speakerInfo === 'object' ? speakerInfo.cleanText || speakerInfo.text || '' : '')).trim();

        // 1. Check if an authored voice track buffer exists in AudioManager.buffers
        const textLower = text.toLowerCase();
        let targetKey = null;

        if (textLower.includes('purple one') || textLower.includes('drew robot 4a')) targetKey = 'voice_lucia_message';
        else if (textLower.includes('you look like hell')) targetKey = 'voice_marisol_ch1_01';
        else if (textLower.includes('good side')) targetKey = 'voice_elias_ch1_01';
        else if (textLower.includes('not harder. smarter')) targetKey = 'voice_elias_ch2_01';
        else if (textLower.includes('point of contact is neutral')) targetKey = 'voice_hr_ch3_01';
        else if (textLower.includes('neutral word for bleeding')) targetKey = 'voice_elias_ch3_01';
        else if (textLower.includes('she needs it tonight')) targetKey = 'voice_elias_ch4_01';
        else if (textLower.includes('command not recognized')) targetKey = 'voice_kiosk_ch4_01';
        else if (textLower.includes('training model sort arm 4a')) targetKey = 'voice_system_ch5_01';
        else if (textLower.includes('thermal warning in sector 4')) targetKey = 'voice_system_ch6_01';

        if (targetKey && this.buffers[targetKey]) {
            return this.play(targetKey, { bus: 'voice', volume: 1.0, varyPitch: false });
        }

        // 2. Character-Matched Procedural Voice Vocalizer
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.voiceGain);

        let baseFreq = 220;
        let endFreq = 180;
        let waveType = 'sine';
        let filterFreq = 1200;
        let duration = 0.14;

        if (speakerName.includes('MOTHERSHIP')) {
            baseFreq = 380; endFreq = 260; waveType = 'sawtooth'; filterFreq = 1400; duration = 0.16;
        } else if (speakerName.includes('EXOSUIT') || speakerName.includes('SYSTEM')) {
            baseFreq = 520; endFreq = 440; waveType = 'triangle'; filterFreq = 2200; duration = 0.12;
        } else if (speakerName.includes('BUNKER') || speakerName.includes('FACILITIES')) {
            baseFreq = 160; endFreq = 130; waveType = 'square'; filterFreq = 800; duration = 0.22;
        } else if (speakerName.includes('QUEEN')) {
            baseFreq = 310; endFreq = 220; waveType = 'sine'; filterFreq = 3000; duration = 0.28;
        } else if (speakerName.includes('TANK')) {
            baseFreq = 110; endFreq = 95; waveType = 'triangle'; filterFreq = 650; duration = 0.18;
        } else if (speakerName.includes('SCOUT')) {
            baseFreq = 680; endFreq = 840; waveType = 'sine'; filterFreq = 2800; duration = 0.10;
        } else if (speakerName.includes('ENGINEER')) {
            baseFreq = 440; endFreq = 360; waveType = 'square'; filterFreq = 1600; duration = 0.13;
        } else if (speakerName.includes('MARTHA') || speakerName.includes('MARISOL')) {
            baseFreq = 340; endFreq = 310; waveType = 'sine'; filterFreq = 1800; duration = 0.15;
        } else if (speakerName.includes('BRIGGS') || speakerName.includes('KAELEN')) {
            baseFreq = 170; endFreq = 150; waveType = 'triangle'; filterFreq = 1100; duration = 0.16;
        }

        const pitchShift = 0.94 + Math.random() * 0.12;
        baseFreq *= pitchShift;
        endFreq *= pitchShift;

        osc.type = waveType;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(baseFreq * 1.5, now);
        osc2.frequency.exponentialRampToValueAtTime(endFreq * 1.5, now + duration);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(filterFreq, now);
        filter.Q.setValueAtTime(4.0, now);

        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(0.25, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.start(now);
        osc2.start(now);
        osc.stop(now + duration + 0.02);
        osc2.stop(now + duration + 0.02);

        return { source: osc, gainNode };
    }

    static _isGameplayAudioContext() {
        if (typeof window === 'undefined') return true;
        if (typeof window.isGameplayPhase === 'function') return window.isGameplayPhase();
        return window.game?.performanceProfile !== 'menu';
    }

    // The metal-stress family is the game's static-like cue. Keep it on the
    // VFX/SFX mix, lower than the raw asset volume, and suppress it on menus.
    static playMetalStress(options = {}) {
        if (this.globalMuted || !this.isUnlocked) return null;
        if (options.gameplayOnly !== false && !this._isGameplayAudioContext()) return null;

        const force = Boolean(options.force);
        const minGapMs = Math.max(0, Number(options.minGapMs ?? 900));
        const chance = Math.max(0, Math.min(1, Number(options.chance ?? 1)));
        const now = Date.now();
        if (!force && minGapMs > 0 && now - this._lastMetalStressAt < minGapMs) return null;
        if (!force && chance < 1 && Math.random() > chance) return null;

        const volumeInput = Number(options.volume ?? 0.08);
        const volume = Math.max(0.01, Math.min(0.12, volumeInput * 0.35));
        const playbackRate = Number.isFinite(Number(options.playbackRate))
            ? Math.max(0.35, Math.min(2.5, Number(options.playbackRate)))
            : 1;

        const result = this.play('amb_metal_stress', {
            ...options,
            bus: 'sfx',
            volume,
            playbackRate,
            varyPitch: false
        });
        if (result) this._lastMetalStressAt = now;
        return result;
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

    static playProceduralBreathing(options = {}) {
        if (this.globalMuted || !this.isUnlocked) return null;

        const now = audioCtx.currentTime;
        const duration = Math.max(0.5, Number(options.duration) || 2.4);
        const volume = Math.max(0, Math.min(1, Number(options.volume ?? 0.08)));

        const lowOsc = audioCtx.createOscillator();
        const lfo = audioCtx.createOscillator();
        const lfoGain = audioCtx.createGain();
        const breathGain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        lowOsc.type = 'sine';
        lowOsc.frequency.setValueAtTime(Number(options.frequency) || 54, now);
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.42, now);
        lfoGain.gain.setValueAtTime(volume * 0.55, now);
        breathGain.gain.setValueAtTime(0.0001, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(260, now);
        filter.Q.setValueAtTime(6, now);

        lfo.connect(lfoGain);
        lfoGain.connect(breathGain.gain);
        lowOsc.connect(filter);
        filter.connect(breathGain);
        breathGain.connect(this.worldGain);

        breathGain.gain.linearRampToValueAtTime(volume, now + 0.25);
        breathGain.gain.setValueAtTime(volume, now + Math.max(0.3, duration - 0.35));
        breathGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        lowOsc.start(now);
        lfo.start(now);
        lowOsc.stop(now + duration + 0.05);
        lfo.stop(now + duration + 0.05);
        return { source: lowOsc, gainNode: breathGain };
    }

    static playProceduralScrape(options = {}) {
        if (this.globalMuted || !this.isUnlocked) return null;

        const now = audioCtx.currentTime;
        const duration = Math.max(0.12, Number(options.duration) || 0.55);
        const volume = Math.max(0, Math.min(1, Number(options.volume ?? 0.22)));

        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        osc.type = 'sawtooth';
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(900, now);
        filter.frequency.exponentialRampToValueAtTime(140, now + duration);
        filter.Q.setValueAtTime(11, now);

        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + duration);
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + duration + 0.05);
        return { source: osc, gainNode };
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
        // Tension is a 0..1 multiplier on the music bus; the user music slider
        // (musicGain) and master (masterGain) are applied separately downstream,
        // so we no longer attenuate twice or fight the mixer. Baselines are
        // rebalanced so music is clearly present throughout a run.
        const targets = {
            safe:       { music: 0.5,  world: 0.6 },
            exploring:  { music: 0.62, world: 1.0 },
            threatened: { music: 0.78, world: 1.25 },
            boss:       { music: 0.85, world: 1.3 }
        };
        const cfg = targets[level] ?? targets.exploring;
        const t = audioCtx.currentTime + 1.2; // 1.2s crossfade
        this.musicTensionGain.gain.linearRampToValueAtTime(cfg.music, t);
        this.worldGain.gain.linearRampToValueAtTime(cfg.world, t);
    }

    // Map a gameplay context to a track key; falls back to the legacy single
    // track when the contextual stems are not present in the loaded buffers.
    static MUSIC_CONTEXT_TRACKS = {
        safe_ship:    'music_safe_ship',
        cryo_explore: 'music_cryo_explore',
        bio_explore:  'music_bio_explore',
        combat:       'music_combat_threatened'
    };

    static resolveMusicTrackKey(context) {
        const mapped = this.MUSIC_CONTEXT_TRACKS[context];
        if (mapped && this.buffers[mapped]) return mapped;
        return this.buffers.mainbg_music ? 'mainbg_music' : mapped;
    }

    // Crossfade the looping background track for the given gameplay context so
    // music is always present and only the tone changes on biome/threat shifts.
    static setMusicContext(context = 'safe_ship') {
        if (!this.isUnlocked) {
            this._pendingMusicContext = context; // applied on unlock/startAmbience
            return;
        }
        const bufferKey = this.resolveMusicTrackKey(context);
        if (!bufferKey || !this.buffers[bufferKey]) return;

        // Already on the right context, or two contexts share the fallback track.
        if (this.activeMusic && this.activeMusic.context === context) return;
        if (this.activeMusic && this.activeMusic.bufferKey === bufferKey) {
            this.activeMusic.context = context;
            return;
        }

        const fade = this._musicFadeSeconds;
        const now = audioCtx.currentTime;

        // Fade out and retire the previous track.
        const previous = this.activeMusic;
        if (previous?.gainNode && previous?.source) {
            const g = previous.gainNode.gain;
            g.cancelScheduledValues(now);
            g.setValueAtTime(g.value, now);
            g.linearRampToValueAtTime(0.0001, now + fade);
            try { previous.source.stop(now + fade + 0.05); } catch (err) { void err; }
        }

        // Start the new track silent and fade it up.
        const started = this.play(bufferKey, { volume: 0.0001, loop: true, bus: 'music', varyPitch: false });
        if (!started) return;
        const ng = started.gainNode.gain;
        ng.cancelScheduledValues(now);
        ng.setValueAtTime(0.0001, now);
        ng.linearRampToValueAtTime(1.0, now + fade);

        this.activeMusic = { source: started.source, gainNode: started.gainNode, bufferKey, context };
        this.musicSource = started.source; // keep legacy reference current
    }

    static startAmbience() {
        if (this.ambientSource) return; // Already playing

        // Play Drone
        const drone = this.play('amb_bunker_loop', { volume: 0.005, loop: true, bus: 'world', varyPitch: false });
        if (drone) this.ambientSource = drone.source;

        // Start contextual background music (crossfade-managed). Honour any
        // context requested before the audio graph was unlocked.
        this.setMusicContext(this._pendingMusicContext ?? 'safe_ship');
        this._pendingMusicContext = null;

        // Start random ambient pings (drips only; static now comes from
        // specific gameplay cues so it doesn't wash over the whole menu flow).
        if (!this.randInterval) {
            this.randInterval = setInterval(() => {
                if (this.globalMuted || Math.random() > 0.6) return; // 40% chance to play something

                this.play('amb_drip', {
                    bus: 'world',
                    volume: 0.12 + (Math.random() * 0.08),
                    playbackRate: 0.8 + (Math.random() * 0.4) // randomize pitch slightly
                });
            }, 5000); // Check every 5 seconds
        }
    }

    static startMenuMusic() {
        if (!this.isUnlocked) {
            this._pendingMusicContext = 'safe_ship';
            return;
        }
        // The menu should only carry the title music. Any looping ambience
        // from gameplay needs to stop here so it can't bleed under the theme.
        this.stopAmbience({ stopMusic: false });
        this.setMusicTension('safe');
        this.setMusicContext('safe_ship');
    }

    static stopMusic({ fadeSeconds = this._musicFadeSeconds } = {}) {
        if (!this.activeMusic?.source || !this.activeMusic?.gainNode) {
            this.activeMusic = null;
            this.musicSource = null;
            return;
        }

        const now = audioCtx.currentTime;
        const fade = Math.max(0, Number(fadeSeconds) || 0);
        const { source, gainNode } = this.activeMusic;
        const gain = gainNode.gain;
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(gain.value, now);
        gain.linearRampToValueAtTime(0.0001, now + fade);
        try { source.stop(now + fade + 0.05); } catch (err) { void err; }
        this.activeMusic = null;
        this.musicSource = null;
    }

    static stopAmbience({ stopMusic = false, musicFadeSeconds = this._musicFadeSeconds } = {}) {
        if (this.ambientSource) {
            try { this.ambientSource.stop(); } catch (err) { void err; }
            this.ambientSource = null;
        }
        if (stopMusic) this.stopMusic({ fadeSeconds: musicFadeSeconds });
        if (this.randInterval) {
            clearInterval(this.randInterval);
            this.randInterval = null;
        }
    }
}

AudioManager.init();
import { assetUrl } from './assetUrl.js';
