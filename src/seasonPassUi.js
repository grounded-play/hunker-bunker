// ── Season 0 Tactical Dossier — UI & Live Wiring ──────────────────────────
// Renders the battle pass modal and wires real gameplay events (see
// docs/armory-and-class-weapons-worklog.md for the research trail) to XP
// awards. Reward granting reuses steamVaultUi.js's sandbox inventory pattern
// and BankManager for currency so claimed rewards land in the same places
// everything else in the game reads from — not a second parallel system.
import { SeasonPassManager, TIER_REWARDS, TOTAL_TIERS, XP_PER_TIER, XP_SOURCES } from './seasonPass.js';
import { grantVaultItem } from './steamVaultUi.js';

export const seasonPass = new SeasonPassManager();
if (typeof window !== 'undefined') window.seasonPass = seasonPass;

let hudCardSeq = 0;

function showSeasonPassToast(title, blurb) {
    const stack = document.querySelector('.hud-notification-stack');
    if (!stack) return;
    const toast = document.createElement('div');
    toast.className = 'achievement-toast season-pass-toast hud-stack-card hidden';
    toast.setAttribute('aria-live', 'polite');
    toast.dataset.notificationPriority = '5';
    toast.dataset.seq = String(hudCardSeq++);
    toast.dataset.autoDismissMs = '4200';
    toast.dataset.removeDelayMs = '320';
    toast.innerHTML = `
        <div class="achievement-toast__icon">◈</div>
        <div class="achievement-toast__body">
            <div class="achievement-toast__kicker">TACTICAL DOSSIER</div>
            <div class="achievement-toast__title">${title}</div>
            <div class="achievement-toast__blurb">${blurb}</div>
        </div>
    `;
    toast.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        if (typeof window.dismissHudNotificationCard === 'function') {
            window.dismissHudNotificationCard(toast);
        } else {
            toast.remove();
        }
    });
    stack.append(toast);
    if (typeof window.updateHudNotificationDeck === 'function') window.updateHudNotificationDeck();
    toast.classList.remove('hidden');
    requestAnimationFrame(() => {
        toast.classList.add('visible');
        if (typeof window.updateHudNotificationDeck === 'function') window.updateHudNotificationDeck();
    });
}

function awardXp(amount, source, label) {
    const before = seasonPass.getCurrentTier();
    const { xpAwarded } = seasonPass.addXp(amount, source);
    if (xpAwarded <= 0) return;
    const after = seasonPass.getCurrentTier();
    showSeasonPassToast(`+${xpAwarded} XP`, label);
    if (after > before) {
        showSeasonPassToast('TIER UP', `Tactical Dossier — Tier ${after} reached.`);
    }
    updateMenuStatus();
    if (isModalOpen()) renderSeasonPassBody();
}

// Real gameplay-completion signals (window CustomEvents already fired by src/threeGame.js —
// confirmed via code inspection, not assumed from the design doc's fictional event names).
// "Daily Tactical Bounty" / "Weekly Sector Directive" XP sources from doc 04 §2 are NOT wired:
// no quest/bounty-tracking system exists anywhere in this codebase to hook, and building one
// is a separate feature (tracking + reset timers + UI) beyond battle-pass plumbing. Flagged as
// a known gap rather than faked with a wrong signal.
export function wireSeasonPassXpEvents() {
    window.addEventListener('mission-objective-complete', () => {
        awardXp(XP_SOURCES.roomCleared, 'roomCleared', 'Objective cleared.');
    });
    window.addEventListener('enemy-killed', (event) => {
        const detail = event.detail || {};
        if (detail.isBoss) {
            awardXp(XP_SOURCES.bossDefeated, 'bossDefeated', 'Sector boss terminated.');
        } else if (detail.isMilestone) {
            awardXp(XP_SOURCES.eliteNestPurged, 'eliteNestPurged', 'Elite hive nest purged.');
        }
    });
    window.addEventListener('depth-tier-changed', () => {
        awardXp(XP_SOURCES.floorCleared, 'floorCleared', 'Descended to a new sub-level.');
    });
}

function grantReward(reward) {
    if (!reward) return;
    if (reward.kind === 'item' || reward.kind === 'cache') {
        grantVaultItem(reward.itemdefid, reward.qty ?? 1);
    } else if (reward.kind === 'currency') {
        // doc 04's "Fabrication Scrap" has no matching real currency (src/bank.js only tracks
        // tech/coin/med/shells) — realized as `coin`, the closest generic spendable resource.
        window.bankManager?.deposit?.({ [reward.currency === 'scrap' ? 'coin' : reward.currency]: reward.qty });
    }
    showSeasonPassToast('REWARD CLAIMED', reward.label);
}

function isModalOpen() {
    const modal = document.getElementById('season-pass-modal');
    return Boolean(modal) && !modal.classList.contains('hidden');
}

