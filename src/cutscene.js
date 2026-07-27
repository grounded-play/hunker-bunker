const SHIP_SPRITES = {
    SCOUT: '/scout_ship.png',
    TANK: '/tank_ship.png',
    ENGINEER: '/engineer_ship.png'
};

const CUTSCENE_TIMING = Object.freeze({
    overlayInMs: 300,
    shipFadeInMs: 200,
    shipFallStartMs: 500,
    shipFallDurationMs: 1800,
    impactMs: 2300,
    fadeOutMs: 3000,
    finishMs: 3200
});
const INITIAL_STAR_COUNT = 48;
const STREAM_STAR_BATCH = 2;
const STREAM_STAR_INTERVAL_MS = 80;

export class CutsceneManager {
    constructor({
        overlayId = 'cutscene-overlay',
        shipId = 'cutscene-ship',
        wreckId = 'cutscene-wreck',
        starfieldId = 'cutscene-starfield',
        particlesId = 'cutscene-particles',
        viewportId = 'game-viewport',
        resolveImpactPoint = null
    } = {}) {
        this.overlayEl = document.getElementById(overlayId);
        this.shipEl = document.getElementById(shipId);
        this.wreckEl = document.getElementById(wreckId);
        this.starfieldEl = document.getElementById(starfieldId);
        this.particlesEl = document.getElementById(particlesId);
        this.viewportEl = document.getElementById(viewportId);
        this.resolveImpactPoint = resolveImpactPoint;

        this.runId = 0;
        this.activeRunId = 0;
        this.resolveRun = null;
        this.timers = [];
        this.starStreamTimer = 0;
        this.spriteCache = new Map();
        this.allowSkip = true;
        this.handleSkipKey = (event) => {
            if (!this.allowSkip) return;
            if (event.code !== 'Escape' && event.code !== 'Space') return;
            event.preventDefault();
            this.finishActiveRun(true);
        };
    }

    async play({ playerType = 'SCOUT', allowSkip = true, resolveImpactPoint = null } = {}) {
        if (!this.overlayEl || !this.shipEl || !this.wreckEl || !this.particlesEl) {
            return Promise.resolve({ skipped: false });
        }

        this.finishActiveRun(true);

        const runId = ++this.runId;
        this.activeRunId = runId;
        this.allowSkip = allowSkip;

        const sprite = SHIP_SPRITES[playerType] ?? SHIP_SPRITES.SCOUT;
        const [preparedSprite, preparedWreck] = await Promise.all([
            this.prepareSprite(sprite),
            this.prepareSprite('/ship_wreckage.png').catch(() => null)
        ]);
        if (this.activeRunId !== runId) {
            return { skipped: true };
        }

        const getImpactPoint = resolveImpactPoint || this.resolveImpactPoint;

        this.clearTimers();
        this.clearStarField();
        this.clearParticles();
        this.overlayEl.classList.remove('hidden', 'is-visible', 'is-fading', 'is-flash', 'is-falling', 'is-impact');
        this.overlayEl.setAttribute('aria-hidden', 'false');
        this.overlayEl.classList.add('is-active');

        this.shipEl.src = assetUrl(preparedSprite);
        this.wreckEl.src = assetUrl(preparedWreck ?? preparedSprite);
        this.shipEl.style.opacity = '0';
        this.shipEl.style.transition = 'none';
        this.wreckEl.classList.add('hidden');

        const overlayRect = this.overlayEl.getBoundingClientRect();
        const impact = this.clampImpactPoint(getImpactPoint?.(), overlayRect);
        const startX = overlayRect.width * 0.52;
        const startY = -overlayRect.height * 0.24;

        this.positionElement(this.shipEl, startX, startY, 'translate(-50%, -50%) rotate(0deg) scale(0.4)');
        this.positionElement(this.wreckEl, impact.x, impact.y, 'translate(-50%, -50%) rotate(22deg) scale(1.05)');

        window.addEventListener('keydown', this.handleSkipKey);

        this.queue(runId, 30, () => {
            this.overlayEl.classList.add('is-visible');
        });

        this.queue(runId, CUTSCENE_TIMING.overlayInMs, () => {
            this.shipEl.style.transition = `opacity ${CUTSCENE_TIMING.shipFadeInMs}ms ease-out`;
            this.shipEl.style.opacity = '1';
        });

        this.queue(runId, CUTSCENE_TIMING.shipFallStartMs, () => {
            window.AudioManager?.play('amb_metal_stress1', {
                volume: 0.6,
                playbackRate: 1.15,
                bus: 'world',
                varyPitch: false
            });
            this.shipEl.style.transition = [
                `left ${CUTSCENE_TIMING.shipFallDurationMs}ms cubic-bezier(0.2, 0.75, 0.25, 1)`,
                `top ${CUTSCENE_TIMING.shipFallDurationMs}ms cubic-bezier(0.2, 0.75, 0.25, 1)`,
                `transform ${CUTSCENE_TIMING.shipFallDurationMs}ms cubic-bezier(0.2, 0.75, 0.25, 1)`
            ].join(', ');
            this.positionElement(this.shipEl, impact.x, impact.y, 'translate(-50%, -50%) rotate(540deg) scale(0.9)');
            this.overlayEl.classList.add('is-falling');
            this.startStarField(runId, overlayRect.width, overlayRect.height);
        });

        this.queue(runId, CUTSCENE_TIMING.impactMs, () => {
            this.triggerImpact(impact);
        });

        this.queue(runId, CUTSCENE_TIMING.fadeOutMs, () => {
            this.overlayEl.classList.add('is-fading');
        });

        return new Promise((resolve) => {
            this.resolveRun = resolve;
            this.queue(runId, CUTSCENE_TIMING.finishMs, () => {
                this.finishRun(runId, false);
            });
        });
    }

