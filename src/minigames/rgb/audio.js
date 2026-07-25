import { AudioManager } from '../../audio.js';

const BASE = '/minigames/rgb/audio';

export const RGB_AUDIO_MANIFEST = Object.freeze({
    images: [],
    audio: [
        ['rgb_amb_parking_lot', 'ambience/amb_parking_lot.wav'],
        ['rgb_amb_warehouse', 'ambience/amb_warehouse.wav'],
        ['rgb_amb_review_room', 'ambience/amb_review_room.wav'],
        ['rgb_amb_server_room', 'ambience/amb_server_room.wav'],
        ['rgb_amb_sector_fire', 'ambience/amb_sector_fire.wav'],
        ['rgb_music_epilogue_ashes', 'music/music_epilogue_ashes.wav'],
        ['rgb_sfx_4a_servo', 'sfx/sfx_4a_servo.wav'],
        ['rgb_sfx_ui_approved', 'sfx/sfx_ui_approved.wav'],
        ['rgb_sfx_ui_denied', 'sfx/sfx_ui_denied.wav'],
        ['rgb_voice_elias_ch1', 'voice/voice_elias_ch1_01.mp3'],
        ['rgb_voice_elias_ch2', 'voice/voice_elias_ch2_01.mp3'],
        ['rgb_voice_elias_ch3', 'voice/voice_elias_ch3_01.mp3'],
        ['rgb_voice_elias_ch4', 'voice/voice_elias_ch4_01.mp3'],
        ['rgb_voice_hr_ch3', 'voice/voice_hr_ch3_01.mp3'],
        ['rgb_voice_kiosk_ch4', 'voice/voice_kiosk_ch4_01.mp3'],
        ['rgb_voice_lucia', 'voice/voice_lucia_message.mp3'],
        ['rgb_voice_marisol_ch1', 'voice/voice_marisol_ch1_01.mp3'],
        ['rgb_voice_system_ch5', 'voice/voice_system_ch5_01.mp3'],
        ['rgb_voice_system_ch6', 'voice/voice_system_ch6_01.mp3']
    ].map(([key, path]) => ({ key, url: `${BASE}/${path}` }))
});

export const CHAPTER_AMBIENCE = Object.freeze({
    parking_lot: 'rgb_amb_parking_lot',
    warehouse: 'rgb_amb_warehouse',
    incident_review: 'rgb_amb_review_room',
    medi_kiosk: 'rgb_amb_review_room',
    server_room: 'rgb_amb_server_room',
    sector_four: 'rgb_amb_sector_fire'
});

export const HOTSPOT_AUDIO = Object.freeze({
    listen_voicemail: ['rgb_voice_lucia'],
    reply_to_lucia: ['rgb_voice_elias_ch1'],
    speak_with_marisol: ['rgb_voice_marisol_ch1'],
    badge_in: ['rgb_sfx_ui_approved'],
    select_joint: ['rgb_sfx_4a_servo'],
    apply_pressure: ['rgb_sfx_4a_servo'],
    double_tap_honest: ['rgb_sfx_4a_servo', 'rgb_sfx_ui_approved'],
    double_tap_falsify: ['rgb_sfx_4a_servo', 'rgb_sfx_ui_approved'],
    brace_for_impact: ['rgb_voice_elias_ch3'],
    take_the_hit: ['rgb_voice_elias_ch3'],
    demand_footage: ['rgb_voice_hr_ch3'],
    proceed_to_kiosk: ['rgb_sfx_ui_denied'],
    scan_bottle: ['rgb_voice_kiosk_ch4', 'rgb_sfx_ui_denied'],
    request_billing_agent: ['rgb_voice_kiosk_ch4'],
    call_hr: ['rgb_voice_hr_ch3'],
    call_lucia: ['rgb_voice_lucia'],
    give_up: ['rgb_voice_lucia', 'rgb_sfx_ui_denied'],
    read_terminal: ['rgb_voice_system_ch5'],
    walk_away: ['rgb_sfx_ui_denied'],
    expose_profile: ['rgb_sfx_ui_approved'],
    sever_trunk: ['rgb_voice_system_ch5', 'rgb_sfx_ui_denied'],
    pull_alarm: ['rgb_voice_system_ch6'],
    rescue_recenter: ['rgb_sfx_4a_servo', 'rgb_sfx_ui_approved'],
    rescue_fumble: ['rgb_sfx_4a_servo', 'rgb_sfx_ui_denied']
});

