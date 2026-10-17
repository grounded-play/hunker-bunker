/**
 * SUB-CRUST PROTOCOL: 1984
 * Authentic 8-bit vector arcade minigame for life_arcade_cabinet.glb.
 * Features vector graphics simulation, persistent high score table,
 * initials entry, wave scaling, and metagame expedition rewards.
 */

export const ARCADE_STORAGE_KEY = 'hb_arcade_scores_v1';
export const TINA_HIGH_SCORE = 104200;

export const DEFAULT_LEADERBOARD = Object.freeze([
    { rank: 1, initials: 'TINA', score: 104200, role: 'MAYOR' },
    { rank: 2, initials: 'BRI',  score: 88500,  role: 'SUB-CDR' },
    { rank: 3, initials: 'CHE',  score: 62100,  role: 'CHIEF' },
    { rank: 4, initials: 'REY',  score: 45000,  role: 'COURIER' },
    { rank: 5, initials: 'MAR',  score: 25000,  role: 'SALLOW' }
]);

/**
 * Loads high scores from storage or falls back to authored defaults.
 */
export function getArcadeHighScores(storage = null) {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    if (!store) return [...DEFAULT_LEADERBOARD];

    try {
        const raw = store.getItem(ARCADE_STORAGE_KEY);
        if (!raw) return [...DEFAULT_LEADERBOARD];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
        }
    } catch {
        // Fall back on error
    }
    return [...DEFAULT_LEADERBOARD];
}

/**
 * Saves a high score entry, maintains descending order, and caps at top 10.
 */
export function recordArcadeHighScore({ initials = 'AAA', score = 0, role = 'OPERATOR' }, storage = null) {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    const scores = getArcadeHighScores(store);

    const cleanInitials = String(initials || 'AAA').trim().toUpperCase().slice(0, 4) || 'AAA';
    const entry = {
        initials: cleanInitials,
        score: Math.max(0, Math.floor(score)),
        role: String(role || 'OPERATOR').toUpperCase(),
        timestamp: Date.now()
    };

    scores.push(entry);
    scores.sort((a, b) => b.score - a.score);
    const topScores = scores.slice(0, 10).map((item, index) => ({
        ...item,
        rank: index + 1
    }));

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
    const scores = getArcadeHighScores(storage);
    if (scores.length < 5) return true;
    return score > scores[scores.length - 1].score;
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
        this.player.vx *= 0.94;
        this.player.vy *= 0.94;

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
                        break;
                    }
                }
            }

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
        this._onKeyDown = this._onKeyDown.bind(this);
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
        window.addEventListener('keydown', this._onKeyDown);
        this.gameSim.reset();
        this.lastTime = performance.now();
        this._loop = this._loop.bind(this);
        this.rafId = requestAnimationFrame(this._loop);
    }

    close() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        window.removeEventListener('keydown', this._onKeyDown);
        if (this.overlayEl) {
            this.overlayEl.classList.add('hidden');
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
                        <span data-i18n="ui.arcade.thrust">[W/A/D] THRUST/TURN</span>
                        <span data-i18n="ui.arcade.fire">[SPACE] FIRE</span>
                        <span data-i18n="ui.arcade.exit">[ESC] EXIT CABINET</span>
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
        if (e.key === 'Escape') {
            this.close();
            return;
        }

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

        if (this.gameSim.state === 'PLAYING') {
            if (e.key === 'a' || e.key === 'ArrowLeft') {
                this.gameSim.player.angle -= 0.22;
            } else if (e.key === 'd' || e.key === 'ArrowRight') {
                this.gameSim.player.angle += 0.22;
            } else if (e.key === 'w' || e.key === 'ArrowUp') {
                const speed = 120;
                this.gameSim.player.vx += Math.cos(this.gameSim.player.angle) * speed * 0.1;
                this.gameSim.player.vy += Math.sin(this.gameSim.player.angle) * speed * 0.1;
            } else if (e.code === 'Space') {
                this.gameSim.fireBullet();
            }
        }
    }

    _commitHighScore() {
        const initials = this.initialsInput.join('');
        const score = this.gameSim.score;
        recordArcadeHighScore({ initials, score, role: 'OPERATOR' });

        // Dispatch reward callbacks
        if (score >= 25000) {
            this.onReward?.({ type: 'arcade_reflexes', score });
        }
        if (score >= TINA_HIGH_SCORE) {
            this.onReward?.({ type: 'tina_defeated', score });
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('arcade-tina-beaten', { detail: { score } }));
            }
        }
        this.gameSim.state = 'ATTRACT';
    }

    _loop(now) {
        const deltaSec = Math.min(0.1, (now - this.lastTime) / 1000);
        this.lastTime = now;

        this.gameSim.update(deltaSec);
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
            ctx.fillText('PRESS [SPACE] TO PLAY', 160, 205);
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
        ctx.fillText('PRESS [SPACE] TO RESTART', 160, 175);
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
