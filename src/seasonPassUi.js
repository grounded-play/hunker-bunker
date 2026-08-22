// ── Season 0 Tactical Dossier — UI & Live Wiring ──────────────────────────
// Renders the battle pass modal and wires real gameplay events (see
// docs/armory-and-class-weapons-worklog.md for the research trail) to XP
// awards. Reward granting reuses steamVaultUi.js's sandbox inventory pattern
// and BankManager for currency so claimed rewards land in the same places
// everything else in the game reads from — not a second parallel system.
import { SeasonPassManager, TIER_REWARDS, TOTAL_TIERS, XP_PER_TIER, XP_SOURCES } from './seasonPass.js';
import { BountyManager } from './bountySystem.js';
import { getItemCatalogEntry, grantVaultItem } from './steamVaultUi.js';
import { assetUrl } from './assetUrl.js';

export const seasonPass = new SeasonPassManager();
if (typeof window !== 'undefined') window.seasonPass = seasonPass;

export const bountyManager = new BountyManager({
    onAwardXp: (amount, source, label) => {
        awardXp(amount, source, `Directive Complete: ${label}`);
    }
});
if (typeof window !== 'undefined') window.bountyManager = bountyManager;

let hudCardSeq = 0;
let activeTab = 'tiers'; // 'tiers' | 'bounties'
let recentlyCollectedKey = null;

// XP/tier-up toasts used to render the instant an event fired, regardless of
// what was on screen -- a tier-up mid-gameplay popped up over a door prompt,
// or over the intro cutscene video, since nothing gated them to a specific
// app phase. Real progress (seasonPass.addXp, in awardXp below) still
// applies immediately either way; only the visible toast is held back.
const queuedSeasonPassToasts = [];
function isSeasonPassModalOpen() {
    const modal = document.getElementById('season-pass-modal');
    return Boolean(modal) && !modal.classList.contains('hidden');
}

function showSeasonPassToast(title, blurb) {
    if (!isSeasonPassModalOpen()) {
        queuedSeasonPassToasts.push({ title, blurb });
        return;
    }
    renderSeasonPassToast(title, blurb);
}

// Called from main.js's setAppPhase once the player is actually back on the
// Season-screen feedback is kept out of gameplay, doors, and cutscenes. It is
// queued until the player opens the Season Pass modal.
export function flushQueuedSeasonPassToasts() {
    if (!isSeasonPassModalOpen() || queuedSeasonPassToasts.length === 0) return;
    const queued = queuedSeasonPassToasts.splice(0, queuedSeasonPassToasts.length);
    for (const { title, blurb } of queued) {
        renderSeasonPassToast(title, blurb);
    }
}

function renderSeasonPassToast(title, blurb) {
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

// Real gameplay-completion signals wired to XP and Bounty tracking
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

    bountyManager.wireGameEvents();

    window.addEventListener('bounty-completed', (event) => {
        const bounty = event.detail?.bounty;
        if (bounty) {
            showSeasonPassToast('DIRECTIVE COMPLETE', `${bounty.title} — XP READY TO COLLECT`);
            if (isModalOpen()) renderSeasonPassBody();
        }
    });
}