function updateMenuStatus() {
    const status = document.getElementById('season-pass-command-status');
    if (status) status.textContent = `TIER ${seasonPass.getCurrentTier()} / ${TOTAL_TIERS}`;
}

function renderTierCard(tierNumber) {
    const row = TIER_REWARDS[tierNumber - 1];
    const currentTier = seasonPass.getCurrentTier();
    const unlocked = tierNumber <= currentTier;

    const renderSlot = (track) => {
        const reward = track === 'premium' ? row.premium : row.free;
        if (!reward) return '<div class="season-pass-slot season-pass-slot--empty">—</div>';
        const claimed = seasonPass.isClaimed(tierNumber, track);
        const canClaim = seasonPass.canClaim(tierNumber, track);
        const locked = track === 'premium' && !seasonPass.hasPremium();
        let stateClass = 'locked';
        let actionHtml = '<span class="season-pass-slot__state">LOCKED</span>';
        if (claimed) {
            stateClass = 'claimed';
            actionHtml = '<span class="season-pass-slot__state">CLAIMED</span>';
        } else if (canClaim) {
            stateClass = 'claimable';
            actionHtml = `<button class="season-pass-claim-btn" data-tier="${tierNumber}" data-track="${track}">CLAIM</button>`;
        } else if (locked) {
            actionHtml = '<span class="season-pass-slot__state">DOSSIER LOCKED</span>';
        } else if (!unlocked) {
            actionHtml = '<span class="season-pass-slot__state">NOT REACHED</span>';
        }
        return `
            <div class="season-pass-slot season-pass-slot--${track} season-pass-slot--${stateClass}">
                <div class="season-pass-slot__label">${reward.label}</div>
                ${actionHtml}
            </div>
        `;
    };

    return `
        <div class="season-pass-tier-row ${unlocked ? 'unlocked' : ''}">
            <div class="season-pass-tier-number">${tierNumber}</div>
            ${renderSlot('free')}
            ${renderSlot('premium')}
        </div>
    `;
}

function renderSeasonPassBody() {
    const body = document.getElementById('season-pass-body');
    const summary = document.getElementById('season-pass-progress-summary');
    if (!body) return;

    const progress = seasonPass.getTierProgress();
    if (summary) {
        summary.innerHTML = `
            <span class="season-pass-xp-total">${seasonPass.getTotalXp().toLocaleString()} XP</span>
            <span class="season-pass-tier-label">TIER ${progress.tier} / ${TOTAL_TIERS}</span>
            <div class="season-pass-progress-bar"><div class="season-pass-progress-fill" style="width:${Math.round(progress.fraction * 100)}%"></div></div>
            <span class="season-pass-xp-next">${progress.xpIntoTier} / ${progress.xpForNextTier || XP_PER_TIER} XP to next tier</span>
            ${!seasonPass.hasPremium() ? '<button id="season-pass-unlock-premium" class="season-pass-unlock-btn">UNLOCK CLASSIFIED DOSSIER</button>' : '<span class="season-pass-premium-active">CLASSIFIED DOSSIER ACTIVE</span>'}
        `;
        summary.querySelector('#season-pass-unlock-premium')?.addEventListener('click', () => {
            // No real payment backend reachable from this build — same sandbox-purchase
            // convention already used by src/steamVaultUi.js's store tab in dev/offline mode.
            seasonPass.setPremium(true);
            showSeasonPassToast('CLASSIFIED DOSSIER UNLOCKED', 'Premium track rewards now claimable.');
            renderSeasonPassBody();
        });
    }

    let rows = '';
    for (let t = 1; t <= TOTAL_TIERS; t++) rows += renderTierCard(t);
    body.innerHTML = `<div class="season-pass-tier-list">${rows}</div>`;

    body.querySelectorAll('.season-pass-claim-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const tier = Number(btn.dataset.tier);
            const track = btn.dataset.track;
            const reward = seasonPass.claim(tier, track);
            if (reward) grantReward(reward);
            updateMenuStatus();
            renderSeasonPassBody();
        });
    });
}

export function openSeasonPassModal() {
    const modal = document.getElementById('season-pass-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    renderSeasonPassBody();
}

export function closeSeasonPassModal() {
    const modal = document.getElementById('season-pass-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
}

export function initSeasonPassUI() {
    document.getElementById('season-pass-btn')?.addEventListener('click', openSeasonPassModal);
    document.getElementById('close-season-pass-modal')?.addEventListener('click', closeSeasonPassModal);
    document.getElementById('season-pass-modal')?.addEventListener('click', (event) => {
        if (event.target.id === 'season-pass-modal') closeSeasonPassModal();
    });
    wireSeasonPassXpEvents();
    updateMenuStatus();
}
