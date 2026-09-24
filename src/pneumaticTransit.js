// ── Pneumatic Transit Return Network ─────────────────────────────
// Part of Invisible Essentials Phase 4 (Navigation friction and return network).
// Provides safe, one-way fast travel from defeated milestone boss arenas
// directly back to the Crashed Ship Sanctuary, eliminating empty backtracking.

export const TRANSIT_INTERACT_RADIUS = 2.5;
export const TRANSIT_COMBAT_RADIUS = 12.0;

export const DEFAULT_SANCTUARY_COORDS = Object.freeze({
    x: 9,
    y: 0,
    z: 5
});

export const BOSS_ARENA_TRANSIT_POINTS = Object.freeze({
    cybersnail: {
        id: 'transit_cybersnail_arena',
        name: 'RING 1 ARENA PNEUMATIC TRANSIT',
        bossKey: 'cybersnail',
        position: { x: 38, y: 0, z: -14 },
        ringIndex: 1
    },
    cryosnail: {
        id: 'transit_cryosnail_arena',
        name: 'FROST CHASM PNEUMATIC TRANSIT',
        bossKey: 'cryosnail',
        position: { x: 62, y: 0, z: 28 },
        ringIndex: 2
    },
    queen: {
        id: 'transit_queen_arena',
        name: 'SECTOR ZERO DEEP TRANSIT',
        bossKey: 'queen',
        position: { x: 95, y: 0, z: 5 },
        ringIndex: 3
    }
});

/**
 * Creates a transit network state manager.
 */
export function createTransitNetwork({ sanctuary = DEFAULT_SANCTUARY_COORDS } = {}) {
    const terminals = new Map();
    // Register the standard milestone boss transit terminals as initially locked
    for (const def of Object.values(BOSS_ARENA_TRANSIT_POINTS)) {
        terminals.set(def.id, {
            ...def,
            unlocked: false,
            timesUsed: 0
        });
    }

    return {
        sanctuary: Object.freeze({ ...sanctuary }),
        terminals,
        activeTransitEffect: null
    };
}

/**
 * Registers an authored or procedural transit terminal.
 */
export function registerTransitTerminal(network, terminalDef) {
    if (!network || !terminalDef || !terminalDef.id) return null;
    const entry = {
        id: terminalDef.id,
        name: terminalDef.name || 'PNEUMATIC TRANSIT TERMINAL',
        bossKey: terminalDef.bossKey || null,
        position: terminalDef.position ? { ...terminalDef.position } : { x: 0, y: 0, z: 0 },
        ringIndex: Number(terminalDef.ringIndex) || 0,
        unlocked: Boolean(terminalDef.unlocked),
        timesUsed: 0
    };
    network.terminals.set(entry.id, entry);
    return entry;
}

/**
 * Unlocks a transit terminal when its associated milestone boss is defeated.
 */
export function unlockTransitTerminal(network, bossKey) {
    if (!network || !bossKey) return null;
    const normalized = String(bossKey).toLowerCase();
    for (const terminal of network.terminals.values()) {
        if (terminal.bossKey && terminal.bossKey.toLowerCase() === normalized) {
            terminal.unlocked = true;
            return terminal;
        }
    }
    return null;
}

/**
 * Returns all unlocked transit terminals in the network.
 */
export function getUnlockedTransitTerminals(network) {
    if (!network) return [];
    return Array.from(network.terminals.values()).filter((t) => t.unlocked);
}

/**
 * Validates whether the player can use a specific transit terminal.
 * Transit is blocked while hostiles are actively engaged or within 12m.
 */
export function canUseTransit(terminal, {
    inCombat = false,
    nearbyHostiles = [],
    playerPosition = null,
    combatRadius = TRANSIT_COMBAT_RADIUS,
    interactRadius = TRANSIT_INTERACT_RADIUS
} = {}) {
    if (!terminal) {
        return { allowed: false, reason: 'missing_terminal' };
    }
    if (!terminal.unlocked) {
        return { allowed: false, reason: 'not_unlocked' };
    }
    if (inCombat) {
        return { allowed: false, reason: 'in_combat' };
    }
    if (playerPosition) {
        const distToTerminal = Math.hypot(playerPosition.x - terminal.position.x, playerPosition.z - terminal.position.z);
        if (distToTerminal > interactRadius) {
            return { allowed: false, reason: 'too_far', distance: distToTerminal };
        }
    }

    // Check for any nearby engaged/living hostile within combat radius
    if (Array.isArray(nearbyHostiles) && nearbyHostiles.length > 0 && playerPosition) {
        const threatened = nearbyHostiles.some((hostile) => {
            if (!hostile || hostile.dead || hostile.hp <= 0) return false;
            const hx = hostile.x ?? hostile.position?.x ?? 0;
            const hz = hostile.z ?? hostile.position?.z ?? 0;
            return Math.hypot(playerPosition.x - hx, playerPosition.z - hz) <= combatRadius;
        });
        if (threatened) {
            return { allowed: false, reason: 'hostiles_nearby' };
        }
    }

    return { allowed: true };
}

/**
 * Executes one-way fast travel directly back to the Crashed Ship Sanctuary.
 */
export function executeTransit(network, terminalId, {
    inCombat = false,
    nearbyHostiles = [],
    playerPosition = null
} = {}) {
    if (!network) return { ok: false, reason: 'missing_network' };
    const terminal = network.terminals.get(terminalId);
    const check = canUseTransit(terminal, { inCombat, nearbyHostiles, playerPosition });
    if (!check.allowed) {
        return { ok: false, reason: check.reason };
    }

    terminal.timesUsed += 1;
    return {
        ok: true,
        destination: { ...network.sanctuary },
        terminalName: terminal.name,
        terminalId: terminal.id
    };
}

/**
 * Formats the player-facing interaction badge/label for the transit terminal.
 */
export function formatTransitLabel(terminal, {
    inCombat = false,
    hostilesNearby = false,
    candidateIndex = 1,
    candidateCount = 1
} = {}) {
    if (!terminal) return '';
    let statusPrefix = 'INTERACT [F]';
    if (candidateCount > 1) {
        statusPrefix = `INTERACT [F] (${candidateIndex} of ${candidateCount}: Pneumatic Transit)`;
    }

    if (inCombat || hostilesNearby) {
        return `${statusPrefix} — TRANSIT LOCKDOWN: HOSTILES IN AREA [F LOCKED]`;
    }
    return `${statusPrefix} — ${terminal.name} -> SANCTUARY RETURN`;
}
