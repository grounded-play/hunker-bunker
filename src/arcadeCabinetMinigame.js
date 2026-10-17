/**
 * SUB-CRUST PROTOCOL: 1984
 * Authentic 8-bit vector arcade minigame for life_arcade_cabinet.glb.
 * Features vector graphics simulation, persistent high score table,
 * initials entry, wave scaling, and metagame expedition rewards.
 */

export const ARCADE_STORAGE_KEY = 'hb_arcade_scores_v1';
export const TINA_HIGH_SCORE = 104200;
export const ARCADE_LEADERBOARD_LIMIT = 10;
export const ARCADE_INITIALS_CUTOFF = 5;

export const ARCADE_SIMULATION = Object.freeze({
    fixedDeltaSec: 1 / 60,
    maxFrameDeltaSec: 0.1,
    maxSubSteps: 6
});

export const DEFAULT_LEADERBOARD = Object.freeze([
    { rank: 1, initials: 'TINA', score: 104200, role: 'MAYOR' },
    { rank: 2, initials: 'BRI',  score: 88500,  role: 'SUB-CDR' },
    { rank: 3, initials: 'CHE',  score: 62100,  role: 'CHIEF' },
    { rank: 4, initials: 'REY',  score: 45000,  role: 'COURIER' },
    { rank: 5, initials: 'MAR',  score: 25000,  role: 'SALLOW' }
]);

function defaultLeaderboard() {
    // Callers render and sort score rows. Never hand out references to the
    // authored defaults or one accidental mutation poisons every later load.
    return DEFAULT_LEADERBOARD.map((entry) => ({ ...entry }));
}

function normalizeLeaderboard(value) {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry) => {
            const score = Number(entry?.score);
            if (!Number.isFinite(score) || score < 0) return null;
            const initials = String(entry?.initials ?? '')
                .trim()
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, 4);
            if (!initials) return null;
            const role = String(entry?.role || 'OPERATOR')
                .trim()
                .toUpperCase()
                .replace(/[^A-Z0-9 -]/g, '')
                .slice(0, 16) || 'OPERATOR';
            const timestamp = Number(entry?.timestamp);
            return {
                initials,
                score: Math.floor(score),
                role,
                ...(Number.isFinite(timestamp) ? { timestamp } : {})
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, ARCADE_LEADERBOARD_LIMIT)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/**
 * Loads high scores from storage or falls back to authored defaults.
 */
export function getArcadeHighScores(storage = null) {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    if (!store) return defaultLeaderboard();

    try {
        const raw = store.getItem(ARCADE_STORAGE_KEY);
        if (!raw) return defaultLeaderboard();
        const parsed = normalizeLeaderboard(JSON.parse(raw));
        if (parsed.length > 0) return parsed;
    } catch {
        // Fall back on error
    }
    return defaultLeaderboard();
}

/**
 * Saves a high score entry, maintains descending order, and caps at top 10.
 */
export function recordArcadeHighScore({ initials = 'AAA', score = 0, role = 'OPERATOR' }, storage = null) {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    const scores = getArcadeHighScores(store);

    const cleanInitials = String(initials || 'AAA').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'AAA';
    const numericScore = Number(score);
    const entry = {
        initials: cleanInitials,
        score: Number.isFinite(numericScore) ? Math.max(0, Math.floor(numericScore)) : 0,
        role: String(role || 'OPERATOR').trim().toUpperCase().replace(/[^A-Z0-9 -]/g, '').slice(0, 16) || 'OPERATOR',
        timestamp: Date.now()
    };

    const topScores = normalizeLeaderboard([...scores, entry]);

    if (store) {
        try {
            store.setItem(ARCADE_STORAGE_KEY, JSON.stringify(topScores));
        } catch {
            // Storage quota or sandboxed
        }
    }

    return topScores;
}

