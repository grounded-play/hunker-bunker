import { describe, expect, it } from 'vitest';
import { SeasonPassManager, STORAGE_KEY, withSeasonLock } from './seasonPass.js';
import { LocalVaultLedger, LOCAL_VAULT_KEY } from './localVaultLedger.js';
import { BankManager } from './bank.js';
import { SEASON_ONE } from './data/seasonOneConfig.js';

function storage() {
    const values = new Map();
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
}
const atWeek = week => () => Date.parse(SEASON_ONE.featuredStart) + (week - 1) * 604800000;
function manager(store = storage(), week = 1) { return new SeasonPassManager({ storage: store, now: atWeek(week) }); }
function event(pass, runId, kind, id, extra = {}) { return pass.recordEvent({ runId, kind, id, ...extra }); }
function ordinaryRun(pass, id, outcome = 'extracted') {
    pass.beginRun(id);
    for (let i = 0; i < 4; i++) event(pass, id, 'objective', `objective:${i}`);
    event(pass, id, 'depth', 'depth:1', { tier: 1, crossing: true });
    pass.settleRun(id, outcome);
}

describe('Season 1 local progression invariants', () => {
    it('retains objective XP after failure and pays an ordinary extraction exactly once', () => {
        const pass = manager();
        ordinaryRun(pass, 'one', 'failed');
        expect(pass.getTotalXp()).toBe(1450); // 1,000 one-time onboarding + 450 run XP
        ordinaryRun(pass, 'two');
        // Two objectives/depth directives also finish on run two.
        expect(pass.getTotalXp()).toBe(1450 + 750 + 2000);
        const xp = pass.getTotalXp();
        expect(pass.settleRun('two', 'extracted').xpAwarded).toBe(0);
        expect(pass.beginRun('two')).toBe(false);
        expect(event(pass, 'two', 'boss', 'late').xpAwarded).toBe(0);
        expect(pass.getTotalXp()).toBe(xp);
        expect(pass.state.fragments.common).toBe(1);
    });

    it('rejects replay, spawn, forced depth announcements, invalid inputs and over-cap objectives', () => {
        const pass = manager();
        expect(event(pass, 'unknown', 'objective', 'x').xpAwarded).toBe(0);
        pass.beginRun('run');
        for (let i = 0; i < 7; i++) event(pass, 'run', 'objective', `o:${i}`);
        expect(pass.getTotalXp()).toBe(1300);
        expect(event(pass, 'run', 'objective', 'o:0').xpAwarded).toBe(0);
        expect(event(pass, 'run', 'depth', 'spawn', { tier: 0, crossing: true }).xpAwarded).toBe(0);
        expect(event(pass, 'run', 'depth', 'forced', { tier: 1 }).xpAwarded).toBe(0);
        expect(event(pass, 'run', 'depth', 'invalid', { tier: 4, crossing: true }).xpAwarded).toBe(0);
        expect(event(pass, 'run', 'depth', 'd:1', { tier: 1, crossing: true }).xpAwarded).toBe(250);
        expect(event(pass, 'run', 'depth', 'renamed', { tier: 1, crossing: true }).xpAwarded).toBe(0);
        expect(pass.addXp(Infinity).xpAwarded).toBe(0);
        expect(pass.addXp(-100).xpAwarded).toBe(0);
    });

    it('does not reward idle extraction or reopen one-time onboarding', () => {
        const pass = manager();
        pass.beginRun('idle');
        pass.settleRun('idle', 'extracted');
        expect(pass.getTotalXp()).toBe(0);
        expect(pass.state.fragments.common).toBe(0);
        pass.completeOnboarding('target', { itemdefid: 4120 });
        pass.completeOnboarding('target', { itemdefid: 4130 });
        pass.completeOnboarding('equipped');
        expect(pass.getTotalXp()).toBe(1000);
        pass.completeOnboarding('fabricated');
        pass.completeOnboarding('fabricated');
        expect(pass.getTotalXp()).toBe(2000);
        expect(pass.state.pinnedTarget.itemdefid).toBe(4130);
    });

    it('archives exactly 24 directives, including unfinished progress and late joins', () => {
        const store = storage();
        const early = manager(store);
        early.beginRun('run');
        event(early, 'run', 'objective', 'o:1');
        const late = manager(store, 99);
        expect(late.getActiveWeeklies()).toHaveLength(24);
        expect(late.getActiveWeeklies()[0].progress).toBe(1);
        event(late, 'run', 'objective', 'o:2');
        expect(late.getActiveWeeklies()[0].progress).toBe(2);
        expect(late.getActiveWeeklies()[3].progress).toBe(1);
        expect(manager(storage(), 99).getActiveWeeklies()).toHaveLength(24);
    });

    it('caps cumulative fragments at 3 per released week and 24 Common + 8 Rare forever', () => {
        const pass = manager(storage(), 99);
        for (let i = 0; i < 30; i++) ordinaryRun(pass, `run:${i}`);
        pass.beginRun('activity');
        event(pass, 'activity', 'activity', 'camp:meridian');
        expect(pass.state.fragments.common).toBe(24);
        expect(pass.state.fragments.rareWeeks).toHaveLength(8);
        expect(pass.getActiveWeeklies().every(d => d.claimed)).toBe(true);
        expect(pass.getPendingClaims().filter(r => r.reward.itemdefid === 1000)).toHaveLength(24);
        expect(pass.getPendingClaims().filter(r => r.reward.itemdefid === 1100)).toHaveLength(8);
        expect(pass.getTotalXp()).toBe(45000);
        const firstWeek = manager();
        for (let i = 0; i < 5; i++) ordinaryRun(firstWeek, `r:${i}`);
        expect(firstWeek.state.fragments.common).toBe(3);
    });

    it('gives identical XP and fragments to free and verified premium histories', () => {
        const free = manager();
        const paid = manager();
        paid.setVerifiedEntitlement({ seasonId: SEASON_ONE.id, verified: true, owned: true });
        for (const pass of [free, paid]) { ordinaryRun(pass, 'same'); event(pass, 'same', 'boss', 'late'); }
        expect(free.state.xp).toBe(paid.state.xp);
        expect(free.state.fragments).toEqual(paid.state.fragments);
        paid.setPremium(true);
        paid.setVerifiedEntitlement({ seasonId: SEASON_ONE.id, verified: true, owned: false });
        expect(paid.hasPremium()).toBe(false);
        expect(manager(paid.storage).hasPremium()).toBe(false);
    });

    it('rolls back event completion and XP together when persistence fails', () => {
        const store = storage();
        const pass = manager(store);
        pass.beginRun('run');
        const write = store.setItem;
        store.setItem = () => { throw new Error('disk full'); };
        expect(() => event(pass, 'run', 'objective', 'first')).toThrow('disk full');
        expect(pass.getTotalXp()).toBe(0);
        expect(pass.state.runs.run.objectives).toEqual([]);
        store.setItem = write;
        expect(event(pass, 'run', 'objective', 'first').xpAwarded).toBe(1050);
    });

    it('persists choice before delivery; concurrent managers cannot choose both', async () => {
        const store = storage();
        const first = manager(store);
        first.addXp(22500);
        const second = manager(store);
        expect(first.claim(15, 'invalid')).toBeNull();
        expect(first.claim(15, 'free', { selectedChoice: 9999 })).toBeNull();
        expect(first.claim(15, 'free', { selectedChoice: 4112, ownedChoices: [4112] })).toBeNull();
        const [a, b] = await Promise.all([
            withSeasonLock(() => first.claim(15, 'free', { selectedChoice: 4112 })),
            withSeasonLock(() => second.claim(15, 'free', { selectedChoice: 4113 }))
        ]);
        expect(a.receiptId).toBe(b.receiptId);
        expect(b.itemdefid).toBe(4112);
    });
});

