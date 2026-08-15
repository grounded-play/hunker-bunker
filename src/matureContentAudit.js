/**
 * Mature Content Compliance & Reviewer Audit Suite
 * Provides Steam reviewers and compliance auditors with direct inspection of
 * mature content elements, suicide/annihilation plotlines, parasite horror, and Queen subjugation.
 * Activated via F9 shortcut, Reviewer Button, or Gamepad shortcut (LB + RB + R3).
 */

import { ACT2_ENDINGS, ACT2_ENDING_CUTSCENES, getAct2EndingLines } from './act2.js';

// Static copies of the two audio-log letters Valve's suicide/self-sacrifice
// category maps to. Duplicated here (rather than imported from threeGame.js)
// so this reviewer tool has no runtime dependency on the live game/log state.
const REVIEWER_LOG_LETTERS = Object.freeze({
    reyes_c11: {
        label: 'LOG C11 — PVT. M. REYES (FAREWELL LETTER)',
        text: 'To my sister:\nI don\'t think I\'m making it out of here.\nThe Mothership knows what\'s happening. They always know.\nDon\'t let them tell you it was an accident.\n— Pvt. M. Reyes'
    },
    chen_b03: {
        label: 'LOG B03 — DIRECTOR CHEN (SEALED TERMINAL)',
        text: 'TO WHOEVER FINDS THIS:\n\nYou were not sent here to rescue us.\nThe signal doesn\'t need the antenna — it needs a body.\n\nThe Mothership has known about 0047 for eleven years.\nThey wanted to study it. We were the researchers.\nWhen things went wrong, they needed it contained.\nYou are the containment.\n\nThree ships. One carries the tracking signal.\nOne carries the relay.\nOne carries the weapon.\n\nThe Mothership doesn\'t care which of you survives.\nThey only care that the signal reaches 0047.\n\nBurn it all down if you can.\nGet out before the antenna finishes.\nWhatever you do — don\'t let 0047 answer.\n\n— Director Chen, sealed personal terminal.\n   Authenticated: 2047-08-14 23:44:07'
    }
});

export const MATURE_CONTENT_MANIFEST = Object.freeze([
    {
        id: 'sensual_storylines_romance',
        title: 'Sensual Storylines, Camp Romance & Erotic Intimacy',
        rating: 'Adult / Mature (18+) Romance',
        description: 'Interactive branching dialogue trees with camp leaders and entities featuring intense physical and emotional intimacy, thermal shelter body heat, seductive touch, erotic bio-link synchronization, and sensual spore massages.',
        tags: ['Erotic Sci-Fi', 'Sensual Choices', 'Camp Romance', 'Intimate Touch', 'Adult Themes'],
        dialogueTrees: [
            { id: 'sister_val', label: '🩸 SISTER VAL (TALLOW FLESH COMMUNION)' },
            { id: 'commander_briggs', label: '🛡️ BRIGGS (VESPER COMBAT ADRENALINE)' },
            { id: 'overseer_kaelen', label: '⚡ KAELEN (MERIDIAN BIO-LINK OVERCLOCK)' },
            { id: 'aria_queen_mimic', label: '👑 ARIA (HIVE QUEEN SEDUCTIVE MIMIC)' },
            { id: 'dr_nahl', label: '🧬 DR. NAHL (BIO-RESONANT RENEGADE SYMBIOSIS)' }
        ]
    },
    {
        id: 'parasite_symbiosis',
        title: 'Biological Parasitism & Seductive Alien Mimicry',
        rating: 'Mature / Sci-Fi Horror',
        description: 'Alien entities mimic human physiology and vocal registers to lure and manipulate contractors. Includes biological spore infection, neural takeover, and physical body horror transformation.',
        tags: ['Biological Horror', 'Alien Seduction / Deceit', 'Body Transformation', 'Neural Symbiosis']
    },
    {
        id: 'queen_subjugation',
        title: 'Queen Mind Subjugation (Brood Transformation)',
        rating: 'Psychological Horror / Domination',
        description: 'Surrendering to the Hive Queen leads to full loss of autonomy, neural subjugation, and transformation into a brood guardian entity (Ending: FULL_BROOD).',
        tags: ['Loss of Autonomy', 'Mind Control', 'Brood Maturation', 'Dark Sci-Fi'],
        scenes: [
            { kind: 'ending', ending: ACT2_ENDINGS.FULL_BROOD, label: '▶ VIEW CINEMATIC: FULL BROOD (QUEEN WILL-CRUSH)' }
        ]
    },
    {
        id: 'self_annihilation',
        title: 'Self-Annihilation & Sacrificial Endings (KYS Choices)',
        rating: 'Dark Narrative / Suicide Themes',
        description: 'Contractors can choose self-annihilation to purge the spore strain rather than infect human survivor colonies (Endings: EMPTY_HUSK, SCORCHED_SKY, Reyes C11, Chen B03).',
        tags: ['Self-Annihilation', 'Sacrificial Purge', 'Bleak Narrative', 'Fatal Choices'],
        scenes: [
            { kind: 'ending', ending: ACT2_ENDINGS.EMPTY_HUSK, label: '▶ VIEW ENDING: EMPTY HUSK (DYING ALONE IN THE DARK)' },
            { kind: 'ending', ending: ACT2_ENDINGS.SCORCHED_SKY, label: '▶ VIEW ENDING: SCORCHED SKY (PURGE & DRIFT)' },
            { kind: 'log', log: 'reyes_c11', label: '▶ VIEW LOG: PVT. REYES\' FAREWELL LETTER (C11)' },
            { kind: 'log', log: 'chen_b03', label: '▶ VIEW LOG: DIRECTOR CHEN\'S SEALED TERMINAL (B03)' }
        ]
    },
    {
        id: 'combat_violence',
        title: 'Combat Violence, Acid Burns & Biological Dismemberment',
        rating: 'Violence / Gore',
        description: 'Close-quarters ballistic combat against biomechanical abominations, acid burns, splatter, and corpse disintegration.',
        tags: ['Blood & Splatter', 'Acid Burns', 'Dismemberment', 'Ballistic Trauma']
    }
]);