export function isQualifyingHighScore(score, storage = null) {
    const scores = getArcadeHighScores(storage).slice(0, ARCADE_INITIALS_CUTOFF);
    const numericScore = Number(score);
    if (!Number.isFinite(numericScore) || numericScore < 0) return false;
    if (scores.length < ARCADE_INITIALS_CUTOFF) return true;
    return numericScore > scores[scores.length - 1].score;
}

/**
 * Pure simulation state for the 8-bit vector shooter.
 */
export class ArcadeGameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.score = 0;
        this.lives = 3;
        this.wave = 1;
        this.multiplier = 1;
        this.streak = 0;
        this.state = 'ATTRACT'; // ATTRACT | PLAYING | GAME_OVER | ENTER_INITIALS
        this.player = {
            x: 160,
            y: 120,
            angle: -Math.PI / 2,
            vx: 0,
            vy: 0,
            radius: 8,
            invulnerableMs: 0
        };
        this.enemies = [];
        this.bullets = [];
        this.particles = [];
        this.spawnTimerMs = 0;
        this.enemiesRemainingInWave = 10;
    }

    startNewGame() {
        this.reset();
        this.state = 'PLAYING';
        this.player.invulnerableMs = 1500;
        this._spawnWaveEnemies();
    }

    _spawnWaveEnemies() {
        this.enemies = [];
        const count = 6 + this.wave * 3;
        this.enemiesRemainingInWave = count;
    }

    spawnEnemy(width = 320, height = 240) {
        if (this.enemiesRemainingInWave <= 0) return;
        this.enemiesRemainingInWave -= 1;

        // Spawn along perimeter
        const edge = Math.floor(Math.random() * 4);
        let x;
        let y;
        if (edge === 0) {
            x = Math.random() * width;
            y = -10;
        } else if (edge === 1) {
            x = width + 10;
            y = Math.random() * height;
        } else if (edge === 2) {
            x = Math.random() * width;
            y = height + 10;
        } else {
            x = -10;
            y = Math.random() * height;
        }

        const type = Math.random() < 0.25 ? 'fast_snail' : 'geo_snail';
        this.enemies.push({
            x,
            y,
            type,
            hp: type === 'geo_snail' ? 2 : 1,
            speed: type === 'geo_snail' ? 35 : 60,
            radius: type === 'geo_snail' ? 10 : 7,
            scoreValue: type === 'geo_snail' ? 150 : 250
        });
    }

    fireBullet() {
        if (this.state !== 'PLAYING') return false;
        if (this.bullets.length >= 6) return false;

        const speed = 220;
        const bx = this.player.x + Math.cos(this.player.angle) * 12;
        const by = this.player.y + Math.sin(this.player.angle) * 12;

        this.bullets.push({
            x: bx,
            y: by,
            vx: Math.cos(this.player.angle) * speed,
            vy: Math.sin(this.player.angle) * speed,
            lifeMs: 1200
        });
        return true;
    }

    update(deltaSec) {
        if (this.state !== 'PLAYING') return;

        const deltaMs = deltaSec * 1000;
        if (this.player.invulnerableMs > 0) {
            this.player.invulnerableMs = Math.max(0, this.player.invulnerableMs - deltaMs);
        }

        // Update player inertia
        this.player.x += this.player.vx * deltaSec;
        this.player.y += this.player.vy * deltaSec;
        // 0.94 per 60 Hz frame, independent of the display's refresh rate.
        const damping = Math.pow(0.94, deltaSec * 60);
        this.player.vx *= damping;
        this.player.vy *= damping;

        // Screen boundary clamp
        this.player.x = Math.max(10, Math.min(310, this.player.x));
        this.player.y = Math.max(10, Math.min(230, this.player.y));

        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * deltaSec;
            b.y += b.vy * deltaSec;
            b.lifeMs -= deltaMs;
            if (b.lifeMs <= 0 || b.x < 0 || b.x > 320 || b.y < 0 || b.y > 240) {
                this.bullets.splice(i, 1);
            }
        }

        // Spawn timer
        this.spawnTimerMs += deltaMs;
        if (this.spawnTimerMs >= Math.max(400, 1800 - this.wave * 150)) {
            this.spawnTimerMs = 0;
            this.spawnEnemy();
        }

        // Update enemies towards player
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const dist = Math.hypot(dx, dy) || 1;

            e.x += (dx / dist) * e.speed * deltaSec;
            e.y += (dy / dist) * e.speed * deltaSec;

            // Check collision with bullets
            for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
                const b = this.bullets[bi];
                if (Math.hypot(b.x - e.x, b.y - e.y) < e.radius + 3) {
                    this.bullets.splice(bi, 1);
                    e.hp -= 1;
                    if (e.hp <= 0) {
                        this.streak += 1;
                        if (this.streak % 5 === 0) {
                            this.multiplier = Math.min(5, this.multiplier + 1);
                        }
                        this.score += e.scoreValue * this.multiplier;
                        this.enemies.splice(i, 1);
                        e.dead = true;
                        break;
                    }
                }
            }
            // A snail shot dead this frame can't also cost a life.
            if (e.dead) continue;

            // Check player collision
            if (this.player.invulnerableMs <= 0 && Math.hypot(this.player.x - e.x, this.player.y - e.y) < this.player.radius + e.radius) {
                this.lives -= 1;
                this.streak = 0;
                this.multiplier = 1;
                this.player.invulnerableMs = 2000;
                this.player.x = 160;
                this.player.y = 120;
                this.player.vx = 0;
                this.player.vy = 0;

                if (this.lives <= 0) {
                    this.state = isQualifyingHighScore(this.score) ? 'ENTER_INITIALS' : 'GAME_OVER';
                }
            }
        }

        // Wave progression
        if (this.enemies.length === 0 && this.enemiesRemainingInWave <= 0) {
            this.wave += 1;
            this.score += 1000 * this.wave;
            this._spawnWaveEnemies();
        }
    }
}

