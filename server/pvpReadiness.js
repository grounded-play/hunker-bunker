export const PVP_SPAWN_PROTECTION_MS = 3000;

export function beginPvpRound(player, roundId) {
    player.pvpRoundId = roundId;
    player.pvpReadyAt = null;
}

export function markPvpReady(player, roundId, now = Date.now()) {
    if (!player.pvpRoundId || roundId !== player.pvpRoundId) return false;
    if (player.pvpReadyAt == null) player.pvpReadyAt = now;
    return true;
}

export function pvpReadinessRejection(player, now = Date.now()) {
    if (!player.pvpRoundId) return null; // legacy round
    if (player.pvpReadyAt == null) return 'player_loading';
    if (now < player.pvpReadyAt + PVP_SPAWN_PROTECTION_MS) return 'spawn_protected';
    return null;
}
