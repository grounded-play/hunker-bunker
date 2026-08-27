/**
 * QA Nexus Machine & Unified Staging Terminal (docs/debug-gallery-and-architectural-grid-expansion-plan.md §4)
 *
 * Provides a harmonized cybernetic glassmorphism terminal for rapid 1-click
 * warp, boss encounter initialization, camp state simulation, and loadout overrides.
 */
import { openDebugMuseum } from './debugMuseum.js';
import { openDebugTileGrid } from './debugTileGrid.js';
import { openDebugBossArenas, BOSS_ENCOUNTERS } from './debugBossArenas.js';
import { openDebugCampSimulator, CAMP_SCENARIOS } from './debugCampSimulator.js';

let nexusModalEl = null;

export function createQaNexusModal() {
    if (typeof document === 'undefined') return null;
    if (document.getElementById('qa-nexus-modal')) {
        return document.getElementById('qa-nexus-modal');
    }

    const modal = document.createElement('div');
    modal.id = 'qa-nexus-modal';
    modal.className = 'modal hidden';
    modal.setAttribute('aria-hidden', 'true');

    modal.innerHTML = `
        <div class="modal-content qa-nexus-content">
            <div class="terminal-scanline"></div>
            <div class="qa-nexus-header">
                <button class="close-modal" id="close-qa-nexus">×</button>
                <div class="qa-nexus-title">⚙️ QA NEXUS // PROVING GROUNDS COMMAND</div>
                <div class="qa-nexus-subtitle">AUTONOMOUS STAGING, ARCHITECTURAL GRIDS &amp; BOSS LABS</div>
            </div>

            <!-- Live Telemetry Badge Strip -->
            <div class="qa-nexus-telemetry">
                <span class="qa-telemetry-pill" id="qa-pill-coords">LOC: (0.0, 0.0)</span>
                <span class="qa-telemetry-pill" id="qa-pill-noclip">NOCLIP: OFF</span>
                <span class="qa-telemetry-pill" id="qa-pill-god">GOD: OFF</span>
                <span class="qa-telemetry-pill" id="qa-pill-ammo">AMMO: NORMAL</span>
                <span class="qa-telemetry-pill" id="qa-pill-hp">HP: 100/100</span>
            </div>

            <div class="qa-nexus-body">
                <!-- Column 1: Proving Ground Wings -->
                <div class="qa-nexus-section">
                    <div class="qa-section-header">🏛️ QA PROVING GROUNDS (5 WINGS)</div>
                    <div class="qa-card-grid">
                        <button class="qa-card-btn" id="qa-btn-wing1">
                            <span class="qa-card-icon">🏛️</span>
                            <div class="qa-card-info">
                                <div class="qa-card-title">Wing 1: Solo Colonnade</div>
                                <div class="qa-card-desc">Straight blank stage with static forward models</div>
                            </div>
                        </button>
                        <button class="qa-card-btn" id="qa-btn-showroom">
                            <span class="qa-card-icon">🏢</span>
                            <div class="qa-card-info">
                                <div class="qa-card-title">4-Wall Orientation Showroom</div>
                                <div class="qa-card-desc">Isometric 4-wall rotation & lighting stall grid</div>
                            </div>
                        </button>
                        <button class="qa-card-btn" id="qa-btn-wing2">
                            <span class="qa-card-icon">📐</span>
                            <div class="qa-card-info">
                                <div class="qa-card-title">Wing 2: Architectural Grid</div>
                                <div class="qa-card-desc">32m demo grid, canyon edges, rooms & doors</div>
                            </div>
                        </button>
                        <button class="qa-card-btn" id="qa-btn-wing3">
                            <span class="qa-card-icon">⚔️</span>
                            <div class="qa-card-info">
                                <div class="qa-card-title">Wing 3: Boss Arenas</div>
                                <div class="qa-card-desc">5 live boss encounters with phase selectors</div>
                            </div>
                        </button>
                        <button class="qa-card-btn" id="qa-btn-wing4">
                            <span class="qa-card-icon">⛺</span>
                            <div class="qa-card-info">
                                <div class="qa-card-title">Wing 4: Camp Testing Lab</div>
                                <div class="qa-card-desc">4 camp outpost lifecycle states & sieges</div>
                            </div>
                        </button>
                        <button class="qa-card-btn qa-card-btn--accent" id="qa-btn-spawn">
                            <span class="qa-card-icon">🚀</span>
                            <div class="qa-card-info">
                                <div class="qa-card-title">Bunker Crash Origin</div>
                                <div class="qa-card-desc">Return to spawn tile (0, 0)</div>
                            </div>
                        </button>
                    </div>
                </div>

                <!-- Column 2: Live Scenario Triggers & Cheats -->
                <div class="qa-nexus-section">
                    <div class="qa-section-header">⚡ QUICK CHEATS &amp; TRAVERSAL</div>
                    <div class="qa-btn-row">
                        <button class="qa-action-btn qa-action-btn--cyan" id="qa-cheat-noclip">👻 NOCLIP (3.5x FLY)</button>
                        <button class="qa-action-btn" id="qa-cheat-god">⚡ GOD MODE</button>
                        <button class="qa-action-btn qa-action-btn--amber" id="qa-cheat-ammo">♾️ UNLIMITED AMMO</button>
                        <button class="qa-action-btn" id="qa-cheat-heal">❤️ FULL HEAL</button>
                        <button class="qa-action-btn qa-action-btn--amber" id="qa-cheat-res">💎 +999K$ SALVAGE &amp; SHELLS</button>
                        <button class="qa-action-btn qa-action-btn--red" id="qa-cheat-nuke">💥 PURGE ENEMIES</button>
                    </div>

                    <div class="qa-section-header" style="margin-top: 14px;">👑 BOSS ARENA JUMP</div>
                    <div class="qa-mini-list">
                        ${BOSS_ENCOUNTERS.map(b => `
                            <button class="qa-mini-btn" data-boss-index="${b.index}">
                                ⚔️ ${b.name} (${b.phases.length} Phases)
                            </button>
                        `).join('')}
                    </div>

                    <div class="qa-section-header" style="margin-top: 14px;">⛺ CAMP STATE JUMP</div>
                    <div class="qa-mini-list">
                        ${CAMP_SCENARIOS.map(c => `
                            <button class="qa-mini-btn" data-camp-index="${c.index}">
                                ⛺ ${c.name}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    nexusModalEl = modal;
    bindNexusListeners(modal);
    return modal;
}

