// Focus (tilt-shift / bokeh) policy for the gameplay presentation.
//
// This used to also require `cameraMode === 'isometric'`, on the reasoning that
// the miniature effect belonged to the isometric presentation only. But the
// game ships in third-person (threeGame.js constructor, and the persisted
// `hb_camera_mode` default in main.js), and renderWithPerf only reaches
// composer.render() when this predicate is true -- so a default-settings player
// was getting a raw renderer.render() frame with none of the post-processing
// the build pays for. The camera no longer switches the effect off; how strong
// the defocus is at a given framing is decided by updateTiltShiftAndBokeh.
export function usesGameplayFocusEffects(game) {
    return game.performanceProfile === 'gameplay'
        && game.gameplayPostProcessingEnabled !== false
        && !game.loadingPaused;
}
