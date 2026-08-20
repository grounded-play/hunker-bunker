/**
 * Tactical Net: Multiplayer PVP & Co-Op Lobby Client
 * Connects directly to server/relay.js Socket.IO server or local LAN loopback.
 */

import { io as connectSocketIo } from 'socket.io-client';
import { planMultiplayerCrashSites } from './multiplayerCrashPlanner.js';
import { startMultiplayerRun } from './gameController.js';
import {
    createSteamLobby,
    joinSteamLobby,
    leaveSteamLobby,
    getSteamLobbies,
    openSteamInviteDialog,
    setSteamRichPresence,
    onSteamLobbyJoinRequested,
    deriveRelayRoomFromLobbyId,
    isLaunchedViaSteam
} from './steamLobbyClient.js';

export const MULTIPLAYER_MODES = Object.freeze({
    COOP: 'coop',
    PVP: 'pvp'
});

// Sprint 24 Milestone A item 4 (docs/sprint24-multiplayer-runtime-2026-08-19.md):
// mint a short-lived session token from the relay's existing POST
// /steam/session route before connecting the socket, so the handshake
// carries proof of auth instead of connecting anonymously (server/relay.js
// now rejects unauthenticated sockets outright in production).
//
// Correction to an earlier assumption this pass: window.electronAPI.getSteamAuthTicket
// DOES already exist (electron/preload.cjs -> hb:getSteamAuthTicket ->
// electron/main.cjs's steamClient.auth.getAuthTicketForWebApi, a real
// steamworks.js call) -- an earlier grep of this codebase missed the
// electron/ directory entirely. It resolves to a RESULT OBJECT
// ({ok, ticketHex, appId, identity, handle, expiresAt} on success), not a
// bare hex string -- a bug in an earlier version of this function treated
// the whole object as the ticket, which would have silently sent garbage
// to /steam/session instead of the real ticket even when running inside
// the actual Electron app with a live Steam session. Fixed here: only the
// real .ticketHex field is used, and only on ok:true; anything else
// (running in a plain browser tab, no Steam client, ticket request
// failed) falls through to the dev placeholder, which the backend's
// existing dev-fallback path (isDevFallbackAllowed in server/steamAuth.js)
// already handles correctly.
//
// Steam store walkthrough (docs/steamstorestatus.log), Part A CORS fix:
// a packaged Electron build's renderer origin is file:// (or null), which
// production's strict HB_ALLOWED_ORIGINS rejects outright once wildcard/
// localhost/non-HTTPS origins are locked out -- so POSTing /steam/session
// from *this* renderer fetch() would start failing the moment production
// origins are locked down, even though the ticket itself was fetched
// correctly via IPC above. electron/preload.cjs already exposes
// window.electronAPI.createSteamSession(), which mints the same session
// via a preload-context request (electron/preload.cjs's
// requestSteamBackend -- Node's fetch, not the renderer's CORS-bound one)
// and, as a bonus, cancels the auth ticket handle when done (this
// function's own manual fetch path never did). Preferred whenever
// available; the manual fetch below stays as the fallback for a plain
// browser dev tab, where window.electronAPI doesn't exist at all.
export async function fetchMultiplayerSessionToken(relayUrl, identity) {
    try {
        if (typeof window !== 'undefined' && window.electronAPI?.createSteamSession) {
            const session = await window.electronAPI.createSteamSession(identity);
            return session?.ok ? session.token : null;
        }

        let ticketHex = null;
        if (typeof window !== 'undefined' && window.electronAPI?.getSteamAuthTicket) {
            const ticketResult = await window.electronAPI.getSteamAuthTicket(identity);
            if (ticketResult?.ok && typeof ticketResult.ticketHex === 'string') {
                ticketHex = ticketResult.ticketHex;
            }
        }
        if (!ticketHex) ticketHex = '00'.repeat(32); // dev placeholder: well-formed hex, not a real Steam ticket
        const response = await fetch(`${relayUrl}/steam/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketHex, identity })
        });
        if (!response.ok) return null;
        const session = await response.json();
        return session?.ok ? session.token : null;
    } catch {
        return null;
    }
}

// Sprint 24 Milestone A (docs/sprint24-multiplayer-runtime-2026-08-19.md):
// clicking #start-game/#title-newrun-btn only opens the pre-mission Armory
// gate (openArmoryGate in main.js) -- it does not itself start the run.
// Confirmed live with two real browser instances: without this, BOTH
// deployMatch() and handleRemoteMatchStart() left every player sitting in
// their own local Armory forever, performanceProfile stuck at 'menu',
// isMultiplayer/remotePlayers set correctly but updateMultiplayer() (gated
// on the 'gameplay' profile) never once running -- no movement/fire/damage
// sync of any kind, despite the lobby and session bootstrap looking
// entirely correct. The Armory renders asynchronously (createArmoryScene
// awaits a canvas + scene build), so the click-through this required polls
// for its embark button rather than assuming it exists immediately after
// the gate opens. (Sprint 26: that click-through now lives in
// src/gameController.js's startMultiplayerRun, called from finalizeDeploy
// below, instead of as local functions in this file.)

// Local dev backend port: matches .env.loco's PORT (3002, not the relay's
// old default of 3001) so npm run server:local doesn't collide with the
// production hunker-bunker-backend Docker container, which is permanently
// bound to 127.0.0.1:3001 on machines running docker-compose.yml alongside
// local dev. Override via window.HB_RELAY_URL if you need something else.
const LOCAL_DEV_RELAY_URL = 'http://localhost:3002';

export function resolveRelayUrl() {
    if (typeof window === 'undefined') return LOCAL_DEV_RELAY_URL;
    if (window.HB_RELAY_URL) return window.HB_RELAY_URL;
    const origin = window.location?.origin || '';
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes(':5173')) {
        return LOCAL_DEV_RELAY_URL;
    }
    if (origin.startsWith('http://') || origin.startsWith('https://')) {
        return origin;
    }
    // Packaged Electron or file:// protocol fallback to live production backend
    return 'https://steam.tuesdaycinema.club';
}

export class MultiplayerLobby {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.currentMode = MULTIPLAYER_MODES.COOP;
        this.roomCode = 'SECTOR-7';
        this.serverUrl = resolveRelayUrl();
        this.players = new Map();
        this.pingMs = 18;
        this.isHost = true;
        // Sprint 24 Milestone A item 5: the real, server-verified host flag
        // (see the currentPlayers handler in connect()) -- distinct from the
        // pre-existing this.isHost above, which is a hardcoded UI-cosmetic
        // default unrelated to actual server-assigned host status.
        this.isLocalPlayerHost = false;
        this.activeMatch = null;
        this.usingRelay = false;
        // Ready-up / host-start gate: previously nonexistent -- any single
        // player clicking deploy instantly launched the whole room with no
        // wait for anyone else (see the deployMatch/matchDeploy trail).
        // localReady mirrors the player's own roster entry's `ready` field
        // for quick reads before that entry may exist.
        this.localReady = false;
        this.countdownInterval = null;
        // docs/steam-lobby-integration-plan-2026-08-20.md step 4: set once
        // this session's room code came from a real Steam lobby (as
        // opposed to the default SECTOR-7 / a manually-typed room code),
        // so updateUiState() knows whether to show the invite button and
        // Rich Presence calls know whether there's a lobby id to report.
        this.steamLobbyId = null;
    }

    init() {
        this.bindUi();
        // docs/steam-lobby-integration-plan-2026-08-20.md step 4: listens
        // regardless of whether the multiplayer modal is even open --
        // fires for cold-start +connect_lobby, a second-instance relaunch,
        // and a friend accepting a live invite while Hunker is already
        // running, all funneled through electron/main.cjs's
        // forwardPendingSteamLobbyJoin(). No-op outside Electron.
        onSteamLobbyJoinRequested((lobbyId) => this.handleSteamLobbyJoinRequested(lobbyId));
    }

    bindUi() {
        if (typeof document === 'undefined') return;

        const openBtns = [
            document.getElementById('title-multiplayer-btn'),
            document.getElementById('briefing-multiplayer-btn')
        ];
        openBtns.forEach((btn) => {
            if (btn && !btn.dataset.bound) {
                btn.dataset.bound = 'true';
                btn.addEventListener('click', () => this.openModal());
            }
        });

        const closeBtn = document.getElementById('close-multiplayer-modal');
        if (closeBtn && !closeBtn.dataset.bound) {
            closeBtn.dataset.bound = 'true';
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        const modeCoopBtn = document.getElementById('net-mode-coop-btn');
        const modePvpBtn = document.getElementById('net-mode-pvp-btn');
        modeCoopBtn?.addEventListener('click', () => this.setMode(MULTIPLAYER_MODES.COOP));
        modePvpBtn?.addEventListener('click', () => this.setMode(MULTIPLAYER_MODES.PVP));

        const connectBtn = document.getElementById('net-connect-btn');
        connectBtn?.addEventListener('click', () => this.toggleConnection());

        const deployBtn = document.getElementById('net-deploy-btn');
        deployBtn?.addEventListener('click', () => this.handleDeployButtonClick());

        const copyCodeBtn = document.getElementById('net-copy-code-btn');
        copyCodeBtn?.addEventListener('click', () => this.copyRoomCode());

        const steamInviteBtn = document.getElementById('net-steam-invite-btn');
        steamInviteBtn?.addEventListener('click', () => this.handleSteamInviteClick());

        const steamLobbiesRefreshBtn = document.getElementById('net-steam-lobbies-refresh-btn');
        steamLobbiesRefreshBtn?.addEventListener('click', () => this.refreshSteamLobbies());
    }

    openModal() {
        const modal = document.getElementById('multiplayer-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        this.updateUiState();
        if (!this.connected) {
            this.connect();
        }
        // docs/logs/log8.json / user report: no way to see public lobbies
        // at all. No-op outside Electron (getSteamLobbies resolves
        // { ok: true, lobbies: [] } there).
        this.refreshSteamLobbies();
    }

    closeModal() {
        const modal = document.getElementById('multiplayer-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }

    setMode(mode) {
        this.currentMode = mode;
        this.updateUiState();
        if (typeof window !== 'undefined') {
            window.AudioManager?.play?.('fx_menu_click', { volume: 0.3, bus: 'sfx' });
        }
    }

    async connect() {
        const statusEl = document.getElementById('net-status-pill');
        if (statusEl) {
            statusEl.textContent = 'CONNECTING...';
            statusEl.className = 'net-status-pill net-status--connecting';
        }

        // docs/steam-lobby-integration-plan-2026-08-20.md step 4: no-op if
        // this.steamLobbyId is already set (we joined an existing lobby via
        // handleSteamLobbyJoinRequested, which sets this.roomCode itself
        // before calling connect()) or if this isn't a packaged Electron
        // build at all -- room codes remain the only path for browser
        // dev/LAN/QA. Must resolve before joinRoom below reads this.roomCode.
        await this.maybeCreateSteamLobby();

        const callsign = (typeof window !== 'undefined' && window.profileManager?.getCallsign?.()) || 'AGENT';
        const opClass = (typeof window !== 'undefined' && window.selectedPlayerType) || 'TANK';

        try {
            if (typeof window !== 'undefined') {
                const sessionToken = await fetchMultiplayerSessionToken(this.serverUrl, callsign);
                this.socket = connectSocketIo(this.serverUrl, {
                    timeout: 4000,
                    reconnectionAttempts: 2,
                    auth: { sessionToken }
                });

                this.socket.on('connect', () => {
                    this.connected = true;
                    this.usingRelay = true;
                    // A reconnect re-fires 'connect' with a brand-new
                    // socket.id and, server-side, a fresh player.ready=false
                    // (see joinRoom) -- mirror that here rather than keeping
                    // a stale locally-ready flag pointed at an id that no
                    // longer exists.
                    this.localReady = false;
                    this.cancelCountdownDisplay();
                    this.socket.emit('joinRoom', {
                        roomCode: this.roomCode,
                        callsign,
                        opClass,
                        // Sprint 26: durable per-browser id (src/profile.js,
                        // localStorage-backed) the server uses as a
                        // reconnect-stable host-identity fallback when a real
                        // steamId64 isn't available -- see server/relay.js's
                        // roomHostKeys. Lets a reconnecting host reclaim its
                        // slot instead of every dev-mode connection looking
                        // like the same anonymous peer.
                        profileId: window.profileManager?.getProfileId?.() || null
                    });

                    this.players.set(this.socket.id, {
                        id: this.socket.id,
                        callsign: `${callsign} (HOST)`,
                        opClass,
                        ping: 14,
                        isSelf: true,
                        ready: false
                    });
                    this.updateUiState();
                });

                this.socket.on('currentPlayers', (serverPlayers) => {
                    // Sprint 24 Milestone A item 5 (docs/sprint24-multiplayer-runtime-2026-08-19.md):
                    // this is the only point in the connection lifecycle where
                    // the server tells a client its OWN isHost status (the
                    // roster always includes the just-joined socket). Captured
                    // here, not re-derived later, because currentPlayers fires
                    // once right after joinRoom -- well before ThreeGame's
                    // setupMultiplayerNetwork() attaches its own listeners at
                    // deploy time, so a listener added there would miss it.
                    this.isLocalPlayerHost = Boolean(serverPlayers[this.socket.id]?.isHost);
                    Object.entries(serverPlayers).forEach(([id, player]) => {
                        if (id !== this.socket.id) {
                            this.players.set(id, {
                                id,
                                callsign: player.callsign || `OPERATIVE-${id.slice(0, 4).toUpperCase()}`,
                                opClass: player.opClass || 'SCOUT',
                                ping: Math.floor(20 + Math.random() * 30),
                                isSelf: false,
                                ready: Boolean(player.ready)
                            });
                        }
                    });
                    this.updateUiState();
                    this.reportSteamRichPresence();
                });

                this.socket.on('newPlayer', (p) => {
                    const id = p?.id || String(Date.now());
                    this.players.set(id, {
                        id,
                        callsign: p?.callsign || `OPERATIVE-${id.slice(0, 4).toUpperCase()}`,
                        opClass: p?.opClass || 'ENGINEER',
                        ping: 28,
                        isSelf: false,
                        ready: Boolean(p?.ready)
                    });
                    this.updateUiState();
                    this.reportSteamRichPresence();
                    window.AudioManager?.play?.('fx_achievement', { volume: 0.25, bus: 'sfx' });
                });

                this.socket.on('playerDisconnected', (id) => {
                    this.players.delete(id);
                    this.updateUiState();
                    this.reportSteamRichPresence();
                });

                // Ready-up / host-start gate (previously nonexistent -- see
                // deployMatch/toggleReady/handleDeployButtonClick).
                this.socket.on('playerReadyChanged', ({ id, ready }) => {
                    const entry = this.players.get(id);
                    if (entry) entry.ready = Boolean(ready);
                    if (id === this.socket.id) this.localReady = Boolean(ready);
                    this.updateUiState();
                });

                this.socket.on('matchCountdown', ({ durationMs }) => {
                    this.beginCountdownDisplay(durationMs);
                });

                this.socket.on('matchCountdownCancelled', () => {
                    this.cancelCountdownDisplay();
                    this.updateUiState();
                });

                this.socket.on('matchDeployRejected', () => {
                    const el = document.getElementById('net-status-pill');
                    if (!el) return;
                    const original = el.textContent;
                    const originalClass = el.className;
                    el.textContent = 'NOT ALL OPERATIVES READY';
                    el.className = 'net-status-pill net-status--offline';
                    setTimeout(() => {
                        if (el.textContent === 'NOT ALL OPERATIVES READY') {
                            el.textContent = original;
                            el.className = originalClass;
                        }
                    }, 2200);
                });

                this.socket.on('matchStarted', (data) => {
                    this.handleRemoteMatchStart(data);
                });

                this.socket.on('connect_error', (err) => {
                    if (err?.message === 'unauthenticated_socket') {
                        // Sprint 24 Milestone A item 4: an explicit auth
                        // rejection is a policy decision, not a network
                        // failure -- don't paper over it with
                        // fallbackLocalSession()'s simulated opponent (the
                        // exact discoverable-but-still-deployable gap the
                        // Sprint 24 review flagged). Surface it distinctly
                        // instead.
                        this.connected = false;
                        this.usingRelay = false;
                        const statusEl = document.getElementById('net-status-pill');
                        if (statusEl) {
                            statusEl.textContent = 'STEAM AUTH REQUIRED';
                            statusEl.className = 'net-status-pill net-status--offline';
                        }
                        return;
                    }
                    this.fallbackLocalSession();
                });
            } else {
                this.fallbackLocalSession();
            }
        } catch {
            this.fallbackLocalSession();
        }
    }

    fallbackLocalSession() {
        this.connected = true;
        this.usingRelay = false;
        const callsign = (typeof window !== 'undefined' && window.profileManager?.getCallsign?.()) || 'AGENT';
        const opClass = (typeof window !== 'undefined' && window.selectedPlayerType) || 'TANK';

        this.players.clear();
        // No real server exists to arbitrate a ready-up gate against in this
        // fallback path -- deploy stays immediate/single-click, as it always
        // was (see deployMatch/handleDeployButtonClick), so every entry here
        // is cosmetically "ready" rather than showing a STANDBY state that
        // clicking deploy would never actually wait on.
        this.localReady = true;
        this.players.set('local-host', {
            id: 'local-host',
            callsign: `${callsign} (HOST)`,
            opClass,
            ping: 8,
            isSelf: true,
            ready: true
        });

        // Simulated squadmate/rival for offline/local simulation
        if (this.currentMode === MULTIPLAYER_MODES.COOP) {
            this.players.set('peer-recon', {
                id: 'peer-recon',
                callsign: 'SPECTRE-9',
                opClass: 'SCOUT',
                ping: 16,
                isSelf: false,
                ready: true
            });
        } else {
            this.players.set('peer-rival', {
                id: 'peer-rival',
                callsign: 'VULCAN-X',
                opClass: 'ENGINEER',
                ping: 19,
                isSelf: false,
                ready: true
            });
        }
        this.updateUiState();
    }

    // docs/steam-lobby-integration-plan-2026-08-20.md step 4. Creates a
    // real Steam lobby and derives this.roomCode from it, so the same
    // connect()/joinRoom relay flow used for room codes carries the Steam
    // party straight through -- nothing downstream needs to know whether
    // the room code came from a lobby id or was typed in by hand.
    async maybeCreateSteamLobby() {
        if (this.steamLobbyId) return;
        if (typeof window === 'undefined' || !window.electronAPI?.steamCreateLobby) return;

        const result = await createSteamLobby({ mode: this.currentMode, maxPlayers: 4 });
        if (result?.ok && result.lobby?.id) {
            this.steamLobbyId = result.lobby.id;
            this.roomCode = deriveRelayRoomFromLobbyId(result.lobby.id);
            this.updateUiState();
            this.reportSteamRichPresence();
        }
    }

    // The #net-steam-invite-btn click handler. Only meaningful once a
    // lobby actually exists (updateUiState() keeps the button hidden
    // otherwise) -- opens Steam's own native Friends invite dialog rather
    // than Hunker building a friends picker itself.
    async handleSteamInviteClick() {
        if (!this.steamLobbyId) return;
        // docs/logs/log8.json / user report: "the invite friends didn't
        // open the Steam overlay." matchmaking.Lobby.openInviteDialog()
        // never throws for "overlay unavailable" -- it's a fire-and-forget
        // native call with no success signal at all (confirmed against
        // steamworks.js's own type defs), and the overlay itself only ever
        // attaches when this process was launched BY Steam. Checking that
        // first means a player running the packaged binary directly gets
        // an honest, specific message instead of a silently dead button.
        const launchedViaSteam = await isLaunchedViaSteam();
        if (launchedViaSteam === false) {
            window.showToastNotification?.('STEAM OVERLAY UNAVAILABLE — LAUNCH HUNKER BUNKER FROM STEAM TO INVITE FRIENDS');
            return;
        }
        const result = await openSteamInviteDialog();
        if (result?.ok) {
            window.showToastNotification?.('STEAM OVERLAY: SELECT A FRIEND TO INVITE');
            window.AudioManager?.play?.('fx_menu_click', { volume: 0.3, bus: 'sfx' });
        } else {
            window.showToastNotification?.('COULD NOT OPEN STEAM INVITE DIALOG');
        }
    }

    // docs/logs/log8.json / user report: no way to see or join a public
    // Steam lobby at all. Populates #net-steam-lobbies-list; no-op outside
    // Electron (getSteamLobbies resolves an empty list there, so the group
    // stays hidden -- see updateUiState()).
    async refreshSteamLobbies() {
        if (typeof document === 'undefined') return;
        const listEl = document.getElementById('net-steam-lobbies-list');
        if (!listEl) return;
        const result = await getSteamLobbies();
        const lobbies = result?.ok ? (result.lobbies ?? []) : [];

        if (!result?.ok) {
            listEl.innerHTML = '<div class="net-spec-row"><span class="net-spec-val">Could not load public lobbies.</span></div>';
            return;
        }
        if (lobbies.length === 0) {
            listEl.innerHTML = '<div class="net-spec-row"><span class="net-spec-val">No public lobbies found. Try REFRESH, or create your own.</span></div>';
            return;
        }

        listEl.innerHTML = '';
        for (const lobby of lobbies) {
            const row = document.createElement('div');
            row.className = 'net-spec-row';

            const label = document.createElement('span');
            label.className = 'net-spec-name';
            const mode = (lobby.data?.hb_mode || 'coop').toUpperCase();
            const memberCount = lobby.members?.length ?? 0;
            label.textContent = `${mode} // ${memberCount}/4 OPERATIVES`;

            const joinBtn = document.createElement('button');
            joinBtn.type = 'button';
            joinBtn.className = 'net-code-copy-btn';
            joinBtn.textContent = 'JOIN';
            joinBtn.addEventListener('click', () => this.handleSteamLobbyJoinRequested(lobby.id));

            row.appendChild(label);
            row.appendChild(joinBtn);
            listEl.appendChild(row);
        }
    }

    // Fires for cold-start +connect_lobby, a second-instance relaunch, and
    // a friend accepting a live invite while Hunker is already running
    // (electron/main.cjs's forwardPendingSteamLobbyJoin funnels all three
    // through one channel -- see init()'s subscription). Deliberately
    // simple for this first pass: if already connected to a different
    // session, disconnect first rather than trying to merge two live
    // connections -- an edge case (accepting an invite while already
    // mid-match elsewhere) worth revisiting once this is live-tested, not
    // guessed at now.
    async handleSteamLobbyJoinRequested(lobbyId) {
        if (!lobbyId) return;
        const result = await joinSteamLobby(lobbyId);
        if (!result?.ok) return;

        if (this.connected) this.disconnect();

        this.steamLobbyId = lobbyId;
        this.roomCode = deriveRelayRoomFromLobbyId(lobbyId);
        if (result.lobby?.data?.hb_mode) this.currentMode = result.lobby.data.hb_mode;
        this.updateUiState();
        if (typeof document !== 'undefined') {
            const modal = document.getElementById('multiplayer-modal');
            modal?.classList.remove('hidden');
            modal?.setAttribute('aria-hidden', 'false');
        }
        await this.connect();
    }

    // Steam Friends-visible status + "Join Game" support. Called at the
    // handful of state changes the plan calls out (lobby created, roster
    // changed, ready, deployed) rather than from every updateUiState() --
    // Rich Presence is meant to change occasionally, not on every render.
    // Fire-and-forget: a failure here shouldn't block or be surfaced as a
    // gameplay error, same treatment steamLobbyClient's own no-op guards
    // already give every other Steam call that isn't on the critical path.
    reportSteamRichPresence(phase = 'lobby') {
        if (!this.steamLobbyId) return;
        const isCoop = this.currentMode === MULTIPLAYER_MODES.COOP;
        const modeLabel = isCoop ? 'Co-op Expedition' : 'PvP Skirmish';
        const status = phase === 'deployed'
            ? `${modeLabel} — In Progress`
            : `${modeLabel} — ${this.players.size}/4 Operatives`;
        void setSteamRichPresence({ status, connect: `+connect_lobby ${this.steamLobbyId}` });
    }

    disconnect() {
        if (this.socket) {
            try { this.socket.disconnect(); } catch { /* ignore */ }
            this.socket = null;
        }
        this.connected = false;
        this.usingRelay = false;
        this.players.clear();
        this.activeMatch = null;
        this.localReady = false;
        this.cancelCountdownDisplay();
        // docs/steam-lobby-integration-plan-2026-08-20.md step 4: leave the
        // Steam lobby alongside the relay socket, and reset roomCode back
        // to the plain default rather than leaving a stale STEAM-<id>
        // around -- otherwise the next connect() would see steamLobbyId
        // still set and skip creating/joining a fresh lobby entirely (see
        // maybeCreateSteamLobby's early-return). No-op outside Electron.
        if (this.steamLobbyId) {
            void leaveSteamLobby();
            this.steamLobbyId = null;
            this.roomCode = 'SECTOR-7';
        }
        this.updateUiState();
    }

    toggleConnection() {
        if (this.connected) {
            this.disconnect();
        } else {
            this.connect();
        }
    }

    // The single #net-deploy-btn's click handler now dispatches on
    // connection/ready/host state instead of always deploying instantly --
    // see the class-level comment on `localReady` for why this exists.
    handleDeployButtonClick() {
        if (!this.usingRelay) {
            // No real server session (offline/local fallback) -- there's no
            // one else to wait on, so deploy immediately, exactly as this
            // always worked before the ready-up gate existed.
            this.deployMatch();
            return;
        }
        if (!this.localReady) {
            this.setLocalReady(true);
            return;
        }
        if (this.isLocalPlayerHost) {
            if (this.allPlayersReady()) {
                this.deployMatch();
            } else {
                // Not everyone's ready -- clicking again backs the host out
                // rather than doing nothing, so there's always a way to
                // cancel your own ready state from this one button.
                this.setLocalReady(false);
            }
            return;
        }
        // Non-host, already ready: toggle back to not-ready.
        this.setLocalReady(false);
    }

    allPlayersReady() {
        if (this.players.size === 0) return false;
        return Array.from(this.players.values()).every((p) => p.ready);
    }

    setLocalReady(ready) {
        this.localReady = ready;
        const self = this.players.get(this.socket?.id);
        if (self) self.ready = ready;
        this.socket?.emit('playerReady', { ready });
        this.updateUiState();
    }

    beginCountdownDisplay(durationMs) {
        this.cancelCountdownDisplay();
        const deployBtn = document.getElementById('net-deploy-btn');
        let remaining = Math.ceil((durationMs ?? 3000) / 1000);
        if (deployBtn) {
            deployBtn.disabled = true;
            deployBtn.textContent = `STARTING IN ${remaining}...`;
        }
        this.countdownInterval = setInterval(() => {
            remaining -= 1;
            if (deployBtn && remaining > 0) {
                deployBtn.textContent = `STARTING IN ${remaining}...`;
            }
            if (remaining <= 0 && this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }
        }, 1000);
    }

    cancelCountdownDisplay() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    // Requests a deploy. For a real relay session this only asks the server
    // to start the ready-up-gated countdown (see server/relay.js's
    // matchDeploy handler) -- the run itself only actually launches once
    // matchStarted comes back through handleRemoteMatchStart below, the same
    // path every other player in the room takes, so host and guests start
    // together instead of the host launching solo the instant it clicks
    // deploy. The offline/local fallback path (no real server to echo a
    // matchStarted back) is the one exception: it still launches immediately,
    // exactly as this always worked before the ready-up gate existed.
    deployMatch() {
        window.AudioManager?.play?.('fx_menu_confirm', { volume: 0.4, bus: 'sfx' });

        const playerRoster = Array.from(this.players.values());
        const crashPlan = planMultiplayerCrashSites({
            seed: this.roomCode,
            playerCount: playerRoster.length,
            mode: this.currentMode,
            playerRoster
        });

        if (this.usingRelay && this.socket) {
            this.socket.emit('matchDeploy', {
                seed: this.roomCode,
                mode: this.currentMode,
                crashPlan
            });
            return;
        }

        this.finalizeDeploy({ mode: this.currentMode, seed: this.roomCode, crashPlan });
    }

    handleRemoteMatchStart(data) {
        this.cancelCountdownDisplay();
        this.finalizeDeploy({
            mode: data.mode || this.currentMode,
            seed: data.seed || this.roomCode,
            crashPlan: data.crashPlan || null
        });
    }

    // Shared by deployMatch's offline-fallback path and handleRemoteMatchStart
    // (the real-relay path, for host and guests alike) -- the actual "leave
    // the lobby and launch the run" side effects used to be duplicated
    // between those two call sites, which meant a real-relay host ran them
    // twice: once instantly and redundantly from its own deployMatch, and
    // again moments later reacting to its own matchStarted echo from the
    // server (io.to() includes the sender). Consolidated to one place.
    finalizeDeploy({ mode, seed, crashPlan }) {
        this.activeMatch = {
            roomCode: this.roomCode,
            mode,
            seed,
            crashPlan: crashPlan || null,
            isMultiplayer: true,
            isHost: Boolean(this.isLocalPlayerHost),
            socket: this.socket
        };

        this.reportSteamRichPresence('deployed');
        this.closeModal();

        // Sprint 26: previously this method set window.activeMultiplayerSession
        // and DOM-clicked through the Armory gate inline (see git history for
        // the original ThreeGame's constructor calls setupMultiplayerNetwork()
        // once, well before this modal is ever opened... comment) -- moved into
        // src/gameController.js's startMultiplayerRun so multiplayer start has
        // one explicit, testable entry point instead of this class reaching
        // into globals + DOM directly. Not awaited: nothing here needs to
        // block on the Armory-embark click actually landing.
        void startMultiplayerRun(this.activeMatch);

        const modeName = mode === MULTIPLAYER_MODES.COOP ? 'CO-OP EXPEDITION' : 'PVP SECTOR DUEL';
        if (typeof window !== 'undefined' && window.showToastNotification) {
            window.showToastNotification(`TACTICAL NET DEPLOYED: ${modeName}`);
        }
    }

    copyRoomCode() {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(this.roomCode).catch(() => null);
        }
        const btn = document.getElementById('net-copy-code-btn');
        if (btn) {
            const orig = btn.textContent;
            btn.textContent = 'COPIED!';
            setTimeout(() => { btn.textContent = orig; }, 1800);
        }
        window.AudioManager?.play?.('fx_menu_click', { volume: 0.3, bus: 'sfx' });
    }

    getActiveSession() {
        return this.activeMatch;
    }

    updateUiState() {
        if (typeof document === 'undefined') return;

        const isCoop = this.currentMode === MULTIPLAYER_MODES.COOP;
        const modeCoopBtn = document.getElementById('net-mode-coop-btn');
        const modePvpBtn = document.getElementById('net-mode-pvp-btn');
        modeCoopBtn?.classList.toggle('active', isCoop);
        modePvpBtn?.classList.toggle('active', !isCoop);

        const coopIndicator = modeCoopBtn?.querySelector('.net-mode-card__indicator');
        const pvpIndicator = modePvpBtn?.querySelector('.net-mode-card__indicator');
        if (coopIndicator) coopIndicator.textContent = isCoop ? 'ACTIVE MODE' : 'SELECT MODE';
        if (pvpIndicator) pvpIndicator.textContent = !isCoop ? 'ACTIVE MODE' : 'SELECT MODE';

        const titleDesc = document.getElementById('net-mode-description');
        if (titleDesc) {
            titleDesc.textContent = isCoop
                ? 'CO-OP EXPEDITION: Deploy joint squads through the outer ring. Shared salvage, synchronized telemetry, and emergency revival.'
                : 'PVP SKIRMISH: Contested bunker combat. Battle rival contractor operatives for sector dominance and high-tier drop caches.';
        }

        // docs/steam-lobby-integration-plan-2026-08-20.md step 4: this
        // element was never actually updated after its hardcoded initial
        // HTML text before this -- harmless while this.roomCode always
        // equaled the same 'SECTOR-7' default, but a real gap now that a
        // Steam lobby can change it to STEAM-<id>.
        const roomCodeEl = document.getElementById('net-room-code-val');
        if (roomCodeEl) roomCodeEl.textContent = this.roomCode;

        const steamInviteBtn = document.getElementById('net-steam-invite-btn');
        steamInviteBtn?.classList.toggle('hidden', !this.steamLobbyId);

        // docs/logs/log8.json / user report: shown whenever Steam Lobby
        // integration is available at all, not gated on steamLobbyId --
        // browsing/joining a public lobby is exactly how a player without
        // one yet gets into a session.
        const steamLobbiesGroup = document.getElementById('net-steam-lobbies-group');
        const hasSteamLobbyApi = typeof window !== 'undefined' && Boolean(window.electronAPI?.steamCreateLobby);
        steamLobbiesGroup?.classList.toggle('hidden', !hasSteamLobbyApi);

        const statusEl = document.getElementById('net-status-pill');
        const connectBtn = document.getElementById('net-connect-btn');
        if (statusEl) {
            if (this.connected && this.usingRelay) {
                statusEl.textContent = 'ONLINE // RELAY ACTIVE';
                statusEl.className = 'net-status-pill net-status--online';
            } else if (this.connected) {
                statusEl.textContent = 'LOCAL // RELAY UNREACHABLE';
                statusEl.className = 'net-status-pill net-status--offline';
            } else {
                statusEl.textContent = 'STANDBY // OFFLINE';
                statusEl.className = 'net-status-pill net-status--offline';
            }
        }

        const relayUrlEl = document.getElementById('net-relay-url');
        if (relayUrlEl) {
            relayUrlEl.textContent = this.usingRelay
                ? `socket.io://${this.serverUrl.replace(/^https?:\/\//, '')}`
                : 'socket.io://unreachable (local fallback)';
        }
        if (connectBtn) {
            connectBtn.textContent = this.connected ? 'DISCONNECT' : 'CONNECT RELAY';
        }

        const rosterCountEl = document.getElementById('net-roster-count');
        if (rosterCountEl) {
            rosterCountEl.textContent = `${isCoop ? 'SQUAD' : 'RIVALS'}: ${this.players.size} / 4`;
        }

        const rosterGrid = document.getElementById('net-roster-list');
        if (rosterGrid) {
            rosterGrid.innerHTML = '';
            if (this.players.size === 0) {
                rosterGrid.innerHTML = `
                    <div class="net-empty-roster">
                        <div class="net-empty-title">NO OPERATIVES IN SECTOR</div>
                        <div class="net-empty-sub">BROADCASTING DISTRESS FREQUENCY ON SECTOR CHANNEL...</div>
                    </div>
                `;
            } else {
                this.players.forEach((player) => {
                    const row = document.createElement('div');
                    row.className = `net-roster-row ${player.isSelf ? 'net-roster-row--self' : ''}`;
                    const normalizedClass = (player.opClass || 'TANK').toUpperCase();
                    const classColor = normalizedClass === 'SCOUT' ? 'cyan' : (normalizedClass === 'TANK' ? 'amber' : 'green');
                    const classIcon = normalizedClass === 'SCOUT' ? '↗' : (normalizedClass === 'TANK' ? '▰' : '⚙');
                    row.innerHTML = `
                        <div class="net-roster-callsign">
                            <span class="net-roster-avatar net-avatar--${classColor}">${classIcon}</span>
                            <span>${player.callsign}</span>
                        </div>
                        <div class="net-roster-class">
                            <span class="net-class-badge net-class--${classColor}">${normalizedClass}</span>
                        </div>
                        <div class="net-roster-ping">
                            <span class="net-ping-dot">●</span>
                            <span>${player.ping}ms</span>
                        </div>
                        <div class="net-roster-status">
                            <span class="net-status-tag ${player.ready ? '' : 'net-status-tag--standby'}">${player.ready ? 'READY' : 'STANDBY'}</span>
                        </div>
                    `;
                    rosterGrid.appendChild(row);
                });
            }
        }

        const deployBtn = document.getElementById('net-deploy-btn');
        // A pending countdown owns the button's text/disabled state (see
        // beginCountdownDisplay) -- don't stomp it on an unrelated
        // updateUiState() call (e.g. another player's ready toggle) while
        // one is running.
        if (deployBtn && !this.countdownInterval) {
            const deployLabel = isCoop ? 'DEPLOY SQUAD' : 'ENTER ARENA';
            if (!this.connected || this.players.size === 0) {
                deployBtn.disabled = true;
                deployBtn.textContent = deployLabel;
            } else if (!this.usingRelay) {
                // Offline/local fallback: no ready-up gate to arbitrate.
                deployBtn.disabled = false;
                deployBtn.textContent = deployLabel;
            } else if (!this.localReady) {
                deployBtn.disabled = false;
                deployBtn.textContent = 'READY UP';
            } else if (!this.isLocalPlayerHost) {
                deployBtn.disabled = false;
                deployBtn.textContent = 'WAITING FOR HOST... (CLICK TO UN-READY)';
            } else if (!this.allPlayersReady()) {
                const readyCount = Array.from(this.players.values()).filter((p) => p.ready).length;
                deployBtn.disabled = false;
                deployBtn.textContent = `WAITING FOR SQUAD (${readyCount}/${this.players.size} READY)`;
            } else {
                deployBtn.disabled = false;
                deployBtn.textContent = deployLabel;
            }
        }
    }
}

export const multiplayerLobby = new MultiplayerLobby();
