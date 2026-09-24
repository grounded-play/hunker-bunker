import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// 2026-09-24 Deck + PC co-op QA (docs/planning/qa-2026-09-24-deck-pc-coop-game-plan.md):
// a squadmate's pit-fall death never reached the partner (they kept seeing a
// standing operator), the guest recovering their own black box wiped the host's,
// and each client rolled its own power-up drops.

afterEach(() => vi.unstubAllGlobals());

const METHODS = ['broadcastSharedWorldEvent', 'handleSharedWorldEvent', 'applyRemotePlayerDeath',
    'applyRemotePlayerRedeploy', 'applyRemoteLootDrop', 'removeLootDrop'];

function netGame({ id = 'me', host = false, remotes = [] } = {}) {
    const emit = vi.fn();
    vi.stubGlobal('window', {
        dispatchEvent: () => true,
        CustomEvent,
        AudioManager: { play: vi.fn() },
        showToastNotification: vi.fn()
    });
    const game = {
        isMultiplayer: true,
        multiplayerMode: 'coop',
        isMultiplayerHost: host,
        multiplayerLocalPlayerId: id,
        netSocket: { emit },
        remotePlayers: new Map(remotes.map((remote) => [remote.id, remote])),
        inRunLootDrops: [],
        clearBlackBoxMarker: vi.fn(),
        _blackBoxState: { active: true, x: 1, z: 1 },
        arcManager: { recordSignal: vi.fn(), evaluate: vi.fn() },
        showRemotePlayerDeathMarker: vi.fn((remote) => { remote.deathMarker = {}; }),
        clearRemotePlayerDeathMarker: vi.fn((remote) => { if (remote) remote.deathMarker = null; }),
        spawnPhysicalLootDrop: vi.fn((x, z, item) => ({ position: { x, z }, userData: { item } }))
    };
    game.spawnPhysicalLootDrop.mockImplementation((x, z, item) => {
        const mesh = { position: { x, z }, userData: { item }, removeFromParent: vi.fn(), traverse: vi.fn() };
        game.inRunLootDrops.push(mesh);
        return mesh;
    });
    for (const method of METHODS) game[method] = ThreeGame.prototype[method];
    return { game, emit };
}

const remote = (id) => ({ id, callsign: 'HAWK-3', mesh: { visible: true, position: { x: 0, z: 0 } }, overlay: { setDowned: vi.fn() }, hp: 5, maxHp: 5 });

describe('a squadmate death reaches the partner', () => {
    it('shows the body down, where it fell, with its black box — not a standing operator', () => {
        const hawk = remote('hawk');
        const { game } = netGame({ remotes: [hawk] });
        const applied = game.handleSharedWorldEvent({ event: 'player-died', detail: { playerId: 'hawk', seq: 1, x: 1.4, z: -1.9, reason: 'pit-fall' }, originId: 'hawk' });
        expect(applied).not.toBe(false);
        expect(hawk.isDown).toBe(true);
        expect(hawk.mesh.position).toEqual({ x: 1.4, z: -1.9 });
        expect(hawk.overlay.setDowned).toHaveBeenCalledWith(true);
        expect(game.showRemotePlayerDeathMarker).toHaveBeenCalledWith(hawk, { keepBody: true });
    });

    it('applies each death once, and stands the squadmate back up on redeploy', () => {
        const hawk = remote('hawk');
        const { game } = netGame({ remotes: [hawk] });
        const died = { event: 'player-died', detail: { playerId: 'hawk', seq: 1, x: 0, z: 0 }, originId: 'hawk' };
        game.handleSharedWorldEvent(died);
        game.handleSharedWorldEvent(died);
        expect(game.showRemotePlayerDeathMarker).toHaveBeenCalledTimes(1);
        game.handleSharedWorldEvent({ event: 'player-redeployed', detail: { playerId: 'hawk', seq: 1 }, originId: 'hawk' });
        expect(hawk.isDown).toBe(false);
        expect(hawk.overlay.setDowned).toHaveBeenLastCalledWith(false);
        expect(hawk.deathMarker).toBeNull();
        // A second life, a second death.
        game.handleSharedWorldEvent({ event: 'player-died', detail: { playerId: 'hawk', seq: 2, x: 0, z: 0 }, originId: 'hawk' });
        expect(game.showRemotePlayerDeathMarker).toHaveBeenCalledTimes(2);
    });
});

