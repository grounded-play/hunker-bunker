/**
 * Mature Content Compliance & Reviewer Audit Suite
 * Provides Steam reviewers and compliance auditors with direct inspection of
 * mature content elements, suicide/annihilation plotlines, parasite horror, and Queen subjugation.
 * Activated via F9 shortcut, Reviewer Button, or Gamepad shortcut (LB + RB + R3).
 */

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
        tags: ['Loss of Autonomy', 'Mind Control', 'Brood Maturation', 'Dark Sci-Fi']
    },
    {
        id: 'self_annihilation',
        title: 'Self-Annihilation & Sacrificial Endings (KYS Choices)',
        rating: 'Dark Narrative / Suicide Themes',
        description: 'Contractors can choose self-annihilation to purge the spore strain rather than infect human survivor colonies (Endings: EMPTY_HUSK, SCORCHED_SKY, Reyes C11, Chen C13).',
        tags: ['Self-Annihilation', 'Sacrificial Purge', 'Bleak Narrative', 'Fatal Choices']
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
    }

    init() {
        this.bindShortcuts();
        this.bindUi();
    }

    bindShortcuts() {
        if (typeof window === 'undefined') return;

        window.addEventListener('keydown', (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                this.toggleModal();
            }
        });
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
                actionHtml = `
                    <div class="mature-audit-actions" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px;">
                        ${item.dialogueTrees.map((dt) => `
                            <button type="button" class="mature-launch-tree-btn start-btn" data-tree-id="${dt.id}" style="font-size: 10px; padding: 6px 10px;">
                                ▶ ${dt.label}
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

            container.appendChild(card);
        });
    }
}

export const matureContentAudit = new MatureContentAudit();
