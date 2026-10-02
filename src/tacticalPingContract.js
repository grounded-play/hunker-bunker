import { t } from './i18n.js';

export const QUICK_COMMAND_IDS = Object.freeze(['help', 'wait', 'follow', 'regroup', 'thanks']);

export const PING_LOCALIZATION_KEYS = Object.freeze({
    point: 'ui.ping.point',
    target: 'ui.ping.target',
    supplies: 'ui.ping.supplies',
    help: 'ui.ping.help',
    wait: 'ui.ping.wait',
    follow: 'ui.ping.follow',
    regroup: 'ui.ping.regroup',
    thanks: 'ui.ping.thanks',
    'chat.quick.wait': 'ui.chat.quick.wait'
});

export function createTacticalPingPayload({
    x = 0,
    z = 0,
    kind = 'point',
    commandId = null,
    targetId = null,
    targetName = null,
    peerId = null,
    senderName = null,
    label = null,
    duration = 6.0,
    timestamp = Date.now()
} = {}) {
    const resolvedKind = commandId ? 'quick-command' : (kind || 'point');
    let defaultLabel = 'TACTICAL PING';

    if (commandId) {
        defaultLabel = commandId.toUpperCase();
    } else if (resolvedKind === 'enemy') {
        defaultLabel = targetName ? `TARGET: ${String(targetName).toUpperCase()}` : 'TARGET: HOSTILE';
    } else if (resolvedKind === 'item') {
        defaultLabel = targetName ? `SUPPLIES: ${String(targetName).toUpperCase()}` : 'SUPPLIES';
    }

    const locKey = commandId
        ? `ui.ping.${commandId}`
        : (resolvedKind === 'enemy' ? 'ui.ping.target' : (resolvedKind === 'item' ? 'ui.ping.supplies' : 'ui.ping.point'));

    return {
        x: Number.isFinite(x) ? Number(x) : 0,
        z: Number.isFinite(z) ? Number(z) : 0,
        kind: resolvedKind,
        commandId: commandId || null,
        locKey,
        targetId: targetId ? String(targetId) : null,
        targetName: targetName ? String(targetName) : null,
        peerId: peerId ? String(peerId) : null,
        senderName: senderName ? String(senderName) : null,
        label: label || defaultLabel,
        duration: Number.isFinite(duration) ? duration : 6.0,
        timestamp
    };
}

export function resolveTacticalPingLabel(payload = {}, translator = t) {
    if (!payload) return 'TACTICAL PING';
    const tr = typeof translator === 'function' ? translator : t;

    if (payload.commandId) {
        const commandKey = `ui.ping.${payload.commandId}`;
        const localized = tr?.(commandKey);
        if (localized && localized !== commandKey) return localized;
        const chatKey = `ui.chat.quick.${payload.commandId}`;
        const chatLocalized = tr?.(chatKey);
        if (chatLocalized && chatLocalized !== chatKey) return chatLocalized;
        return payload.label || payload.commandId.toUpperCase();
    }

    if (payload.kind === 'enemy') {
        const target = payload.targetName ? String(payload.targetName).toUpperCase() : 'HOSTILE';
        const localized = tr?.('ui.ping.target', { target });
        if (localized && localized !== 'ui.ping.target') return localized;
        return payload.label || `TARGET: ${target}`;
    }

    if (payload.kind === 'item') {
        const item = payload.targetName ? String(payload.targetName).toUpperCase() : 'SUPPLIES';
        const localized = tr?.('ui.ping.supplies', { item });
        if (localized && localized !== 'ui.ping.supplies') return localized;
        return payload.label || `SUPPLIES: ${item}`;
    }

    const localizedPoint = tr?.('ui.ping.point');
    if (localizedPoint && localizedPoint !== 'ui.ping.point') return localizedPoint;
    return payload.label || 'TACTICAL PING';
}

export function createPingSpamGuard({
    minIntervalMs = 350,
    maxBurst = 3,
    burstWindowMs = 2000
} = {}) {
    let lastTime = 0;
    const timestamps = [];

    return {
        canPing(now = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
            if (now - lastTime < minIntervalMs) {
                return false;
            }

            // Clean up timestamps outside window
            while (timestamps.length > 0 && now - timestamps[0] > burstWindowMs) {
                timestamps.shift();
            }

            if (timestamps.length >= maxBurst) {
                return false;
            }

            lastTime = now;
            timestamps.push(now);
            return true;
        },
        reset() {
            lastTime = 0;
            timestamps.length = 0;
        }
    };
}
