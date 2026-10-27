// Motion clips rendered by the local pipeline and encoded into public/
// (scripts/cinematics/comfy_clips.py `encode` rewrites this list; see
// docs/cinematics-comfyui-pipeline.md). An id here makes its registry entry
// play the clip: side stories and cards 33-38 in src/songInterstitials.js,
// sleep styles in src/sleepCutscene.js.
export const SHIPPED_MOTION_CLIPS = Object.freeze(new Set([
]));
