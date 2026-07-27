// ── HB Debug Console & Logger (~) ──────────────────────────────
// In-Game Tactical Dev Console & Comprehensive Log System.
// Toggleable via `~` (Tilde / Backquote key). Captures console.log/warn/error/debug,
// accepts cheat & diagnostic commands, and offers level/category filtering.

class DebugLogger {
    constructor() {
        this.logs = [];
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

            logger.pushLog('debug', 'FETCH', [`-> ${method} ${url}`]);

            return origFetch.call(this, input, init).then(response => {
                const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
                const duration = Math.round(now - startTime);
                const level = response.ok ? 'debug' : 'warn';
                logger.pushLog(level, 'FETCH', [`<- ${method} ${url} [${response.status} ${response.statusText}] (${duration}ms)`]);
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
            id: Math.random().toString(36).substring(2, 9),
            timestamp,
            level,
            category,
            message
        };

        this.logs.push(entry);
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
                    <button id="hb-console-clear" class="hb-cmd-btn">CLEAR</button>
                    <button id="hb-console-close" style="background: none; border: none; color: #ff5566; font-weight: bold; cursor: pointer; font-size: 14px; padding: 0 4px;">✕</button>
                </div>
            </div>
            <div id="hb-console-logs" style="flex: 1; overflow-y: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 3px; scroll-behavior: smooth;"></div>
            <div style="display: flex; align-items: center; padding: 6px 12px; background: rgba(0, 0, 0, 0.4); border-top: 1px solid rgba(255, 255, 255, 0.1);">
                <span style="color: #00f0ff; margin-right: 8px; font-weight: bold;">&gt;</span>
                <input id="hb-console-input" type="text" placeholder="Type a command (help, god, heal, tp x z, spawn enemy, give tech 100, clear, or JS expr)..." style="flex: 1; background: transparent; border: none; outline: none; color: #00ffff; font-family: inherit; font-size: 12px;" />
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
  • god                   - Toggle player invincibility
  • heal                  - Fully restore player Health & Oxygen
  • tp <x> <z>            - Teleport player to target tile
  • spawn <type>          - Spawn enemy (cybersnail, cryosnail, sporesnail, crawler, queen)
  • give <resource> <qty> - Add tech, coin, or med resources
  • biome <active|cryo|bio>- Force environment biome transition
  • fps                   - Display current WebGL performance stats
  • loglevel <level>      - Set min log level (debug|info|warn|error)
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

            case 'god':
                if (game?.playerVitals) {
                    game._godMode = !game._godMode;
                    this.info('CHEAT', `God mode set to ${game._godMode ? 'ON (Invincible)' : 'OFF'}`);
                } else {
                    this.warn('CMD', 'Game or player vitals not active');
                }
                break;

            case 'heal':
                if (game?.playerVitals) {
                    game.playerVitals.health = game.playerVitals.maxHealth || 100;
                    game.playerVitals.oxygen = game.playerVitals.maxOxygen || 100;
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
                    game.spawnEnemyInstance(enemyType, px + 2, pz + 2);
                    this.info('SPAWN', `Spawned ${enemyType} near player`);
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
