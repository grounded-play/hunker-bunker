function clampPercent(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(100, numeric));
}

function clampHearts(value, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(0, Math.floor(numeric));
}

export class VitalsHUD {
    constructor({
        root = document,
        panelId = 'vitals-panel',
        heartsId = 'vitals-hearts',
        o2BarId = 'vitals-o2-bar',
        o2PctId = 'vitals-o2-pct',
        o2LabelId = 'vitals-o2-label'
    } = {}) {
        this.root = root;
        this.panel = root.getElementById(panelId);
        this.heartsEl = root.getElementById(heartsId);
        this.o2BarEl = root.getElementById(o2BarId);
        this.o2PctEl = root.getElementById(o2PctId);
        this.o2LabelEl = root.getElementById(o2LabelId);

        this.state = {
            hp: 3,
            maxHp: 3,
            o2: 100,
            bubbleActive: false
        };

        this.handleHealth = this.handleHealth.bind(this);
        this.handleO2 = this.handleO2.bind(this);

        if (this.panel && this.heartsEl && this.o2BarEl && this.o2PctEl) {
            window.addEventListener('player-health-changed', this.handleHealth);
            window.addEventListener('player-o2-changed', this.handleO2);
            this.render();
        }
    }

    handleHealth(event) {
        const detail = event?.detail ?? {};
        this.state.maxHp = clampHearts(detail.maxHp, this.state.maxHp);
        this.state.hp = clampHearts(detail.hp, this.state.hp);
        this.renderHearts();
    }

    handleO2(event) {
        const detail = event?.detail ?? {};
        this.state.o2 = clampPercent(detail.o2 ?? this.state.o2);
        if (typeof detail.bubbleActive === 'boolean') {
            this.state.bubbleActive = detail.bubbleActive;
        }
        this.renderO2();
    }

    render() {
        this.renderHearts();
        this.renderO2();
    }

    renderHearts() {
        if (!this.heartsEl) return;

        const hp = Math.max(0, Math.min(this.state.maxHp, this.state.hp));
        this.heartsEl.replaceChildren();

        for (let i = 0; i < this.state.maxHp; i++) {
            const heart = document.createElement('span');
            const filled = i < hp;
            heart.className = `heart ${filled ? 'heart--full' : 'heart--empty'}`;
            heart.textContent = filled ? '♥' : '♡';
            heart.setAttribute('data-index', String(i));
            this.heartsEl.appendChild(heart);
        }
    }

    renderO2() {
        if (!this.panel || !this.o2BarEl || !this.o2PctEl) return;

        const o2 = clampPercent(this.state.o2);
        this.o2BarEl.style.width = `${o2}%`;
        this.o2PctEl.textContent = `${Math.round(o2)}%`;

        const warning = o2 <= 25 && o2 > 10;
        const critical = o2 <= 10;
        const empty = o2 <= 0;

        this.panel.classList.toggle('vitals-panel--o2-warning', warning);
        this.panel.classList.toggle('vitals-panel--o2-critical', critical);
        this.panel.classList.toggle('vitals-panel--o2-empty', empty);
        this.panel.classList.toggle('vitals-panel--bubble-active', this.state.bubbleActive);
        document.body.classList.toggle('vitals-critical', critical);

        if (this.o2LabelEl) {
            this.o2LabelEl.textContent = this.state.bubbleActive ? 'O₂ ◈' : 'O₂';
        }
    }

    destroy() {
        window.removeEventListener('player-health-changed', this.handleHealth);
        window.removeEventListener('player-o2-changed', this.handleO2);
        document.body.classList.remove('vitals-critical');
    }
}
