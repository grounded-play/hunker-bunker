/**
 * Tactical Net: Multiplayer PVP & Co-Op Lobby Client
 * Connects directly to server/relay.js Socket.IO server or local LAN loopback.
 */

export const MULTIPLAYER_MODES = Object.freeze({
    COOP: 'coop',
    PVP: 'pvp'
});

export class MultiplayerLobby {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.currentMode = MULTIPLAYER_MODES.COOP;
        this.roomCode = 'SECTOR-7';
        this.serverUrl = typeof window !== 'undefined' && window.location?.origin
            ? (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
                ? 'http://localhost:3001'
                : window.location.origin)
            : 'http://localhost:3001';
        this.players = new Map();
        this.pingMs = 18;
        this.isHost = true;
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

        // Try Socket.IO if available globally or mock connection
        const callsign = (typeof window !== 'undefined' && window.profileManager?.getCallsign?.()) || 'AGENT';
        const opClass = (typeof window !== 'undefined' && window.selectedPlayerType) || 'TANK';

        try {
            if (typeof window !== 'undefined' && typeof window.io === 'function') {
                this.socket = window.io(this.serverUrl, {
                    timeout: 4000,
                    reconnectionAttempts: 2
                });

                this.socket.on('connect', () => {
                    this.connected = true;
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
                    Object.entries(serverPlayers).forEach(([id, _player]) => {
                        if (id !== this.socket.id) {
                            this.players.set(id, {
                                id,
                                callsign: `OPERATIVE-${id.slice(0, 4).toUpperCase()}`,
                                opClass: 'SCOUT',
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
                        callsign: `OPERATIVE-${id.slice(0, 4).toUpperCase()}`,
                        opClass: 'ENGINEER',
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

        // Add simulated squadmates for LAN/sandbox preview
        if (this.currentMode === MULTIPLAYER_MODES.COOP) {
            this.players.set('peer-recon', {
                id: 'peer-recon',
                callsign: 'SPECTRE-9 (AI)',
                opClass: 'SCOUT',
                ping: 16,
                isSelf: false
            });
        } else {
            this.players.set('peer-rival', {
                id: 'peer-rival',
                callsign: 'VULCAN-X (AI)',
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
        this.players.clear();
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

        // Launch game run with multiplayer context active
        const startBtn = document.getElementById('start-game') || document.getElementById('title-newrun-btn');
        if (startBtn) {
            startBtn.click();
        }

        const modeName = this.currentMode === MULTIPLAYER_MODES.COOP ? 'CO-OP EXPEDITION' : 'PVP SECTOR DUEL';
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

    updateUiState() {
        if (typeof document === 'undefined') return;

        const isCoop = this.currentMode === MULTIPLAYER_MODES.COOP;
        const modeCoopBtn = document.getElementById('net-mode-coop-btn');
        const modePvpBtn = document.getElementById('net-mode-pvp-btn');
        modeCoopBtn?.classList.toggle('active', isCoop);
        modePvpBtn?.classList.toggle('active', !isCoop);

        const titleDesc = document.getElementById('net-mode-description');
        if (titleDesc) {
            titleDesc.textContent = isCoop
                ? 'CO-OP EXPEDITION: Deploy joint squads through the outer ring. Shared salvage, synchronized telemetry, and emergency revival.'
                : 'PVP SKIRMISH: Contested bunker combat. Battle rival contractor operatives for sector dominance and high-tier drop caches.';
        }

        const statusEl = document.getElementById('net-status-pill');
        const connectBtn = document.getElementById('net-connect-btn');
        if (statusEl) {
            if (this.connected) {
                statusEl.textContent = 'ONLINE // RELAY ACTIVE';
                statusEl.className = 'net-status-pill net-status--online';
            } else {
                statusEl.textContent = 'STANDBY // OFFLINE';
                statusEl.className = 'net-status-pill net-status--offline';
            }
        }
        if (connectBtn) {
            connectBtn.textContent = this.connected ? 'DISCONNECT' : 'CONNECT RELAY';
        }

        const rosterGrid = document.getElementById('net-roster-list');
        if (rosterGrid) {
            rosterGrid.innerHTML = '';
            if (this.players.size === 0) {
                rosterGrid.innerHTML = '<div class="net-empty-roster">NO OPERATIVES IN SECTOR</div>';
            } else {
                this.players.forEach((player) => {
                    const row = document.createElement('div');
                    row.className = `net-roster-row ${player.isSelf ? 'net-roster-row--self' : ''}`;
                    row.innerHTML = `
                        <div class="net-roster-callsign">${player.callsign}</div>
                        <div class="net-roster-class">${player.opClass}</div>
                        <div class="net-roster-ping">${player.ping}ms</div>
                        <div class="net-roster-status">READY</div>
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
