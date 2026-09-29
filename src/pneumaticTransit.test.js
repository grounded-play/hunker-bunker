import { describe, expect, it } from 'vitest';
import {
    createTransitNetwork,
    registerTransitTerminal,
    unlockTransitTerminal,
    getUnlockedTransitTerminals,
    canUseTransit,
    executeTransit,
    formatTransitLabel,
    DEFAULT_SANCTUARY_COORDS
} from './pneumaticTransit.js';

describe('Pneumatic Transit Return Network (Invisible Essentials Phase 4)', () => {
    it('initializes standard transit terminals as locked with default sanctuary destination', () => {
        const network = createTransitNetwork();
        expect(network.sanctuary).toEqual(DEFAULT_SANCTUARY_COORDS);
        expect(network.terminals.size).toBeGreaterThanOrEqual(3);

        const unlocked = getUnlockedTransitTerminals(network);
        expect(unlocked).toHaveLength(0);
    });

    it('unlocks the Cybersnail arena transit terminal upon boss defeat', () => {
        const network = createTransitNetwork();
        const terminal = unlockTransitTerminal(network, 'cybersnail');
        expect(terminal).not.toBeNull();
        expect(terminal.unlocked).toBe(true);
        expect(terminal.id).toBe('transit_cybersnail_arena');

        const unlocked = getUnlockedTransitTerminals(network);
        expect(unlocked).toHaveLength(1);
        expect(unlocked[0].id).toBe('transit_cybersnail_arena');
    });

    it('blocks transit when the terminal is locked', () => {
        const network = createTransitNetwork();
        const terminal = network.terminals.get('transit_cybersnail_arena');
        const check = canUseTransit(terminal);
        expect(check.allowed).toBe(false);
        expect(check.reason).toBe('not_unlocked');
    });

    it('blocks transit during combat state or when hostiles are within 12m', () => {
        const network = createTransitNetwork();
        const terminal = unlockTransitTerminal(network, 'cybersnail');
        const playerPos = { x: 38, y: 0, z: -14 };

        // Test inCombat flag
        const combatCheck = canUseTransit(terminal, {
            inCombat: true,
            playerPosition: playerPos
        });
        expect(combatCheck.allowed).toBe(false);
        expect(combatCheck.reason).toBe('in_combat');

        // Test hostile within 12m
        const hostileNear = [{ x: 42, z: -14, hp: 50, dead: false }];
        const hostileCheck = canUseTransit(terminal, {
            inCombat: false,
            nearbyHostiles: hostileNear,
            playerPosition: playerPos
        });
        expect(hostileCheck.allowed).toBe(false);
        expect(hostileCheck.reason).toBe('hostiles_nearby');

        // Hostile beyond 12m allows transit
        const hostileFar = [{ x: 55, z: -14, hp: 50, dead: false }];
        const farCheck = canUseTransit(terminal, {
            inCombat: false,
            nearbyHostiles: hostileFar,
            playerPosition: playerPos
        });
        expect(farCheck.allowed).toBe(true);

        // Dead hostile within 12m allows transit
        const deadHostile = [{ x: 40, z: -14, hp: 0, dead: true }];
        const deadCheck = canUseTransit(terminal, {
            inCombat: false,
            nearbyHostiles: deadHostile,
            playerPosition: playerPos
        });
        expect(deadCheck.allowed).toBe(true);
    });

    it('executes one-way fast travel back to the Crashed Ship Sanctuary', () => {
        const network = createTransitNetwork();
        unlockTransitTerminal(network, 'cybersnail');
        const playerPos = { x: 38, y: 0, z: -14 };

        const result = executeTransit(network, 'transit_cybersnail_arena', {
            inCombat: false,
            playerPosition: playerPos
        });
        expect(result.ok).toBe(true);
        expect(result.destination).toEqual(DEFAULT_SANCTUARY_COORDS);
        expect(result.terminalId).toBe('transit_cybersnail_arena');

        const terminal = network.terminals.get('transit_cybersnail_arena');
        expect(terminal.timesUsed).toBe(1);
    });

    it('formats interaction labels with candidate cycling badge', () => {
        const network = createTransitNetwork();
        const terminal = unlockTransitTerminal(network, 'cybersnail');

        // Single candidate
        const labelSingle = formatTransitLabel(terminal, {
            candidateIndex: 1,
            candidateCount: 1
        });
        expect(labelSingle).toContain('INTERACT [F]');
        expect(labelSingle).toContain('SANCTUARY RETURN');

        // Multi-candidate badge
        const labelMulti = formatTransitLabel(terminal, {
            candidateIndex: 2,
            candidateCount: 3
        });
        expect(labelMulti).toContain('(2 of 3: Pneumatic Transit)');

        // Combat lockdown label
        const labelLockdown = formatTransitLabel(terminal, {
            inCombat: true,
            candidateIndex: 1,
            candidateCount: 2
        });
        expect(labelLockdown).toContain('TRANSIT LOCKDOWN');
        expect(labelLockdown).toContain('[F LOCKED]');
    });

    it('registers custom or procedural transit terminals', () => {
        const network = createTransitNetwork();
        const custom = registerTransitTerminal(network, {
            id: 'transit_camp_delta',
            name: 'CAMP DELTA PNEUMATIC CHUTE',
            position: { x: 120, y: 0, z: 80 },
            ringIndex: 2,
            unlocked: true
        });

        expect(custom.id).toBe('transit_camp_delta');
        expect(network.terminals.has('transit_camp_delta')).toBe(true);

        const unlocked = getUnlockedTransitTerminals(network);
        expect(unlocked.some((t) => t.id === 'transit_camp_delta')).toBe(true);
    });
});