function grantReward(reward) {
    if (!reward) return;
    if (reward.kind === 'item' || reward.kind === 'cache') {
        grantVaultItem(reward.itemdefid, reward.qty ?? 1);
    } else if (reward.kind === 'currency') {
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
        const collectedKey = `${tierNumber}:${track}`;
        const justCollected = recentlyCollectedKey === collectedKey;
        let stateClass = 'locked';
        let actionHtml = '<span class="season-pass-slot__state">LOCKED</span>';
        if (claimed) {
            stateClass = `claimed${justCollected ? ' just-collected' : ''}`;
            actionHtml = `<span class="season-pass-slot__state">${justCollected ? 'COLLECTED ✓' : 'CLAIMED ✓'}</span>`;
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
                <div class="season-pass-slot__reward">
                    ${renderRewardVisual(reward)}
                    <div class="season-pass-slot__label">${reward.label}${reward.qty > 1 ? ` <span class="season-pass-slot__qty">×${reward.qty}</span>` : ''}</div>
                </div>
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

function renderRewardVisual(reward) {
    const catalog = reward.itemdefid != null ? getItemCatalogEntry(reward.itemdefid) : null;
    const image = catalog?.localImg || catalog?.img;
    if (image) {
        return `<img class="season-pass-slot__art" src="${assetUrl(image)}" alt="" loading="lazy" onerror="this.classList.add('is-missing')">`;
    }
    const icon = reward.kind === 'currency' ? '⬢' : reward.kind === 'cache' ? '📦' : '◈';
    return `<span class="season-pass-slot__art season-pass-slot__art--glyph" aria-hidden="true">${icon}</span>`;
}

function renderBountyCard(bounty) {
    const pct = Math.min(100, Math.round((bounty.progress / (bounty.target || 1)) * 100));
    return `
        <div class="bounty-card ${bounty.completed ? 'completed' : ''}">
            <div class="bounty-card__top">
                <div class="bounty-card__title">${bounty.title}</div>
                <div class="bounty-card__badge">+${bounty.xp.toLocaleString()} XP</div>
            </div>
            <div class="bounty-card__desc">${bounty.desc}</div>
            <div class="bounty-card__footer">
                <div class="bounty-card__progress-info">
                    <span>PROGRESS</span>
                    <span>${bounty.progress} / ${bounty.target} (${pct}%)</span>
                </div>
                <div class="bounty-card__progress-bar">
                    <div class="bounty-card__progress-fill" style="width:${pct}%"></div>
                </div>
                ${bounty.completed && !bounty.claimed
                    ? `<button class="season-pass-bounty-claim-btn" data-bounty-id="${bounty.id}">COLLECT +${bounty.xp.toLocaleString()} XP</button>`
                    : `<span class="bounty-card__claim-state">${bounty.claimed ? 'XP COLLECTED ✓' : 'IN PROGRESS'}</span>`}
            </div>
        </div>
    `;
}

function getTimeUntilDailyReset() {
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const diff = Math.max(0, tomorrow - now);
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
}

function getTimeUntilWeeklyReset() {
    const now = new Date();
    const day = now.getUTCDay();
    const daysUntilMonday = (8 - (day || 7)) % 7 || 7;
    const nextMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday));
    const diff = Math.max(0, nextMonday - now);
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor((diff % 86400000) / 3600000);
    return `${days}d ${hrs}h`;
}

function renderSeasonPassBody() {
    const body = document.getElementById('season-pass-body');
    const summary = document.getElementById('season-pass-progress-summary');
    if (!body) return;

    const progress = seasonPass.getTierProgress();
    if (summary) {
        summary.innerHTML = `
            <div class="season-pass-telemetry-row">
                <div class="season-pass-chip season-pass-chip--tier">
                    <span>◈</span> TIER ${progress.tier} / ${TOTAL_TIERS}
                </div>
                <div class="season-pass-chip season-pass-chip--xp">
                    <span>⚡</span> ${seasonPass.getTotalXp().toLocaleString()} XP
                </div>
                <div class="season-pass-progress-bar-wrap">
                    <div class="season-pass-progress-bar">
                        <div class="season-pass-progress-fill" style="width:${Math.round(progress.fraction * 100)}%"></div>
                    </div>
                    <span class="season-pass-xp-next">${progress.xpIntoTier} / ${progress.xpForNextTier || XP_PER_TIER} XP</span>
                </div>
                ${!seasonPass.hasPremium()
                    ? '<button id="season-pass-unlock-premium" class="season-pass-unlock-btn">UNLOCK CLASSIFIED INTEL</button>'
                    : '<span class="season-pass-chip season-pass-chip--active">✓ CLASSIFIED DOSSIER ACTIVE</span>'
                }
            </div>
            <div class="season-pass-tabs">
                <button class="season-pass-tab-btn ${activeTab === 'tiers' ? 'active' : ''}" data-tab="tiers">
                    <span class="season-pass-tab-icon">◈</span> PROGRESSION TIERS (1-50)
                </button>
                <button class="season-pass-tab-btn ${activeTab === 'bounties' ? 'active' : ''}" data-tab="bounties">
                    <span class="season-pass-tab-icon">⚡</span> TACTICAL DIRECTIVES & BOUNTIES
                </button>
            </div>
        `;
        summary.querySelector('#season-pass-unlock-premium')?.addEventListener('click', () => {
            seasonPass.setPremium(true);
            showSeasonPassToast('CLASSIFIED DOSSIER UNLOCKED', 'Premium track rewards now claimable.');
            renderSeasonPassBody();
        });
        summary.querySelectorAll('.season-pass-tab-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                activeTab = btn.dataset.tab;
                renderSeasonPassBody();
            });
        });
    }

    if (activeTab === 'tiers') {
        let rows = `
            <div class="season-pass-tier-header-row">
                <div class="tier-col-num">TIER</div>
                <div class="tier-col-free">FREE REQUISITION TRACK</div>
                <div class="tier-col-premium">CLASSIFIED OPERATOR TRACK</div>
            </div>
        `;
        for (let t = 1; t <= TOTAL_TIERS; t++) rows += renderTierCard(t);
        body.innerHTML = `<div class="season-pass-tier-list">${rows}</div>`;

        body.querySelectorAll('.season-pass-claim-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const tier = Number(btn.dataset.tier);
                const track = btn.dataset.track;
                const reward = seasonPass.claim(tier, track);
                if (reward) {
                    recentlyCollectedKey = `${tier}:${track}`;
                    grantReward(reward);
                }
                updateMenuStatus();
                renderSeasonPassBody();
                window.setTimeout(() => {
                    if (recentlyCollectedKey !== `${tier}:${track}`) return;
                    recentlyCollectedKey = null;
                    if (isSeasonPassModalOpen()) renderSeasonPassBody();
                }, 800);
            });
        });
    } else {
        const dailies = bountyManager.getActiveDailies();
        const weeklies = bountyManager.getActiveWeeklies();

        body.innerHTML = `
            <div class="bounty-section">
                <div class="bounty-section__header">
                    <span class="bounty-section__title">◈ DAILY TACTICAL DIRECTIVES (3 ACTIVE)</span>
                    <span class="bounty-section__timer">RESETS IN: ${getTimeUntilDailyReset()}</span>
                </div>
                <div class="bounty-grid">
                    ${dailies.map(renderBountyCard).join('')}
                </div>
            </div>
            <div class="bounty-section">
                <div class="bounty-section__header">
                    <span class="bounty-section__title">◈ WEEKLY SECTOR OPERATIONS (5 ACTIVE)</span>
                    <span class="bounty-section__timer">RESETS IN: ${getTimeUntilWeeklyReset()}</span>
                </div>
                <div class="bounty-grid">
                    ${weeklies.map(renderBountyCard).join('')}
                </div>
            </div>
        `;
        body.querySelectorAll('.season-pass-bounty-claim-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const bounty = bountyManager.claim(button.dataset.bountyId);
                if (!bounty) return;
                const weekly = bountyManager.state.weeklies.some((entry) => entry.id === bounty.id);
                awardXp(bounty.xp, weekly ? 'weeklyDirective' : 'dailyBounty', `Directive Complete: ${bounty.title}`);
                renderSeasonPassBody();
            });
        });
    }
}

