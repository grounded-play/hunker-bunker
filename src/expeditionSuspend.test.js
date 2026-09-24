import { describe, expect, it } from 'vitest';
import {
    EXPEDITION_RESUME_CLAIM_KEY,
    EXPEDITION_SUSPEND_KEY,
    createExpeditionSuspendStorage,
    normalizeExpeditionSuspendSnapshot
} from './expeditionSuspend.js';

function memoryStorage() {
    const values = new Map();
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: (key) => values.delete(key),
        values
    };
}

function snapshot(overrides = {}) {
    return {
        version: 1,
        mode: 'solo',
        resumeId: 'resume-a',
        generation: 1,
        savedAt: 10,
        expedition: { campaignSeed: 42, expeditionSeed: 84, expeditionIndex: 2, profile: { title: 'E3' } },
        player: {
            classType: 'ENGINEER', x: 12, z: -4, facingYaw: 1,
            vitals: { hp: 2, maxHp: 4, o2: 51, maxO2: 90 },
            inventory: { health: 1, ammo: 8, weapon: 3, coin: 2 },
            weapon: { clipAmmo: 4, clipSize: 6 }
        },
        run: { missionState: { status: 'active' }, overclockIds: ['cryo_rime'], relicIds: ['shatter_engine'] },
        world: { killedEnemyScatterKeys: ['dead:1'], enemies: [{ scatterKey: 'live:1', type: 'cryosnail', x: 3, z: 4, hp: 2, maxHp: 4 }] },
        ...overrides
    };
}

describe('expedition suspend snapshot', () => {
    it('normalizes the complete continuation contract and rejects non-solo saves', () => {
        const value = normalizeExpeditionSuspendSnapshot(snapshot());
        expect(value).toMatchObject({
            expedition: { campaignSeed: 42, expeditionIndex: 2 },
            player: { classType: 'ENGINEER', inventory: { ammo: 8 } },
            run: { overclockIds: ['cryo_rime'], relicIds: ['shatter_engine'] },
            world: { killedEnemyScatterKeys: ['dead:1'], enemies: [{ scatterKey: 'live:1', hp: 2 }] }
        });
        expect(normalizeExpeditionSuspendSnapshot(snapshot({ mode: 'coop' }))).toBeNull();
    });

    it('atomically moves one active snapshot into one retryable claim', () => {
        const storage = memoryStorage();
        const store = createExpeditionSuspendStorage({ storage, now: () => 100, randomId: () => 'generated' });
        const saved = store.save(snapshot({ resumeId: undefined, generation: 0 }));
        expect(saved.resumeId).toBe('generated');
        expect(storage.getItem(EXPEDITION_SUSPEND_KEY)).toBeTruthy();

        const claim = store.claim();
        expect(claim.resumeId).toBe('generated');
        expect(storage.getItem(EXPEDITION_SUSPEND_KEY)).toBeNull();
        expect(storage.getItem(EXPEDITION_RESUME_CLAIM_KEY)).toBeTruthy();
        expect(store.claim()).toEqual(claim);
    });

    it('commits restored progress as a newer single snapshot and clears the claim', () => {
        const storage = memoryStorage();
        let now = 100;
        const store = createExpeditionSuspendStorage({ storage, now: () => now, randomId: () => 'same-run' });
        const first = store.save(snapshot({ resumeId: undefined, generation: 0 }));
        store.claim();
        now = 200;
        const committed = store.save({ ...first, player: { ...first.player, x: 99 } });
        expect(committed.generation).toBeGreaterThan(first.generation);
        expect(committed.player.x).toBe(99);
        expect(storage.getItem(EXPEDITION_RESUME_CLAIM_KEY)).toBeNull();
        expect(store.peek()).toEqual(committed);
    });

    it('fails closed on corrupt data and clears both records', () => {
        const storage = memoryStorage();
        storage.setItem(EXPEDITION_SUSPEND_KEY, '{broken');
        const store = createExpeditionSuspendStorage({ storage });
        expect(store.peek()).toBeNull();
        store.clear();
        expect(storage.values.size).toBe(0);
    });
});

