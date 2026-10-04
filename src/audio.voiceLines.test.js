import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from './audio.js';
import { createVoiceLineLibrary } from './voiceLines.js';

const KEY = 'narrative.leaderDialogue.briggs.stages.0.loop';
const TEXT = 'BRIGGS: PROVE YOU CAN HOLD A LINE. FORTIFY THIS POSITION, THEN WE TALK.';

async function libraryWith(keys) {
    const library = createVoiceLineLibrary({
        fetchJson: async () => ({ locales: { en: keys } }),
        getLocale: () => 'en',
        translate: (key) => (key === KEY ? TEXT : key)
    });
    await library.load();
    return library;
}

describe('AudioManager exact voice lines', () => {
    beforeEach(() => {
        AudioManager.init();
        AudioManager.isUnlocked = true;
        AudioManager.globalMuted = false;
        AudioManager.voiceEnabled = true;
        AudioManager.setChannelVolume('voice', 1.0);
        AudioManager.stopActiveVoice(0);
        AudioManager.buffers = {};
        AudioManager._playedVoiceSemantics?.clear?.();
    });
    afterEach(() => {
        AudioManager.voiceLines = null;
        vi.restoreAllMocks();
    });

    it('plays the recorded line itself ahead of the keyword-matched clip', async () => {
        AudioManager.voiceLines = await libraryWith([KEY]);
        AudioManager.buffers[`line:${KEY}`] = { duration: 3.2 };
        AudioManager.buffers.voice_briggs_01_stop_identify = { duration: 4.0 };
        expect(AudioManager.playVoiceForMessage('BRIGGS', TEXT)).not.toBeNull();
        expect(AudioManager.activeVoice?.bufferKey).toBe(`line:${KEY}`);
    });

    it('falls back to the keyword clips for a line nobody recorded', async () => {
        AudioManager.voiceLines = await libraryWith([]);
        AudioManager.buffers.voice_briggs_01_stop_identify = { duration: 4.0 };
        expect(AudioManager.playVoiceForMessage('BRIGGS', 'STOP. IDENTIFY.')).not.toBeNull();
        expect(AudioManager.activeVoice?.bufferKey).toBe('voice_briggs_01_stop_identify');
    });

    it('fetches a recorded line on first use and plays it when it arrives', async () => {
        AudioManager.voiceLines = await libraryWith([KEY]);
        const decode = vi.spyOn(AudioManager, 'decodeAudioAsset').mockResolvedValue({ duration: 3.2 });
        expect(AudioManager.playVoiceForMessage('BRIGGS', TEXT)).toBeNull();
        expect(decode).toHaveBeenCalledWith(`/audio/voice/lines/en/${KEY}.mp3`);
        await vi.waitFor(() => expect(AudioManager.activeVoice?.bufferKey).toBe(`line:${KEY}`));
    });

    it('plays a recorded line by key (developer commentary)', async () => {
        AudioManager.voiceLines = await libraryWith([KEY]);
        AudioManager.buffers[`line:${KEY}`] = { duration: 3.2 };
        expect(AudioManager.playVoiceLine(KEY)).not.toBeNull();
        expect(AudioManager.activeVoice?.bufferKey).toBe(`line:${KEY}`);
        expect(AudioManager.playVoiceLine('narrative.commentary.none.body')).toBeNull();
    });
});