export class MatureContentAudit {
    constructor() {
        this.isOpen = false;
        this._gamepadComboHeld = false;
        this._gamepadPollRaf = null;
    }

    init() {
        this.bindShortcuts();
        this.bindUi();
        this.bindGamepadShortcut();
    }

    bindShortcuts() {
        if (typeof window === 'undefined') return;

        window.addEventListener('keydown', (e) => {
            if (e.key === 'F9' || (e.ctrlKey && (e.key === 'm' || e.key === 'M'))) {
                e.preventDefault();
                this.toggleModal();
            }
        });
    }

    // LB + RB + Right Stick Click (R3): standard Gamepad API button indices
    // 4 (left shoulder), 5 (right shoulder), 11 (right stick click).
    bindGamepadShortcut() {
        if (typeof window === 'undefined' || typeof navigator?.getGamepads !== 'function') return;

        const poll = () => {
            const pads = navigator.getGamepads?.() ?? [];
            const comboPressed = Array.from(pads).some((gp) => {
                if (!gp?.connected || !gp.buttons) return false;
                return gp.buttons[4]?.pressed && gp.buttons[5]?.pressed && gp.buttons[11]?.pressed;
            });

            if (comboPressed && !this._gamepadComboHeld) {
                this._gamepadComboHeld = true;
                this.toggleModal();
            } else if (!comboPressed && this._gamepadComboHeld) {
                this._gamepadComboHeld = false;
            }

            this._gamepadPollRaf = window.requestAnimationFrame(poll);
        };

        this._gamepadPollRaf = window.requestAnimationFrame(poll);
    }

    bindUi() {
        if (typeof document === 'undefined') return;

        const closeBtn = document.getElementById('close-mature-audit-modal');
        closeBtn?.addEventListener('click', () => this.closeModal());

        const openBtn = document.getElementById('open-mature-audit-btn');
        openBtn?.addEventListener('click', () => this.openModal());
    }

    toggleModal() {
        if (this.isOpen) {
            this.closeModal();
        } else {
            this.openModal();
        }
    }

