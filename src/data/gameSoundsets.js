const VALID_RETRIGGER_POLICIES = new Set(['reject', 'replace-oldest', 'replace-quietest']);

/**
 * Runtime soundset definitions live here only after edited assets pass
 * provenance review. Raw source-pack files never become shipping dependencies.
 */
export const GAME_SOUNDSETS = Object.freeze({
    door_slide_horiz: Object.freeze({
        variants: Object.freeze(['cc0_door_lock_body_01', 'cc0_door_lock_body_02', 'cc0_metal_lock_impact_01']),
        fallback: 'door_slide_horiz1', bus: 'world', gain: 0.78,
        pitch: Object.freeze([0.96, 1.04]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    hive_webs_sticky: Object.freeze({
        variants: Object.freeze(['cc0_resin_shift_01', 'cc0_resin_shift_02']),
        fallback: 'hive_webs_sticky', bus: 'world', gain: 0.72,
        pitch: Object.freeze([0.92, 1.06]), noImmediateRepeat: true, retrigger: 'replace-quietest'
    })
});

export function validateSoundset(soundset) {
    if (!soundset || !Array.isArray(soundset.variants) || soundset.variants.length === 0) return false;
    if (soundset.variants.some(key => typeof key !== 'string' || key.length === 0)) return false;
    if (soundset.pitch && (!Array.isArray(soundset.pitch) || soundset.pitch.length !== 2 || soundset.pitch.some(value => !Number.isFinite(value)))) return false;
    if (soundset.pitch && soundset.pitch[0] > soundset.pitch[1]) return false;
    if (soundset.retrigger && !VALID_RETRIGGER_POLICIES.has(soundset.retrigger)) return false;
    return true;
}

/**
 * Pure deterministic selection. The caller owns history, cooldowns, voice
 * limits, buffer availability, and playback; this function only resolves the
 * next key and normalized play options.
 */
export function selectSoundsetVariant(soundset, {
    random = Math.random,
    lastVariant = null,
    availableKeys = null
} = {}) {
    if (!validateSoundset(soundset)) return null;

    const available = availableKeys ? new Set(availableKeys) : null;
    let candidates = available
        ? soundset.variants.filter(key => available.has(key))
        : [...soundset.variants];

    if (soundset.noImmediateRepeat && candidates.length > 1) {
        candidates = candidates.filter(key => key !== lastVariant);
    }

    if (candidates.length === 0) {
        return soundset.fallback && (!available || available.has(soundset.fallback))
            ? { key: soundset.fallback, bus: soundset.bus ?? 'sfx', gain: soundset.gain ?? 1, playbackRate: 1 }
            : null;
    }

    const roll = Math.min(0.999999999, Math.max(0, Number(random()) || 0));
    const key = candidates[Math.floor(roll * candidates.length)];
    const [pitchMin, pitchMax] = soundset.pitch ?? [1, 1];

    return {
        key,
        bus: soundset.bus ?? 'sfx',
        gain: soundset.gain ?? 1,
        playbackRate: pitchMin + ((pitchMax - pitchMin) * roll)
    };
}
