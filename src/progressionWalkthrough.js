/**
 * Wing 5: Gameplay Progression Walkthrough (docs/debug-gallery-and-architectural-grid-
 * expansion-plan.md §7) — "all things in gameplay order testable." Generalizes
 * src/matureContentAudit.js's proven F9 reviewer-gallery pattern (a manifest + jump buttons)
 * to the full campaign progression instead of just mature-content beats.
 *
 * Every stage below fires a REAL, already-shipped trigger — the same dev console commands
 * (via window.__DEBUG__.runCommand, which runs the exact executeDevCommand() dispatcher the
 * console itself uses), the same teleport helper, and the same ending-cutscene/log viewer
 * logic matureContentAudit.js already uses for endings. Nothing here invents a new gameplay
 * hook — per the plan doc's scope-discipline note, a stage with no real trigger is left as a
 * documented gap, not a button that pretends to do something.
 */
import { ACT2_ENDINGS, ACT2_ENDING_CUTSCENES, getAct2EndingLines } from './act2.js';

export const PROGRESSION_MANIFEST = Object.freeze([
    {
        id: 'boot_tutorial',
        order: 1,
        title: '1. Tutorial & Boot',
        description: 'Crash cutscene, class select, mothership dialogue, skip/tutorial choice.',
        stages: [
            { kind: 'command', command: 'tp crash', label: '▶ TELEPORT: BUNKER CRASH SITE (RUN START)' }
        ]
    },
    {
        id: 'depth_tiers',
        order: 2,
        title: '2. Depth Tier Progression (0-3)',
        description: 'getDepthTier() thresholds: dist<2 chunks=Tier 0, <5=Tier 1, <9=Tier 2, else Tier 3.',
        stages: [
            { kind: 'command', command: 'tp chunk 0 0', label: '▶ JUMP: DEPTH TIER 0' },
            { kind: 'command', command: 'tp chunk 3 0', label: '▶ JUMP: DEPTH TIER 1' },
            { kind: 'command', command: 'tp chunk 7 0', label: '▶ JUMP: DEPTH TIER 2' },
            { kind: 'command', command: 'tp chunk 12 0', label: '▶ JUMP: DEPTH TIER 3' }
        ]
    },
    {
        id: 'camp_hive_discovery',
        order: 3,
        title: '3. Camp & Hive Discovery',
        description: 'First-contact reward flow at survivor camps and hive sites, using the real per-run POI list.',
        stages: [
            { kind: 'poi-category', category: 'CAMP', label: '▶ TELEPORT: NEAREST CAMP' },
            { kind: 'poi-category', category: 'HIVE', label: '▶ TELEPORT: NEAREST HIVE' }
        ]
    },
    {
        id: 'milestone_bosses',
        order: 4,
        title: '4. Milestone Bosses',
        description: 'Forces the milestone-boss-spawned event (real dev command, same one triggerDebugEvent already supports).',
        stages: [
            { kind: 'command', command: 'event milestone_boss', label: '▶ TRIGGER: MILESTONE BOSS SPAWN' }
        ]
    },
    {
        id: 'queen_and_endings',
        order: 5,
        title: '5. Queen Fight & Act 2 Endings',
        description: 'Direct jump to any of the 10 shipped Act 2 endings — same cutscene/log viewer matureContentAudit.js uses.',
        stages: Object.entries(ACT2_ENDINGS).map(([key, value]) => ({
            kind: 'ending',
            ending: value,
            label: `▶ VIEW ENDING: ${key.replace(/_/g, ' ')}`
        }))
    },
    {
        id: 'battle_pass',
        order: 6,
        title: '6. Battle Pass Tier Progression',
        description: 'Grants real XP via window.seasonPass.addXp() — 5,000 XP per tier, 50 tiers total.',
        stages: [
            { kind: 'season-xp', amount: 5000, label: '▶ GRANT: +1 TIER (5,000 XP)' },
            { kind: 'season-xp', amount: 25000, label: '▶ GRANT: +5 TIERS (25,000 XP)' },
            { kind: 'season-xp', amount: 245000, label: '▶ GRANT: MAX TIER 50 (245,000 XP)' }
        ]
    },
    {
        id: 'achievements',
        order: 7,
        title: '7. Achievements',
        description: 'Real unlock via the existing "unlock_all" / "unlock <key>" dev console commands.',
        stages: [
            { kind: 'command', command: 'unlock_all', label: '▶ UNLOCK: ALL ACHIEVEMENTS' }
        ]
    },
    {
        id: 'extraction',
        order: 8,
        title: '8. Extraction & Run End',
        description: 'Fires the same "win" debug event real gameplay dispatches on successful extraction.',
        stages: [
            { kind: 'command', command: 'event win', label: '▶ TRIGGER: SUCCESSFUL EXTRACTION' }
        ]
    }
]);

