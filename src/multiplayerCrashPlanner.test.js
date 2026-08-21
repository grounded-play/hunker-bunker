import { describe, expect, it } from 'vitest';
import {
    planMultiplayerCrashSites,
    hashSeed,
    MULTIPLAYER_SPAWN_MODES,
    DEFAULT_BASE_SPAWN,
    partitionCrashPlanPlayers
} from './multiplayerCrashPlanner.js';

describe('multiplayerCrashPlanner', () => {
    it('produces deterministic hashes for string and numeric seeds', () => {
        expect(hashSeed('SECTOR-7')).toBe(hashSeed('SECTOR-7'));
        expect(hashSeed(12345)).toBe(12345);
        expect(typeof hashSeed('ALPHA-BRAVO')).toBe('number');
    });

    it('generates valid 2-player co-op crash sites with distinct spawn locations', () => {
        const plan = planMultiplayerCrashSites({
            seed: 'ALPHA-99',
            playerCount: 2,
            mode: MULTIPLAYER_SPAWN_MODES.COOP,
            playerRoster: [
                { id: 'host-1', callsign: 'VIPER', opClass: 'SCOUT' },
                { id: 'peer-2', callsign: 'TITAN', opClass: 'TANK' }
            ]
        });

        expect(plan.playerCount).toBe(2);
        expect(plan.players.length).toBe(2);

        const [p1, p2] = plan.players;
        expect(p1.spawnX).toBe(DEFAULT_BASE_SPAWN.x);
        expect(p1.spawnZ).toBe(DEFAULT_BASE_SPAWN.z);
        expect(p1.callsign).toBe('VIPER');
        expect(p1.opClass).toBe('SCOUT');

        expect(p2.spawnX).not.toBe(p1.spawnX);
        expect(p2.callsign).toBe('TITAN');
        expect(p2.opClass).toBe('TANK');

        expect(plan.breachCorridors.length).toBe(1);
        expect(plan.breachCorridors[0].corridorArchetype).toBe('distress_conduit');
    });

    it('generates valid PvP crash sites with contested breach corridor', () => {
        const plan = planMultiplayerCrashSites({
            seed: 'PVP-ARENA-1',
            playerCount: 2,
            mode: MULTIPLAYER_SPAWN_MODES.PVP,
            playerRoster: [
                { id: 'host-1', callsign: 'RIVAL-1', opClass: 'ENGINEER' },
                { id: 'peer-2', callsign: 'RIVAL-2', opClass: 'SCOUT' }
            ]
        });

        expect(plan.mode).toBe(MULTIPLAYER_SPAWN_MODES.PVP);
        expect(plan.breachCorridors.length).toBe(1);
        expect(plan.breachCorridors[0].corridorArchetype).toBe('contested_breach');
        expect(plan.breachCorridors[0].label).toBe('CONTESTED ZONE');
    });

    it('clamps player count safely between 1 and 4', () => {
        const planSolo = planMultiplayerCrashSites({ playerCount: 0 });
        expect(planSolo.players.length).toBe(1);

        const planSquad = planMultiplayerCrashSites({ playerCount: 8 });
        expect(planSquad.players.length).toBe(4);
    });

    it('partitions host and guest crash entries by the local socket ID', () => {
        const players = [
            { id: 'host-socket', isHost: true, spawnX: 9, spawnZ: 9 },
            { id: 'guest-socket', isHost: false, spawnX: 47, spawnZ: 47 }
        ];

        const host = partitionCrashPlanPlayers(players, { localPlayerId: 'host-socket', isHost: true });
        expect(host.localPlayer.id).toBe('host-socket');
        expect(host.remotePlayers.map((player) => player.id)).toEqual(['guest-socket']);

        const guest = partitionCrashPlanPlayers(players, { localPlayerId: 'guest-socket', isHost: false });
        expect(guest.localPlayer.id).toBe('guest-socket');
        expect(guest.remotePlayers.map((player) => player.id)).toEqual(['host-socket']);
    });

    it('falls back to the local host role when no live socket ID is available', () => {
        const players = [
            { id: 'host', isHost: true },
            { id: 'guest', isHost: false }
        ];

        expect(partitionCrashPlanPlayers(players, { isHost: true }).localPlayer.id).toBe('host');
        expect(partitionCrashPlanPlayers(players, { isHost: false }).localPlayer.id).toBe('guest');
    });
});