    finishActiveRun(skipped = true) {
        if (!this.activeRunId) return;
        this.finishRun(this.activeRunId, skipped);
    }

    finishRun(runId, skipped = false) {
        if (this.activeRunId !== runId) return;

        this.clearTimers();
        this.stopStarField();
        this.clearStarField();
        this.clearParticles();
        window.removeEventListener('keydown', this.handleSkipKey);

        if (this.viewportEl) {
            this.viewportEl.classList.remove('cutscene-shake');
        }

        this.overlayEl.classList.remove('is-active', 'is-visible', 'is-fading', 'is-flash', 'is-falling', 'is-impact');
        this.overlayEl.classList.add('hidden');
        this.overlayEl.setAttribute('aria-hidden', 'true');

        this.shipEl.style.transition = 'none';
        this.shipEl.style.opacity = '0';
        this.wreckEl.classList.add('hidden');

        this.activeRunId = 0;
        const resolve = this.resolveRun;
        this.resolveRun = null;
        resolve?.({ skipped });
    }

    triggerImpact(impact) {
        this.stopStarField();
        this.overlayEl.classList.add('is-flash');
        this.overlayEl.classList.add('is-impact');
        window.AudioManager?.play('door_slam_vertical', { volume: 0.48, bus: 'world' });
        window.AudioManager?.play('ui_error', { volume: 0.4, bus: 'sfx' });
        window.AudioManager?.play('amb_metal_stress2', { volume: 0.3, bus: 'world' });

        if (this.viewportEl) {
            this.viewportEl.classList.add('cutscene-shake');
            this.queue(this.activeRunId, 420, () => {
                this.viewportEl.classList.remove('cutscene-shake');
            });
        }

        this.shipEl.style.opacity = '0';
        this.wreckEl.classList.remove('hidden');
        this.positionElement(this.wreckEl, impact.x, impact.y, 'translate(-50%, -50%) rotate(22deg) scale(1.05)');

        this.spawnDebris(impact.x, impact.y);
        this.spawnDust(impact.x, impact.y);

        this.queue(this.activeRunId, 90, () => {
            this.overlayEl.classList.remove('is-flash');
        });
        this.queue(this.activeRunId, 360, () => {
            this.overlayEl.classList.remove('is-impact');
        });
    }

    spawnDebris(originX, originY) {
        for (let i = 0; i < 14; i++) {
            const particle = document.createElement('div');
            particle.className = 'debris-particle';
            particle.style.left = `${originX}px`;
            particle.style.top = `${originY}px`;
            particle.style.setProperty('--dx', `${(Math.random() - 0.5) * 190}px`);
            particle.style.setProperty('--dy', `${-40 - Math.random() * 120}px`);
            particle.style.setProperty('--rot', `${(Math.random() - 0.5) * 520}deg`);
            particle.style.setProperty('--size', `${4 + Math.random() * 8}px`);
            particle.style.animationDuration = `${420 + Math.random() * 240}ms`;
            this.particlesEl.appendChild(particle);
            this.queue(this.activeRunId, 820, () => particle.remove());
        }
    }

