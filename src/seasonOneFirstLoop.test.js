import { afterEach, describe, expect, it } from 'vitest';
import { BankManager } from './bank.js';
import { FabricatorManager } from './fabricator.js';
import { LoadoutManager } from './loadout.js';
import { SeasonPassManager } from './seasonPass.js';
import { LocalVaultLedger } from './localVaultLedger.js';
import { getFieldWeaponProfile } from './fieldWeapon.js';
import { nextSeasonExpedition } from './data/seasonOneExpeditions.js';
import { SEASON_ONE } from './data/seasonOneConfig.js';
import { ThreeGame } from './threeGame.js';

function storage() {
    const data = new Map();
    return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
}
afterEach(() => { delete globalThis.window; });

describe('First objective → useful field fabrication → next deployment', () => {
    it('earns, delivers, prints, reloads, equips and changes actual projectile creation', async () => {
        const store = storage();
        const bank = new BankManager({ storage: store });
        const vault = new LocalVaultLedger(store);
        const pass = new SeasonPassManager({ storage: store, now: () => Date.parse(SEASON_ONE.featuredStart) });
        pass.completeOnboarding('target', { itemdefid: 4120 });
        pass.beginRun('first');
        pass.recordEvent({ runId: 'first', kind: 'objective', id: 'mission:active' });
        pass.settleRun('first', 'failed');
        await pass.settleRewards((reward, key) => reward.kind === 'supply_bundle'
            ? bank.depositSeasonReward({ tech: reward.tech, coin: reward.coin, med: reward.med }, key)
            : vault.grant(reward.itemdefid, reward.qty, key));
        expect(pass.getTotalXp()).toBe(2050);
        expect(vault.read().items.some(i => i.itemdefid === 4120)).toBe(true);
        expect(bank.getState()).toMatchObject({ tech: 20, coin: 10, med: 5, foundryActivated: false });
        const printer = new FabricatorManager({ storage: store, bank, now: () => 1000 });
        expect(printer.startPrint('scatter_rep', bank)?.id).toBe('scatter_rep');
        expect(bank.getState()).toMatchObject({ tech: 8, coin: 4, med: 5 });
        const recovered = new FabricatorManager({ storage: store, bank, now: () => 11000 });
        expect(recovered.tickPrints()).toEqual(['scatter_rep']);
        const loadout = new LoadoutManager({ storage: store });
        expect(loadout.equip('scatter_rep', recovered)).toBe(true);
        const nextLoadout = new LoadoutManager({ storage: store });
        const profile = getFieldWeaponProfile(nextLoadout.getEquippedId(), recovered.isFabricated(nextLoadout.getEquippedId()));
        expect(profile.spreads).toHaveLength(3);
        const shots = [];
        globalThis.window = {};
        const game = { playerType: 'SCOUT', player: { position: { x: 0, z: 0 } }, fieldWeapon: profile,
            getTerrainHeightAt: () => 0, spawnProjectile: shot => shots.push(shot) };
        ThreeGame.prototype.spawnPlayerShot.call(game, 1, 0);
        expect(shots).toHaveLength(3);
        expect(shots[0].vz).toBeLessThan(0);
        expect(shots[2].vz).toBeGreaterThan(0);
        const fieldTtl = shots[0].ttl;
        shots.length = 0;
        game.fieldWeapon = null;
        ThreeGame.prototype.spawnPlayerShot.call(game, 1, 0);
        expect(shots).toHaveLength(1);
        expect(shots[0].ttl).toBeGreaterThan(fieldTtl);
    });

    it('recovers a paid print after the fabricator write fails without charging again', () => {
        const store = storage();
        const bank = new BankManager({ storage: store });
        bank.deposit({ tech: 20, coin: 10 });
        const printer = new FabricatorManager({ storage: store, bank, now: () => 1000 });
        const write = store.setItem;
        store.setItem = (key, value) => { if (key === 'hb_fabricator_v1') throw new Error('interrupted'); write(key, value); };
        expect(() => printer.startPrint('scatter_rep', bank)).toThrow('interrupted');
        expect(bank.getState()).toMatchObject({ tech: 8, coin: 4 });
        store.setItem = write;
        const resumed = new FabricatorManager({ storage: store, bank, now: () => 12000 });
        resumed.tickPrints();
        expect(resumed.isFabricated('scatter_rep')).toBe(true);
        expect(resumed.startPrint('scatter_rep', bank)).toBeNull();
        expect(bank.getState()).toMatchObject({ tech: 8, coin: 4 });
    });

    it('never selects the same opening package three times consecutively', () => {
        const first = nextSeasonExpedition([], () => 0);
        const next = nextSeasonExpedition([first.id, first.id], () => 0);
        expect(next.id).not.toBe(first.id);
        expect(next.type).toBe('mapping');
    });
});
