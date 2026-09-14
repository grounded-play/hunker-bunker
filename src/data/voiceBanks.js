// The two alt-radio voice banks (Steam itemdefs 4148/4149) and the cue slot
// each bank must fill.
//
// This is the labelling key for the raw VO session takes: the artist recorded
// 6 freestyle takes of 6 lines per bank, and these are those 6 lines. Both
// src/audio.js's callout cueMap and scripts/segment-vo-takes.mjs read from
// here, so a cue can never exist in one and not the other.
export const VOICE_BANKS = Object.freeze({
    4148: Object.freeze({
        itemdefid: 4148,
        prefix: 'voice_commander',
        name: 'Soviet Sub-Commander Radio',
        blurb: 'Heavy radio static. Authoritative Russian-accented military jargon.',
        previewCue: 'boss_spotted',
        slots: Object.freeze([
            Object.freeze({ key: 'voice_commander_reloading', cue: 'reload', intent: 'Weapon reload -- replaces "Reloading"' }),
            Object.freeze({ key: 'voice_commander_low_health', cue: 'low_health', intent: 'Player near death -- replaces "Shield low"' }),
            Object.freeze({ key: 'voice_commander_boss_spotted', cue: 'boss_spotted', intent: 'Boss enters the field -- replaces "Heavy incoming"' }),
            Object.freeze({ key: 'voice_commander_killstreak', cue: 'killstreak', intent: 'Kill streak / overdrive ready' }),
            Object.freeze({ key: 'voice_commander_breached', cue: 'breached', intent: 'A wall is breached' }),
            Object.freeze({ key: 'voice_commander_victory', cue: 'victory', intent: 'Extraction / run won' })
        ])
    }),
    4149: Object.freeze({
        itemdefid: 4149,
        prefix: 'voice_aura',
        name: "Synthesized AI Unit 'AURA'",
        blurb: 'Smooth synthesized female tactical assistant with sub-harmonic chimes.',
        previewCue: 'overdrive_ready',
        slots: Object.freeze([
            Object.freeze({ key: 'voice_aura_reloading', cue: 'reload', intent: 'Weapon reload -- replaces "Reloading"' }),
            Object.freeze({ key: 'voice_aura_shield_critical', cue: 'shield_critical', intent: 'Player near death -- replaces "Shield low"' }),
            Object.freeze({ key: 'voice_aura_threat_high', cue: 'threat_high', intent: 'Boss enters the field -- replaces "Heavy incoming"' }),
            Object.freeze({ key: 'voice_aura_target_down', cue: 'target_down', intent: 'Target eliminated' }),
            Object.freeze({ key: 'voice_aura_overdrive_ready', cue: 'overdrive_ready', intent: 'Dash overdrive charged' }),
            Object.freeze({ key: 'voice_aura_sector_cleared', cue: 'sector_cleared', intent: 'Objective complete / sector cleared' })
        ])
    })
});

export const VOICE_BANK_IDS = Object.freeze(Object.keys(VOICE_BANKS).map(Number));
export const VOICE_TAKES_PER_LINE = 2;

export function getVoiceTakeKeys(slotKey, count = VOICE_TAKES_PER_LINE) {
    return Array.from({ length: count }, (_, index) => index === 0 ? slotKey : `${slotKey}${index + 1}`);
}

export function getVoiceAudioManifest() {
    return Object.values(VOICE_BANKS).flatMap((bank) => bank.slots.flatMap((slot) => (
        getVoiceTakeKeys(slot.key).map((key) => ({ key, url: `/audio/generated/${key}.wav` }))
    )));
}

/** Which bank a raw session filename belongs to ("voice_aura_V_take_1.wav" -> 4149). */
export function bankForSourceFile(filename = '') {
    const name = String(filename).toLowerCase();
    for (const bank of Object.values(VOICE_BANKS)) {
        // "voice_aura" / "voice_commander" -- the same prefix the game uses.
        if (name.includes(bank.prefix.replace('voice_', ''))) return bank;
    }
    return null;
}

export function getVoiceBank(itemdefid) {
    return VOICE_BANKS[Number(itemdefid)] ?? null;
}
