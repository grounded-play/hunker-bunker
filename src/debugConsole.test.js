import { describe, it, expect, beforeEach } from 'vitest';

if (typeof globalThis.window === 'undefined') {
    globalThis.window = {
        addEventListener: () => {},
        removeEventListener: () => {},
        document: {
            readyState: 'complete',
            addEventListener: () => {},
            createElement: () => ({
                style: {},
                querySelector: () => null,
                querySelectorAll: () => []
            }),
            body: { appendChild: () => {} },
            head: { appendChild: () => {} }
        }
    };
}

const { debugLog } = await import('./debugConsole.js');

describe('debugConsole', () => {
    beforeEach(() => {
        debugLog.clear();
    });

    it('intercepts console methods and stores logs', () => {
        console.log('Test log message');
        console.warn('Test warning message');
        console.error('Test error message');

        const logs = debugLog.logs;
        expect(logs.some(l => l.message.includes('Test log message'))).toBe(true);
        expect(logs.some(l => l.message.includes('Test warning message'))).toBe(true);
        expect(logs.some(l => l.message.includes('Test error message'))).toBe(true);
    });

    it('executes help command', () => {
        debugLog.executeCommand('help');
        const lastLog = debugLog.logs[debugLog.logs.length - 1];
        expect(lastLog.message).toContain('Available Commands:');
        expect(lastLog.message).toContain('steam');
    });

    it('executes steam command safely when electronAPI is absent', async () => {
        globalThis.window.refreshSteamBridgeStatus = async () => null;
        debugLog.executeCommand('steam');
        await new Promise(r => setTimeout(r, 20));
        const logs = debugLog.logs;
        expect(logs.some(l => l.message.includes('Web build detected'))).toBe(true);
    });

    it('executes steam command when refreshSteamBridgeStatus returns status', async () => {
        globalThis.window.refreshSteamBridgeStatus = async () => ({
            info: {
                active: true,
                persona: 'TestPlayer',
                appId: 4957040,
                steamId64: '76561198000000000',
                isSteamDeck: false,
                cloud: { available: true, enabledForApp: true, enabledForAccount: true },
                steamInputAvailable: true
            },
            health: {
                ok: true,
                steam: { authConfigured: true }
            }
        });

        debugLog.executeCommand('steam');
        await new Promise(r => setTimeout(r, 20));
        const logs = debugLog.logs;
        expect(logs.some(l => l.message.includes('STEAMWORKS DIAGNOSTIC REPORT'))).toBe(true);
        expect(logs.some(l => l.message.includes('TestPlayer'))).toBe(true);
    });

    it('exposes window.hbLog helper and filters by category', () => {
        globalThis.window.hbLog('AUDIO', 'info', 'Audio track started');
        globalThis.window.hbLog('GAME', 'debug', 'Player took 10 damage');

        const logs = debugLog.logs;
        expect(logs.some(l => l.category === 'AUDIO' && l.message.includes('Audio track started'))).toBe(true);
        expect(logs.some(l => l.category === 'GAME' && l.message.includes('Player took 10 damage'))).toBe(true);

        const audioLog = logs.find(l => l.category === 'AUDIO');
        debugLog.categoryFilter = 'AUDIO';
        expect(debugLog.matchesFilter(audioLog)).toBe(true);

        const gameLog = logs.find(l => l.category === 'GAME');
        expect(debugLog.matchesFilter(gameLog)).toBe(false);

        debugLog.categoryFilter = 'ALL';
        expect(debugLog.matchesFilter(gameLog)).toBe(true);
    });

    it('has expanded maxLogs capacity of 2500', () => {
        expect(debugLog.maxLogs).toBe(2500);
    });
});
