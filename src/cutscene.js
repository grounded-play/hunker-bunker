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

export class CutsceneManager {
    constructor({
        overlayId = 'cutscene-overlay',
        shipId = 'cutscene-ship',
        wreckId = 'cutscene-wreck',
        particlesId = 'cutscene-particles',
        viewportId = 'game-viewport',
        resolveImpactPoint = null
    } = {}) {
        this.overlayEl = document.getElementById(overlayId);
        this.shipEl = document.getElementById(shipId);
        this.wreckEl = document.getElementById(wreckId);
        this.particlesEl = document.getElementById(particlesId);
        this.viewportEl = document.getElementById(viewportId);
        this.resolveImpactPoint = resolveImpactPoint;

        this.runId = 0;
        this.activeRunId = 0;
        this.resolveRun = null;
        this.timers = [];
        this.allowSkip = true;
        this.handleSkipKey = (event) => {
            if (!this.allowSkip) return;
            if (event.code !== 'Escape' && event.code !== 'Space') return;
            event.preventDefault();
            this.finishActiveRun(true);
        };
    }

    play({ playerType = 'SCOUT', allowSkip = true, resolveImpactPoint = null } = {}) {
        if (!this.overlayEl || !this.shipEl || !this.wreckEl || !this.particlesEl) {
            return Promise.resolve({ skipped: false });
        }

        this.finishActiveRun(true);

        const runId = ++this.runId;
        this.activeRunId = runId;
        this.allowSkip = allowSkip;

        const sprite = SHIP_SPRITES[playerType] ?? SHIP_SPRITES.SCOUT;
        const getImpactPoint = resolveImpactPoint || this.resolveImpactPoint;

        this.clearTimers();
        this.clearParticles();
        this.overlayEl.classList.remove('hidden', 'is-visible', 'is-fading', 'is-flash');
        this.overlayEl.setAttribute('aria-hidden', 'false');
        this.overlayEl.classList.add('is-active');

        this.shipEl.src = sprite;
        this.wreckEl.src = sprite;
        this.shipEl.style.opacity = '0';
        this.shipEl.style.transition = 'none';
        this.wreckEl.classList.add('hidden');

        const overlayRect = this.overlayEl.getBoundingClientRect();
        const impact = this.clampImpactPoint(getImpactPoint?.(), overlayRect);
        const startX = overlayRect.width * 0.52;
        const startY = -overlayRect.height * 0.24;

        this.positionElement(this.shipEl, startX, startY, 'translate(-50%, -50%) rotate(0deg) scale(0.4)');
        this.positionElement(this.wreckEl, impact.x, impact.y, 'translate(-50%, -50%) rotate(8deg) scale(0.9)');

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
        this.clearParticles();
        window.removeEventListener('keydown', this.handleSkipKey);

        if (this.viewportEl) {
            this.viewportEl.classList.remove('cutscene-shake');
        }

        this.overlayEl.classList.remove('is-active', 'is-visible', 'is-fading', 'is-flash');
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
        this.overlayEl.classList.add('is-flash');
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
        this.positionElement(this.wreckEl, impact.x, impact.y, 'translate(-50%, -50%) rotate(8deg) scale(0.9)');

        this.spawnDebris(impact.x, impact.y);
        this.spawnDust(impact.x, impact.y);

        this.queue(this.activeRunId, 90, () => {
            this.overlayEl.classList.remove('is-flash');
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