function bindNexusListeners(modal) {
    modal.querySelector('#close-qa-nexus')?.addEventListener('click', () => closeQaNexusModal());

    // Wing Teleports
    modal.querySelector('#qa-btn-wing1')?.addEventListener('click', () => {
        closeQaNexusModal();
        void openDebugMuseum(window.game || window.threeGame);
    });

    modal.querySelector('#qa-btn-showroom')?.addEventListener('click', () => {
        closeQaNexusModal();
        // main.js's openDebugShowroom() isn't exported (module-local); the correct public
        // entry point is window.__DEBUG__.teleport('showroom'), which already calls it.
        void window.__DEBUG__?.teleport?.('showroom');
    });

    modal.querySelector('#qa-btn-wing2')?.addEventListener('click', () => {
        closeQaNexusModal();
        void openDebugTileGrid(window.game || window.threeGame);
    });

    modal.querySelector('#qa-btn-wing3')?.addEventListener('click', () => {
        closeQaNexusModal();
        void openDebugBossArenas(window.game || window.threeGame);
    });

    modal.querySelector('#qa-btn-wing4')?.addEventListener('click', () => {
        closeQaNexusModal();
        void openDebugCampSimulator(window.game || window.threeGame);
    });

    modal.querySelector('#qa-btn-spawn')?.addEventListener('click', () => {
        closeQaNexusModal();
        const game = window.game || window.threeGame;
        const spawn = game?.getSpawnTile?.() ?? { x: 0, y: 0 };
        game?.teleportPlayerTo?.(spawn.x, spawn.y);
    });

    // Cheats
    modal.querySelector('#qa-cheat-noclip')?.addEventListener('click', () => {
        const game = window.game || window.threeGame;
        if (game?.toggleNoclip) game.toggleNoclip();
        updateNexusTelemetry();
    });

    modal.querySelector('#qa-cheat-god')?.addEventListener('click', () => {
        const game = window.game || window.threeGame;
        if (game?.setGodMode) game.setGodMode(!game.godMode);
        updateNexusTelemetry();
    });

    modal.querySelector('#qa-cheat-ammo')?.addEventListener('click', () => {
        const game = window.game || window.threeGame;
        if (game?.toggleUnlimitedAmmo) {
            game.toggleUnlimitedAmmo();
        } else if (typeof window.devToggleUnlimitedAmmo === 'function') {
            window.devToggleUnlimitedAmmo();
        }
        updateNexusTelemetry();
    });

    modal.querySelector('#qa-cheat-heal')?.addEventListener('click', () => {
        const game = window.game || window.threeGame;
        game?.healPlayer?.(999);
        game?.adjustOxygen?.(999);
        updateNexusTelemetry();
    });

    modal.querySelector('#qa-cheat-res')?.addEventListener('click', () => {
        if (typeof window.devGrantResources === 'function') window.devGrantResources();
    });

    modal.querySelector('#qa-cheat-nuke')?.addEventListener('click', () => {
        const game = window.game || window.threeGame;
        game?.purgeHostiles?.();
    });

    // Boss Jump Buttons
    modal.querySelectorAll('[data-boss-index]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-boss-index'), 10);
            closeQaNexusModal();
            const game = window.game || window.threeGame;
            void openDebugBossArenas(game).then(() => {
                if (game?.player?.position) {
                    game.player.position.set(13000 + idx * 65, 0, 9500 + 20);
                }
            });
        });
    });

    // Camp Jump Buttons
    modal.querySelectorAll('[data-camp-index]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-camp-index'), 10);
            closeQaNexusModal();
            const game = window.game || window.threeGame;
            void openDebugCampSimulator(game).then(() => {
                if (game?.player?.position) {
                    game.player.position.set(15000 + idx * 65, 0, 9500 + 8);
                }
            });
        });
    });
}