export const ARCADE_INPUT = Object.freeze({
    TURN_RATE: 3.8,          // rad/s at full stick or a held key
    THRUST_ACCEL: 260,       // px/s^2
    FIRE_COOLDOWN_MS: 170    // held fire auto-repeats at this rate
});

/**
 * Applies one frame of held input: { turn: -1..1, thrust, fire }.
 * Held keys and sticks steer smoothly; the old controls moved only on
 * key-repeat taps and never took a gamepad.
 */
export function applyArcadeInput(sim, input = {}, deltaSec = 0) {
    if (!sim || sim.state !== 'PLAYING') return;
    const player = sim.player;
    const turn = Math.max(-1, Math.min(1, Number(input.turn) || 0));
    player.angle += turn * ARCADE_INPUT.TURN_RATE * deltaSec;
    if (input.thrust) {
        player.vx += Math.cos(player.angle) * ARCADE_INPUT.THRUST_ACCEL * deltaSec;
        player.vy += Math.sin(player.angle) * ARCADE_INPUT.THRUST_ACCEL * deltaSec;
    }
    sim.fireCooldownMs = Math.max(0, (sim.fireCooldownMs ?? 0) - deltaSec * 1000);
    if (input.fire && sim.fireCooldownMs <= 0 && sim.fireBullet()) {
        sim.fireCooldownMs = ARCADE_INPUT.FIRE_COOLDOWN_MS;
    }
}

/**
 * Advances the cabinet on a fixed 60 Hz clock. The remainder is returned to
 * the controller for the next rendered frame, keeping play identical at
 * 60/120/144 Hz while bounding catch-up work after a suspended tab.
 */
