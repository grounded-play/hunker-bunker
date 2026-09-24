import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

let events;
let registry;
beforeEach(() => {
    events = [];
    registry = { trackObjective: vi.fn(), resolveObjective: vi.fn() };
    vi.stubGlobal('window', {
        dispatchEvent: (event) => { events.push(event.type); return true; },
        objectiveRegistry: registry
    });
});
afterEach(() => vi.unstubAllGlobals());

const METHODS = ['setActiveExpedition', 'syncExpeditionBountyTracker', 'armArrivalIncident', 'updateArrivalIncident',
    'spawnArrivalIncident', 'spawnArrivalMember', 'dropArrivalCache'];

function game({ multiplayer = false } = {}) {
    const parent = { children: [], add(child) { this.children.push(child); child.parent = this; } };
    const g = {
        performanceProfile: 'gameplay',
        chunkSize: 49,
        player: { position: { x: 9, z: 12 } },
        isMultiplayer: multiplayer,
        netSocket: multiplayer ? {} : null,
        isMultiplayerHost: false,
        scatterMaterials: { cryosnail: {}, cybersnail: {} },
        scatterSprites: [],
        pickupMeshes: [],
        chunkMeshes: new Map([['0,0', parent]]),
        scene: parent,
        isSnailTileWalkable: () => true,
        createScatterInstance: (placement) => ({ position: { x: placement.x, z: placement.z }, userData: { type: placement.type, isElite: placement.spawnedElite } }),
        createSnailDropPlacement: (x, z, tx, tz, type) => ({ worldX: tx, worldZ: tz, type }),
        createPickupInstance: (placement) => ({ userData: { type: placement.type } }),
        showBunkerLine: vi.fn(),
        applyExpeditionPlayerEffects: vi.fn()
    };
    for (const method of METHODS) g[method] = ThreeGame.prototype[method];
    return g;
}

const gale = (index) => ({ condition: { id: 'glacial_gale' }, bounty: { id: 'salvage_run' }, expeditionSeed: 4242, expeditionIndex: index });

describe('the arrival incident in the runtime', () => {
    it('waits, announces the pack, tracks it, and leaves a salvage cache when it is cleared', () => {
        const g = game();
        g.setActiveExpedition(gale(2));
        g.updateArrivalIncident(10);
        expect(g.scatterSprites).toHaveLength(0);
        g.updateArrivalIncident(11);
        expect(g.scatterSprites.map((s) => s.userData.type)).toEqual(['cryosnail', 'cryosnail', 'cryosnail']);
        expect(g.scatterSprites.every((s) => s.userData.aiMode === 'hunt' && s.userData.arrivalIncident)).toBe(true);
        for (const sprite of g.scatterSprites) {
            expect(Math.hypot(sprite.position.x - 9, sprite.position.z - 12)).toBeGreaterThan(13);
        }
        expect(g.showBunkerLine).toHaveBeenCalledTimes(1);
        expect(registry.trackObjective).toHaveBeenCalledWith(expect.objectContaining({ id: 'arrival-incident', priority: 25 }));
        expect(events).toContain('arrival-incident-started');

        g.scatterSprites[0].userData.burstTriggered = true;
        g.updateArrivalIncident(0.1);
        expect(g.pickupMeshes).toHaveLength(0);
        for (const sprite of g.scatterSprites) sprite.userData.burstTriggered = true;
        g.updateArrivalIncident(0.1);
        expect(g.pickupMeshes.map((p) => p.userData.type)).toEqual(['coin', 'coin', 'coin']);
        expect(registry.resolveObjective).toHaveBeenCalledWith('arrival-incident', 'complete');
        expect(events).toContain('arrival-incident-cleared');
        g.updateArrivalIncident(5);
        expect(g.pickupMeshes).toHaveLength(3);
    });

    it('pays nothing when the pack is unloaded rather than beaten', () => {
        const g = game();
        g.setActiveExpedition(gale(2));
        g.updateArrivalIncident(25);
        for (const sprite of g.scatterSprites) sprite.parent = null;
        g.updateArrivalIncident(0.1);
        expect(g.pickupMeshes).toHaveLength(0);
        expect(registry.resolveObjective).toHaveBeenLastCalledWith('arrival-incident', 'abandoned');
    });

    it('holds off outside live gameplay and stays out of multiplayer', () => {
        const g = game();
        g.setActiveExpedition(gale(2));
        g.performanceProfile = 'menu';
        g.updateArrivalIncident(60);
        expect(g.scatterSprites).toHaveLength(0);
        const squad = game({ multiplayer: true });
        squad.setActiveExpedition(gale(2));
        expect(squad._arrivalIncident).toBeNull();
    });
});
