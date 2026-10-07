import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// "Make all rooms custom and hallways named mostly ... but only after we scan
// it, otherwise it's just ???" (owner, 2026-10-06).
describe('room and hallway names are learned by scanning', () => {
    const room = { id: '0,0:room:3', role: 'utility', footprint: [{ x: 5, y: 5 }, { x: 6, y: 5 }] };
    const makeGame = () => {
        const grid = Array.from({ length: 32 }, () => Array.from({ length: 32 }, () => '.'));
        return {
            chunkSize: 32,
            chunkCache: new Map([['0,0', grid]]),
            wfcMetadataCache: new Map([['0,0', { roomInstances: [room] }]]),
            explorationTracker: { recordRadarScan: vi.fn() },
            scannedLocationKeys: new Set(),
            performanceProfile: 'gameplay',
            player: { position: { x: 5, z: 5 } },
            checkMappingMissionComplete: vi.fn(),
            getLocationAt: ThreeGame.prototype.getLocationAt,
            syncPlayerLocationLabel: ThreeGame.prototype.syncPlayerLocationLabel
        };
    };
    const withWindow = (fn) => {
        const events = [];
        const original = globalThis.window;
        globalThis.window = { dispatchEvent: (event) => events.push(event) };
        try { fn(events); } finally { globalThis.window = original; }
    };

    it('reads ??? until a pulse reaches the room, then its name', () => withWindow((events) => {
        const game = makeGame();
        expect(game.syncPlayerLocationLabel()).toMatchObject({ known: false });
        expect(events.at(-1).detail).toMatchObject({ label: null, known: false, kind: 'room' });

        ThreeGame.prototype.recordRadarScanDiscovery.call(game, 5, 5, 18);
        expect(game.scannedLocationKeys.has('room:0,0:0,0:room:3')).toBe(true);
        expect(game.scannedLocationKeys.has('hall:0,0')).toBe(true);
        expect(events.at(-1).detail.known).toBe(true);
        expect(events.at(-1).detail.label).toMatch(/[A-Z]-\d{2}$/);
    }));

    it('names the hallway outside any room, and only says so once per change', () => withWindow((events) => {
        const game = makeGame();
        game.player.position = { x: 20, z: 20 };
        expect(game.getLocationAt(20, 20)).toMatchObject({ scanKey: 'hall:0,0', known: false });
        game.syncPlayerLocationLabel();
        game.syncPlayerLocationLabel();
        expect(events).toHaveLength(1);
    }));

    it('labels only scanned places on the map', () => {
        const game = makeGame();
        game.getScannedLocationLabels = ThreeGame.prototype.getScannedLocationLabels;
        expect(game.getScannedLocationLabels('0,0')).toEqual([]);
        game.scannedLocationKeys.add('room:0,0:0,0:room:3');
        const [label] = game.getScannedLocationLabels('0,0');
        expect(label).toMatchObject({ kind: 'room', x: 5.5, z: 5 });
        game.scannedLocationKeys.add('hall:0,0');
        expect(game.getScannedLocationLabels('0,0').map((entry) => entry.kind)).toEqual(['room', 'hall']);
    });
});
