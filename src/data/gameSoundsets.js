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
    }),

    // Kenney Impact Sounds, CC0. Licence file retained with the pack under
    // art/source/audio/cinematic-source/kenney/; only the selected files are
    // copied into public/, the raw packs stay in the ignored source tree.
    //
    // The sprite layouts have carried footstepFrames since the atlas work, so
    // the game already knew exactly which animation frames are footfalls. It
    // had no sound to play on them and fell back to a synthesised blip.
    footstep_concrete: Object.freeze({
        variants: Object.freeze([
            'footstep_concrete_000', 'footstep_concrete_001', 'footstep_concrete_002',
            'footstep_concrete_003', 'footstep_concrete_004'
        ]),
        // Five variants and no immediate repeat. A repeated footstep is the
        // most noticeable audio artefact a game can have, because the ear
        // tracks a walk cycle whether the player wants it to or not.
        fallback: 'footstep_concrete_000', bus: 'sfx', gain: 0.42,
        pitch: Object.freeze([0.94, 1.08]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    footstep_snow: Object.freeze({
        variants: Object.freeze([
            'footstep_snow_000', 'footstep_snow_001', 'footstep_snow_002',
            'footstep_snow_003', 'footstep_snow_004'
        ]),
        fallback: 'footstep_snow_000', bus: 'sfx', gain: 0.40,
        pitch: Object.freeze([0.92, 1.06]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    // Prop debris had no sound at all until this sprint, then borrowed
    // amb_metal_stress -- an ambience cue doing an impact's job.
    prop_impact_metal: Object.freeze({
        variants: Object.freeze([
            'impactMetal_light_000', 'impactMetal_light_001',
            'impactMetal_medium_000', 'impactMetal_medium_001'
        ]),
        fallback: 'impactMetal_light_000', bus: 'sfx', gain: 0.55,
        pitch: Object.freeze([0.88, 1.14]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    }),
    prop_impact_glass: Object.freeze({
        variants: Object.freeze(['impactGlass_light_000', 'impactGlass_light_001']),
        fallback: 'impactGlass_light_000', bus: 'sfx', gain: 0.5,
        pitch: Object.freeze([0.9, 1.12]), noImmediateRepeat: true, retrigger: 'replace-oldest'
    })
});

// These approved soundsets used to exist only in the registry: without
// manifest entries no variant could decode, so every footfall fell back.
export const GAMEPLAY_FOLEY_MANIFEST = Object.freeze([
    ...['footstep_concrete', 'footstep_snow'].flatMap((key) => (
        GAME_SOUNDSETS[key].variants.map((variant) => Object.freeze({ key: variant, url: `/audio/footsteps/${variant}.ogg` }))
    )),
    ...['prop_impact_metal', 'prop_impact_glass'].flatMap((key) => (
        GAME_SOUNDSETS[key].variants.map((variant) => Object.freeze({ key: variant, url: `/audio/impacts/${variant}.ogg` }))
    ))
]);

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
