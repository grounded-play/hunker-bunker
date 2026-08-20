// Steam Lobby integration — pure/testable pieces.
// docs/steam-lobby-integration-plan-2026-08-20.md step 1: single-instance
// lock + `+connect_lobby <id>` argv parsing. Split out from main.cjs (same
// pattern as save-contract.cjs/qa-tools.cjs) so this can get real vitest
// coverage without needing a live Electron/Steam runtime.

// Steam launches (or relaunches, via the second-instance path) the game
// with `+connect_lobby <64-bit-lobby-id>` as two separate argv entries
// when a player accepts a Friends invite or clicks "Join Game." Returns
// the lobby id as a string (arbitrary precision -- these are real 64-bit
// Steam IDs, kept as a string here and only converted to BigInt at the
// actual matchmaking.joinLobby() call site, not in this parsing step) or
// null if the flag isn't present or has no value after it.
function parseConnectLobbyArg(argv = []) {
    if (!Array.isArray(argv)) return null;
    const flagIndex = argv.indexOf('+connect_lobby');
    if (flagIndex === -1) return null;
    const value = argv[flagIndex + 1];
    if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
    return value;
}

module.exports = { parseConnectLobbyArg };
