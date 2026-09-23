import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { descentSeedOffset, coopTransitionDedupeKey } from './coopTransitions.js';
import { MILESTONE_BOSS_DEFINITIONS } from './milestoneBossLifecycle.js';

// Host and guest wired through a relay that behaves like server/relay.js's
// worldEvent handler: JSON-bounded detail, broadcast to the whole room with
// the sender's id, including the sender itself.
let dispatched;
beforeEach(() => {
    dispatched = [];
    vi.stubGlobal('window', {
        dispatchEvent: (event) => { dispatched.push({ type: event.type, detail: event.detail }); return true; },
        AudioManager: null,
        objectiveRegistry: { trackObjective: vi.fn(), resolveObjective: vi.fn() }
    });
});
afterEach(() => vi.unstubAllGlobals());

const METHODS = ['broadcastSharedWorldEvent', 'handleSharedWorldEvent', 'spawnBossAdds', 'spawnSporesnailAdds', 'spawnQueenAdds',
    'handleSporesnailFightEvent', 'handleQueenFightEvent', 'announceBossFightEvent', 'applyRemoteBossFightEvent',
    'applyRemoteBossAdds', 'applyDescent', 'resolveElevatorChoice', 'applyRemoteMilestoneDefeat'];

function room() {
    const clients = [];
    const relay = (originId, payload) => {
        const detail = JSON.parse(JSON.stringify(payload.detail ?? {}));
        for (const client of clients) client.handleSharedWorldEvent({ event: payload.event, detail, originId });
    };
    const join = (id, isHost) => {
        const parent = { children: [], add(child) { this.children.push(child); } };
        const boss = { position: { x: 10, z: 10 }, parent, material: { color: { setHex: vi.fn() } }, userData: { scatterKey: '3,4:0:sporesnail', biomeTint: 0x88ff88 } };
        const game = {
            isMultiplayer: true,
            multiplayerMode: 'coop',
            isMultiplayerHost: isHost,
            multiplayerLocalPlayerId: id,
            netSocket: { emit: (_name, payload) => relay(id, payload) },
            scatterSprites: [boss],
            scatterMaterials: { sporesnail: {}, crawler: {} },
            boss,
            globalSeedOffset: 1234,
            missionState: { status: 'elevator_ready', targetDepth: 0 },
            defeatedMilestoneBosses: new Set(),
            killedBosses: new Set(),
            isSnailTileWalkable: () => true,
            createScatterInstance: (placement) => ({ position: { x: placement.x, z: placement.z }, userData: { type: placement.type, scatterKey: placement.scatterKey } }),
            spawnGearPoofEffect: vi.fn(),
            getActiveO2GeneratorDistance: () => 40,
            syncVisibleChunks: vi.fn(),
            showBunkerLine: vi.fn(),
            reconcileMilestoneBossLifecycle: vi.fn(),
            reconcileAuthoredWorldProgression: vi.fn(),
            activateExtractionGuidance: vi.fn(),
            persistCampaignWorld: vi.fn()
        };
        for (const method of METHODS) game[method] = ThreeGame.prototype[method];
        clients.push(game);
        return game;
    };
    return { host: join('host', true), guest: join('guest', false) };
}

const adds = (game) => game.scatterSprites.filter((sprite) => sprite.userData.sporesnailAdd).map((sprite) => sprite.userData.scatterKey);