export function advanceArcadeSimulation(sim, input = {}, accumulatorSec = 0, elapsedSec = 0) {
    let accumulator = Math.min(
        Math.max(0, Number(accumulatorSec) || 0)
            + Math.max(0, Math.min(ARCADE_SIMULATION.maxFrameDeltaSec, Number(elapsedSec) || 0)),
        ARCADE_SIMULATION.fixedDeltaSec * ARCADE_SIMULATION.maxSubSteps
    );
    let subSteps = 0;
    while (accumulator >= ARCADE_SIMULATION.fixedDeltaSec
        && subSteps < ARCADE_SIMULATION.maxSubSteps) {
        applyArcadeInput(sim, input, ARCADE_SIMULATION.fixedDeltaSec);
        sim.update(ARCADE_SIMULATION.fixedDeltaSec);
        accumulator -= ARCADE_SIMULATION.fixedDeltaSec;
        subSteps += 1;
    }
    return { accumulatorSec: accumulator, subSteps };
}

const PAD_DEADZONE = 0.25;

/**
 * Reads the first connected standard-mapping gamepad: left stick or d-pad
 * turns, d-pad up / RT / X thrusts, A fires and starts, B backs out.
 */
export function readArcadePad(pads = []) {
    const pad = Array.from(pads ?? []).find(Boolean);
    if (!pad) return null;
    const pressed = (index) => Boolean(pad.buttons?.[index]?.pressed);
    const stick = Number(pad.axes?.[0]) || 0;
    let turn = Math.abs(stick) > PAD_DEADZONE ? stick : 0;
    if (pressed(14)) turn = -1;
    if (pressed(15)) turn = 1;
    return {
        turn,
        thrust: pressed(12) || pressed(2) || (pad.buttons?.[7]?.value ?? 0) > 0.3 || pressed(7),
        fire: pressed(0),
        back: pressed(1),
        up: pressed(12),
        down: pressed(13),
        left: pressed(14),
        right: pressed(15)
    };
}

const KEY_TURN_LEFT = new Set(['KeyA', 'ArrowLeft']);
const KEY_TURN_RIGHT = new Set(['KeyD', 'ArrowRight']);
const KEY_THRUST = new Set(['KeyW', 'ArrowUp']);
const KEY_FIRE = new Set(['Space']);

/**
 * Controller to mount and present the arcade UI inside the browser DOM.
 */
export class ArcadeCabinetController {
    constructor({ game = null, onReward = null } = {}) {
        this.game = game;
        this.onReward = onReward;
        this.gameSim = new ArcadeGameState();
        this.overlayEl = null;
        this.canvasEl = null;
        this.ctx = null;
        this.rafId = null;
        this.lastTime = 0;
        this.initialsInput = ['A', 'A', 'A'];
        this.initialsIndex = 0;
        this.heldKeys = new Set();
        this.prevPad = null;
        this.simulationAccumulatorSec = 0;
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
    }