export function updateNexusTelemetry() {
    if (!nexusModalEl) return;
    const game = window.game || window.threeGame;
    const px = game?.player?.position?.x ? game.player.position.x.toFixed(1) : '0.0';
    const pz = game?.player?.position?.z ? game.player.position.z.toFixed(1) : '0.0';

    const coordsPill = nexusModalEl.querySelector('#qa-pill-coords');
    if (coordsPill) coordsPill.textContent = `LOC: (${px}, ${pz})`;

    const noclipPill = nexusModalEl.querySelector('#qa-pill-noclip');
    if (noclipPill) {
        const active = Boolean(game?.noclip);
        noclipPill.textContent = `NOCLIP: ${active ? 'ON (3.5x)' : 'OFF'}`;
        noclipPill.classList.toggle('qa-pill--active', active);
    }

    const godPill = nexusModalEl.querySelector('#qa-pill-god');
    if (godPill) {
        const active = Boolean(game?.godMode);
        godPill.textContent = `GOD: ${active ? 'ON' : 'OFF'}`;
        godPill.classList.toggle('qa-pill--active', active);
    }

    const ammoPill = nexusModalEl.querySelector('#qa-pill-ammo');
    if (ammoPill) {
        const active = Boolean(game?.unlimitedAmmo);
        ammoPill.textContent = `AMMO: ${active ? 'INF' : 'NORMAL'}`;
        ammoPill.classList.toggle('qa-pill--active', active);
    }

    const hpPill = nexusModalEl.querySelector('#qa-pill-hp');
    if (hpPill) {
        const hp = Math.round(game?.playerVitals?.health ?? 100);
        const maxHp = Math.round(game?.playerVitals?.maxHp ?? 100);
        hpPill.textContent = `HP: ${hp}/${maxHp}`;
    }
}

export function openQaNexusModal() {
    createQaNexusModal();
    if (!nexusModalEl) return false;
    nexusModalEl.classList.remove('hidden');
    nexusModalEl.setAttribute('aria-hidden', 'false');
    updateNexusTelemetry();
    window.AudioManager?.play?.('ui_modal_open', { bus: 'ui', volume: 0.5 });
    return true;
}

export function closeQaNexusModal() {
    if (!nexusModalEl) return false;
    nexusModalEl.classList.add('hidden');
    nexusModalEl.setAttribute('aria-hidden', 'true');
    window.AudioManager?.play?.('ui_modal_close', { bus: 'ui', volume: 0.4 });
    return true;
}

if (typeof window !== 'undefined') {
    window.__DEBUG__ = window.__DEBUG__ || {};
    window.__DEBUG__.openNexus = openQaNexusModal;
    window.__DEBUG__.closeNexus = closeQaNexusModal;
    window.openQaNexusModal = openQaNexusModal;
    window.closeQaNexusModal = closeQaNexusModal;
}
