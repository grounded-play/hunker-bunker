// ── HB Debug Console & Logger (~) ──────────────────────────────
// In-Game Tactical Dev Console & Comprehensive Log System.
// Toggleable via `~` (Tilde / Backquote key). Captures console.log/warn/error/debug,
// accepts cheat & diagnostic commands, and offers level/category filtering.

export class DebugLogger {
    constructor() {
        this.logs = [];
        this.sessionLogs = [];
        this.sessionStartedAt = new Date();
        this.sequence = 0;
        this.maxLogs = 2500;
        this.subscribers = new Set();
        this.visible = false;
        this.currentFilter = 'ALL';
        this.categoryFilter = 'ALL';
        this.searchTerm = '';
        this.autoScroll = true;
        this.commandHistory = [];
        this.historyIndex = -1;
        this.domCreated = false;
        this.minLevel = 'debug'; // 'debug' | 'info' | 'warn' | 'error'

        this.levelOrder = { debug: 0, info: 1, warn: 2, error: 3 };

        this.initConsoleInterception();
        this.initUncaughtErrorHandlers();
        this.initFetchInterception();
        this.initGlobalInputTelemetry();
        this.initGameEventTelemetry();

        if (typeof window !== 'undefined') {
            window.hbLogger = this;
            window.hbLog = (category, level, message, ...details) => {
                const lvl = (level || 'info').toLowerCase();
                if (typeof this[lvl] === 'function') {
                    this[lvl](category || 'SYS', message, ...details);
                } else {
                    this.info(category || 'SYS', message, ...details);
                }
            };
            if (typeof document !== 'undefined') {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => this.mountUI());
                } else {
                    this.mountUI();
                }
            }
        }
    }

    initConsoleInterception() {
        if (typeof window === 'undefined') return;

        const origLog = console.log.bind(console);
        const origInfo = console.info.bind(console);
        const origWarn = console.warn.bind(console);
        const origError = console.error.bind(console);
        const origDebug = (console.debug || console.log).bind(console);

        console.log = (...args) => {
            origLog(...args);
            this.pushLog('info', 'SYS', args);
        };

        console.info = (...args) => {
            origInfo(...args);
            this.pushLog('info', 'SYS', args);
        };

        console.warn = (...args) => {
            origWarn(...args);
            this.pushLog('warn', 'WARN', args);
        };

        console.error = (...args) => {
            origError(...args);
            this.pushLog('error', 'ERR', args);
        };

        console.debug = (...args) => {
            origDebug(...args);
            this.pushLog('debug', 'DEBUG', args);
        };
    }

    initUncaughtErrorHandlers() {
        if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;

        window.addEventListener('error', (event) => {
            const errorMsg = event.error ? (event.error.stack || event.error.message || String(event.error)) : (event.message || 'Script error');
            const source = event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : 'unknown';
            this.pushLog('error', 'UNCAUGHT', [`Runtime Error: ${errorMsg} (${source})`]);
        });

        window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason ? (event.reason.stack || event.reason.message || String(event.reason)) : 'Unhandled promise rejection';
            this.pushLog('error', 'UNCAUGHT', [`Unhandled Rejection: ${reason}`]);
        });
    }

    initFetchInterception() {
        if (typeof window === 'undefined' || !window.fetch) return;
        const origFetch = window.fetch;
        if (origFetch.__hb_wrapped) return;

        const logger = this;
        const wrappedFetch = function (input, init) {
            const url = typeof input === 'string' ? input : (input && input.url ? input.url : String(input));
            const method = (init && init.method) ? init.method.toUpperCase() : 'GET';
            const startTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

            return origFetch.call(this, input, init).then(response => {
                const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
                const duration = Math.round(now - startTime);
                if (!response.ok || duration >= 1000) {
                    const level = response.ok ? 'debug' : 'warn';
                    logger.pushLog(level, 'FETCH', [`<- ${method} ${url} [${response.status} ${response.statusText}] (${duration}ms)`]);
                }
                return response;
            }).catch(err => {
                const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
                const duration = Math.round(now - startTime);
                logger.pushLog('error', 'FETCH', [`X- ${method} ${url} FAILED: ${err.message || err} (${duration}ms)`]);
                throw err;
            });
        };

        wrappedFetch.__hb_wrapped = true;
        window.fetch = wrappedFetch;
    }

    initGlobalInputTelemetry() {
        if (typeof window === 'undefined' || typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;

        // Mouse click telemetry
        document.addEventListener('click', (e) => {
            if (this.visible && this.overlayEl && this.overlayEl.contains(e.target)) {
                return; // Ignore clicks inside dev console itself
            }
            const target = e.target;
            if (!target) return;

            const tag = target.tagName ? target.tagName.toLowerCase() : 'el';
            const id = target.id ? `#${target.id}` : '';
            const className = target.className && typeof target.className === 'string' ? `.${target.className.trim().split(/\s+/).join('.')}` : '';
            let text = target.textContent ? target.textContent.trim().replace(/\s+/g, ' ').slice(0, 30) : '';
            if (text) text = ` "${text}"`;

            this.pushLog('debug', 'INPUT', [`Click -> <${tag}${id}${className}>${text}`]);
        }, { capture: true, passive: true });

        // Action Hotkeys telemetry (Q, F, R, Space, Esc, Tab)
        const trackKeys = new Set(['KeyQ', 'KeyF', 'KeyR', 'Space', 'Escape', 'Tab', 'KeyE', 'KeyM']);
        window.addEventListener('keydown', (e) => {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
                return;
            }
            if (trackKeys.has(e.code)) {
                this.pushLog('debug', 'INPUT', [`Hotkey -> [${e.code}] (${e.key})`]);
            }
        }, { capture: true, passive: true });
    }

    initGameEventTelemetry() {
        if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
        const eventNames = [
            'run-cards-drawn', 'player-damaged', 'player-death', 'player-respawned',
            'player-health-changed', 'player-blocked',
            'player-extracted', 'mission-objective-complete', 'biome-changed',
            'black-box-recovered', 'foundry-discovered', 'cave-entrance-revealed',
            'queen-fight-started', 'camp-choice-resolved', 'camp-choice-denied',
            'camp-supported', 'camp-bonded', 'camp-final-resolved',
            'hive-choice-resolved', 'hive-mined', 'act2-milestone', 'act2-departed',
            'achievement-unlocked', 'lore-terminal-read', 'salvage-cache-opened',
            'o2-bubble-activated', 'bunker-door-toggled', 'bunker-door-destroyed',
            'boss-attack-telegraph', 'boss-attack-resolved',
            'destructible-prop-broken', 'player-melee-attack'
        ];
        for (const eventName of eventNames) {
            window.addEventListener(eventName, (event) => {
                this.info('EVENT', eventName, event?.detail ?? null);
            });
        }
    }

    formatArgs(args) {
        return args.map(arg => {
            if (arg === null) return 'null';
            if (arg === undefined) return 'undefined';
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
    }

    pushLog(level, category, args) {
        const now = new Date();
        const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
        
        const message = this.formatArgs(args);
        const entry = {
            id: ++this.sequence,
            timestamp,
            isoTime: now.toISOString(),
            elapsedMs: now.getTime() - this.sessionStartedAt.getTime(),
            level,
            category,
            message
        };

        this.logs.push(entry);
        this.sessionLogs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        this.notifySubscribers(entry);
    }

    debug(category, message, ...details) {
        if (this.levelOrder.debug < this.levelOrder[this.minLevel]) return;
        const args = [message, ...details].filter(x => x !== undefined);
        this.pushLog('debug', category, args);
    }

    info(category, message, ...details) {
        if (this.levelOrder.info < this.levelOrder[this.minLevel]) return;
        const args = [message, ...details].filter(x => x !== undefined);
        this.pushLog('info', category, args);
    }

    warn(category, message, ...details) {
        if (this.levelOrder.warn < this.levelOrder[this.minLevel]) return;
        const args = [message, ...details].filter(x => x !== undefined);
        this.pushLog('warn', category, args);
    }

    error(category, message, ...details) {
        if (this.levelOrder.error < this.levelOrder[this.minLevel]) return;
        const args = [message, ...details].filter(x => x !== undefined);
        this.pushLog('error', category, args);
    }

    subscribe(fn) {
        this.subscribers.add(fn);
        return () => this.subscribers.delete(fn);
    }

    notifySubscribers(entry) {
        for (const sub of this.subscribers) {
            try { sub(entry); } catch (e) { console.error(e); }
        }
        if (this.visible && this.logsContainer) {
            this.renderSingleLog(entry);
            if (this.autoScroll) {
                this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
            }
        }
    }

    mountUI() {
        if (this.domCreated || typeof document === 'undefined') return;
        this.domCreated = true;

        const overlay = document.createElement('div');
        overlay.id = 'hb-debug-console';
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            height: '480px',
            maxHeight: '80vh',
            backgroundColor: 'rgba(10, 14, 20, 0.94)',
            backdropFilter: 'blur(10px)',
            borderBottom: '2px solid #00f0ff',
            boxShadow: '0 8px 32px rgba(0, 240, 255, 0.25)',
            zIndex: '99999',
            display: 'none',
            flexDirection: 'column',
            fontFamily: "'Space Mono', 'Courier New', monospace",
            fontSize: '12px',
            color: '#c0d0e0',
            userSelect: 'text'
        });

        overlay.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: rgba(0, 240, 255, 0.08); border-bottom: 1px solid rgba(0, 240, 255, 0.2);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="color: #00f0ff; font-weight: bold; letter-spacing: 1px;">⚙ HUNKER BUNKER DEV CONSOLE (~)</span>
                    <span id="hb-console-stats" style="color: #6688aa; font-size: 11px;">FPS: -- | ENTITIES: --</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button id="hb-filter-all" class="hb-cmd-btn active">ALL</button>
                    <button id="hb-filter-debug" class="hb-cmd-btn">DEBUG</button>
                    <button id="hb-filter-info" class="hb-cmd-btn">INFO</button>
                    <button id="hb-filter-warn" class="hb-cmd-btn">WARN</button>
                    <button id="hb-filter-error" class="hb-cmd-btn">ERROR</button>
                    <select id="hb-console-cat-filter" class="hb-cmd-btn" style="background: #121820; color: #00f0ff; border-color: #334455; padding: 2px 4px;">
                        <option value="ALL">CAT: ALL</option>
                        <option value="INPUT">INPUT</option>
                        <option value="LOAD">LOAD</option>
                        <option value="AUDIO">AUDIO</option>
                        <option value="GAME">GAME</option>
                        <option value="STEAM">STEAM</option>
                        <option value="FETCH">FETCH</option>
                        <option value="SYS">SYS</option>
                        <option value="UNCAUGHT">UNCAUGHT</option>
                    </select>
                    <input id="hb-console-search" type="text" placeholder="Filter logs..." style="background: #121820; border: 1px solid #334455; color: #fff; padding: 2px 6px; border-radius: 3px; width: 130px; font-size: 11px;" />
                    <button id="hb-console-autoscroll" class="hb-cmd-btn active">AUTO-SCROLL: ON</button>
                    <button id="hb-console-export" class="hb-cmd-btn" title="Download the complete log captured since launch">EXPORT SESSION</button>
                    <button id="hb-console-clear" class="hb-cmd-btn">CLEAR</button>
                    <button id="hb-console-close" style="background: none; border: none; color: #ff5566; font-weight: bold; cursor: pointer; font-size: 14px; padding: 0 4px;">✕</button>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; padding: 5px 12px; background: rgba(14, 24, 38, 0.75); border-bottom: 1px solid rgba(0, 240, 255, 0.15); flex-wrap: wrap;">
                <span style="color: #ffaa44; font-size: 10px; font-weight: bold; margin-right: 4px;">QUICK CHEATS:</span>
                <button id="hb-quick-god" class="hb-cmd-btn hb-cheat-btn" title="Toggle Godmode (Invulnerability)">⚡ GOD</button>
                <button id="hb-quick-noclip" class="hb-cmd-btn hb-cheat-btn" style="background: rgba(34, 211, 238, 0.15); border-color: #22d3ee; color: #22d3ee;" title="Toggle Noclip (Ghost Fly through walls, Zero Collision, 3.5x Speed)">👻 NOCLIP / FLY</button>
                <button id="hb-quick-heal" class="hb-cmd-btn hb-cheat-btn" title="Refill HP and Oxygen">❤️ HEAL</button>
                <button id="hb-quick-speed" class="hb-cmd-btn hb-cheat-btn" title="Boost Sprint Traversal Speed">🚀 SPEED</button>
                <button id="hb-quick-resources" class="hb-cmd-btn hb-cheat-btn" title="Grant +250 Tech, +150 Coin, +75 Med, +75 Shells">💎 +500$</button>
                <button id="hb-quick-nuke" class="hb-cmd-btn hb-cheat-btn" title="Purge all hostiles from active sector">💥 NUKE</button>
                <span style="color: #00f0ff; font-size: 10px; font-weight: bold; margin-left: 8px; margin-right: 4px;">TELEPORT:</span>
                <button id="hb-quick-tp-museum" class="hb-cmd-btn hb-nav-btn" title="Teleport to continuous asset museum (9000, 9000)">🏛️ MUSEUM</button>
                <button id="hb-quick-tp-showroom" class="hb-cmd-btn hb-nav-btn" title="Teleport to 4-wall showroom (9500, 9500)">🏢 SHOWROOM</button>
                <button id="hb-quick-tp-camp" class="hb-cmd-btn hb-nav-btn" title="Teleport to nearest survivor camp">⛺ CAMP</button>
                <button id="hb-quick-tp-queen" class="hb-cmd-btn hb-nav-btn" title="Teleport to Cave Queen lair">👑 QUEEN</button>
                <button id="hb-quick-tp-crash" class="hb-cmd-btn hb-nav-btn" title="Teleport back to crash origin">🚀 CRASH</button>
            </div>
            <div id="hb-console-logs" style="flex: 1; overflow-y: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 3px; scroll-behavior: smooth;"></div>
            <div style="display: flex; align-items: center; padding: 6px 12px; background: rgba(0, 0, 0, 0.4); border-top: 1px solid rgba(255, 255, 255, 0.1);">
                <span style="color: #00f0ff; margin-right: 8px; font-weight: bold;">&gt;</span>
                <input id="hb-console-input" type="text" placeholder="Type a command (help, noclip, god, heal, speed, tp x z, spawn enemy, give tech 100, clear, or JS expr)..." style="flex: 1; background: transparent; border: none; outline: none; color: #00ffff; font-family: inherit; font-size: 12px;" />
            </div>
        `;

        // Inject helper button styles
        const style = document.createElement('style');
        style.textContent = `
            .hb-cmd-btn {
                background: #141d28;
                border: 1px solid #283a4e;
                color: #88aacc;
                padding: 2px 8px;
                border-radius: 3px;
                font-size: 11px;
                font-family: inherit;
                cursor: pointer;
                transition: all 150ms ease;
            }
            .hb-cmd-btn:hover {
                background: #1f2e40;
                color: #00f0ff;
                border-color: #00f0ff;
            }
            .hb-cmd-btn.active {
                background: rgba(0, 240, 255, 0.2);
                color: #00f0ff;
                border-color: #00f0ff;
            }
            .hb-log-entry {
                line-height: 1.4;
                word-break: break-word;
                white-space: pre-wrap;
            }
            .hb-log-debug { color: #6699cc; }
            .hb-log-info { color: #44ffaa; }
            .hb-log-warn { color: #ffbb33; }
            .hb-log-error { color: #ff4455; font-weight: bold; }
        `;
        document.head.appendChild(style);
        document.body.appendChild(overlay);

        this.overlayEl = overlay;
        this.logsContainer = overlay.querySelector('#hb-console-logs');
        this.inputEl = overlay.querySelector('#hb-console-input');
        this.statsEl = overlay.querySelector('#hb-console-stats');
        this.searchEl = overlay.querySelector('#hb-console-search');

        // Button Listeners
        overlay.querySelector('#hb-console-close').onclick = () => this.toggle(false);
        overlay.querySelector('#hb-console-clear').onclick = () => this.clear();
        overlay.querySelector('#hb-console-export').onclick = () => this.exportSession('json');

        const autoScrollBtn = overlay.querySelector('#hb-console-autoscroll');
        autoScrollBtn.onclick = () => {
            this.autoScroll = !this.autoScroll;
            autoScrollBtn.textContent = `AUTO-SCROLL: ${this.autoScroll ? 'ON' : 'OFF'}`;
            autoScrollBtn.classList.toggle('active', this.autoScroll);
        };

        const filterBtns = {
            ALL: overlay.querySelector('#hb-filter-all'),
            DEBUG: overlay.querySelector('#hb-filter-debug'),
            INFO: overlay.querySelector('#hb-filter-info'),
            WARN: overlay.querySelector('#hb-filter-warn'),
            ERROR: overlay.querySelector('#hb-filter-error')
        };

        Object.entries(filterBtns).forEach(([level, btn]) => {
            btn.onclick = () => {
                Object.values(filterBtns).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = level;
                this.renderAllLogs();
            };
        });

        // Quick Cheats & Teleport Action Toolbar Listeners
        const quickGodBtn = overlay.querySelector('#hb-quick-god');
        const quickNoclipBtn = overlay.querySelector('#hb-quick-noclip');
        const quickHealBtn = overlay.querySelector('#hb-quick-heal');
        const quickSpeedBtn = overlay.querySelector('#hb-quick-speed');
        const quickResBtn = overlay.querySelector('#hb-quick-resources');
        const quickNukeBtn = overlay.querySelector('#hb-quick-nuke');

        if (quickGodBtn) quickGodBtn.onclick = () => this.executeCommand('god');
        if (quickNoclipBtn) quickNoclipBtn.onclick = () => this.executeCommand('noclip');
        if (quickHealBtn) quickHealBtn.onclick = () => this.executeCommand('heal');
        if (quickSpeedBtn) {
            quickSpeedBtn.onclick = () => {
                const targetGame = window.threeGame || window.game;
                if (targetGame) {
                    targetGame._sprintMoveSpeedMult = (targetGame._sprintMoveSpeedMult > 2.0 ? 1.0 : 3.0);
                    this.info('CHEAT', `Sprint speed multiplier set to ${targetGame._sprintMoveSpeedMult}x`);
                }
            };
        }
        if (quickResBtn) quickResBtn.onclick = () => this.executeCommand('give tech 250');
        if (quickNukeBtn) quickNukeBtn.onclick = () => this.executeCommand('nuke');

        const quickTpMuseum = overlay.querySelector('#hb-quick-tp-museum');
        const quickTpShowroom = overlay.querySelector('#hb-quick-tp-showroom');
        const quickTpCamp = overlay.querySelector('#hb-quick-tp-camp');
        const quickTpQueen = overlay.querySelector('#hb-quick-tp-queen');
        const quickTpCrash = overlay.querySelector('#hb-quick-tp-crash');

        if (quickTpMuseum) quickTpMuseum.onclick = () => this.executeCommand('museum');
        if (quickTpShowroom) quickTpShowroom.onclick = () => this.executeCommand('showroom');
        if (quickTpCamp) {
            quickTpCamp.onclick = () => {
                const targetGame = window.threeGame || window.game;
                const pois = targetGame?.getDebugPointsOfInterest?.() ?? [];
                const camp = pois.find(p => p.id?.includes('camp') || p.name?.toLowerCase().includes('camp'));
                if (camp && targetGame?.teleportPlayerTo) {
                    targetGame.teleportPlayerTo(camp.x, camp.z);
                    this.info('NAV', `Teleported to ${camp.name} (${camp.x.toFixed(1)}, ${camp.z.toFixed(1)})`);
                } else {
                    this.executeCommand('tp 0 0');
                }
            };
        }
        if (quickTpQueen) {
            quickTpQueen.onclick = () => {
                const targetGame = window.threeGame || window.game;
                const pois = targetGame?.getDebugPointsOfInterest?.() ?? [];
                const queen = pois.find(p => p.id?.includes('queen') || p.name?.toLowerCase().includes('queen'));
                if (queen && targetGame?.teleportPlayerTo) {
                    targetGame.teleportPlayerTo(queen.x, queen.z);
                    this.info('NAV', `Teleported to Cave Queen Lair (${queen.x.toFixed(1)}, ${queen.z.toFixed(1)})`);
                } else {
                    this.executeCommand('tp 900 900');
                }
            };
        }
        if (quickTpCrash) {
            quickTpCrash.onclick = () => {
                const targetGame = window.threeGame || window.game;
                const spawn = targetGame?.getSpawnTile?.() ?? { x: 0, y: 0 };
                if (targetGame?.teleportPlayerTo) {
                    targetGame.teleportPlayerTo(spawn.x, spawn.y);
                    this.info('NAV', `Teleported to Bunker Crash Origin (${spawn.x.toFixed(1)}, ${spawn.y.toFixed(1)})`);
                }
            };
        }

        const catFilterSelect = overlay.querySelector('#hb-console-cat-filter');
        if (catFilterSelect) {
            catFilterSelect.onchange = () => {
                this.categoryFilter = catFilterSelect.value;
                this.renderAllLogs();
            };
        }

        this.searchEl.oninput = () => {
            this.searchTerm = this.searchEl.value.toLowerCase();
            this.renderAllLogs();
        };

        // Command Input Listener
        this.inputEl.onkeydown = (e) => {
            if (e.key === 'Enter') {
                const cmd = this.inputEl.value.trim();
                if (cmd) {
                    this.executeCommand(cmd);
                    this.commandHistory.push(cmd);
                    this.historyIndex = this.commandHistory.length;
                    this.inputEl.value = '';
                }
            } else if (e.key === 'ArrowUp') {
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    this.inputEl.value = this.commandHistory[this.historyIndex] ?? '';
                }
            } else if (e.key === 'ArrowDown') {
                if (this.historyIndex < this.commandHistory.length - 1) {
                    this.historyIndex++;
                    this.inputEl.value = this.commandHistory[this.historyIndex] ?? '';
                } else {
                    this.historyIndex = this.commandHistory.length;
                    this.inputEl.value = '';
                }
            } else if (e.key === 'Escape' || e.code === 'Backquote' || e.key === '`' || e.key === '~') {
                e.preventDefault();
                e.stopPropagation();
                this.toggle(false);
            }
        };

        // Global ~ (Backquote) Listener
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Backquote' || e.key === '`' || e.key === '~') {
                // If console is visible or user pressed ~, toggle overlay
                e.preventDefault();
                e.stopPropagation();
                this.toggle(!this.visible);
            }
        }, true);

        // Stats update timer
        setInterval(() => this.updateStats(), 1000);
    }

    toggle(show) {
        this.visible = show !== undefined ? show : !this.visible;
        if (this.overlayEl) {
            this.overlayEl.style.display = this.visible ? 'flex' : 'none';
            if (this.visible) {
                this.renderAllLogs();
                setTimeout(() => this.inputEl?.focus(), 50);
            }
        }
    }

    clear() {
        this.logs = [];
        if (this.logsContainer) {
            this.logsContainer.innerHTML = '';
        }
        this.info('SYS', 'Console logs cleared.');
    }

    buildSessionCapture() {
        const game = typeof window !== 'undefined' ? (window.game ?? window.threeGame) : null;
        return {
            format: 'hunker-bunker-session-log',
            schemaVersion: 1,
            session: {
                startedAt: this.sessionStartedAt.toISOString(),
                exportedAt: new Date().toISOString(),
                durationMs: Date.now() - this.sessionStartedAt.getTime(),
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
                url: typeof location !== 'undefined' ? location.href : null
            },
            state: {
                appPhase: typeof window !== 'undefined' ? window.__hbAppPhase ?? null : null,
                playerType: game?.playerType ?? null,
                runStats: game?.getRunStats?.() ?? null,
                position: game?.player?.position
                    ? { x: game.player.position.x, y: game.player.position.y, z: game.player.position.z }
                    : null,
                renderer: game?.renderer?.info?.render ?? null
            },
            entries: this.sessionLogs.map((entry) => ({ ...entry }))
        };
    }

    serializeSession(format = 'json') {
        const capture = this.buildSessionCapture();
        if (format === 'txt') {
            const header = [
                'HUNKER BUNKER SESSION LOG',
                `Started: ${capture.session.startedAt}`,
                `Exported: ${capture.session.exportedAt}`,
                `Duration: ${capture.session.durationMs}ms`,
                `Entries: ${capture.entries.length}`,
                ''
            ];
            return header.concat(capture.entries.map((entry) => (
                `[${entry.isoTime}] [+${entry.elapsedMs}ms] [${entry.level.toUpperCase()}] [${entry.category}] ${entry.message}`
            ))).join('\n');
        }
        return JSON.stringify(capture, null, 2);
    }

    exportSession(format = 'json') {
        if (typeof document === 'undefined') return null;
        const normalizedFormat = format === 'txt' ? 'txt' : 'json';
        this.info('SESSION', `Export requested (${normalizedFormat.toUpperCase()})`);
        const body = this.serializeSession(normalizedFormat);
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `hunker-bunker-session-${stamp}.${normalizedFormat}`;
        const blob = new Blob([body], {
            type: normalizedFormat === 'json' ? 'application/json' : 'text/plain'
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
        this.info('SESSION', `Session capture saved: ${filename} (${this.sessionLogs.length} entries)`);
        return filename;
    }

    renderSingleLog(entry) {
        if (!this.logsContainer) return;
        if (!this.matchesFilter(entry)) return;

        const row = document.createElement('div');
        row.className = `hb-log-entry hb-log-${entry.level}`;
        row.innerHTML = `<span style="color:#556677;">[${entry.timestamp}]</span> <span style="color:#00f0ff;font-weight:bold;">[${entry.category}]</span> ${this.escapeHTML(entry.message)}`;
        this.logsContainer.appendChild(row);
    }

    renderAllLogs() {
        if (!this.logsContainer) return;
        this.logsContainer.innerHTML = '';
        const matching = this.logs.filter(entry => this.matchesFilter(entry));
        for (const entry of matching) {
            this.renderSingleLog(entry);
        }
        if (this.autoScroll) {
            this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
        }
    }

    matchesFilter(entry) {
        if (this.currentFilter !== 'ALL' && entry.level.toUpperCase() !== this.currentFilter) {
            return false;
        }
        if (this.categoryFilter && this.categoryFilter !== 'ALL' && entry.category.toUpperCase() !== this.categoryFilter) {
            return false;
        }
        if (this.searchTerm) {
            const fullText = `${entry.category} ${entry.message}`.toLowerCase();
            if (!fullText.includes(this.searchTerm)) return false;
        }
        return true;
    }

    escapeHTML(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    updateStats() {
        if (!this.statsEl) return;
        const fps = window.__hb_fps ?? '--';
        const entities = window.threeGame?.scatterObjects?.length ?? '--';
        const playerHp = window.threeGame?.playerVitals?.health ? Math.round(window.threeGame.playerVitals.health) : '--';
        this.statsEl.textContent = `FPS: ${fps} | HP: ${playerHp} | ENTITIES: ${entities}`;
    }

    executeCommand(cmd) {
        this.info('CMD', `> ${cmd}`);
        const parts = cmd.trim().split(/\s+/);
        const action = parts[0].toLowerCase();
        const win = typeof window !== 'undefined' ? window : null;
        const game = win?.threeGame;

        switch (action) {
            case 'help':
                this.info('HELP', `Available Commands:
  • help                  - Show this command manual
  • steam [status|recheck]- Perform Steamworks integration & backend diagnostic check
  • clear                 - Clear dev log history
  • exportlogs [json|txt] - Download the complete log captured since launch
  • god                   - Toggle player invincibility
  • heal                  - Fully restore player Health & Oxygen
  • tp <x> <z>            - Teleport player to target tile
  • spawn <type>          - Spawn enemy (cybersnail, cryosnail, sporesnail, crawler, queen)
  • give <resource> <qty> - Add tech, coin, or med resources
  • biome <active|cryo|bio>- Force environment biome transition
  • fps                   - Display current WebGL performance stats
  • loglevel <level>      - Set min log level (debug|info|warn|error)
  • resetachievements confirm - Reset Steam stats/achievements for THIS logged-in account (QA builds only, HB_QA_TOOLS_ENABLED=1)
  • <js code>             - Evaluate arbitrary JavaScript expressions`);
                break;

            case 'steam':
                this.info('STEAM', 'Executing Steamworks diagnostic check...');
                if (typeof win?.refreshSteamBridgeStatus === 'function') {
                    win.refreshSteamBridgeStatus().then((res) => {
                        if (!res) {
                            this.warn('STEAM', 'Web build detected — window.electronAPI is absent.');
                            return;
                        }
                        const info = res.info ?? {};
                        const health = res.health ?? {};
                        this.info('STEAM', `=== STEAMWORKS DIAGNOSTIC REPORT ===
• Desktop Shell: PRESENT
• Steamworks Active: ${info.active ? 'YES' : 'NO (' + (info.reason || 'inactive') + ')'}
• Persona / Account: ${info.persona ?? 'N/A'} (SteamID64: ${info.steamId64 ?? 'N/A'}, AppID: ${info.appId ?? 'N/A'})
• Steam Deck Hardware: ${info.isSteamDeck ? 'YES' : 'NO'}
• Steam Cloud: ${info.cloud?.available ? 'Available' : 'Unavailable'} (App: ${info.cloud?.enabledForApp}, Account: ${info.cloud?.enabledForAccount})
• Steam Input: ${info.steamInputAvailable ? 'Ready' : 'Not Available'}
• Backend Service: ${health.ok ? 'OK' : 'FAILED (' + (health.reason || 'unreachable') + ')'}
• Backend Message: ${health.message ?? (health.steam?.authConfigured ? 'Auth Configured' : 'Dev Mode')}
• Failure Message: ${info.message ?? 'None'}
====================================`);
                    }).catch((err) => {
                        this.error('STEAM', `Diagnostic check error: ${err?.message ?? err}`);
                    });
                } else {
                    this.warn('STEAM', 'window.refreshSteamBridgeStatus unavailable.');
                }
                break;

            case 'clear':
                this.clear();
                break;

            case 'exportlogs':
            case 'savelogs':
                this.exportSession(parts[1]?.toLowerCase() === 'txt' ? 'txt' : 'json');
                break;

            case 'god':
                if (game?.setGodMode) {
                    const next = !game.godMode;
                    game.setGodMode(next);
                    this.info('CHEAT', `God mode set to ${next ? 'ON (Invincible)' : 'OFF'}`);
                } else {
                    this.warn('CMD', 'Game or player vitals not active');
                }
                break;

            case 'noclip':
            case 'fly':
            case 'ghost': {
                const targetGame = game || win?.game;
                if (targetGame?.toggleNoclip) {
                    const active = targetGame.toggleNoclip();
                    this.info('CHEAT', `Noclip (Ghost Fly + Zero Collision + 3.5x Speed) ${active ? 'ACTIVE [Fly Mode ON]' : 'DISABLED [Normal Physics]'}`);
                } else if (typeof win?.devToggleNoclip === 'function') {
                    const msg = win.devToggleNoclip();
                    this.info('CHEAT', msg);
                } else {
                    this.warn('CMD', 'Noclip unavailable (Game instance not active)');
                }
                break;
            }

            case 'speed': {
                const targetGame = game || win?.game;
                if (targetGame) {
                    const mult = parseFloat(parts[1]) || (targetGame._sprintMoveSpeedMult > 2.0 ? 1.0 : 3.0);
                    targetGame._sprintMoveSpeedMult = mult;
                    this.info('CHEAT', `Sprint speed multiplier set to ${mult}x`);
                } else {
                    this.warn('CMD', 'Game instance not active');
                }
                break;
            }

            case 'nuke':
            case 'kill':
            case 'kill_all': {
                const targetGame = game || win?.game;
                if (targetGame?.purgeHostiles) {
                    const killed = targetGame.purgeHostiles();
                    this.info('CHEAT', `Purged ${killed} hostile enemies from active sector.`);
                } else if (typeof win?.devKillSnails === 'function') {
                    this.info('CHEAT', win.devKillSnails());
                } else {
                    this.warn('CMD', 'Hostile purge unavailable');
                }
                break;
            }

            case 'museum': {
                const targetGame = game || win?.game;
                if (win?.__DEBUG__?.openMuseum) {
                    this.info('NAV', 'Opening Continuous Asset Museum at (9000, 9000)...');
                    void win.__DEBUG__.openMuseum();
                } else if (win?.openDebugMuseum) {
                    this.info('NAV', 'Opening Debug Museum...');
                    void win.openDebugMuseum(targetGame);
                } else {
                    this.warn('CMD', 'Museum module not loaded');
                }
                break;
            }

            case 'showroom': {
                const targetGame = game || win?.game;
                if (win?.__DEBUG__?.openShowroom) {
                    this.info('NAV', 'Opening 4-Wall Showroom at (9500, 9500)...');
                    void win.__DEBUG__.openShowroom();
                } else if (win?.openDebugShowroom) {
                    this.info('NAV', 'Opening Debug Showroom...');
                    void win.openDebugShowroom(targetGame);
                } else {
                    this.warn('CMD', 'Showroom module not loaded');
                }
                break;
            }

            case 'heal':
                if (game?.playerVitals) {
                    game.healPlayer?.(game.playerVitals.maxHp ?? 100);
                    game.adjustOxygen?.(100);
                    this.info('CHEAT', 'Player Health & Oxygen fully restored.');
                } else {
                    this.warn('CMD', 'Player vitals not active');
                }
                break;

            case 'tp':
                if (game?.player?.position) {
                    const tx = parseFloat(parts[1]);
                    const tz = parseFloat(parts[2]);
                    if (!isNaN(tx) && !isNaN(tz)) {
                        game.player.position.x = tx;
                        game.player.position.z = tz;
                        this.info('TELEPORT', `Player teleported to (${tx}, ${tz})`);
                    } else {
                        this.warn('CMD', 'Usage: tp <x> <z>');
                    }
                }
                break;

            case 'spawn':
                if (game?.spawnEnemyInstance) {
                    const enemyType = parts[1] || 'cybersnail';
                    const px = game.player?.position?.x ?? 0;
                    const pz = game.player?.position?.z ?? 0;
                    const spawned = game.spawnEnemyInstance(enemyType, px + 2, pz + 2);
                    if (spawned) {
                        this.info('SPAWN', `Spawned ${enemyType} near player`);
                    } else {
                        this.warn('CMD', `Unknown enemy type '${enemyType}'`);
                    }
                } else {
                    this.warn('CMD', 'Enemy spawner unavailable in current state');
                }
                break;

            case 'give':
                if (game?.addRunResource) {
                    const res = parts[1] || 'tech';
                    const amt = parseInt(parts[2], 10) || 50;
                    game.addRunResource(res, amt);
                    this.info('GIVE', `Added ${amt} ${res}`);
                } else {
                    this.warn('CMD', 'Resource system unavailable');
                }
                break;

            case 'biome':
                if (game?.forceBiome) {
                    const bKey = parts[1] || 'cryo';
                    game.forceBiome(bKey);
                    this.info('BIOME', `Environment forced to ${bKey}`);
                } else {
                    this.warn('CMD', 'Biome transition unavailable');
                }
                break;

            case 'fog':
                if (game) {
                    game.disableFogOfWar = !game.disableFogOfWar;
                    this.info('CONFIG', `Fog of war set to ${game.disableFogOfWar ? 'DISABLED (Full Visibility)' : 'ENABLED'}`);
                }
                break;

            case 'fps':
                this.updateStats();
                this.info('PERF', `Renderer PixelRatio: ${game?.renderer?.getPixelRatio() ?? 1} | Max Anisotropy: ${game?.maxTextureAnisotropy ?? 1}`);
                break;

            case 'loglevel':
                if (['debug', 'info', 'warn', 'error'].includes(parts[1]?.toLowerCase())) {
                    this.minLevel = parts[1].toLowerCase();
                    this.info('CONFIG', `Minimum log level set to ${this.minLevel}`);
                } else {
                    this.warn('CMD', 'Usage: loglevel debug|info|warn|error');
                }
                break;

            case 'resetachievements':
                // QA/beta only — electron/main.cjs only registers the IPC
                // handler this calls on a named Steam beta branch or when the
                // build is launched with HB_QA_TOOLS_ENABLED=1. Resets the
                // Steam account currently logged into
                // THIS running game — there is no remote reset for a
                // different account. Requires "confirm" since it's a real
                // action against a real Steam profile, not local run state
                // like the other cheats here.
                if (parts[1]?.toLowerCase() !== 'confirm') {
                    this.warn('QA', 'This resets ALL Steam stats and achievements for the currently logged-in account. Type: resetachievements confirm');
                    break;
                }
                if (!win?.electronAPI?.resetAchievements) {
                    this.warn('QA', 'Not available — no desktop Steam bridge in this build.');
                    break;
                }
                win.electronAPI.resetAchievements().then((result) => {
                    if (result?.ok) {
                        this.info('QA', 'Steam stats and achievements reset for the current account.');
                    } else if (result?.reason === 'qa_tools_disabled') {
                        this.warn('QA', 'Disabled in this build — launch with HB_QA_TOOLS_ENABLED=1 to enable.');
                    } else if (result?.reason === 'steam_not_active') {
                        this.warn('QA', 'Steamworks is not active — is Steam running and logged in?');
                    } else {
                        this.error('QA', `Reset failed: ${result?.message ?? result?.reason ?? 'unknown error'}`);
                    }
                }).catch((err) => {
                    this.error('QA', `Reset failed: ${err?.message ?? err}`);
                });
                break;

            default:
                // Fallback: evaluate JS via indirect eval
                try {
                    const result = (0, eval)(cmd);
                    this.info('EVAL', String(result));
                } catch (err) {
                    this.error('CMD', `Unrecognized command or eval error: ${err.message}`);
                }
                break;
        }
    }
}

export const debugLog = new DebugLogger();
