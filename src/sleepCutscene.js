// Sleep cutscenes (Sprint 53 S1-S2). Resting already resets the world --
// the day advances, the night is simulated, the sky jumps to dawn -- before
// `day-rest-open` fires; main.js plays one of these over that change, then
// shows the morning card. Prompts: docs/planning/sprint-53-world-variety-night-and-sleep-2026-10-07.md §C.

import { SHIPPED_MOTION_CLIPS } from './cinematics/shippedMotionClips.js';

export const SLEEP_CUTSCENE_STYLES = Object.freeze(['bunker', 'camp', 'cryo', 'hive', 'squad']);

// Videos added to public/cutscenes/ as sleep-<style>.webm (+ .mp4, -poster.jpg),
// or sleep-<style>-<class> when the film shows the player's own class model;
// the pipeline-rendered ones come from SHIPPED_MOTION_CLIPS. Until a style's
// video ships, main.js plays a short night interstitial.
export const SHIPPED_SLEEP_CUTSCENES = Object.freeze(new Set([
    'sleep-bunker',
    ...[...SHIPPED_MOTION_CLIPS].filter((id) => id.startsWith('sleep-'))
]));

/** Which sleep a rest gets, by where and how the operator sleeps. */
export function pickSleepCutsceneStyle({ campId = null, coopPlayers = 0, hiveBonded = false, infected = false, biome = 'active' } = {}) {
    if (coopPlayers > 0) return 'squad';
    if (hiveBonded && biome === 'bio') return 'hive';
    if (infected || biome === 'cryo') return 'cryo';
    if (campId && campId !== 'bunker_cot') return 'camp';
    return 'bunker';
}

/** The film for a style: the player's class cut when it has shipped, else the shared one. */
export function sleepCutsceneBase(style, playerClass = null) {
    const base = `sleep-${SLEEP_CUTSCENE_STYLES.includes(style) ? style : 'bunker'}`;
    const classCut = playerClass ? `${base}-${String(playerClass).toLowerCase()}` : null;
    return classCut && SHIPPED_SLEEP_CUTSCENES.has(classCut) ? classCut : base;
}

export function isSleepCutsceneShipped(style, playerClass = null) {
    return SHIPPED_SLEEP_CUTSCENES.has(sleepCutsceneBase(style, playerClass));
}
