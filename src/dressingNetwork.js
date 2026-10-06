import { isRoomDressingId } from './roomDressingPersistence.js';

export function registerDressingNetwork(game, items = []) {
    game._dressingManifest ??= new Map();
    for (const item of items) if (item.destructible) game._dressingManifest.set(item.stableId,
        { stableId: item.stableId, id: item.id, x: item.x, y: item.y });
    if (!game._dressingProtocolEnabled || !game.isMultiplayer || game.multiplayerMode === 'pvp') return;
    const candidates = items.length ? items.filter(item => item.destructible) : [...game._dressingManifest.values()];
    const entries = candidates.map(item => ({
        id: item.stableId, x: item.x, z: item.y,
        hp: game.brokenPropScatterKeys?.has(item.id) || game.brokenPropScatterKeys?.has(item.stableId) ? 0
            : game._dressingHp?.get(item.stableId)?.hp
                ?? game.scatterSprites?.find(s => s.userData?.dressingStableId === item.stableId)?.userData.propHp ?? 3
    }));
    for (let i = 0; i < entries.length; i += 128) game.broadcastSharedWorldEvent?.('dressing-register', { version: 1, items: entries.slice(i, i + 128) });
}

export function applyDressingNetworkEvent(game, data) {
    if (data?.originId !== 'relay') return false;
    const detail = data.detail;
    if (data.event === 'dressing-protocol' && detail?.version === 1) {
        game._dressingProtocolEnabled = detail.enabled === true;
        // Relay epochs restart on membership changes, so retain HP but reset
        // revision comparisons before resubmitting the host's current state.
        for (const state of game._dressingHp?.values() ?? []) state.revision = -1;
        registerDressingNetwork(game);
        return true;
    }
    if (data.event !== 'dressing-state' || detail?.version !== 1 || !isRoomDressingId(detail.id)
        || !Number.isInteger(detail.hp) || detail.hp < 0 || detail.hp > 3
        || !Number.isSafeInteger(detail.revision) || detail.revision < 0) return false;
    game._dressingHp ??= new Map();
    if (detail.revision <= (game._dressingHp.get(detail.id)?.revision ?? -1)) return false;
    game._dressingHp.set(detail.id, { hp: detail.hp, revision: detail.revision });
    const target = game.scatterSprites?.find(s => s.userData?.dressingStableId === detail.id);
    if (target) {
        target.userData.propHp = detail.hp;
        if (detail.hp === 0) game.breakScatterProp(target, { plannedDrops: [], fromRemote: true });
    }
    if (detail.hp === 0) {
        game.brokenPropScatterKeys ??= new Set();
        game.brokenPropScatterKeys.add(detail.id);
    }
    return true;
}