describe('black boxes belong to their owner', () => {
    it("a squadmate recovering their box leaves ours alone", () => {
        const { game } = netGame({ remotes: [remote('hawk')] });
        game.handleSharedWorldEvent({ event: 'black-box-recovered', detail: { ownerId: 'hawk', recovered: { timestamp: 5 } }, originId: 'hawk' });
        expect(game.clearBlackBoxMarker).not.toHaveBeenCalled();
        expect(game._blackBoxState).toEqual({ active: true, x: 1, z: 1 });
    });

    it('our own recovery, echoed back from another device of ours, clears ours', () => {
        const { game } = netGame();
        game.handleSharedWorldEvent({ event: 'black-box-recovered', detail: { ownerId: 'me', recovered: { timestamp: 6 } }, originId: 'relay-other' });
        expect(game.clearBlackBoxMarker).toHaveBeenCalled();
    });

    it('an old client without an owner id cannot wipe ours', () => {
        const { game } = netGame();
        game.handleSharedWorldEvent({ event: 'black-box-recovered', detail: { recovered: { timestamp: 7 } }, originId: 'hawk' });
        expect(game.clearBlackBoxMarker).not.toHaveBeenCalled();
    });
});

describe('power-up drops are the host’s, seen by both', () => {
    it('the guest renders the host’s drop and removes it when anyone takes it', () => {
        const { game } = netGame();
        game.handleSharedWorldEvent({ event: 'loot-drop-spawned', detail: { dropId: 'host:1', itemId: 'cryo_rime', x: 3, z: 4 }, originId: 'host' });
        expect(game.inRunLootDrops).toHaveLength(1);
        expect(game.inRunLootDrops[0].userData).toMatchObject({ lootDropId: 'host:1', item: { id: 'cryo_rime' } });
        // The same announcement twice spawns one drop.
        game.handleSharedWorldEvent({ event: 'loot-drop-spawned', detail: { dropId: 'host:1', itemId: 'cryo_rime', x: 3, z: 4 }, originId: 'host' });
        expect(game.inRunLootDrops).toHaveLength(1);
        game.handleSharedWorldEvent({ event: 'loot-drop-collected', detail: { dropId: 'host:1' }, originId: 'host' });
        expect(game.inRunLootDrops).toHaveLength(0);
    });

    it('ignores an unknown item rather than inventing one', () => {
        const { game } = netGame();
        game.handleSharedWorldEvent({ event: 'loot-drop-spawned', detail: { dropId: 'host:2', itemId: 'no_such_drop', x: 0, z: 0 }, originId: 'host' });
        expect(game.inRunLootDrops).toHaveLength(0);
    });
});

describe('every co-op death is announced', () => {
    function dyingGame(overrides = {}) {
        const broadcast = vi.fn();
        vi.stubGlobal('window', { dispatchEvent: () => true, CustomEvent });
        return {
            broadcast,
            game: {
                isPlayerDead: false,
                getSessionInventory: () => ({ health: 0, ammo: 0, weapon: 0, coin: 0, total: 0 }),
                closeConsoleModal: () => {},
                showBunkerLine: () => {},
                buildLineDirectorContext: () => ({ register: 'default' }),
                getDepthTierName: () => 'SURFACE',
                maxDepthTierReached: 0,
                playerType: 'SCOUT',
                player: { position: { x: 0.9, z: -2.3 } },
                isMultiplayer: true,
                multiplayerMode: 'coop',
                netSocket: { emit: vi.fn() },
                isMultiplayerHost: true,
                multiplayerLocalPlayerId: 'deck',
                broadcastSharedWorldEvent: broadcast,
                ...overrides
            }
        };
    }

    it('a pit-fall (which skips the downed state) still tells the squad', () => {
        const { game, broadcast } = dyingGame();
        ThreeGame.prototype.handleDeath.call(game, 'pit-fall');
        expect(broadcast).toHaveBeenCalledWith('player-died', expect.objectContaining({
            playerId: 'deck', seq: 1, x: 0.9, z: -2.3, reason: 'pit-fall', classType: 'SCOUT'
        }));
    });

    it('a solo death announces nothing', () => {
        const { game, broadcast } = dyingGame({ isMultiplayer: false, netSocket: null });
        ThreeGame.prototype.handleDeath.call(game, 'pit-fall');
        expect(broadcast).not.toHaveBeenCalledWith('player-died', expect.anything());
    });
});

describe('only the host rolls power-ups', () => {
    const killGame = (overrides) => {
        const { game } = netGame(overrides);
        game.dropLootForKill = ThreeGame.prototype.dropLootForKill;
        game.runOverclocks = [];
        game.runRelics = [];
        return game;
    };
    const boss = { position: { x: 5, z: 6 }, userData: {} };

    it('a guest rolls nothing and waits for the host', () => {
        const game = killGame({ host: false });
        expect(game.dropLootForKill(boss, { isBoss: true })).toBeNull();
        expect(game.spawnPhysicalLootDrop).not.toHaveBeenCalled();
    });

    it('the host rolls, spawns and announces the same drop', () => {
        const game = killGame({ host: true, id: 'deck' });
        let drop = null;
        for (let i = 0; i < 50 && !drop; i += 1) drop = game.dropLootForKill(boss, { isBoss: true });
        expect(drop).toBeTruthy();
        const mesh = game.inRunLootDrops.at(-1);
        expect(game.netSocket.emit).toHaveBeenCalledWith('worldEvent', {
            event: 'loot-drop-spawned',
            detail: { dropId: mesh.userData.lootDropId, itemId: drop.id, x: 5, z: 6 }
        });
    });
});