const HOTSPOT_SPEAKERS = Object.freeze({
    listen_voicemail: 'LUCIA',
    speak_with_marisol: 'MARISOL',
    demand_footage: 'HR',
    call_hr: 'HR',
    scan_bottle: 'KIOSK',
    request_billing_agent: 'KIOSK',
    document_bag: 'KIOSK',
    read_terminal: 'SYSTEM',
    pull_alarm: 'SYSTEM'
});

export function hasAuthoredVoice(hotspotId) {
    return (HOTSPOT_AUDIO[hotspotId] ?? []).some((key) => key.includes('_voice_'));
}

export function getDialogueSpeaker(hotspotId) {
    return HOTSPOT_SPEAKERS[hotspotId] ?? 'ELIAS';
}

export function createRgbAudioController() {
    let ambience = null;
    let music = null;
    let activeChapter = null;
    let ready = false;
    let destroyed = false;
    let speechToken = 0;

    const stopHandle = (handle) => {
        try { handle?.source?.stop(); } catch { /* already stopped */ }
    };

    const play = (key, options = {}) => {
        if (!ready || destroyed) return null;
        return AudioManager.play(key, { varyPitch: false, ...options });
    };

    const stopSpeech = () => {
        speechToken += 1;
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    };

    const speakLines = (hotspotId, lines = []) => {
        if (
            destroyed
            || AudioManager.globalMuted
            || !AudioManager.voiceEnabled
            || typeof window === 'undefined'
            || !window.speechSynthesis
            || typeof window.SpeechSynthesisUtterance !== 'function'
        ) return;

        stopSpeech();
        const token = speechToken;
        const speaker = getDialogueSpeaker(hotspotId);
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find((voice) => (
            voice.lang?.toLowerCase().startsWith('en')
            && (speaker === 'SYSTEM' || speaker === 'KIOSK'
                ? /google|microsoft|english/i.test(voice.name)
                : true)
        )) ?? voices.find((voice) => voice.lang?.toLowerCase().startsWith('en'));

        const queueNext = (index) => {
            if (destroyed || token !== speechToken || index >= lines.length) return;
            const utterance = new window.SpeechSynthesisUtterance(String(lines[index]));
            utterance.voice = preferred ?? null;
            utterance.rate = speaker === 'SYSTEM' || speaker === 'KIOSK' ? 0.88 : 0.94;
            utterance.pitch = speaker === 'LUCIA' ? 1.12 : (speaker === 'SYSTEM' ? 0.82 : 0.96);
            utterance.volume = Math.min(
                1,
                Math.max(0, AudioManager.masterVolume * AudioManager.voiceVolume)
            );
            utterance.onend = () => queueNext(index + 1);
            utterance.onerror = () => queueNext(index + 1);
            window.speechSynthesis.speak(utterance);
        };
        queueNext(0);
    };

    return {
        async load() {
            await AudioManager.unlock();
            await AudioManager.loadAssets(RGB_AUDIO_MANIFEST);
            if (destroyed) return;
            ready = true;
            music = play('rgb_music_epilogue_ashes', {
                bus: 'music',
                loop: true,
                volume: 0.26
            });
            if (activeChapter) this.enterChapter(activeChapter);
        },
        enterChapter(chapterId) {
            activeChapter = chapterId;
            if (!ready || destroyed) return;
            stopHandle(ambience);
            ambience = play(CHAPTER_AMBIENCE[chapterId], {
                bus: 'world',
                loop: true,
                volume: chapterId === 'sector_four' ? 0.5 : 0.34
            });
        },
        hotspot(hotspotId, lines = []) {
            const authoredVoice = hasAuthoredVoice(hotspotId);
            for (const key of HOTSPOT_AUDIO[hotspotId] ?? []) {
                play(key, {
                    bus: key.includes('_voice_') ? 'voice' : 'sfx',
                    volume: key.includes('_voice_') ? 0.9 : 0.65
                });
            }
            if (!authoredVoice) speakLines(hotspotId, lines);
        },
        ending(endingId) {
            if (endingId !== 'ashes_survival') return;
            stopHandle(music);
            music = play('rgb_music_epilogue_ashes', {
                bus: 'music',
                loop: true,
                volume: 0.65
            });
        },
        destroy() {
            destroyed = true;
            stopSpeech();
            stopHandle(ambience);
            stopHandle(music);
            ambience = null;
            music = null;
        }
    };
}