describe('Reward delivery and deterministic workshop recovery', () => {
    it('retries after sink commit / progression confirmation failure without minting twice', async () => {
        const store = storage();
        const pass = manager(store);
        const bank = new BankManager({ storage: store });
        const vault = new LocalVaultLedger(store);
        pass.addXp(3000);
        const write = store.setItem;
        let failConfirm = true;
        const deliver = (reward, id) => {
            const result = reward.kind === 'supply_bundle'
                ? bank.depositSeasonReward({ tech: reward.tech, coin: reward.coin, med: reward.med }, id)
                : vault.grant(reward.itemdefid, reward.qty, id);
            if (failConfirm) store.setItem = (key, value) => { if (key === STORAGE_KEY) throw new Error('crash'); write(key, value); };
            return result;
        };
        await pass.settleRewards(deliver);
        expect(pass.getPendingClaims()).toHaveLength(2);
        store.setItem = write;
        failConfirm = false;
        const resumed = manager(store);
        await resumed.settleRewards(deliver);
        expect(resumed.getPendingClaims()).toHaveLength(0);
        expect(bank.getState()).toMatchObject({ tech: 5, coin: 2, med: 1 });
        expect(vault.read().items.filter(i => i.itemdefid === 4120)).toHaveLength(1);
    });

    it('keeps failed remote deliveries pending without asserting ownership', async () => {
        const store = storage();
        const pass = manager(store);
        pass.addXp(1500);
        await pass.settleRewards(() => ({ ok: false, reason: 'offline' }));
        expect(pass.isClaimed(1, 'free')).toBe(false);
        expect(manager(store).getPendingClaims()).toHaveLength(1);
    });

    it('consumes exact quantities from multiple stacks and replays the same craft receipt', () => {
        const store = storage();
        store.setItem(LOCAL_VAULT_KEY, JSON.stringify([
            { itemId: 'a', itemdefid: 1000, quantity: 2 }, { itemId: 'b', itemdefid: 1000, quantity: 4 }
        ]));
        const vault = new LocalVaultLedger(store);
        const first = vault.craft(2100);
        expect(first.ok).toBe(true);
        expect(first.items.filter(i => i.itemdefid === 1000)).toEqual([{ itemId: 'b', itemdefid: 1000, quantity: 1 }]);
        expect(new LocalVaultLedger(store).craft(2100).duplicate).toBe(true);
        expect(vault.read().items.filter(i => i.itemdefid === 2100)).toHaveLength(1);
    });

    it('warns for owned outputs and never partially burns on missing ingredients or storage failure', () => {
        const store = storage();
        const vault = new LocalVaultLedger(store);
        vault.grant(2100, 1, 'old-earned-item');
        vault.grant(1000, 10, 'common');
        expect(vault.craft(2100).reason).toBe('already_owned');
        expect(vault.craft(2200).reason).toBe('insufficient_fragments');
        const before = store.getItem(LOCAL_VAULT_KEY);
        store.setItem = () => { throw new Error('quota'); };
        expect(() => vault.craft(2100, { confirmOwned: true })).toThrow('quota');
        expect(store.getItem(LOCAL_VAULT_KEY)).toBe(before);
    });
});

describe('preserved save and completed delivery history', () => {
    it('preserves an unreadable season save and refuses to overwrite it', () => {
        const store = storage();
        store.setItem(STORAGE_KEY, '{interrupted');
        const pass = manager(store);
        expect(() => pass.addXp(1000)).toThrow();
        expect(store.getItem(STORAGE_KEY)).toBe('{interrupted');
    });
    it('never reissues a delivered item removed from inventory', async () => {
        const store = storage();
        const pass = manager(store);
        const vault = new LocalVaultLedger(store);
        const deliver = (reward, key) => vault.grant(reward.itemdefid, reward.qty, key);
        pass.addXp(1500);
        await pass.settleRewards(deliver);
        const record = vault.read();
        record.items = [];
        vault.save(record);
        await manager(store).settleRewards(deliver);
        expect(vault.read().items).toEqual([]);
    });
});