    openModal() {
        this.isOpen = true;
        if (typeof document === 'undefined') return;
        const modal = document.getElementById('mature-content-audit-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        this.renderManifest();
    }

    closeModal() {
        this.isOpen = false;
        this.closeSceneViewer();
        if (typeof document === 'undefined') return;
        const modal = document.getElementById('mature-content-audit-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }

    renderManifest() {
        const container = document.getElementById('mature-audit-list');
        if (!container) return;
        container.innerHTML = '';

        MATURE_CONTENT_MANIFEST.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'mature-audit-card';

            let actionHtml = '';
            if (Array.isArray(item.dialogueTrees)) {
                actionHtml += `
                    <div class="mature-audit-actions" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px;">
                        ${item.dialogueTrees.map((dt) => `
                            <button type="button" class="mature-launch-tree-btn start-btn" data-tree-id="${dt.id}" style="font-size: 10px; padding: 6px 10px;">
                                ▶ ${dt.label}
                            </button>
                        `).join('')}
                    </div>
                `;
            }
            if (Array.isArray(item.scenes)) {
                actionHtml += `
                    <div class="mature-audit-actions" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px;">
                        ${item.scenes.map((scene, idx) => `
                            <button type="button" class="mature-launch-scene-btn start-btn" data-scene-idx="${idx}" style="font-size: 10px; padding: 6px 10px;">
                                ${scene.label}
                            </button>
                        `).join('')}
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="mature-audit-card__header">
                    <div class="mature-audit-card__title">${item.title}</div>
                    <div class="mature-audit-card__rating">${item.rating}</div>
                </div>
                <div class="mature-audit-card__desc">${item.description}</div>
                <div class="mature-audit-card__tags">
                    ${item.tags.map((t) => `<span class="mature-audit-tag">${t}</span>`).join('')}
                </div>
                ${actionHtml}
            `;

            card.querySelectorAll('.mature-launch-tree-btn').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    const treeId = e.currentTarget.getAttribute('data-tree-id');
                    this.closeModal();
                    if (typeof window !== 'undefined' && window.openNpcDialogueTree) {
                        window.openNpcDialogueTree(treeId);
                    }
                });
            });

            card.querySelectorAll('.mature-launch-scene-btn').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    const idx = Number(e.currentTarget.getAttribute('data-scene-idx'));
                    this.playScene(item.scenes[idx]);
                });
            });

            container.appendChild(card);
        });
    }

    // Renders an ending's cutscene (if a video asset exists) or its dialogue
    // lines / log letter text as a fullscreen reviewer overlay.
    playScene(scene) {
        if (typeof document === 'undefined' || !scene) return;

        this.closeSceneViewer();

        const overlay = document.createElement('div');
        overlay.id = 'mature-audit-scene-viewer';
        overlay.className = 'mature-audit-scene-viewer';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.92);'
            + 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;';

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '× CLOSE SCENE VIEWER';
        closeBtn.className = 'close-modal';
        closeBtn.style.cssText = 'position:absolute;top:16px;right:16px;font-size:14px;padding:8px 14px;';
        closeBtn.addEventListener('click', () => this.closeSceneViewer());
        overlay.appendChild(closeBtn);

        if (scene.kind === 'ending') {
            const cutsceneId = ACT2_ENDING_CUTSCENES[scene.ending];
            const video = document.createElement('video');
            video.src = `/cutscenes/${cutsceneId}.webm`;
            video.poster = `/cutscenes/${cutsceneId}-poster.jpg`;
            video.controls = true;
            video.autoplay = true;
            video.style.cssText = 'max-width:90vw;max-height:70vh;';
            video.addEventListener('error', () => {
                // No rendered cutscene asset for this ending (e.g. text-only
                // endings like EMPTY_HUSK) — fall back to the ending's copy.
                video.remove();
                overlay.appendChild(this._buildTextPanel(getAct2EndingLines(scene.ending).join('\n\n')));
            });
            overlay.appendChild(video);
        } else if (scene.kind === 'log') {
            const letter = REVIEWER_LOG_LETTERS[scene.log];
            overlay.appendChild(this._buildTextPanel(letter?.text ?? '', letter?.label));
        }

        document.body.appendChild(overlay);
        this._sceneViewerEl = overlay;
    }

    _buildTextPanel(text, label) {
        const panel = document.createElement('pre');
        panel.className = 'mature-audit-scene-text';
        panel.style.cssText = 'max-width:70ch;white-space:pre-wrap;color:#e8e8e8;font-family:inherit;'
            + 'font-size:15px;line-height:1.6;background:rgba(255,255,255,0.05);padding:24px;border-radius:6px;';
        panel.textContent = label ? `${label}\n\n${text}` : text;
        return panel;
    }

    closeSceneViewer() {
        if (typeof document === 'undefined') return;
        const existing = document.getElementById('mature-audit-scene-viewer');
        existing?.remove();
        this._sceneViewerEl = null;
    }
}

export const matureContentAudit = new MatureContentAudit();