describe('TRY AGAIN continues the co-op map with its changes', () => {
    it('a co-op death keeps the run’s world changes for a retry in the same room', () => {
        const broadcast = vi.fn();
        vi.stubGlobal('window', { dispatchEvent: () => true, CustomEvent });
        const maze = { generationVersion: 2, worldChanges: { destroyedWalls: ['wall:3,4'] } };
        const game = {
            isPlayerDead: false,
            getSessionInventory: () => ({ health: 0, ammo: 0, weapon: 0, coin: 0, total: 0 }),
            closeConsoleModal: () => {},
            showBunkerLine: () => {},
            buildLineDirectorContext: () => ({ register: 'default' }),
            getDepthTierName: () => 'SURFACE',
            maxDepthTierReached: 0,
            playerType: 'TANK',
            player: { position: { x: 0, z: 0 } },
            isMultiplayer: true,
            multiplayerMode: 'coop',
            netSocket: { emit: vi.fn() },
            multiplayerLocalPlayerId: 'pc',
            multiplayerRoomCode: 'STEAM-1',
            broadcastSharedWorldEvent: broadcast,
            getMazePersistenceState: () => maze,
            shouldCarryCoopRun: ThreeGame.prototype.shouldCarryCoopRun
        };
        ThreeGame.prototype.handleDeath.call(game, 'pit-fall');
        expect(game._coopRunCarry).toEqual({ roomCode: 'STEAM-1', maze });
        expect(game.shouldCarryCoopRun()).toBe(true);
        // Another room, or a solo run, does not inherit it.
        expect(ThreeGame.prototype.shouldCarryCoopRun.call({ ...game, multiplayerRoomCode: 'STEAM-2' })).toBe(false);
        expect(ThreeGame.prototype.shouldCarryCoopRun.call({ ...game, isMultiplayer: false })).toBe(false);
        // MAIN MENU clears it (setPerformanceProfile('menu') sets it to null).
        expect(ThreeGame.prototype.shouldCarryCoopRun.call({ ...game, _coopRunCarry: null })).toBe(false);
    });
});

describe('a broken prop breaks on both screens with the same drops', () => {
    function propGame(overrides = {}) {
        vi.stubGlobal('window', { dispatchEvent: () => true, CustomEvent, AudioManager: { play: vi.fn(), playMetalStress: vi.fn() } });
        const parent = { add: vi.fn(), remove: vi.fn() };
        const prop = { position: { x: 10, z: 20 }, parent, userData: { type: 'prop_camp_crates', scatterKey: 'prop:10:20', propHp: 1 } };
        const game = {
            isMultiplayer: true,
            multiplayerMode: 'coop',
            netSocket: { emit: vi.fn() },
            multiplayerLocalPlayerId: 'deck',
            scatterSprites: [prop],
            pickupMeshes: [],
            loadoutMods: {},
            player: { position: { x: 9, z: 20 } },
            spawnGearPoofEffect: vi.fn(),
            spawnToxicSporePuddle: vi.fn(),
            createSnailDropPlacement: (sx, sz, x, z, type) => ({ worldX: x, worldZ: z, type }),
            createPickupInstance: (placement) => ({ position: { x: placement.worldX, z: placement.worldZ }, userData: { type: placement.type } }),
            ...overrides
        };
        for (const method of ['broadcastSharedWorldEvent', 'handleSharedWorldEvent', 'breakScatterProp', 'applyRemotePropBroken', 'spawnDestructiblePropDrops']) {
            game[method] = ThreeGame.prototype[method];
        }
        return { game, prop };
    }

    it('the breaker announces the prop and its rolled drops; the partner reproduces them exactly', () => {
        const { game: deck, prop } = propGame();
        deck.breakScatterProp(prop);
        const [, payload] = deck.netSocket.emit.mock.calls.find(([name, body]) => name === 'worldEvent' && body.event === 'prop-broken');
        expect(payload.detail.scatterKey).toBe('prop:10:20');
        expect(payload.detail.drops.length).toBeGreaterThan(0);
        expect(deck.scatterSprites).toHaveLength(0);

        const { game: pc } = propGame({ multiplayerLocalPlayerId: 'pc' });
        pc.handleSharedWorldEvent({ event: 'prop-broken', detail: payload.detail, originId: 'deck' });
        expect(pc.scatterSprites).toHaveLength(0);
        expect(pc.pickupMeshes.map((p) => [p.userData.type, p.position.x, p.position.z, p.userData.pickupId]))
            .toEqual(deck.pickupMeshes.map((p) => [p.userData.type, p.position.x, p.position.z, p.userData.pickupId]));
        // The partner does not re-announce it.
        expect(pc.netSocket.emit.mock.calls.some(([, body]) => body?.event === 'prop-broken')).toBe(false);
    });
});