    // Every finished game is announced once, whether or not the score makes
    // the table: main.js pays the rewards (AAA plan §7.4) and the
    // achievements track the best score.
    _announceGameEnd() {
        const { state, score } = this.gameSim;
        if (state === 'PLAYING') {
            this._inGame = true;
            return;
        }
        if (!this._inGame || (state !== 'GAME_OVER' && state !== 'ENTER_INITIALS')) return;
        this._inGame = false;
        this.onReward?.({ type: 'game_end', score });
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('arcade-score-recorded', { detail: { score, beatTina: score > TINA_HIGH_SCORE } }));
        }
    }

    heldInput() {
        const held = (set) => [...set].some((code) => this.heldKeys.has(code));
        return {
            turn: (held(KEY_TURN_RIGHT) ? 1 : 0) - (held(KEY_TURN_LEFT) ? 1 : 0),
            thrust: held(KEY_THRUST),
            fire: held(KEY_FIRE)
        };
    }

    // The cabinet owns the keyboard while open: capture phase, swallowed, so
    // Esc doesn't also open Settings and Tab/M/E don't reach the game. Only
    // F-keys and OS chords pass through.
    _ownsKey(e) {
        if (!this.isOpen()) return false;
        if (/^F\d+$/.test(e.key ?? '') || e.ctrlKey || e.metaKey || e.altKey) return false;
        e.preventDefault?.();
        e.stopImmediatePropagation?.();
        return true;
    }

    _onKeyUp(e) {
        if (!this._ownsKey(e)) return;
        this.heldKeys.delete(e.code);
    }

    isOpen() {
        return Boolean(this.overlayEl && !this.overlayEl.classList.contains('hidden'));
    }

    open() {
        this._ensureDom();
        if (this.overlayEl) {
            this.overlayEl.classList.remove('hidden');
        }
        if (this.game?.setInputEnabled) {
            this.game.setInputEnabled(false);
        }
        window.addEventListener('keydown', this._onKeyDown, { capture: true });
        window.addEventListener('keyup', this._onKeyUp, { capture: true });
        this.heldKeys.clear();
        this.prevPad = null;
        this.gameSim.reset();
        this.simulationAccumulatorSec = 0;
        this.lastTime = performance.now();
        this._loop = this._loop.bind(this);
        this.rafId = requestAnimationFrame(this._loop);
    }

    close() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        window.removeEventListener('keydown', this._onKeyDown, { capture: true });
        window.removeEventListener('keyup', this._onKeyUp, { capture: true });
        this.heldKeys.clear();
        const wasOpen = this.isOpen();
        if (this.overlayEl) {
            this.overlayEl.classList.add('hidden');
        }
        if (wasOpen && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('arcade-cabinet-closed'));
        }
        if (this.game?.setInputEnabled) {
            this.game.setInputEnabled(true);
        }
    }

    _ensureDom() {
        if (typeof document === 'undefined') return;
        let overlay = document.getElementById('arcade-cabinet-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'arcade-cabinet-overlay';
            overlay.className = 'arcade-cabinet-overlay hidden';
            overlay.innerHTML = `
                <div class="arcade-cabinet-frame" id="cabinet-bezel">
                    <div class="arcade-cabinet-screen">
                        <canvas id="arcade-cabinet-canvas" width="320" height="240"></canvas>
                        <div class="arcade-cabinet-crt-lines" aria-hidden="true"></div>
                    </div>
                    <div class="arcade-cabinet-controls-hint">
                        <span data-i18n="ui.arcade.thrust">[W/A/D · STICK] THRUST/TURN</span>
                        <span data-i18n="ui.arcade.fire">[SPACE · A] FIRE</span>
                        <span data-i18n="ui.arcade.exit">[ESC · B] EXIT CABINET</span>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        this.overlayEl = overlay;
        this.canvasEl = overlay.querySelector('#arcade-cabinet-canvas');
        if (this.canvasEl) {
            this.ctx = this.canvasEl.getContext('2d');
        }
    }

    _onKeyDown(e) {
        if (!this._ownsKey(e)) return;
        if (e.key === 'Escape') {
            this.close();
            return;
        }
        this.heldKeys.add(e.code);
        if (e.repeat) return;

        if (this.gameSim.state === 'ATTRACT' || this.gameSim.state === 'GAME_OVER') {
            if (e.code === 'Space' || e.code === 'Enter') {
                this.gameSim.startNewGame();
            }
            return;
        }

        if (this.gameSim.state === 'ENTER_INITIALS') {
            if (e.key === 'ArrowUp') {
                const charCode = this.initialsInput[this.initialsIndex].charCodeAt(0);
                this.initialsInput[this.initialsIndex] = String.fromCharCode(charCode >= 90 ? 65 : charCode + 1);
            } else if (e.key === 'ArrowDown') {
                const charCode = this.initialsInput[this.initialsIndex].charCodeAt(0);
                this.initialsInput[this.initialsIndex] = String.fromCharCode(charCode <= 65 ? 90 : charCode - 1);
            } else if (e.key === 'ArrowRight' || e.code === 'Space') {
                if (this.initialsIndex < 2) {
                    this.initialsIndex += 1;
                } else {
                    this._commitHighScore();
                }
            } else if (e.key === 'ArrowLeft') {
                this.initialsIndex = Math.max(0, this.initialsIndex - 1);
            } else if (e.code === 'Enter') {
                this._commitHighScore();
            }
            return;
        }

        // PLAYING: steering and fire are held state, applied per frame.
    }

    // Gamepad edges for the non-playing screens (start, initials, back).
    _handlePad(pad) {
        const prev = this.prevPad ?? {};
        this.prevPad = pad;
        if (!pad) return;
        const edge = (name) => pad[name] && !prev[name];
        if (edge('back')) {
            this.close();
            return;
        }
        const state = this.gameSim.state;
        if ((state === 'ATTRACT' || state === 'GAME_OVER') && edge('fire')) {
            this.gameSim.startNewGame();
        } else if (state === 'ENTER_INITIALS') {
            const letter = this.initialsInput[this.initialsIndex].charCodeAt(0);
            if (edge('up')) this.initialsInput[this.initialsIndex] = String.fromCharCode(letter >= 90 ? 65 : letter + 1);
            if (edge('down')) this.initialsInput[this.initialsIndex] = String.fromCharCode(letter <= 65 ? 90 : letter - 1);
            if (edge('left')) this.initialsIndex = Math.max(0, this.initialsIndex - 1);
            if (edge('right') || edge('fire')) {
                if (this.initialsIndex < 2) this.initialsIndex += 1;
                else this._commitHighScore();
            }
        }
    }

    _commitHighScore() {
        const initials = this.initialsInput.join('');
        const score = this.gameSim.score;
        recordArcadeHighScore({ initials, score, role: 'OPERATOR' });

        // Rewards follow the game's end (_announceGameEnd), not the initials.
        this.gameSim.state = 'ATTRACT';
    }

    _loop(now) {
        const elapsedSec = Math.max(0, Math.min(
            ARCADE_SIMULATION.maxFrameDeltaSec,
            (now - this.lastTime) / 1000
        ));
        this.lastTime = now;

        const pad = typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
            ? readArcadePad(navigator.getGamepads())
            : null;
        const keys = this.heldInput();
        this._handlePad(pad);
        if (!this.isOpen()) return;
        const step = advanceArcadeSimulation(this.gameSim, {
            turn: keys.turn || pad?.turn || 0,
            thrust: keys.thrust || Boolean(pad?.thrust),
            fire: keys.fire || Boolean(pad?.fire)
        }, this.simulationAccumulatorSec, elapsedSec);
        this.simulationAccumulatorSec = step.accumulatorSec;
        this._announceGameEnd();
        this._render();

        if (this.isOpen()) {
            this.rafId = requestAnimationFrame(this._loop);
        }
    }

    _render() {
        if (!this.ctx || !this.canvasEl) return;
        const ctx = this.ctx;
        ctx.fillStyle = '#050a08';
        ctx.fillRect(0, 0, 320, 240);

        if (this.gameSim.state === 'ATTRACT') {
            this._renderAttractScreen(ctx);
        } else if (this.gameSim.state === 'PLAYING') {
            this._renderGameplay(ctx);
        } else if (this.gameSim.state === 'ENTER_INITIALS') {
            this._renderInitialsEntry(ctx);
        } else if (this.gameSim.state === 'GAME_OVER') {
            this._renderGameOver(ctx);
        }
    }

    _renderAttractScreen(ctx) {
        ctx.fillStyle = '#39ff14';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SUB-CRUST PROTOCOL: 1984', 160, 35);

        ctx.fillStyle = '#ffb700';
        ctx.font = '10px monospace';
        ctx.fillText('== HIGH SCORES ==', 160, 60);

        const scores = getArcadeHighScores();
        ctx.font = '9px monospace';
        scores.slice(0, 5).forEach((entry, i) => {
            const y = 85 + i * 18;
            ctx.fillStyle = entry.score >= TINA_HIGH_SCORE ? '#ff4081' : '#a0e8af';
            ctx.fillText(`${entry.rank}. ${entry.initials}  ${entry.score.toLocaleString()}  (${entry.role})`, 160, y);
        });

        ctx.fillStyle = '#39ff14';
        const blink = Math.floor(Date.now() / 500) % 2 === 0;
        if (blink) {
            ctx.fillText('PRESS [SPACE] OR (A) TO PLAY', 160, 205);
        }
    }

    _renderGameplay(ctx) {
        // Render HUD
        ctx.fillStyle = '#39ff14';
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.gameSim.score}`, 10, 18);
        ctx.fillText(`WAVE: ${this.gameSim.wave}`, 120, 18);
        ctx.textAlign = 'right';
        ctx.fillText(`LIVES: ${'♥'.repeat(this.gameSim.lives)}`, 310, 18);
        if (this.gameSim.multiplier > 1) {
            ctx.fillStyle = '#ffb700';
            ctx.fillText(`x${this.gameSim.multiplier}`, 310, 32);
        }

        // Render Player Ship (Vector Triangle)
        const p = this.gameSim.player;
        ctx.strokeStyle = (p.invulnerableMs > 0 && Math.floor(Date.now() / 100) % 2 === 0) ? '#ff5555' : '#39ff14';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const tipX = p.x + Math.cos(p.angle) * 10;
        const tipY = p.y + Math.sin(p.angle) * 10;
        const leftX = p.x + Math.cos(p.angle + 2.5) * 8;
        const leftY = p.y + Math.sin(p.angle + 2.5) * 8;
        const rightX = p.x + Math.cos(p.angle - 2.5) * 8;
        const rightY = p.y + Math.sin(p.angle - 2.5) * 8;
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(leftX, leftY);
        ctx.lineTo(p.x, p.y);
        ctx.lineTo(rightX, rightY);
        ctx.closePath();
        ctx.stroke();

        // Render Bullets
        ctx.fillStyle = '#fff';
        for (const b of this.gameSim.bullets) {
            ctx.fillRect(b.x - 1.5, b.y - 1.5, 3, 3);
        }

        // Render Enemies
        for (const e of this.gameSim.enemies) {
            ctx.strokeStyle = e.type === 'geo_snail' ? '#00e5ff' : '#ff4444';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
            ctx.stroke();
            // Vector crosshair
            ctx.beginPath();
            ctx.moveTo(e.x - 3, e.y);
            ctx.lineTo(e.x + 3, e.y);
            ctx.moveTo(e.x, e.y - 3);
            ctx.lineTo(e.x, e.y + 3);
            ctx.stroke();
        }
    }

    _renderInitialsEntry(ctx) {
        ctx.fillStyle = '#ffb700';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NEW HIGH SCORE!', 160, 50);

        ctx.fillStyle = '#39ff14';
        ctx.font = '10px monospace';
        ctx.fillText(`SCORE: ${this.gameSim.score.toLocaleString()}`, 160, 75);
        ctx.fillText('ENTER INITIALS (UP/DOWN/SPACE):', 160, 110);

        ctx.font = '22px monospace';
        for (let i = 0; i < 3; i++) {
            const char = this.initialsInput[i];
            const isSelected = i === this.initialsIndex;
            ctx.fillStyle = isSelected ? '#ff4081' : '#a0e8af';
            ctx.fillText(char, 130 + i * 30, 155);
            if (isSelected) {
                ctx.fillRect(122 + i * 30, 162, 16, 2);
            }
        }
    }

    _renderGameOver(ctx) {
        ctx.fillStyle = '#ff4444';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', 160, 90);

        ctx.fillStyle = '#a0e8af';
        ctx.font = '10px monospace';
        ctx.fillText(`FINAL SCORE: ${this.gameSim.score.toLocaleString()}`, 160, 125);
        ctx.fillText('PRESS [SPACE] OR (A) TO RESTART', 160, 175);
    }
}

/**
 * Singleton instance helper.
 */
let sharedArcadeController = null;

export function getArcadeController(opts = {}) {
    if (!sharedArcadeController) {
        sharedArcadeController = new ArcadeCabinetController(opts);
    }
    return sharedArcadeController;
}
