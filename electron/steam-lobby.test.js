import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { parseConnectLobbyArg } = require('./steam-lobby.cjs');

// docs/steam-lobby-integration-plan-2026-08-20.md step 1: Steam launches
// (or relaunches, via Electron's second-instance event) the game with
// `+connect_lobby <64-bit-lobby-id>` when a player accepts a Friends
// invite or clicks "Join Game" while Hunker is closed.
describe('parseConnectLobbyArg', () => {
    it('extracts the lobby id when +connect_lobby is present', () => {
        const argv = ['/path/to/HunkerBunker', '+connect_lobby', '109775243912345678'];
        expect(parseConnectLobbyArg(argv)).toBe('109775243912345678');
    });

    it('returns null when +connect_lobby is not present', () => {
        expect(parseConnectLobbyArg(['/path/to/HunkerBunker'])).toBeNull();
    });

    it('returns null when +connect_lobby has no value after it', () => {
        expect(parseConnectLobbyArg(['/path/to/HunkerBunker', '+connect_lobby'])).toBeNull();
    });

    it('returns null when the value after +connect_lobby is not purely numeric (rejects injected flags/garbage)', () => {
        expect(parseConnectLobbyArg(['+connect_lobby', '--evil-flag'])).toBeNull();
        expect(parseConnectLobbyArg(['+connect_lobby', '123abc'])).toBeNull();
        expect(parseConnectLobbyArg(['+connect_lobby', ''])).toBeNull();
    });

    it('is safe against non-array input', () => {
        expect(parseConnectLobbyArg(undefined)).toBeNull();
        expect(parseConnectLobbyArg(null)).toBeNull();
        expect(parseConnectLobbyArg('not an array')).toBeNull();
    });

    it('finds the flag anywhere in argv, not only at a fixed position', () => {
        const argv = ['/path/to/HunkerBunker', '--some-other-flag', 'value', '+connect_lobby', '42'];
        expect(parseConnectLobbyArg(argv)).toBe('42');
    });
});