export function openSeasonPassModal() {
    const modal = document.getElementById('season-pass-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    renderSeasonPassBody();
    flushQueuedSeasonPassToasts();

    // Auto-focus preferred controller/keyboard target
    requestAnimationFrame(() => {
        const target = modal.querySelector('.season-pass-claim-btn')
            || modal.querySelector('.season-pass-tab-btn.active')
            || modal.querySelector('#close-season-pass-modal');
        target?.focus?.();
    });
}

export function closeSeasonPassModal() {
    const modal = document.getElementById('season-pass-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
}

export function handleSeasonPassKeyDown(event) {
    const modal = document.getElementById('season-pass-modal');
    if (!modal || modal.classList.contains('hidden')) return;

    if (event.code === 'KeyQ' || event.code === 'KeyE') {
        event.preventDefault();
        activeTab = activeTab === 'tiers' ? 'bounties' : 'tiers';
        renderSeasonPassBody();
        const activeTabBtn = modal.querySelector(`.season-pass-tab-btn[data-tab="${activeTab}"]`);
        activeTabBtn?.focus?.();
        return;
    }

    if (event.code === 'Escape') {
        event.preventDefault();
        closeSeasonPassModal();
        return;
    }
}

export function initSeasonPassUI() {
    document.getElementById('season-pass-btn')?.addEventListener('click', openSeasonPassModal);
    document.getElementById('close-season-pass-modal')?.addEventListener('click', closeSeasonPassModal);
    document.getElementById('season-pass-modal')?.addEventListener('click', (event) => {
        if (event.target.id === 'season-pass-modal') closeSeasonPassModal();
    });
    window.addEventListener('keydown', handleSeasonPassKeyDown);
    wireSeasonPassXpEvents();
    updateMenuStatus();
}
