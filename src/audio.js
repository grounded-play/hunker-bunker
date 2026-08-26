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
    static foleyGain = audioCtx.createGain();
    static rainGain = audioCtx.createGain();
    // Tension multiplier sits between the music sources and the user music
    // slider (musicGain) so runtime intensity and the user mix no longer fight.
    static musicTensionGain = audioCtx.createGain();

    static campRainSource = null;
    static activeDialogueStage = null;

    // Centralized Speech Director & Active Voice State
    static activeVoice = {
        source: null,
        gainNode: null,
        priority: -1,
        startedAt: 0,
        estimatedDuration: 0,
        promise: null,
        resolve: null
    };
    static voiceQueue = [];

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
        this.foleyGain.connect(this.masterGain);
        this.rainGain.connect(this.worldGain);
        this.musicTensionGain.connect(this.musicGain);

        // Base volume mix
        this.masterGain.gain.value = 1.0;
        this.sfxGain.gain.value = 1.0;
        this.worldGain.gain.value = 1.0;
        this.musicGain.gain.value = 1.0;
        this.voiceGain.gain.value = 1.0;
        this.foleyGain.gain.value = 1.0;
        this.rainGain.gain.value = 1.0;
        // Start mid-tension so music is clearly audible from the first frame.
        this.musicTensionGain.gain.value = 0.6;
        this.stopActiveVoice(0);
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
                : channel === 'foley'
                    ? this.foleyGain
                    : (channel === 'ambient' || channel === 'rain')
                        ? this.rainGain
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
        presentationTelemetry.emit('AUDIO', PRESENTATION_EVENTS.AUDIO.LOAD_START, {
            audioCount: manifest.audio.length,
            imageCount: manifest.images.length
        });
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
                    presentationTelemetry.emit('AUDIO', PRESENTATION_EVENTS.AUDIO.LOAD_FAILED, { type: 'image', url, reason: 'image-error' });
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
                        presentationTelemetry.emit('AUDIO', PRESENTATION_EVENTS.AUDIO.LOAD_FAILED, {
                            type: 'audio',
                            key: item.key,
                            url: item.url,
                            fallbackUrl: item.fallbackUrl,
                            reason: fallbackError?.message ?? String(fallbackError)
                        });
                    }
                } else {
                    console.warn(`Failed to load audio: ${item.url}`, e);
                    presentationTelemetry.emit('AUDIO', PRESENTATION_EVENTS.AUDIO.LOAD_FAILED, {
                        type: 'audio',
                        key: item.key,
                        url: item.url,
                        reason: e?.message ?? String(e)
                    });
                }
                updateProgress(item.url);
            }
        });

        await Promise.all([...imagePromises, ...audioPromises]);
        if (typeof window !== 'undefined' && window.hbLog) {
            window.hbLog('AUDIO', 'info', `Asset manifest loading finished (${loaded}/${total} loaded)`);
        }
        presentationTelemetry.emit('AUDIO', PRESENTATION_EVENTS.AUDIO.LOAD_COMPLETE, { loaded, total });
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
        if (matchingKeys.length === 0) {
            presentationTelemetry.emit('AUDIO', PRESENTATION_EVENTS.AUDIO.PLAY_MISSING, { key });
            return null;
        }

        // Pick a random variation
        const selectedKey = matchingKeys[Math.floor(Math.random() * matchingKeys.length)];
        presentationTelemetry.emit('AUDIO', PRESENTATION_EVENTS.AUDIO.PLAY, {
            requestedKey: key,
            selectedKey,
            bus: options.bus ?? 'sfx'
        });

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
        } else if (bus === 'foley') {
            lastNode.connect(this.foleyGain); // Staged Room Tone & Scene Foley bus
        } else {
            lastNode.connect(this.sfxGain);
        }

        source.start(0);
        return { source, gainNode, panner };
    }

    static isVoiceSpeaking() {
        if (!this.activeVoice?.source) return false;
        const now = audioCtx.currentTime;
        return (now - (this.activeVoice.startedAt || 0)) < (this.activeVoice.estimatedDuration || 0);
    }

    static getActiveVoiceDurationRemaining() {
        if (!this.activeVoice?.source) return 0;
        const now = audioCtx.currentTime;
        const remaining = ((this.activeVoice.startedAt || 0) + (this.activeVoice.estimatedDuration || 0)) - now;
        return Math.max(0, remaining);
    }

    static stopActiveVoice(fadeSeconds = 0.08) {
        if (!this.activeVoice?.source) return;
        const now = audioCtx.currentTime;
        if (this.activeVoice.gainNode?.gain) {
            try {
                this.activeVoice.gainNode.gain.setValueAtTime(this.activeVoice.gainNode.gain.value || 1.0, now);
                this.activeVoice.gainNode.gain.linearRampToValueAtTime(0.001, now + fadeSeconds);
            } catch (e) { void e; }
        }
        const src = this.activeVoice.source;
        setTimeout(() => {
            try { src.stop?.(); } catch (e) { void e; }
        }, Math.max(20, Math.round(fadeSeconds * 1000)));

        this.activeVoice.resolve?.(false);
        this.activeVoice.source = null;
        this.activeVoice.gainNode = null;
        this.activeVoice.priority = -1;
        this.activeVoice.startedAt = 0;
        this.activeVoice.estimatedDuration = 0;
        this.activeVoice.promise = null;
        this.activeVoice.resolve = null;

        // Restore music ducking
        try {
            this.musicGain.gain.setTargetAtTime(1.0, audioCtx.currentTime + 0.05, 0.4);
        } catch (e) { void e; }
    }

    static playVoiceTrack(key, options = {}) {
        if (this.globalMuted || !this.voiceEnabled) return null;
        if (!this.buffers[key]) return null;

        const priority = options.priority !== undefined ? options.priority : 3;
        const now = audioCtx.currentTime;

        // If the exact same voice buffer is already actively speaking, do NOT restart it over itself
        if (this.isVoiceSpeaking() && this.activeVoice?.bufferKey === key) {
            return this.activeVoice;
        }

        // If a higher-priority narrative voice track is active (<= 2), don't clobber it with lower priority
        if (this.activeVoice?.source && this.activeVoice.priority <= 2 && this.activeVoice.priority < priority) {
            const remaining = ((this.activeVoice.startedAt || 0) + (this.activeVoice.estimatedDuration || 0)) - now;
            if (remaining > 0.15) {
                return null;
            }
        }

        // If a voice track of equal priority is already speaking, and force is not set:
        // don't interrupt if it's the same speaker
        if (this.isVoiceSpeaking() && this.activeVoice?.priority === priority && !options.force) {
            if (this.activeVoice?.speakerName && options.speakerName && this.activeVoice.speakerName === options.speakerName) {
                return this.activeVoice;
            }
        }

        // Stop existing lower/equal priority voice cleanly
        this.stopActiveVoice(0.06);

        const playback = this.play(key, {
            bus: 'voice',
            volume: options.volume !== undefined ? options.volume : 1.0,
            varyPitch: false,
            ...options
        });

        if (!playback) return null;

        const buffer = this.buffers[key];
        const pbRate = options.playbackRate || 1.0;
        const duration = (buffer && buffer.duration) ? (buffer.duration / pbRate) : (options.duration || 3.0);

        let resolveFn = null;
        const completionPromise = new Promise((resolve) => { resolveFn = resolve; });

        this.activeVoice = {
            source: playback.source,
            gainNode: playback.gainNode,
            bufferKey: key,
            speakerName: options.speakerName || null,
            priority,
            startedAt: now,
            estimatedDuration: duration,
            promise: completionPromise,
            resolve: resolveFn
        };

        // Auto-duck music for narrative priorities (<= 2)
        if (priority <= 2 && options.duckMusic !== false) {
            try {
                this.musicGain.gain.setTargetAtTime(0.35, now, 0.2);
            } catch (e) { void e; }
        }

        const onEndCleanup = () => {
            if (this.activeVoice?.source === playback.source) {
                this.activeVoice.source = null;
                this.activeVoice.gainNode = null;
                this.activeVoice.bufferKey = null;
                this.activeVoice.speakerName = null;
                this.activeVoice.priority = -1;
                this.activeVoice.startedAt = 0;
                this.activeVoice.estimatedDuration = 0;
                this.activeVoice.promise = null;
                this.activeVoice.resolve = null;
                if (priority <= 2 && options.duckMusic !== false) {
                    try {
                        this.musicGain.gain.setTargetAtTime(1.0, audioCtx.currentTime + 0.1, 0.5);
                    } catch (e) { void e; }
                }
                resolveFn?.(true);
            }
        };

        if (playback.source) {
            playback.source.onended = onEndCleanup;
        }

        // Backup timer in case onended is not fired by browser or mock environment
        setTimeout(() => {
            if (this.activeVoice?.source === playback.source) {
                onEndCleanup();
            }
        }, Math.max(300, Math.round((duration * 1000) + 100)));

        return { ...playback, duration, promise: completionPromise };
    }

    static playVoiceCallout(cueType, options = {}) {
        if (this.globalMuted || !this.voiceEnabled) return null;
        // Suppress tactical combat chatter if narrative or leader dialogue is active
        if (this.isVoiceSpeaking() && this.activeVoice.priority <= 2) {
            return null;
        }

        const voicePackId = (typeof window !== 'undefined' ? (window.loadout?.state?.voicePackId || window.loadout?.getEquippedVoicePackId?.()) : null);
        if (!voicePackId) return null;

        let prefix = null;
        const idStr = String(voicePackId);
        if (idStr === '4148' || idStr === 'voicepack_soviet_commander') {
            prefix = 'voice_commander';
        } else if (idStr === '4149' || idStr === 'voicepack_aura') {
            prefix = 'voice_aura';
        }
        if (!prefix) return null;

        const cueMap = {
            breached: `${prefix}_breached`,
            reload: `${prefix}_reloading`,
            reloading: `${prefix}_reloading`,
            low_health: prefix === 'voice_commander' ? 'voice_commander_low_health' : 'voice_aura_shield_critical',
            shield_critical: prefix === 'voice_commander' ? 'voice_commander_low_health' : 'voice_aura_shield_critical',
            boss_spotted: prefix === 'voice_commander' ? 'voice_commander_boss_spotted' : 'voice_aura_threat_high',
            threat_high: prefix === 'voice_commander' ? 'voice_commander_boss_spotted' : 'voice_aura_threat_high',
            killstreak: prefix === 'voice_commander' ? 'voice_commander_killstreak' : 'voice_aura_target_down',
            target_down: `${prefix}_target_down`,
            victory: prefix === 'voice_commander' ? 'voice_commander_victory' : 'voice_aura_sector_cleared',
            sector_cleared: prefix === 'voice_commander' ? 'voice_commander_victory' : 'voice_aura_sector_cleared',
            overdrive_ready: prefix === 'voice_commander' ? 'voice_commander_killstreak' : 'voice_aura_overdrive_ready'
        };

        const targetKey = cueMap[cueType] || `${prefix}_${cueType}`;
        if (this.buffers[targetKey]) {
            return this.playVoiceTrack(targetKey, { priority: 4, volume: options.volume ?? 0.85, ...options });
        }
        return this.play(targetKey, { bus: 'voice', volume: options.volume ?? 0.85, ...options });
    }

    static playVoiceForMessage(speakerInfo = {}, messageText = '', options = {}) {
        if (this.globalMuted || !this.isUnlocked || !this.voiceEnabled) return null;
        if (this.voiceGain.gain.value <= 0.001) return null;

        // Skip typewriter chirps if full voice speech is actively playing
        if (options.isChirp && this.isVoiceSpeaking()) return null;

        const speakerName = String(typeof speakerInfo === 'string' ? speakerInfo : (speakerInfo.name || speakerInfo.speaker || '')).toUpperCase();
        const text = String(messageText || (typeof speakerInfo === 'object' ? speakerInfo.cleanText || speakerInfo.text || '' : '')).trim();
        const textLower = text.toLowerCase();

        // Assign voice priority based on speaker identity
        let priority = options.priority !== undefined ? options.priority : 3;
        if (speakerName.includes('BRIGGS') || speakerName.includes('MARTHA') || speakerName.includes('KAELEN')
            || speakerName.includes('NAHL') || speakerName.includes('VEY') || speakerName.includes('RHUN')
            || speakerName.includes('QUEEN') || speakerName.includes('OKONKWO')) {
            priority = 1;
        } else if (speakerName.includes('MOTHERSHIP') || speakerName.includes('SYSTEM') || speakerName.includes('EXOSUIT') || speakerName.includes('BUNKER')) {
            priority = 3;
        }

        // 1. Check direct key match or character script mapping
        let targetKey = null;

        // RGB authored voice clips
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

        // Mothership Command
        else if (speakerName.includes('MOTHERSHIP')) {
            if (textLower.includes('unauthorized biological') || textLower.includes('do not answer') || textLower.includes('extraction window')) targetKey = 'voice_mothership_02_warning_bio';
            else if (textLower.includes('abandoned') || textLower.includes('extermination') || textLower.includes('remain where you are')) targetKey = 'voice_mothership_03_orbital_purge';
            else if (textLower.includes("you're alive") || textLower.includes("you are alive") || textLower.includes("alive.")) targetKey = 'voice_mothership_01_alive';
        }
        // System / Exosuit
        else if (speakerName.includes('EXOSUIT') || speakerName.includes('SYSTEM')) {
            if (textLower.includes('uplink severed') || textLower.includes('telemetry lost') || textLower.includes('respiration')) targetKey = 'voice_system_02_uplink_severed';
            else if (textLower.includes('heartbeat') || textLower.includes('residual neural') || textLower.includes('manifest check')) targetKey = 'voice_system_03_five_heartbeats';
            else if (textLower.includes('oxygen') || textLower.includes('console stabilized') || textLower.includes('hull integrity')) targetKey = 'voice_system_01_o2_stabilized';
        }
        // Bunker / Facilities Director
        else if (speakerName.includes('BUNKER') || speakerName.includes('FACILITIES')) {
            if (textLower.includes('welcome committee') || textLower.includes('curiosity continues') || textLower.includes('movement logged')) targetKey = 'voice_bunker_02_welcome_committee';
            else if (textLower.includes('structure notes') || textLower.includes('disapproves') || textLower.includes('power has been rerouted') || textLower.includes('navigation telemetry')) targetKey = 'voice_bunker_03_depth_disapproves';
            else if (textLower.includes('unauthorized') || textLower.includes('darkness') || textLower.includes('suspended')) targetKey = 'voice_bunker_01_enjoy_darkness';
        }
        // The Queen
        else if (speakerName.includes('QUEEN')) {
            if (textLower.includes('whispers through') || textLower.includes('exterminators') || textLower.includes('sever the uplink')) targetKey = 'voice_queen_02_sever_uplink';
            else if (textLower.includes('grid dies') || textLower.includes('door left open') || textLower.includes('warm bodies') || textLower.includes('call that mercy')) targetKey = 'voice_queen_03_door_left_open';
            else if (textLower.includes('sleep now') || textLower.includes('choose a new world') || textLower.includes('when you wake')) targetKey = 'voice_queen_04_sleep_now';
            else if (textLower.includes('two heartbeats') || textLower.includes('one purpose') || textLower.includes('cold box') || textLower.includes('share the body')) targetKey = 'voice_queen_01_two_heartbeats';
        }
        // Commander Briggs
        else if (speakerName.includes('BRIGGS')) {
            if (textLower.includes('defense line') || textLower.includes('southern barricade') || textLower.includes('magazine') || textLower.includes('beyond the flare')) targetKey = 'voice_briggs_02_southern_barricade';
            else if (textLower.includes('died out there') || textLower.includes('sit down') || textLower.includes('ledger')) targetKey = 'voice_briggs_03_ledger_sit_down';
            else if (textLower.includes('stop') || textLower.includes('identify') || textLower.includes('turrets')) targetKey = 'voice_briggs_01_stop_identify';
        }
        // Overseer Kaelen
        else if (speakerName.includes('KAELEN')) {
            if (textLower.includes('sector zero') || textLower.includes('computer sleeps') || textLower.includes('its dream')) targetKey = 'voice_kaelen_02_sector_zero_dream';
            else if (textLower.includes('sensory telemetry') || textLower.includes('floor plating') || textLower.includes('pulse reads')) targetKey = 'voice_kaelen_03_pulse_through_floor';
            else if (textLower.includes('machine dreamed') || textLower.includes('dark at bay') || textLower.includes('primary bus')) targetKey = 'voice_kaelen_01_machine_dreamed';
        }
        // Dr. Okonkwo-Vass
        else if (speakerName.includes('OKONKWO') || speakerName.includes('VASS')) {
            if (textLower.includes('read us') || textLower.includes('my theory') || textLower.includes('do not hate us')) targetKey = 'voice_okonkwo_02_they_read_us';
            else if (textLower.includes('stand your ground') || textLower.includes('footnote') || textLower.includes('if i am right')) targetKey = 'voice_okonkwo_03_more_than_footnote';
            else if (textLower.includes('bitten') || textLower.includes('shelled ones') || textLower.includes('lazy science')) targetKey = 'voice_okonkwo_01_lazy_science';
        }
        // Nahl, the Suture
        else if (speakerName.includes('NAHL')) {
            if (textLower.includes('pain is information') || textLower.includes('calls it growth') || textLower.includes('look away')) targetKey = 'voice_nahl_02_pain_is_information';
            else if (textLower.includes('thread sever') || textLower.includes('stitched it back') || textLower.includes('separate hearts') || textLower.includes('beat in rhythm')) targetKey = 'voice_nahl_03_separate_hearts';
            else if (textLower.includes('hear me now') || textLower.includes('every sac') || textLower.includes('holes you left')) targetKey = 'voice_nahl_01_you_can_hear_me';
        }
        // Vey, the Listener
        else if (speakerName.includes('VEY')) {
            if (textLower.includes('every filament') || textLower.includes('archived') || textLower.includes('gaps where') || textLower.includes('relay')) targetKey = 'voice_vey_02_gaps_where_mined';
            else if (textLower.includes('mothership from here') || textLower.includes('easiest to forge') || textLower.includes('static quiets')) targetKey = 'voice_vey_03_forge_mothership';
            else if (textLower.includes('signal') || textLower.includes('not just noise') || textLower.includes('finally')) targetKey = 'voice_vey_01_signal_recognized';
        }
        // Rhun, the Shield
        else if (speakerName.includes('RHUN')) {
            if (textLower.includes('not prey') || textLower.includes('not queen') || textLower.includes('old armor')) targetKey = 'voice_rhun_02_not_prey_not_queen';
            else if (textLower.includes('guard what') || textLower.includes('shield that changes') || textLower.includes('gravestone')) targetKey = 'voice_rhun_03_guard_what';
            else if (textLower.includes('mark fades') || textLower.includes('stand in front') || textLower.includes('done')) targetKey = 'voice_rhun_04_stand_in_front';
            else if (textLower.includes('pried my plates') || textLower.includes('look at you')) targetKey = 'voice_rhun_01_pried_my_plates';
        }

        if (targetKey && this.buffers[targetKey]) {
            // If this exact buffer is already actively playing, don't restart it
            if (this.isVoiceSpeaking() && this.activeVoice?.bufferKey === targetKey) {
                return this.activeVoice;
            }
            return this.playVoiceTrack(targetKey, { priority, speakerName, volume: options.volume ?? 1.0, varyPitch: false, ...options });
        }

        // If voice is currently speaking, do not override with procedural fallback
        if (this.isVoiceSpeaking()) {
            return null;
        }

        // 2. Character-Matched Procedural Voice Vocalizer (Fallback)
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

        // Track procedural voice lifetime
        this.activeVoice = {
            source: osc,
            gainNode,
            priority,
            startedAt: now,
            estimatedDuration: duration + 0.04,
            promise: Promise.resolve(true),
            resolve: null
        };

        return { source: osc, gainNode };
    }

    // ── Staged Dialogue & Foley Engine ──────────────────────────────────
    static playStagedDialogue({
        voiceKey,
        roomToneKey,
        openingCue,
        closingCue,
        syncCues = [],
        volume = 1.0,
        duckMusic = true,
        onComplete = null
    } = {}) {
        if (this.globalMuted || !this.voiceEnabled) return null;

        // Stop any previous active dialogue stage
        this.stopStagedDialogue();

        const stage = {
            roomTone: null,
            voice: null,
            timeoutIds: [],
            isStopped: false
        };
        this.activeDialogueStage = stage;

        const now = audioCtx.currentTime;

        // 1. Duck Music during staged dialogue
        if (duckMusic) {
            this.musicGain.gain.setTargetAtTime(0.35, now, 0.3);
        }

        // 2. Start Room Tone if specified
        if (roomToneKey && this.buffers[roomToneKey]) {
            stage.roomTone = this.play(roomToneKey, {
                bus: 'foley',
                volume: 0.001,
                loop: true,
                varyPitch: false
            });
            if (stage.roomTone?.gainNode) {
                stage.roomTone.gainNode.gain.setValueAtTime(0.001, now);
                stage.roomTone.gainNode.gain.linearRampToValueAtTime(0.4, now + 0.4);
            }
        }

        // 3. Trigger Opening Cue
        if (openingCue && this.buffers[openingCue]) {
            this.play(openingCue, { bus: 'foley', volume: 0.7, varyPitch: false });
        }

        // 4. Play Main Voice Line
        const startVoiceDelay = openingCue ? 250 : 50;
        const voiceTimer = setTimeout(() => {
            if (stage.isStopped) return;
            if (voiceKey && this.buffers[voiceKey]) {
                stage.voice = this.play(voiceKey, {
                    bus: 'voice',
                    volume: volume,
                    varyPitch: false
                });

                const voiceDuration = this.buffers[voiceKey]?.duration || 3.0;

                // Fire sync cues anchored to offsets
                for (const cue of syncCues) {
                    const cueDelay = Math.max(0, (cue.offsetSeconds || 0) * 1000);
                    const cueTimer = setTimeout(() => {
                        if (stage.isStopped) return;
                        if (cue.key && this.buffers[cue.key]) {
                            this.play(cue.key, { bus: 'foley', volume: cue.volume ?? 0.6, varyPitch: false });
                        }
                    }, cueDelay);
                    stage.timeoutIds.push(cueTimer);
                }

                // Schedule wrap-up
                const wrapTimer = setTimeout(() => {
                    if (stage.isStopped) return;
                    if (closingCue && this.buffers[closingCue]) {
                        this.play(closingCue, { bus: 'foley', volume: 0.6, varyPitch: false });
                    }
                    // Fade out room tone gently
                    if (stage.roomTone?.gainNode) {
                        const ct = audioCtx.currentTime;
                        stage.roomTone.gainNode.gain.linearRampToValueAtTime(0.001, ct + 0.8);
                        setTimeout(() => {
                            try { stage.roomTone?.source?.stop(); } catch (e) { void e; }
                        }, 900);
                    }
                    // Restore music volume
                    if (duckMusic) {
                        this.musicGain.gain.setTargetAtTime(1.0, audioCtx.currentTime + 0.5, 0.6);
                    }
                    if (onComplete) onComplete();
                }, Math.max(500, (voiceDuration * 1000) - 100));
                stage.timeoutIds.push(wrapTimer);
            }
        }, startVoiceDelay);
        stage.timeoutIds.push(voiceTimer);

        return stage;
    }

    static stopStagedDialogue() {
        if (!this.activeDialogueStage) return;
        const stage = this.activeDialogueStage;
        stage.isStopped = true;
        for (const tid of stage.timeoutIds) {
            clearTimeout(tid);
        }
        if (stage.voice?.source) {
            try { stage.voice.source.stop(); } catch (e) { void e; }
        }
        if (stage.roomTone?.source) {
            try { stage.roomTone.source.stop(); } catch (e) { void e; }
        }
        this.activeDialogueStage = null;
        this.musicGain.gain.setTargetAtTime(1.0, audioCtx.currentTime, 0.2);
    }

    // ── Reusable Environmental Foley & Hazard Sound Triggers ────────────
    static playFoley(key, options = {}) {
        return this.play(key, { bus: 'foley', ...options });
    }

    static playBreakerBlackout(options = {}) {
        return this.play('foley_bunker_blackout_breaker', { bus: 'foley', volume: 0.75, ...options });
    }

    static playScannerAnomaly(options = {}) {
        return this.play('foley_exosuit_scanner_anomaly', { bus: 'foley', volume: 0.7, ...options });
    }

    static playSuitStartup(options = {}) {
        return this.play('foley_exosuit_startup', { bus: 'foley', volume: 0.8, ...options });
    }

    static playMechFootsteps(options = {}) {
        return this.play('foley_bunker_welcome_mech_steps', { bus: 'foley', volume: 0.65, ...options });
    }

    static playNeuralBond(options = {}) {
        return this.play('foley_queen_neural_bond', { bus: 'foley', volume: 0.7, ...options });
    }

    static playCableTear(options = {}) {
        return this.play('foley_queen_cable_tear', { bus: 'foley', volume: 0.75, ...options });
    }

    static playMembraneClose(options = {}) {
        return this.play('foley_queen_membrane_close', { bus: 'foley', volume: 0.7, ...options });
    }

    static playOrbitalLaunchRumble(options = {}) {
        return this.play('foley_mothership_orbital_launch', { bus: 'foley', volume: 0.8, ...options });
    }

    static playNavCorruption(options = {}) {
        return this.play('foley_bunker_nav_corruption', { bus: 'foley', volume: 0.65, ...options });
    }

    static playLinkAcquire(options = {}) {
        return this.play('foley_mothership_link_acquire_1', { bus: 'foley', volume: 0.6, ...options });
    }

    static playCarrierTerminate(options = {}) {
        return this.play('foley_mothership_carrier_term', { bus: 'foley', volume: 0.6, ...options });
    }

    static playSeverUplink(options = {}) {
        return this.play('foley_exosuit_sever_uplink', { bus: 'foley', volume: 0.7, ...options });
    }

    // ── Starter Camp Rain Ambient Bed ───────────────────────────────────
    static startCampRainAmbience(volume = 0.25) {
        if (this.campRainSource) return; // Already active
        if (!this.buffers['amb_camp_rain_loop']) return;

        const rain = this.play('amb_camp_rain_loop', {
            volume: Math.max(0, Math.min(1, volume)),
            loop: true,
            bus: 'world',
            varyPitch: false
        });
        if (rain) {
            this.campRainSource = rain;
            if (rain.gainNode) {
                const now = audioCtx.currentTime;
                rain.gainNode.gain.setValueAtTime(0.001, now);
                rain.gainNode.gain.linearRampToValueAtTime(volume, now + 1.2);
            }
        }
    }

    static setCampRainVolume(volume, fadeSeconds = 0.5) {
        if (!this.campRainSource?.gainNode) return;
        const clamped = Math.max(0, Math.min(1, Number(volume) || 0));
        const now = audioCtx.currentTime;
        this.campRainSource.gainNode.gain.setTargetAtTime(clamped, now, Math.max(0.05, fadeSeconds));
    }

    static stopCampRainAmbience(fadeSeconds = 1.0) {
        if (!this.campRainSource) return;
        const sourceRef = this.campRainSource;
        this.campRainSource = null;
        if (sourceRef.gainNode) {
            const now = audioCtx.currentTime;
            sourceRef.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);
        }
        setTimeout(() => {
            try { sourceRef.source?.stop(); } catch (e) { void e; }
        }, (fadeSeconds * 1000) + 100);
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

        // Start Starter Camp rain ambience bed if available
        this.startCampRainAmbience(0.22);

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
        this.stopCampRainAmbience(musicFadeSeconds);
        if (stopMusic) this.stopMusic({ fadeSeconds: musicFadeSeconds });
        if (this.randInterval) {
            clearInterval(this.randInterval);
            this.randInterval = null;
        }
    }
}

AudioManager.init();
import { assetUrl } from './assetUrl.js';
import { PRESENTATION_EVENTS, presentationTelemetry } from './presentationTelemetry.js';
