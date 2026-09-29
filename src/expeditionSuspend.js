// Versioned, solo-only expedition continuation storage.
//
// An active snapshot is atomically moved to a resume claim before the world
// starts restoring. The claim survives a crash during loading, but only one
// copy is ever available, preventing repeated reward claims from one save.

export const EXPEDITION_SUSPEND_VERSION = 1;
export const EXPEDITION_SUSPEND_KEY = 'hb_expedition_suspend_v1';
export const EXPEDITION_RESUME_CLAIM_KEY = 'hb_expedition_resume_claim_v1';

function finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function nonNegativeInt(value, fallback = 0) {
    return Math.max(0, Math.floor(finite(value, fallback)));
}

function jsonClone(value, fallback = null) {
    try { return JSON.parse(JSON.stringify(value)); } catch { return fallback; }
}

function stringArray(value) {
    return [...new Set((Array.isArray(value) ? value : []).filter((entry) => typeof entry === 'string'))];
}

function normalizeInventory(value = {}) {
    return {
        health: nonNegativeInt(value.health),
        ammo: nonNegativeInt(value.ammo),
        weapon: nonNegativeInt(value.weapon),
        coin: nonNegativeInt(value.coin)
    };
}

function normalizeEnemy(value) {
    if (!value || typeof value !== 'object' || typeof value.scatterKey !== 'string' || !value.scatterKey) return null;
    if (typeof value.type !== 'string' || !value.type) return null;
    return {
        scatterKey: value.scatterKey,
        type: value.type,
        x: finite(value.x),
        z: finite(value.z),
        hp: Math.max(1, finite(value.hp, 1)),
        maxHp: Math.max(1, finite(value.maxHp, 1)),
        speed: Math.max(0, finite(value.speed)),
        enraged: Boolean(value.enraged),
        isBoss: Boolean(value.isBoss),
        isElite: Boolean(value.isElite),
        aiMode: typeof value.aiMode === 'string' ? value.aiMode : 'hunt',
        targetType: typeof value.targetType === 'string' ? value.targetType : 'player',
        dynamic: Boolean(value.dynamic),
        statusEffects: jsonClone(value.statusEffects, null)
    };
}

