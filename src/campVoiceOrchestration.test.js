import { describe, it, expect, beforeEach } from 'vitest';
import { AudioManager } from './audio.js';
import { ThreeGame } from './threeGame.js';

describe('Camp Voice Orchestration & Speech Director', () => {
    beforeEach(() => {
        AudioManager.init();
        AudioManager.isUnlocked = true;
        AudioManager.globalMuted = false;
        AudioManager.voiceEnabled = true;
        AudioManager.setChannelVolume('voice', 1.0);
        AudioManager.stopActiveVoice(0);
        AudioManager.buffers = {};
    });

    describe('AudioManager Speech Priority & Lifetime Tracking', () => {
        it('reports isVoiceSpeaking correctly when voice track plays and ends', () => {
            AudioManager.buffers['voice_test_leader'] = { duration: 3.5 };
            expect(AudioManager.isVoiceSpeaking()).toBe(false);
            expect(AudioManager.getActiveVoiceDurationRemaining()).toBe(0);

            const result = AudioManager.playVoiceTrack('voice_test_leader', { priority: 1, duration: 3.5 });
            expect(result).not.toBeNull();
            expect(AudioManager.isVoiceSpeaking()).toBe(true);
            expect(AudioManager.getActiveVoiceDurationRemaining()).toBeGreaterThan(0);
            expect(result.duration).toBe(3.5);
            expect(result.promise).toBeInstanceOf(Promise);

            // Cleanly stop
            AudioManager.stopActiveVoice(0);
            expect(AudioManager.isVoiceSpeaking()).toBe(false);
            expect(AudioManager.getActiveVoiceDurationRemaining()).toBe(0);
        });

        it('prevents low-priority radio/callout voice from interrupting active leader voice', () => {
            AudioManager.buffers['voice_briggs_01_stop_identify'] = { duration: 4.0 };
            AudioManager.buffers['voice_aura_reloading'] = { duration: 1.5 };

            // Start Priority 1 (Leader)
            const leaderResult = AudioManager.playVoiceTrack('voice_briggs_01_stop_identify', { priority: 1, duration: 4.0 });
            expect(leaderResult).not.toBeNull();
            expect(AudioManager.activeVoice.priority).toBe(1);

            // Attempt Priority 4 (Callout) while Priority 1 is speaking
            const calloutResult = AudioManager.playVoiceTrack('voice_aura_reloading', { priority: 4, duration: 1.5 });
            expect(calloutResult).toBeNull();
            expect(AudioManager.activeVoice.priority).toBe(1);

            // Attempt Priority 3 (Radio) while Priority 1 is speaking
            const radioResult = AudioManager.playVoiceForMessage('SYSTEM', 'SURVIVOR CAMP LOCATED', { priority: 3 });
            expect(radioResult).toBeNull();
            expect(AudioManager.activeVoice.priority).toBe(1);
        });

        it('allows higher-priority cutscene/leader voice to preempt lower-priority radio', () => {
            AudioManager.buffers['voice_system_01_o2_stabilized'] = { duration: 3.0 };
            AudioManager.buffers['voice_martha_01_warm_pipes'] = { duration: 4.5 };

            // Start Priority 3 (Radio / System)
            AudioManager.playVoiceTrack('voice_system_01_o2_stabilized', { priority: 3, duration: 3.0 });
            expect(AudioManager.activeVoice.priority).toBe(3);

            // Start Priority 1 (Camp Leader)
            const leaderResult = AudioManager.playVoiceTrack('voice_martha_01_warm_pipes', { priority: 1, duration: 4.5 });
            expect(leaderResult).not.toBeNull();
            expect(AudioManager.activeVoice.priority).toBe(1);
        });

        it('suppresses typewriter chirp sound effects when voice is actively speaking', () => {
            AudioManager.buffers['voice_elias_ch1_01'] = { duration: 3.0 };
            AudioManager.playVoiceTrack('voice_elias_ch1_01', { priority: 1, duration: 3.0 });

            // A typewriter chirp passed with isChirp: true should return null when speaking
            const chirpResult = AudioManager.playVoiceForMessage('SCOUT', '...', { isChirp: true });
            expect(chirpResult).toBeNull();
        });

        it('does not restart or clobber the same voice clip when sequential briefing lines trigger', () => {
            AudioManager.buffers['voice_mothership_01_alive'] = { duration: 10.0 };
            const firstResult = AudioManager.playVoiceForMessage('MOTHERSHIP', "AGENT SCOUT. YOU'RE ALIVE.");
            expect(firstResult).not.toBeNull();
            const originalSource = firstResult.source;

            // Sequential briefing line while the first clip is speaking
            const secondResult = AudioManager.playVoiceForMessage('MOTHERSHIP', 'YOUR SHIP TOOK A HYPERSONIC STRIKE ON DESCENT.');
            expect(secondResult).toBeNull(); // not a new authored clip, suppressed while speaking
            expect(AudioManager.isVoiceSpeaking()).toBe(true);
            expect(AudioManager.activeVoice.source).toBe(originalSource);

            // Triggering the same track directly returns active voice without restarting
            const duplicateResult = AudioManager.playVoiceTrack('voice_mothership_01_alive', { duration: 10.0 });
            expect(duplicateResult.source).toBe(originalSource);
        });
    });

    describe('Camp First Contact & Leader Interaction Sequencing', () => {
        it('dispatches camp-first-contact with onComplete callback that invokes talkToLeader', () => {
            const dispatchedEvents = [];
            globalThis.window = {
                dispatchEvent: (event) => dispatchedEvents.push(event),
                AudioManager
            };
            globalThis.CustomEvent = class CustomEvent {
                constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
            };

            let leaderTalkInvoked = false;
            const fakeThis = {
                isGameplayInputActive: () => true,
                player: { position: { x: 0, z: 0 } },
                act2: {},
                getActionableCampAt: () => ({ camp: { id: 'camp_tallow', label: 'TALLOW' }, action: 'talk' }),
                getCampRecord: () => ({ status: 'alive', bond: 0 }),
                talkToLeader: () => { leaderTalkInvoked = true; return true; }
            };

            const result = ThreeGame.prototype.interactWithAct2Camp.call(fakeThis);
            expect(result).toBe(true);

            const firstContactEvent = dispatchedEvents.find((e) => e.type === 'camp-first-contact');
            expect(firstContactEvent).toBeDefined();
            expect(firstContactEvent.detail.campId).toBe('camp_tallow');
            expect(typeof firstContactEvent.detail.onComplete).toBe('function');

            // Initial call should NOT have immediately called talkToLeader on the first contact frame
            expect(leaderTalkInvoked).toBe(false);

            // Simulating interstitial completion
            firstContactEvent.detail.onComplete();
            expect(leaderTalkInvoked).toBe(true);
        });
    });
});
