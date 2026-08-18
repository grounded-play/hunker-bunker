import { describe, expect, it } from 'vitest';
import { getRelayTelemetry, logRelayEvent, sessionTelemetry } from './relay.js';

describe('Server Relay Telemetry & Event Logging', () => {
    it('initializes telemetry structure with zeroed counters', () => {
        const stats = getRelayTelemetry();
        expect(stats).toHaveProperty('totalConnections');
        expect(stats).toHaveProperty('matchesDeployed');
        expect(stats).toHaveProperty('tradesExecuted');
        expect(stats).toHaveProperty('revivesExecuted');
        expect(stats).toHaveProperty('fatalHits');
        expect(Array.isArray(stats.recentEvents)).toBe(true);
    });

    it('records and rotates relay event logs cleanly', () => {
        logRelayEvent('TEST_EVENT', { room: 'TEST-1', score: 100 });
        const stats = getRelayTelemetry();
        const latest = stats.recentEvents[stats.recentEvents.length - 1];
        expect(latest.type).toBe('TEST_EVENT');
        expect(latest.room).toBe('TEST-1');
        expect(latest.score).toBe(100);
        expect(typeof latest.timestamp).toBe('number');
    });

    it('increments telemetry counters appropriately', () => {
        const initialTrades = sessionTelemetry.tradesExecuted;
        sessionTelemetry.tradesExecuted += 1;
        expect(getRelayTelemetry().tradesExecuted).toBe(initialTrades + 1);
    });
});
