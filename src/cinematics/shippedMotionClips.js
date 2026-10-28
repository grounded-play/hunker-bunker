// Motion clips rendered by the local pipeline and encoded into public/
// (scripts/cinematics/comfy_clips.py `encode` rewrites this list; see
// docs/cinematics-comfyui-pipeline.md). An id here makes its registry entry
// play the clip: side stories and cards 33-38 in src/songInterstitials.js,
// sleep styles in src/sleepCutscene.js.
export const SHIPPED_MOTION_CLIPS = Object.freeze(new Set([
    'aria_queens_mark',
    'briggs_vanguard_fire',
    'card_33',
    'card_34',
    'card_35',
    'card_36',
    'nahl_co_evolution',
    'nahl_transcendence',
    'opening-crash-engineer',
    'opening-crash-scout',
    'opening-crash-tank',
    'opening-flight-scout',
    'opening-flight-tank',
    'opening-launch-engineer',
    'opening-launch-scout',
    'opening-launch-tank',
    'sleep-camp-engineer',
    'sleep-camp-scout',
    'sleep-cryo-engineer',
    'sleep-squad',
    'val_eternal_hearth',
    'val_hearth_warmth',
]));