export class ProgressionWalkthrough {
    constructor() {
        this.isOpen = false;
        this.manifest = PROGRESSION_MANIFEST;
    }

    init() {
        if (typeof window === 'undefined') return;
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F10') {
                e.preventDefault();
                this.toggleModal();
            }
        });
        document.getElementById('close-progression-walkthrough-modal')?.addEventListener('click', () => this.closeModal());
    }

    toggleModal() {
        if (this.isOpen) this.closeModal();
        else this.openModal();
    }

    openModal() {
        this.isOpen = true;
        const modal = document.getElementById('progression-walkthrough-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        this.renderManifest();
    }

    closeModal() {
        this.isOpen = false;
        this.closeSceneViewer();
        const modal = document.getElementById('progression-walkthrough-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }

    renderManifest() {
        const container = document.getElementById('progression-walkthrough-list');
        if (!container) return;
        container.innerHTML = '';

        for (const category of PROGRESSION_MANIFEST) {
            const card = document.createElement('div');
            card.className = 'mature-audit-card';
            card.innerHTML = `
                <div class="mature-audit-card__header">
                    <div class="mature-audit-card__title">${category.title}</div>
                </div>
                <div class="mature-audit-card__desc">${category.description}</div>
                <div class="mature-audit-actions" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px;"></div>
            `;
            const actionsEl = card.querySelector('.mature-audit-actions');
            for (const stage of category.stages) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'progression-stage-btn start-btn';
                btn.style.cssText = 'font-size: 10px; padding: 6px 10px;';
                btn.textContent = stage.label;
                btn.addEventListener('click', () => this.runStage(stage));
                actionsEl.appendChild(btn);
            }
            container.appendChild(card);
        }
    }

    runStage(stage) {
        const game = window.game;
        switch (stage.kind) {
            case 'command':
                window.__DEBUG__?.runCommand?.(stage.command);
                break;
            case 'poi-category': {
                const pois = game?.getDebugPointsOfInterest?.() ?? [];
                const match = pois.find((p) => p.category === stage.category);
                if (match) window.__DEBUG__?.teleport?.({ x: match.x, z: match.z });
                else console.warn(`[progression-walkthrough] no ${stage.category} POI found in the current run`);
                break;
            }
            case 'season-xp':
                window.seasonPass?.addXp?.(stage.amount, 'progressionWalkthrough');
                break;
            case 'ending':
                this.playEnding(stage.ending);
                break;
            default:
                console.warn('[progression-walkthrough] unknown stage kind', stage);
        }
    }

    // Mirrors matureContentAudit.js's playScene() for endings exactly — same cutscene path
    // convention, same text-fallback behavior — reused rather than reimplemented.
    playEnding(ending) {
        this.closeSceneViewer();
        const overlay = document.createElement('div');
        overlay.id = 'progression-scene-viewer';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.92);'
            + 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;';

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '× CLOSE SCENE VIEWER';
        closeBtn.className = 'close-modal';
        closeBtn.style.cssText = 'position:absolute;top:16px;right:16px;font-size:14px;padding:8px 14px;';
        closeBtn.addEventListener('click', () => this.closeSceneViewer());
        overlay.appendChild(closeBtn);

        const cutsceneId = ACT2_ENDING_CUTSCENES[ending];
        const video = document.createElement('video');
        video.src = `/cutscenes/${cutsceneId}.webm`;
        video.poster = `/cutscenes/${cutsceneId}-poster.jpg`;
        video.controls = true;
        video.autoplay = true;
        video.style.cssText = 'max-width:90vw;max-height:70vh;';
        video.addEventListener('error', () => {
            video.remove();
            const panel = document.createElement('pre');
            panel.style.cssText = 'max-width:70ch;white-space:pre-wrap;color:#e8e8e8;font-family:inherit;'
                + 'font-size:15px;line-height:1.6;background:rgba(255,255,255,0.05);padding:24px;border-radius:6px;';
            panel.textContent = getAct2EndingLines(ending).join('\n\n');
            overlay.appendChild(panel);
        });
        overlay.appendChild(video);

        document.body.appendChild(overlay);
    }

    closeSceneViewer() {
        document.getElementById('progression-scene-viewer')?.remove();
    }
}

export const progressionWalkthrough = new ProgressionWalkthrough();
