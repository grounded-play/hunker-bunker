// Steam Lobby integration — renderer-side wrapper (step 3 of
// docs/steam-lobby-integration-plan-2026-08-20.md). Thin wrappers around
// window.electronAPI.steam* (step 2), each a no-op with a clear reason
// outside Electron -- same guard pattern already established in
// src/multiplayerLobby.js's fetchMultiplayerSessionToken for
// getSteamAuthTicket/createSteamSession. Lobby data here is discovery/
// party metadata only; damage, item grants, results, and identity stay
// authoritative in the already-live relay backend (Part A) -- nothing in
// this file talks to that backend at all.

// Must match electron/main.cjs's HB_LOBBY_PROTOCOL_VERSION -- bump both
// together whenever a change would make an old and new build's lobby
// metadata genuinely incompatible (not just a version-number habit).
export const HB_LOBBY_PROTOCOL_VERSION = '1';

// STEAM-<lobbyId> replaces room codes (SECTOR-7 / random) as the relay
// room identity for any session that originated from a real Steam lobby,
// so Steam party identity and relay room identity are the same thing
// rather than two things that have to be kept in sync by hand. Room codes
// remain the only path for browser dev/LAN/QA, where there's no Steam
// lobby to derive from.
export function deriveRelayRoomFromLobbyId(lobbyId) {
    return `STEAM-${lobbyId}`;
}

// A lobby with no hb_protocol at all (an older client, or a lobby this
// build didn't create) is treated as compatible rather than rejected --
// the field itself is new, so its absence isn't evidence of a real
// mismatch, only of an unknown one. An actual mismatched value is.
export function checkLobbyProtocolCompatibility(lobbyData, localProtocol = HB_LOBBY_PROTOCOL_VERSION) {
    const remoteProtocol = lobbyData?.hb_protocol ?? null;
    if (remoteProtocol == null) return { compatible: true, reason: 'no_protocol_declared' };
    if (remoteProtocol === localProtocol) return { compatible: true };
    return { compatible: false, reason: 'VERSION_MISMATCH', localProtocol, remoteProtocol };
}

// Checks for steamCreateLobby specifically as a proxy for "the real
// electronAPI bridge exists," not because lobby creation is special --
// preload.cjs exposes every steam* function in the same
// contextBridge.exposeInMainWorld call, so in the real app this is either
// entirely present or entirely absent. (A hand-written test/mock object
// that only stubs one specific steam* function without this one will
// read as "not Electron" here -- include steamCreateLobby too.)
function hasSteamLobbyApi() {
    return typeof window !== 'undefined' && Boolean(window.electronAPI?.steamCreateLobby);
}

// visibility defaults to 'public' -- docs/logs/log8.json / user report: a
// FriendsOnly lobby (this file's original default) never shows up in
// getSteamLobbies() below (Steamworks' RequestLobbyList only returns
// Public lobbies), which made "see and join a public lobby" structurally
// impossible regardless of any UI built on top. 'friends' and 'private'
// remain available for a caller that explicitly wants an invite-only session.
export async function createSteamLobby({ mode = 'coop', maxPlayers = 4, build = null, visibility = 'public' } = {}) {
    if (!hasSteamLobbyApi()) return { ok: false, reason: 'not_electron' };
    return window.electronAPI.steamCreateLobby({ mode, maxPlayers, build, visibility });
}

// Lists this game's currently-open Public lobbies (electron/main.cjs's
// hb:steamGetLobbies already filters out anything not carrying this
// game's hb_protocol metadata). Empty array outside Electron rather than
// an error -- there's nothing to browse, not a failure.
export async function getSteamLobbies() {
    if (!hasSteamLobbyApi()) return { ok: true, lobbies: [] };
    return window.electronAPI.steamGetLobbies();
}

// docs/logs/log8.json / user report: Invite Friends "didn't open the Steam
// overlay." The overlay (and therefore the invite dialog) can only ever
// work when this process was actually launched BY Steam -- running the
// packaged binary directly bypasses Steam's overlay hook entirely, and
// steamworks.js exposes no way to detect overlay availability directly
// (confirmed against the type defs). electron/main.cjs's launchedViaSteam
// flag is the best available proxy, so UI can warn accurately instead of
// the invite button silently doing nothing. Returns null (genuinely
// unknown, not "false") outside Electron.
export async function isLaunchedViaSteam() {
    if (typeof window === 'undefined' || !window.electronAPI?.getSteamInfo) return null;
    const info = await window.electronAPI.getSteamInfo();
    return Boolean(info?.launchedViaSteam);
}

export async function joinSteamLobby(lobbyId) {
    if (!hasSteamLobbyApi()) return { ok: false, reason: 'not_electron' };
    return window.electronAPI.steamJoinLobby(lobbyId);
}

export async function leaveSteamLobby() {
    if (!hasSteamLobbyApi()) return { ok: true };
    return window.electronAPI.steamLeaveLobby();
}

export async function getSteamLobby() {
    if (!hasSteamLobbyApi()) return { ok: true, lobby: null };
    return window.electronAPI.steamGetLobby();
}

export async function openSteamInviteDialog() {
    if (!hasSteamLobbyApi()) return { ok: false, reason: 'not_electron' };
    return window.electronAPI.steamOpenInviteDialog();
}

export async function setSteamLobbyState(state) {
    if (!hasSteamLobbyApi()) return { ok: true };
    return window.electronAPI.steamSetLobbyState(state);
}

export async function setSteamRichPresence(presence) {
    if (typeof window === 'undefined' || !window.electronAPI?.steamSetRichPresence) return { ok: true };
    return window.electronAPI.steamSetRichPresence(presence);
}

// Fires for cold-start +connect_lobby, a second-instance relaunch, and the
// live GameLobbyJoinRequested callback alike (electron/main.cjs's
// forwardPendingSteamLobbyJoin funnels all three through one channel) --
// callers only need this one subscription. Returns a no-op unsubscribe
// outside Electron, matching every other subscribe helper here.
export function onSteamLobbyJoinRequested(handler) {
    if (typeof window === 'undefined' || !window.electronAPI?.onSteamLobbyJoinRequested) return () => {};
    return window.electronAPI.onSteamLobbyJoinRequested(handler);
}