    spawnDust(originX, originY) {
        for (let i = 0; i < 18; i++) {
            const dust = document.createElement('div');
            dust.className = 'cutscene-dust';
            dust.style.left = `${originX}px`;
            dust.style.top = `${originY}px`;
            dust.style.setProperty('--dx', `${(Math.random() - 0.5) * 160}px`);
            dust.style.setProperty('--dy', `${(Math.random() - 0.5) * 80}px`);
            dust.style.setProperty('--size', `${12 + Math.random() * 26}px`);
            dust.style.animationDuration = `${560 + Math.random() * 280}ms`;
            this.particlesEl.appendChild(dust);
            this.queue(this.activeRunId, 1100, () => dust.remove());
        }
    }

    clearParticles() {
        if (!this.particlesEl) return;
        this.particlesEl.replaceChildren();
    }

    clearStarField() {
        if (!this.starfieldEl) return;
        this.starfieldEl.replaceChildren();
    }

    startStarField(runId, width, height) {
        this.stopStarField();
        this.clearStarField();

        const spawn = () => {
            if (this.activeRunId !== runId || !this.starfieldEl) return;
            for (let index = 0; index < STREAM_STAR_BATCH; index++) {
                this.spawnStar(width, height);
            }
        };

        for (let index = 0; index < INITIAL_STAR_COUNT; index++) {
            this.spawnStar(width, height);
        }

        this.starStreamTimer = window.setInterval(spawn, STREAM_STAR_INTERVAL_MS);
    }

    stopStarField() {
        if (!this.starStreamTimer) return;
        window.clearInterval(this.starStreamTimer);
        this.starStreamTimer = 0;
    }

    spawnStar(width, height) {
        if (!this.starfieldEl) return;
        const star = document.createElement('div');
        star.className = 'cutscene-far-star';
        star.style.left = `${Math.random() * width}px`;
        star.style.top = `${Math.random() * (height * 0.96)}px`;
        star.style.setProperty('--dx', `${(Math.random() - 0.5) * 360}px`);
        star.style.setProperty('--dy', `${-140 - Math.random() * 320}px`);
        star.style.setProperty('--angle', `${(Math.random() - 0.5) * 14}deg`);
        star.style.setProperty('--length', `${8 + Math.random() * 20}px`);
        star.style.setProperty('--thickness', `${1 + Math.random() * 1.5}px`);
        star.style.setProperty('--alpha', `${0.65 + Math.random() * 0.35}`);
        star.style.animationDuration = `${480 + Math.random() * 320}ms`;
        this.starfieldEl.appendChild(star);

        this.queue(this.activeRunId, 960, () => {
            star.remove();
        });
    }

    queue(runId, delayMs, fn) {
        const timer = window.setTimeout(() => {
            if (this.activeRunId !== runId) return;
            fn();
        }, delayMs);
        this.timers.push(timer);
    }

    clearTimers() {
        for (const timer of this.timers) {
            window.clearTimeout(timer);
        }
        this.timers.length = 0;
    }

    async prepareSprite(spritePath) {
        const cached = this.spriteCache.get(spritePath);
        if (cached) {
            return cached;
        }

        const prepared = new Promise((resolve) => {
            const image = new Image();
            image.decoding = 'async';

            image.onload = () => {
                const width = image.naturalWidth || image.width;
                const height = image.naturalHeight || image.height;
                if (!width || !height) {
                    resolve(spritePath);
                    return;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext('2d', { willReadFrequently: true });
                if (!context) {
                    resolve(spritePath);
                    return;
                }

                context.drawImage(image, 0, 0);
                const frame = context.getImageData(0, 0, width, height);
                const pixels = frame.data;

                for (let i = 0; i < pixels.length; i += 4) {
                    const alpha = pixels[i + 3];
                    if (alpha === 0) continue;

                    const maxChannel = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
                    if (maxChannel <= 28) {
                        pixels[i + 3] = 0;
                        continue;
                    }

                    if (maxChannel < 56) {
                        pixels[i + 3] = Math.round(alpha * 0.35);
                    }
                }

                context.putImageData(frame, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };

            image.onerror = () => resolve(spritePath);
            image.src = assetUrl(spritePath);
        });

        this.spriteCache.set(spritePath, prepared);
        return prepared;
    }

    clampImpactPoint(point, rect) {
        const fallback = {
            x: rect.width * 0.5,
            y: rect.height * 0.64
        };

        if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
            return fallback;
        }

        return {
            x: Math.min(rect.width * 0.9, Math.max(rect.width * 0.1, point.x)),
            y: Math.min(rect.height * 0.86, Math.max(rect.height * 0.24, point.y))
        };
    }

    positionElement(element, x, y, transform) {
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        element.style.transform = transform;
    }
}
import { assetUrl } from './assetUrl.js';
