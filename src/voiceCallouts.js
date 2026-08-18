// Season 0 Voice Pack callouts (docs/season-zero-protocol/03 §5, itemdefs 4148/4149).
// AudioManager.playVoiceCallout(cueType) and 2 of its 8 cue trigger points (reload,
// low_health) already existed in src/threeGame.js. This wires the remaining 6 to real game
// events instead of leaving them defined-but-unused in AudioManager's cueMap.
export function initVoiceCallouts() {
    window.addEventListener('milestone-boss-spawned', () => {
        window.AudioManager?.playVoiceCallout?.('boss_spotted');
    });
    window.addEventListener('hive-harvest-boss-spawned', () => {
        window.AudioManager?.playVoiceCallout?.('boss_spotted');
    });
    window.addEventListener('enemy-killed', (e) => {
        if (e.detail?.isBoss) window.AudioManager?.playVoiceCallout?.('target_down');
    });
    window.addEventListener('mission-objective-complete', () => {
        window.AudioManager?.playVoiceCallout?.('sector_cleared');
    });
    window.addEventListener('player-extracted', () => {
        window.AudioManager?.playVoiceCallout?.('victory');
    });
    window.addEventListener('wall-breached', () => {
        window.AudioManager?.playVoiceCallout?.('breached');
    });
    window.addEventListener('dash-overdrive-ready', () => {
        window.AudioManager?.playVoiceCallout?.('overdrive_ready');
    });
}