describe('co-op irreversible transitions have one authority', () => {
    it('spawns the host\'s boss adds on the guest with the same keys, and never the guest\'s own', () => {
        const { host, guest } = room();
        guest.handleSporesnailFightEvent({ type: 'adds', count: 2 }, guest.boss);
        expect(adds(guest)).toEqual([]);

        host.handleSporesnailFightEvent({ type: 'adds', count: 2 }, host.boss);
        expect(adds(host)).toHaveLength(2);
        expect(adds(guest)).toEqual(adds(host));

        host.handleSporesnailFightEvent({ type: 'adds', count: 2 }, host.boss);
        expect(adds(guest)).toEqual(adds(host));
        expect(new Set(adds(host)).size).toBe(4);
    });

    it('runs phase and weakpoint beats from the host only', () => {
        const { host, guest } = room();
        guest.handleSporesnailFightEvent({ type: 'weakpoint-open' }, guest.boss);
        expect(guest.boss.userData.weakpointOpen).toBeUndefined();
        host.handleSporesnailFightEvent({ type: 'weakpoint-open' }, host.boss);
        expect(guest.boss.userData.weakpointOpen).toBe(true);
        host.handleSporesnailFightEvent({ type: 'weakpoint-close' }, host.boss);
        expect(guest.boss.userData.weakpointOpen).toBe(false);
        // Attacks target each client's own operator, so they stay local.
        expect(() => guest.handleSporesnailFightEvent({ type: 'attack' }, guest.boss)).not.toThrow();
    });

    it('carries the host\'s Queen phase radio line to the guest', () => {
        const { host, guest } = room();
        guest.boss.userData.scatterKey = host.boss.userData.scatterKey = 'queen-fight';
        dispatched = [];
        host.handleQueenFightEvent({ type: 'phase', phase: 'fury' }, host.boss);
        // One line on the host, one on the guest from the announcement.
        const lines = dispatched.filter((entry) => entry.type === 'queen-phase-line');
        expect(lines.map((entry) => entry.detail.text)).toEqual([
            'QUEEN: I CARRIED YOU. I CARRIED ALL OF YOU.',
            'QUEEN: I CARRIED YOU. I CARRIED ALL OF YOU.'
        ]);
        // The guest's own tick does not add a third.
        guest.handleQueenFightEvent({ type: 'phase', phase: 'fury' }, guest.boss);
        expect(dispatched.filter((entry) => entry.type === 'queen-phase-line')).toHaveLength(2);
    });

    it('opens a milestone crossing on a guest whose boss copy was a replica', () => {
        const { host, guest } = room();
        const milestone = MILESTONE_BOSS_DEFINITIONS[0];
        host.broadcastSharedWorldEvent('milestone-defeated', { milestoneId: milestone.milestoneId });
        expect(guest.defeatedMilestoneBosses.has(milestone.goalKey)).toBe(true);
        expect(guest.reconcileAuthoredWorldProgression).toHaveBeenCalledTimes(1);
        host.broadcastSharedWorldEvent('milestone-defeated', { milestoneId: milestone.milestoneId });
        expect(guest.reconcileAuthoredWorldProgression).toHaveBeenCalledTimes(1);
    });

    it('puts both clients in the same deeper sector whoever chooses to descend', () => {
        const { host, guest } = room();
        guest.resolveElevatorChoice('descend');
        expect(guest.globalSeedOffset).toBe(host.globalSeedOffset);
        expect(host.globalSeedOffset).toBe((1234 + 7919) | 0);
        expect(host.missionState.status).toBe('active');

        host.missionState.status = 'elevator_ready';
        host.resolveElevatorChoice('descend');
        expect(host.globalSeedOffset).toBe((1234 + 2 * 7919) | 0);
        expect(guest.globalSeedOffset).toBe(host.globalSeedOffset);
        expect(guest.syncVisibleChunks).toHaveBeenCalledTimes(2);
    });

    it('ignores a stale or repeated descent announcement', () => {
        const { host, guest } = room();
        host.resolveElevatorChoice('descend');
        const offset = guest.globalSeedOffset;
        guest.handleSharedWorldEvent({ event: 'elevator-descended', detail: { descentIndex: 1, seedOffset: 999 }, originId: 'late' });
        expect(guest.globalSeedOffset).toBe(offset);
    });
});

describe('transition helpers', () => {
    it('reproduces the old cumulative single-player offsets', () => {
        let legacy = 1234;
        for (let index = 1; index <= 5; index += 1) {
            legacy = (legacy + 7919) | 0;
            expect(descentSeedOffset(1234, index)).toBe(legacy);
        }
        expect(descentSeedOffset(2 ** 31 - 5, 1)).toBe(((2 ** 31 - 5) + 7919) | 0);
    });

    it('keys each transition so the relay echo and duplicates dedupe', () => {
        expect(coopTransitionDedupeKey('boss-adds', { bossKey: 'b', sequence: 2 })).toBe('boss-adds:b:2');
        expect(coopTransitionDedupeKey('elevator-descended', { descentIndex: 1 })).toBe('elevator-descended:1');
        expect(coopTransitionDedupeKey('wall-destroyed', {})).toBeNull();
        expect(coopTransitionDedupeKey('boss-adds', { bossKey: 'b' })).toBeNull();
    });
});