export function normalizeExpeditionSuspendSnapshot(raw) {
    if (!raw || typeof raw !== 'object' || raw.version !== EXPEDITION_SUSPEND_VERSION) return null;
    if (raw.mode !== 'solo' || typeof raw.resumeId !== 'string' || !raw.resumeId) return null;
    const campaignSeed = Number(raw.expedition?.campaignSeed);
    const expeditionSeed = Number(raw.expedition?.expeditionSeed);
    const expeditionIndex = Number(raw.expedition?.expeditionIndex);
    if (!Number.isSafeInteger(campaignSeed) || !Number.isSafeInteger(expeditionSeed)
        || !Number.isSafeInteger(expeditionIndex) || expeditionIndex < 0) return null;
    const enemies = (Array.isArray(raw.world?.enemies) ? raw.world.enemies : [])
        .map(normalizeEnemy).filter(Boolean);
    return {
        version: EXPEDITION_SUSPEND_VERSION,
        mode: 'solo',
        resumeId: raw.resumeId,
        generation: nonNegativeInt(raw.generation, 1) || 1,
        savedAt: nonNegativeInt(raw.savedAt, Date.now()),
        expedition: {
            campaignSeed,
            expeditionSeed,
            expeditionIndex,
            profile: jsonClone(raw.expedition.profile, null)
        },
        player: {
            classType: typeof raw.player?.classType === 'string' ? raw.player.classType : 'SCOUT',
            x: finite(raw.player?.x),
            z: finite(raw.player?.z),
            facingYaw: finite(raw.player?.facingYaw, Math.PI / 2),
            vitals: {
                hp: Math.max(1, finite(raw.player?.vitals?.hp, 1)),
                maxHp: Math.max(1, finite(raw.player?.vitals?.maxHp, 1)),
                o2: Math.max(0, finite(raw.player?.vitals?.o2, 100)),
                maxO2: Math.max(1, finite(raw.player?.vitals?.maxO2, 100))
            },
            inventory: normalizeInventory(raw.player?.inventory),
            weapon: {
                clipAmmo: nonNegativeInt(raw.player?.weapon?.clipAmmo),
                clipSize: Math.max(1, nonNegativeInt(raw.player?.weapon?.clipSize, 1))
            }
        },
        run: {
            startedAt: nonNegativeInt(raw.run?.startedAt),
            elapsedMs: nonNegativeInt(raw.run?.elapsedMs),
            missionState: jsonClone(raw.run?.missionState, null),
            modifier: jsonClone(raw.run?.modifier, null),
            overclockIds: stringArray(raw.run?.overclockIds),
            relicIds: stringArray(raw.run?.relicIds),
            shardCount: nonNegativeInt(raw.run?.shardCount),
            depositedResources: normalizeInventory(raw.run?.depositedResources),
            kills: nonNegativeInt(raw.run?.kills),
            maxDepthTierReached: nonNegativeInt(raw.run?.maxDepthTierReached),
            currentDepthTier: nonNegativeInt(raw.run?.currentDepthTier),
            totalDistanceTravelled: Math.max(0, finite(raw.run?.totalDistanceTravelled))
        },
        world: {
            maze: jsonClone(raw.world?.maze, null),
            killedEnemyScatterKeys: stringArray(raw.world?.killedEnemyScatterKeys),
            depletedGearPileKeys: stringArray(raw.world?.depletedGearPileKeys),
            killedBosses: stringArray(raw.world?.killedBosses),
            visitedChunks: stringArray(raw.world?.visitedChunks),
            enemies
        }
    };
}

function parseStored(storage, key) {
    try {
        const raw = storage?.getItem?.(key);
        return raw ? normalizeExpeditionSuspendSnapshot(JSON.parse(raw)) : null;
    } catch {
        return null;
    }
}

function writeStored(storage, key, value) {
    try {
        storage?.setItem?.(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

export function createExpeditionSuspendStorage({
    storage = null,
    activeKey = EXPEDITION_SUSPEND_KEY,
    claimKey = EXPEDITION_RESUME_CLAIM_KEY,
    now = () => Date.now(),
    randomId = () => globalThis.crypto?.randomUUID?.() ?? `resume-${now()}`
} = {}) {
    return {
        storage,
        activeKey,
        claimKey,
        peek() {
            return parseStored(storage, claimKey) ?? parseStored(storage, activeKey);
        },
        save(snapshot) {
            if (!storage) return null;
            const previous = this.peek();
            const normalized = normalizeExpeditionSuspendSnapshot({
                ...snapshot,
                version: EXPEDITION_SUSPEND_VERSION,
                mode: 'solo',
                resumeId: snapshot?.resumeId ?? previous?.resumeId ?? randomId(),
                generation: Math.max(previous?.generation ?? 0, nonNegativeInt(snapshot?.generation)) + 1,
                savedAt: now()
            });
            if (!normalized || !writeStored(storage, activeKey, normalized)) return null;
            try { storage.removeItem(claimKey); } catch { /* best effort */ }
            return normalized;
        },
        claim() {
            if (!storage) return null;
            const existingClaim = parseStored(storage, claimKey);
            if (existingClaim) return existingClaim;
            const active = parseStored(storage, activeKey);
            if (!active || !writeStored(storage, claimKey, active)) return null;
            try { storage.removeItem(activeKey); } catch { return null; }
            return active;
        },
        clear() {
            try { storage?.removeItem?.(activeKey); } catch { /* best effort */ }
            try { storage?.removeItem?.(claimKey); } catch { /* best effort */ }
        }
    };
}

export const expeditionSuspendStore = createExpeditionSuspendStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : null
});
