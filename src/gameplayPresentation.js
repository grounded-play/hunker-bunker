// Keep distant threats and route geometry sharp in the perspective camera.
// The miniature focus effect belongs to the isometric presentation only.
export function usesGameplayFocusEffects(game) {
    return game.performanceProfile === 'gameplay'
        && game.cameraMode === 'isometric'
        && game.gameplayPostProcessingEnabled !== false
        && !game.adaptiveGameplayPerformanceMode
        && !game.loadingPaused;
}
