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

    it('starts with the captured log collapsed and reports live FPS/enemy telemetry', () => {
        const statsEl = { textContent: '' };
        debugLog.logsExpanded = false;
        debugLog.statsEl = statsEl;
        globalThis.window.__hb_fps = 58;
        globalThis.window.threeGame = {
            playerVitals: { hp: 73 },
            scatterSprites: [
                { userData: { type: 'cybersnail', isEnemy: true } },
                { userData: { type: 'crawler', isEnemy: true, burstTriggered: true } },
                { userData: { type: 'crate' } }
            ],
            isEnemyType: (type) => ['cybersnail', 'crawler'].includes(type)
        };

        debugLog.updateStats();

        expect(debugLog.logsExpanded).toBe(false);
        expect(statsEl.textContent).toBe('FPS: 58 | ENEMIES: 1 | HP: 73');
    });

    it('keeps the complete session journal when the visible console is cleared', () => {
        const start = debugLog.sessionLogs.length;
        debugLog.info('BOOT', 'renderer starting');
        debugLog.info('PHASE', 'boot -> gameplay');
        debugLog.clear();

        expect(debugLog.sessionLogs.slice(start).map((entry) => entry.message)).toEqual([
            'renderer starting',
            'boot -> gameplay',
            'Console logs cleared.'
        ]);
    });

    it('serializes the session journal as readable text', () => {
        debugLog.warn('WORLD', 'unexpected chunk fallback', { chunk: '2,-1' });

        const exported = debugLog.serializeSession('txt');
        expect(exported).toContain('HUNKER BUNKER SESSION LOG');
        expect(exported).toContain('[WARN] [WORLD] unexpected chunk fallback');
        expect(exported).toContain('"chunk": "2,-1"');
    });

    it('records demo checkpoints and exports Deck-safe diagnostic context', () => {
        globalThis.window.HunkerInputState = {
            getState: () => ({ isSteamDeck: true, controllerCount: 1, lastInputMode: 'controller' })
        };
        globalThis.window.hbStage = { stageWidth: 1280, stageHeight: 800, scale: 1 };
        globalThis.window.__hbSteamStatus = { active: true, isSteamDeck: true, backend: { ok: true } };
        globalThis.window.threeGame = {
            getPerformanceDiagnosticsSnapshot: () => ({ drawCalls: 12, triangles: 400 })
        };

        debugLog.executeCommand('demo start');
        debugLog.executeCommand('demo mark first-room');
        const capture = debugLog.buildSessionCapture();

        expect(capture.session.demoMarkers.map((marker) => marker.label)).toEqual(['demo-start', 'first-room']);
        expect(capture.state.input.isSteamDeck).toBe(true);
        expect(capture.state.stage.stageWidth).toBe(1280);
        expect(capture.state.steam.backend.ok).toBe(true);
        expect(capture.state.performance.drawCalls).toBe(12);
    });

    it('executes noclip command and delegates to game instance', () => {
        let noclipCalled = false;
        globalThis.window.threeGame = {
            toggleNoclip: () => {
                noclipCalled = true;
                return true;
            }
        };

        debugLog.executeCommand('noclip');
        expect(noclipCalled).toBe(true);
        const lastLog = debugLog.logs[debugLog.logs.length - 1];
        expect(lastLog.message).toContain('Noclip');
        expect(lastLog.message).toContain('ACTIVE');
    });

    it('executes speed and nuke commands cleanly', () => {
        let hostilesPurged = false;
        globalThis.window.threeGame = {
            _sprintMoveSpeedMult: 1.0,
            purgeHostiles: () => {
                hostilesPurged = true;
                return 5;
            }
        };

        debugLog.executeCommand('speed 4.5');
        expect(globalThis.window.threeGame._sprintMoveSpeedMult).toBe(4.5);

        debugLog.executeCommand('nuke');
        expect(hostilesPurged).toBe(true);
        const lastLog = debugLog.logs[debugLog.logs.length - 1];
        expect(lastLog.message).toContain('5 hostile enemies');
    });

    it('executes proving grounds commands (nexus, tilegrid, bosses, campsim)', () => {
        let nexusOpened = false;
        let tileGridOpened = false;
        let bossesOpened = false;
        let campsOpened = false;

        globalThis.window.__DEBUG__ = {
            openNexus: () => { nexusOpened = true; },
            openTileGrid: () => { tileGridOpened = true; },
            openBossArenas: () => { bossesOpened = true; },
            openCampSimulator: () => { campsOpened = true; }
        };

        debugLog.executeCommand('nexus');
        expect(nexusOpened).toBe(true);

        debugLog.executeCommand('tilegrid');
        expect(tileGridOpened).toBe(true);

        debugLog.executeCommand('bosses');
        expect(bossesOpened).toBe(true);

        debugLog.executeCommand('campsim');
        expect(campsOpened).toBe(true);
    });
});
