/**
 * Tactical Net: Multiplayer PVP & Co-Op Lobby Client
 * Connects directly to server/relay.js Socket.IO server or local LAN loopback.
 */

import { io as connectSocketIo } from 'socket.io-client';
import { planMultiplayerCrashSites } from './multiplayerCrashPlanner.js';

export const MULTIPLAYER_MODES = Object.freeze({
    COOP: 'coop',
    PVP: 'pvp'
});

export function resolveRelayUrl() {
    if (typeof window === 'undefined') return 'http://localhost:3001';
    if (window.HB_RELAY_URL) return window.HB_RELAY_URL;
    const origin = window.location?.origin || '';
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes(':5173')) {
        return 'http://localhost:3001';
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
        this.activeMatch = null;
        this.usingRelay = false;
    }

    init() {
        this.bindUi();
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
        deployBtn?.addEventListener('click', () => this.deployMatch());

        const copyCodeBtn = document.getElementById('net-copy-code-btn');
        copyCodeBtn?.addEventListener('click', () => this.copyRoomCode());
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

        const callsign = (typeof window !== 'undefined' && window.profileManager?.getCallsign?.()) || 'AGENT';
        const opClass = (typeof window !== 'undefined' && window.selectedPlayerType) || 'TANK';

        try {
            if (typeof window !== 'undefined') {
                this.socket = connectSocketIo(this.serverUrl, {
                    timeout: 4000,
                    reconnectionAttempts: 2
                });

                this.socket.on('connect', () => {
                    this.connected = true;
                    this.usingRelay = true;
                    this.socket.emit('joinRoom', {
                        roomCode: this.roomCode,
                        callsign,
                        opClass
                    });

                    this.players.set(this.socket.id, {
                        id: this.socket.id,
                        callsign: `${callsign} (HOST)`,
                        opClass,
                        ping: 14,
                        isSelf: true
                    });
                    this.updateUiState();
                });

                this.socket.on('currentPlayers', (serverPlayers) => {
                    Object.entries(serverPlayers).forEach(([id, player]) => {
                        if (id !== this.socket.id) {
                            this.players.set(id, {
                                id,
                                callsign: player.callsign || `OPERATIVE-${id.slice(0, 4).toUpperCase()}`,
                                opClass: player.opClass || 'SCOUT',
                                ping: Math.floor(20 + Math.random() * 30),
                                isSelf: false
                            });
                        }
                    });
                    this.updateUiState();
                });

                this.socket.on('newPlayer', (p) => {
                    const id = p?.id || String(Date.now());
                    this.players.set(id, {
                        id,
                        callsign: p?.callsign || `OPERATIVE-${id.slice(0, 4).toUpperCase()}`,
                        opClass: p?.opClass || 'ENGINEER',
                        ping: 28,
                        isSelf: false
                    });
                    this.updateUiState();
                    window.AudioManager?.play?.('fx_achievement', { volume: 0.25, bus: 'sfx' });
                });

                this.socket.on('playerDisconnected', (id) => {
                    this.players.delete(id);
                    this.updateUiState();
                });

                this.socket.on('matchStarted', (data) => {
                    this.handleRemoteMatchStart(data);
                });

                this.socket.on('connect_error', () => {
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
        this.players.set('local-host', {
            id: 'local-host',
            callsign: `${callsign} (HOST)`,
            opClass,
            ping: 8,
            isSelf: true
        });

        // Simulated squadmate/rival for offline/local simulation
        if (this.currentMode === MULTIPLAYER_MODES.COOP) {
            this.players.set('peer-recon', {
                id: 'peer-recon',
                callsign: 'SPECTRE-9',
                opClass: 'SCOUT',
                ping: 16,
                isSelf: false
            });
        } else {
            this.players.set('peer-rival', {
                id: 'peer-rival',
                callsign: 'VULCAN-X',
                opClass: 'ENGINEER',
                ping: 19,
                isSelf: false
            });
        }
        this.updateUiState();
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
        this.updateUiState();
    }

    toggleConnection() {
        if (this.connected) {
            this.disconnect();
        } else {
            this.connect();
        }
    }

    deployMatch() {
        window.AudioManager?.play?.('fx_menu_confirm', { volume: 0.4, bus: 'sfx' });
        this.closeModal();

        const playerRoster = Array.from(this.players.values());
        const crashPlan = planMultiplayerCrashSites({
            seed: this.roomCode,
            playerCount: playerRoster.length,
            mode: this.currentMode,
            playerRoster
        });

        this.activeMatch = {
            roomCode: this.roomCode,
            mode: this.currentMode,
            seed: this.roomCode,
            crashPlan,
            isMultiplayer: true,
            socket: this.socket
        };

        if (typeof window !== 'undefined') {
            window.activeMultiplayerSession = this.activeMatch;
        }

        // Notify socket peers if connected
        if (this.socket) {
            this.socket.emit('matchDeploy', {
                seed: this.roomCode,
                mode: this.currentMode,
                crashPlan
            });
        }

        // Launch the game run
        const startBtn = document.getElementById('start-game') || document.getElementById('title-newrun-btn');
        if (startBtn) {
            startBtn.click();
        }

        const modeName = this.currentMode === MULTIPLAYER_MODES.COOP ? 'CO-OP EXPEDITION' : 'PVP SECTOR DUEL';
        if (typeof window !== 'undefined' && window.showToastNotification) {
            window.showToastNotification(`TACTICAL NET DEPLOYED: ${modeName}`);
        }
    }

    handleRemoteMatchStart(data) {
        this.activeMatch = {
            roomCode: this.roomCode,
            mode: data.mode || this.currentMode,
            seed: data.seed || this.roomCode,
            crashPlan: data.crashPlan || null,
            isMultiplayer: true,
            socket: this.socket
        };

        if (typeof window !== 'undefined') {
            window.activeMultiplayerSession = this.activeMatch;
        }

        this.closeModal();
        const startBtn = document.getElementById('start-game') || document.getElementById('title-newrun-btn');
        if (startBtn) {
            startBtn.click();
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
                            <span class="net-status-tag">READY</span>
                        </div>
                    `;
                    rosterGrid.appendChild(row);
                });
            }
        }

        const deployBtn = document.getElementById('net-deploy-btn');
        if (deployBtn) {
            deployBtn.disabled = !this.connected || this.players.size === 0;
            deployBtn.textContent = isCoop ? 'DEPLOY SQUAD' : 'ENTER ARENA';
        }
    }
}

export const multiplayerLobby = new MultiplayerLobby();
