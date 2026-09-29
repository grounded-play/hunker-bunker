import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ENCOUNTER_ROLES } from './encounterCoordination.js';
import {
    ENCOUNTER_RECIPES,
    EXISTING_ENCOUNTER_HOSTILES,
    encounterRoleCoverage,
    planEncounterRecipe,
    simulateEncounterPriority,
    spawnEncounterRecipe
} from './encounterRecipes.js';
import { callSliceContract, hasSliceContract } from './sliceContracts.js';

let dispatched;

beforeEach(() => {
    dispatched = [];
    vi.stubGlobal('CustomEvent', class CustomEvent {
        constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    });
    vi.stubGlobal('window', {
        dispatchEvent: (event) => { dispatched.push(event); return true; },
        AudioManager: { play: vi.fn(), playMetalStress: vi.fn() }
    });
});

afterEach(() => vi.unstubAllGlobals());

function game({ multiplayer = false, host = false } = {}) {
    const broadcastSharedWorldEvent = vi.fn();
    return {
        isMultiplayer: multiplayer,
        isMultiplayerHost: host,
        netSocket: multiplayer ? {} : null,
        multiplayerMode: 'coop',
        coordinatedEncounters: new Map(),
        player: { position: { x: 0, z: 0 } },
        broadcastSharedWorldEvent,
        spawnTextureBurstEffect: vi.fn(),
        spawnFrostShockwaveEffect: vi.fn(),
        takeDamage: vi.fn(),
        spawnEnemyInstance(type, x, z) {
            return {
                parent: {},
                position: { x, z },
                userData: { type, hp: 5, maxHp: 5, staggerState: { staggered: false } }
            };
        }
    };
}

describe('Ring 1 encounter recipes', () => {
    it('defines exactly the three requested recipes using only live hostile types', () => {
        expect(Object.keys(ENCOUNTER_RECIPES).sort()).toEqual(['bloom_push', 'cold_pincer', 'locked_crossfire']);
        for (const recipe of Object.values(ENCOUNTER_RECIPES)) {
            for (const member of recipe.members) {
                expect(EXISTING_ENCOUNTER_HOSTILES, `${recipe.id}/${member.type}`).toContain(member.type);
                expect(ENCOUNTER_ROLES, `${recipe.id}/${member.role}`).toContain(member.role);
            }
        }
        const coverage = encounterRoleCoverage();
        for (const role of ENCOUNTER_ROLES) expect(coverage[role].length, role).toBeGreaterThan(0);
    });

    it('plans deterministic rotated positions and shared scatter keys', () => {
        const a = planEncounterRecipe('locked_crossfire', { x: 10, z: -4 }, { seed: 42 });
        const b = planEncounterRecipe('locked_crossfire', { x: 10, z: -4 }, { seed: 42 });
        const c = planEncounterRecipe('locked_crossfire', { x: 10, z: -4 }, { seed: 43 });
        expect(a).toEqual(b);
        expect(a.members.map((member) => member.scatterKey)).toEqual(b.members.map((member) => member.scatterKey));
        expect(a.members.map(({ x, z }) => [x, z])).not.toEqual(c.members.map(({ x, z }) => [x, z]));
    });

    it('ships the day-one cross-lane spawn contract and dispatches lifecycle events', () => {
        expect(hasSliceContract('spawnEncounterRecipe')).toBe(true);
        const g = game();
        const contract = callSliceContract('spawnEncounterRecipe', g, 'locked_crossfire', { x: 2, z: 3 }, { seed: 9 });
        expect(contract.available).toBe(true);
        const handle = contract.value;
        expect(handle.members.size).toBe(3);
        expect(dispatched.map((event) => event.type)).toContain('encounter-started');
        handle.memberDefeated('left-anchor');
        expect(dispatched.map((event) => event.type)).toContain('encounter-formation-broken');
        handle.memberDefeated('right-anchor');
        handle.memberDefeated('crossfire-suppressor');
        expect(dispatched.map((event) => event.type)).toContain('encounter-cleared');
    });

    it('renders both telegraph channels before releasing role attacks', () => {
        const g = game();
        const handle = spawnEncounterRecipe(g, 'bloom_push', { x: 0, z: 0 }, { seed: 1 });
        for (let index = 0; index < 100; index += 1) handle.tick(0.1);
        const telegraphs = dispatched.filter((event) => event.type === 'encounter-role-telegraph');
        const attacks = dispatched.filter((event) => event.type === 'encounter-role-attack');
        expect(telegraphs.length).toBeGreaterThan(0);
        expect(attacks.length).toBeGreaterThan(0);
        expect(g.spawnTextureBurstEffect).toHaveBeenCalled();
        expect(window.AudioManager.play.mock.calls.length + window.AudioManager.playMetalStress.mock.calls.length).toBeGreaterThan(0);
        expect(dispatched.indexOf(telegraphs[0])).toBeLessThan(dispatched.indexOf(attacks[0]));
    });

    it('keeps formation simulation host-authoritative and announces state', () => {
        const host = game({ multiplayer: true, host: true });
        const hostHandle = spawnEncounterRecipe(host, 'locked_crossfire', { x: 0, z: 0 }, { seed: 2 });
        hostHandle.memberStaggered('left-anchor');
        expect(host.broadcastSharedWorldEvent).toHaveBeenCalledWith('encounter-formation-state', expect.objectContaining({
            encounterId: hostHandle.encounterId,
            formationState: 'staggered'
        }));

        const guest = game({ multiplayer: true, host: false });
        const guestHandle = spawnEncounterRecipe(guest, 'locked_crossfire', { x: 0, z: 0 }, { seed: 2 });
        const before = guestHandle.state;
        guestHandle.tick(100);
        expect(guestHandle.state).toBe(before);
        expect(guestHandle.applyRemoteFormation({
            encounterId: guestHandle.encounterId,
            formationState: 'staggered',
            sequence: 1
        })).toBe(true);
    });

    it.each(['SCOUT', 'TANK', 'ENGINEER'])('different target priorities measurably change %s clear time', (playerClass) => {
        const anchorFirst = simulateEncounterPriority('locked_crossfire', 'anchor', { playerClass });
        const suppressorFirst = simulateEncounterPriority('locked_crossfire', 'suppressor', { playerClass });
        expect(anchorFirst.cleared).toBe(true);
        expect(suppressorFirst.cleared).toBe(true);
        expect(anchorFirst.clearTimeSeconds).not.toBe(suppressorFirst.clearTimeSeconds);
        expect(anchorFirst.clearTimeSeconds).toBeLessThan(suppressorFirst.clearTimeSeconds);
    });
});
