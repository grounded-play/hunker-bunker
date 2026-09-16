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
            Object.freeze({ key: 'voice_commander_reloading', cue: 'reload', subtitle: 'RELOADING.', intent: 'Weapon reload', trigger: 'A non-full weapon begins reload', exclusions: ['menu', 'full magazine'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_low_health', cue: 'low_health', subtitle: 'VITALS CRITICAL.', intent: 'HP crosses downward to 25% or less', trigger: 'Downward HP threshold crossing', exclusions: ['shield loss', 'maximum HP increase', 'healing'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_shield_critical', cue: 'shield_critical', subtitle: 'SHIELD FAILING. TAKE COVER.', intent: 'Shield crosses downward to 25% or less', trigger: 'Downward shield threshold crossing', exclusions: ['HP loss', 'shield unavailable'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_boss_spotted', cue: 'boss_spotted', aliases: ['threat_high'], subtitle: 'HEAVY INCOMING.', intent: 'Boss enters the field', trigger: 'New boss encounter ID', exclusions: ['ordinary enemy', 'repeated event alias'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_killstreak', cue: 'killstreak', subtitle: 'KEEP FIRING.', intent: 'Kill streak reached', trigger: 'New kill-streak tier', exclusions: ['single target down', 'overdrive ready'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_target_down', cue: 'target_down', subtitle: 'HEAVY TARGET DESTROYED.', intent: 'Boss target eliminated', trigger: 'Boss death', exclusions: ['ordinary enemy', 'kill streak'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_overdrive_ready', cue: 'overdrive_ready', subtitle: 'OVERDRIVE CHARGED. MOVE.', intent: 'Dash overdrive charged', trigger: 'Overdrive becomes ready', exclusions: ['kill streak'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_breached', cue: 'breached', subtitle: 'WALL BREACHED.', intent: 'A wall is breached', trigger: 'New wall breach', exclusions: ['door opening'], priority: 4 }),
            Object.freeze({ key: 'voice_commander_sector_cleared', cue: 'sector_cleared', subtitle: 'SECTOR SECURE. RETURN TO SHIP.', intent: 'Objective complete / sector cleared', trigger: 'Objective completion', exclusions: ['extraction victory'], priority: 3 }),
            Object.freeze({ key: 'voice_commander_victory', cue: 'victory', subtitle: 'EXTRACTION SECURED.', intent: 'Extraction / run won', trigger: 'Successful extraction', exclusions: ['objective complete'], priority: 2 })
        ])
    }),
    4149: Object.freeze({
        itemdefid: 4149,
        prefix: 'voice_aura',
        name: "Synthesized AI Unit 'AURA'",
        blurb: 'Smooth synthesized female tactical assistant with sub-harmonic chimes.',
        previewCue: 'overdrive_ready',
        slots: Object.freeze([
            Object.freeze({ key: 'voice_aura_reloading', cue: 'reload', subtitle: 'RELOADING.', intent: 'Weapon reload', trigger: 'A non-full weapon begins reload', exclusions: ['menu', 'full magazine'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_low_health', cue: 'low_health', subtitle: 'OPERATOR VITALS CRITICAL.', intent: 'HP crosses downward to 25% or less', trigger: 'Downward HP threshold crossing', exclusions: ['shield loss', 'maximum HP increase', 'healing'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_shield_critical', cue: 'shield_critical', subtitle: 'SHIELD CRITICAL.', intent: 'Shield crosses downward to 25% or less', trigger: 'Downward shield threshold crossing', exclusions: ['HP loss', 'shield unavailable'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_threat_high', cue: 'threat_high', aliases: ['boss_spotted'], subtitle: 'THREAT LEVEL HIGH.', intent: 'Boss enters the field', trigger: 'New boss encounter ID', exclusions: ['ordinary enemy', 'repeated event alias'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_target_down', cue: 'target_down', subtitle: 'TARGET DOWN.', intent: 'Boss target eliminated', trigger: 'Boss death', exclusions: ['ordinary enemy', 'kill streak'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_killstreak', cue: 'killstreak', subtitle: 'COMBAT EFFICIENCY RISING.', intent: 'Kill streak reached', trigger: 'New kill-streak tier', exclusions: ['single target down', 'overdrive ready'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_overdrive_ready', cue: 'overdrive_ready', subtitle: 'OVERDRIVE READY.', intent: 'Dash overdrive charged', trigger: 'Overdrive becomes ready', exclusions: ['kill streak'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_breached', cue: 'breached', subtitle: 'STRUCTURAL BREACH CONFIRMED.', intent: 'A wall is breached', trigger: 'New wall breach', exclusions: ['door opening'], priority: 4 }),
            Object.freeze({ key: 'voice_aura_sector_cleared', cue: 'sector_cleared', subtitle: 'SECTOR CLEARED.', intent: 'Objective complete / sector cleared', trigger: 'Objective completion', exclusions: ['extraction victory'], priority: 3 }),
            Object.freeze({ key: 'voice_aura_victory', cue: 'victory', subtitle: 'EXTRACTION CONFIRMED. MISSION COMPLETE.', intent: 'Extraction / run won', trigger: 'Successful extraction', exclusions: ['objective complete'], priority: 2 })
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
        getVoiceTakeKeys(slot.key, slot.takeCount).map((key) => ({ key, url: `/audio/generated/${key}.wav` }))
    )));
}

export function resolveVoiceBankSlot(itemdefid, cue) {
    const bank = getVoiceBank(itemdefid);
    if (!bank) return null;
    const normalized = String(cue ?? '').toLowerCase();
    return bank.slots.find((slot) => slot.cue === normalized || slot.aliases?.includes(normalized)) ?? null;
}

export function getVoiceScriptRows() {
    return Object.values(VOICE_BANKS).flatMap((bank) => bank.slots.map((slot) => ({
        bankId: bank.itemdefid,
        bankName: bank.name,
        semanticId: `${bank.itemdefid}:${slot.cue}`,
        repeatScope: 'expedition',
        lifetime: 'trigger-time only',
        direction: bank.itemdefid === 4148 ? 'Authoritative, clipped military radio' : 'Calm synthesized tactical warning',
        takes: getVoiceTakeKeys(slot.key, slot.takeCount),
        ...slot
    })));
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
