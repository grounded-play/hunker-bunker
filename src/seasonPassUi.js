import { createRewardRevealFlow, mountRewardPreview, resolveCeremonyKeyAction } from './rewardReveal.js';
import { presentationTelemetry, PRESENTATION_EVENTS } from './presentationTelemetry.js';
import { createXpAggregator, selectXpSound } from './xpFeedback.js';
// ── Beta Season 1 Tactical Dossier — UI & Live Wiring ──────────────────────────
// Renders the battle pass modal and wires real gameplay events (see
// docs/armory-and-class-weapons-worklog.md for the research trail) to XP
// awards. Reward granting reuses steamVaultUi.js's sandbox inventory pattern
// and BankManager for currency so claimed rewards land in the same places
// everything else in the game reads from — not a second parallel system.
import { SeasonPassManager, TIER_REWARDS, TOTAL_TIERS, XP_PER_TIER, PASS_CHAPTERS, withSeasonLock } from './seasonPass.js';
import { SEASON_ONE, WEEKLY_DISPATCHES } from './data/seasonOneConfig.js';
import { getSeasonOneCosmetic, SEASON_ONE_CLASS_CHOICES } from './data/seasonOneCatalog.js';
import { DETERMINISTIC_RECIPES, getItemCount } from './craftingMatrix.js';
import { getItemCatalogEntry, deliverLocalSeasonReward, craftLocalSeasonRecipe, getLocalSeasonInventory, loadVaultData } from './steamVaultUi.js';
import { assetUrl } from './assetUrl.js';

export const seasonPass = new SeasonPassManager();
if (typeof window !== 'undefined') window.seasonPass = seasonPass;

// Legacy bounties keep their own save; Season 1 has exactly 24 finite directives.
export const bountyManager = seasonPass;
let currentRunId = null;
let wired = false;
let deliveryMessage = '';

function runSeasonAction(action) {
    return withSeasonLock(async () => {
        const result = await action?.();
        if (result?.xpAwarded) presentXp(result);
        const deliveries = await seasonPass.settleRewards(deliverLocalSeasonReward);
        deliveryMessage = deliveries.some(entry => !entry.ok) ? 'Delivery pending — progress is saved. Retry from this Dossier.' : '';
        updateMenuStatus();
        updatePinnedObjective();
        if (isModalOpen()) renderSeasonPassBody();
        return result;
    }).catch(() => {
        deliveryMessage = 'Save or delivery unavailable — retry when local storage is available.';
        if (isModalOpen()) renderSeasonPassBody();
    });
}

export function beginSeasonRun(runId, initialDepth = 0) {
    currentRunId = String(runId);
    return runSeasonAction(() => seasonPass.beginRun(String(runId), initialDepth));
}

export function getSeasonRunSummary() {
    return { ...seasonPass.state.runs[currentRunId], pending: seasonPass.getPendingClaims().length };
}

let hudCardSeq = 0;
let activeTab = 'tiers'; // 'tiers' | 'bounties'
const progressionCeremonyQueue = [];
let progressionCeremonyActive = false;

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

export function shouldPresentProgressionReward({ seasonScreenOpen, claimable }) {
    return seasonScreenOpen === true && claimable === true;
}

function showSeasonPassToast(title, blurb) {
    if (!shouldPresentProgressionReward({ seasonScreenOpen: isSeasonPassModalOpen(), claimable: true })) {
        queuedSeasonPassToasts.push({ title, blurb });
        return;
    }
    renderSeasonPassToast(title, blurb);
}

// Season-screen feedback is kept out of gameplay, doors, and cutscenes. It is
// queued until the player explicitly opens the Season Pass modal.
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

function ensureProgressionCeremony() {
    let overlay = document.getElementById('progression-reward-overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'progression-reward-overlay';
    overlay.className = 'progression-reward-overlay hidden';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
        <div class="progression-reward-panel">
            <div class="progression-reward-kicker">◈ TACTICAL DOSSIER // PROMOTION SIGNAL</div>
            <div class="progression-reward-title">LEVEL <span id="progression-level-value">1</span> REACHED</div>
            <div class="progression-xp-track"><div id="progression-xp-bar" class="progression-xp-bar"></div></div>
            <div id="progression-xp-label" class="progression-xp-label">XP THRESHOLD CONFIRMED</div>
            <div id="progression-reward-preview" class="progression-reward-preview" aria-hidden="true"></div>
            <div class="progression-reward-burst" aria-hidden="true"></div>
            <div class="progression-reward-card">
                <div class="progression-reward-card__slot">NEW REQUISITION</div>
                <div id="progression-reward-primary" class="progression-reward-card__name"></div>
                <div id="progression-reward-secondary" class="progression-reward-card__desc"></div>
                <div id="progression-reward-currency" class="progression-reward-card__meta"></div>
                <div id="progression-reward-confirm" class="progression-reward-card__meta progression-reward-confirm hidden"></div>
            </div>
            <button id="progression-claim-btn" class="start-btn progression-claim-btn">◈ CLAIM REWARD</button>
            <button id="progression-continue-btn" class="start-btn progression-continue-btn hidden">◈ CONTINUE</button>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#progression-claim-btn')?.addEventListener('click', claimProgressionReward);
    overlay.querySelector('#progression-continue-btn')?.addEventListener('click', dismissProgressionReward);
    return overlay;
}

function showNextProgressionReward() {
    // Promotion ceremonies belong to the Dossier, never boot, doors, movies,
    // gameplay, or the title menu. Keep the queue intact until that screen is
    // explicitly opened.
    if (!isSeasonPassModalOpen()) {
        progressionCeremonyActive = false;
        return;
    }
    let next = progressionCeremonyQueue.shift();
    // A reward may have been claimed from its tier row before its queued
    // ceremony ran. Skip stale entries so claimed rewards never prompt again.
    while (next && !shouldPresentProgressionReward({
        seasonScreenOpen: true,
        claimable: Boolean(seasonPass.getReward(next.tier, next.track))
    })) {
        next = progressionCeremonyQueue.shift();
    }
    if (!next) {
        progressionCeremonyActive = false;
        return;
    }
    progressionCeremonyActive = true;
    const reward = seasonPass.state.receipts[seasonPass.claimKey(next.tier, next.track)]?.reward ?? seasonPass.getReward(next.tier, next.track);
    const overlay = ensureProgressionCeremony();
    overlay.dataset.tier = String(next.tier);
    overlay.dataset.track = next.track;
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.querySelector('#progression-level-value').textContent = String(next.tier);
    overlay.querySelector('#progression-reward-primary').textContent = reward?.label ?? 'REWARD SIGNAL';
    overlay.querySelector('#progression-reward-secondary').textContent = reward?.kind === 'item' || reward?.kind === 'cache'
        ? 'ITEM SECURED FOR VAULT CLAIM'
        : 'CURRENCY CREDIT READY';
    overlay.querySelector('#progression-reward-currency').textContent = reward?.qty > 1 ? `QUANTITY ×${reward.qty}` : `${next.track.toUpperCase()} TRACK`;
    overlay.querySelector('#progression-xp-label').textContent = `TIER ${next.tier} // XP THRESHOLD CONFIRMED`;
    const bar = overlay.querySelector('#progression-xp-bar');
    bar.style.width = '0%';
    requestAnimationFrame(() => { bar.style.width = '100%'; });
    const burst = overlay.querySelector('.progression-reward-burst');
    burst.innerHTML = Array.from({ length: 18 }, (_, i) => `<i style="--particle-angle:${i * 20}deg"></i>`).join('');
    overlay.querySelector('#progression-claim-btn').textContent = 'VIEW REWARD';
    overlay.querySelector('#progression-claim-btn')?.focus?.();
}

// Sprint 29 §7. This used to claim, grant, and immediately hide the overlay --
// the player's only feedback that a reward existed was the panel vanishing.
// The reveal now runs as an explicit sequence, and the panel stays up until the
// player dismisses it.
let activePreviewHandle = null;

const rewardRevealFlow = createRewardRevealFlow({
    telemetry: presentationTelemetry,
    grant: async () => {
        const overlay = document.getElementById('progression-reward-overlay');
        const tier = Number(overlay?.dataset.tier);
        const track = overlay?.dataset.track;
        return withSeasonLock(async () => {
            const reward = seasonPass.state.receipts[seasonPass.claimKey(tier, track)]?.reward ?? seasonPass.getReward(tier, track);
            if (seasonPass.isClaimed(tier, track)) return { ok: true, reward };
            const intent = seasonPass.claim(tier, track);
            if (!intent) return { ok: false, reason: 'choice-or-entitlement-required' };
            const result = await deliverLocalSeasonReward(intent, intent.receiptId);
            if (result?.ok) seasonPass.resolvePendingClaim(intent.receiptId);
            return { ...result, reward };
        });
    },
    mountPreview: ({ item, ending }) => {
        const container = document.getElementById('progression-reward-preview');
        if (ending.preview !== '3d') {
            return { ready: Promise.resolve({ ok: false, reason: 'two-dimensional-reward' }), dispose() {} };
        }
        activePreviewHandle = mountRewardPreview({ container, itemId: item?.itemdefid, category: ending.family });
        return activePreviewHandle;
    },
    playSound: (name) => window.AudioManager?.play(name, { bus: 'sfx' }),
    present: (stage, ending) => presentRewardStage(stage, ending)
});

function renderRewardBurst(overlay) {
    const burst = overlay.querySelector('.progression-reward-burst');
    if (!burst) return;
    // Restart the animation rather than leaving the spent particles in place --
    // §3 requires that replaying a reward not stack stale animation state.
    burst.innerHTML = '';
    void burst.offsetWidth;
    burst.innerHTML = Array.from({ length: 18 }, (_, i) => `<i style="--particle-angle:${i * 20}deg"></i>`).join('');
}

export function presentRewardStage(stage, ending) {
    const overlay = document.getElementById('progression-reward-overlay');
    if (!overlay) return;
    overlay.dataset.revealStage = stage;
    overlay.dataset.rewardFamily = ending.family;
    // §5: the burst belongs to the reveal, firing after the reward object is up
    // and before the card settles -- not at ceremony open, which is when it
    // used to fire and why it never read as celebrating the claim.
    if (stage === 'burst') {
        renderRewardBurst(overlay);
        window.AudioManager?.play('ui_reward_burst', { bus: 'sfx' });
        return;
    }
    if (stage !== 'reveal') return;
    overlay.querySelector('#progression-claim-btn')?.classList.add('hidden');
    overlay.querySelector('#progression-continue-btn')?.classList.remove('hidden');
    overlay.querySelector('#progression-continue-btn')?.focus?.();
    const confirm = overlay.querySelector('#progression-reward-confirm');
    if (confirm) {
        confirm.textContent = 'ADDED TO INVENTORY';
        confirm.classList.remove('hidden');
    }
}

export function claimProgressionReward() {
    if (!progressionCeremonyActive) return;
    const overlay = document.getElementById('progression-reward-overlay');
    const tier = Number(overlay?.dataset.tier);
    const track = overlay?.dataset.track;
    // Disable immediately so a second click cannot reach the grant at all
    // (§7's pending state), on top of the flow's own in-flight guard.
    const claimBtn = overlay?.querySelector('#progression-claim-btn');
    if (claimBtn) claimBtn.disabled = true;
    const reward = seasonPass.state.receipts[seasonPass.claimKey(tier, track)]?.reward ?? seasonPass.getReward(tier, track);
    const reveal = rewardRevealFlow.run({ actionKey: `reward:${tier}:${track}`, item: reward }).then((result) => {
        if (!result.ok) {
            // Nothing was granted, so nothing is being revealed -- restore the
            // button rather than stranding the player on a dead panel.
            if (claimBtn) claimBtn.disabled = false;
            return;
        }
        // §7: a reward with no model must say so honestly, while still naming
        // the reward and confirming the grant -- never a silent empty frame.
        if (!result.previewOk) showPreviewUnavailable(result.ending, reward);
    });
    updateMenuStatus();
    return reveal;
}

function showPreviewUnavailable(ending, reward) {
    const container = document.getElementById('progression-reward-preview');
    if (!container) return;
    container.classList.add('progression-reward-preview--unavailable');
    container.textContent = ending.preview === '2d'
        ? `${String(reward?.label ?? 'REWARD').toUpperCase()} — 2D REQUISITION`
        : 'PREVIEW UNAVAILABLE — REWARD SECURED';
}

export function dismissProgressionReward() {
    const overlay = document.getElementById('progression-reward-overlay');
    if (!overlay) return;
    window.AudioManager?.play('ui_reward_dismiss', { bus: 'sfx' });
    presentationTelemetry.emit('REWARD', PRESENTATION_EVENTS.REWARD.REVEAL_CLOSE, {
        tier: Number(overlay.dataset.tier), track: overlay.dataset.track
    });
    activePreviewHandle?.dispose?.();
    activePreviewHandle = null;
    const preview = overlay.querySelector('#progression-reward-preview');
    if (preview) {
        preview.innerHTML = '';
        preview.classList.remove('progression-reward-preview--unavailable');
    }
    overlay.querySelector('#progression-reward-confirm')?.classList.add('hidden');
    overlay.querySelector('#progression-continue-btn')?.classList.add('hidden');
    const claimBtn = overlay.querySelector('#progression-claim-btn');
    if (claimBtn) {
        claimBtn.disabled = false;
        claimBtn.classList.remove('hidden');
    }
    delete overlay.dataset.revealStage;
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    progressionCeremonyActive = false;
    updateMenuStatus();
    document.getElementById('season-pass-modal')?.querySelector?.('.season-pass-tab-btn.active')?.focus?.();
    window.setTimeout(showNextProgressionReward, 260);
}

// Sprint 29 §6: XP used to spawn one toast per gain. The toast auto-dismisses
// after 4.2s, but XP fires faster than that during a fight, so the stack
// saturated and the green box looked permanent. Gains are now collapsed into a
// single rolling burst and announced once.
const xpAggregator = createXpAggregator();
let xpBurstFlushTimer = null;
let xpBurstSeq = 0;

function flushXpBurst(label, { leveledUp = false, bonus = false } = {}) {
    if (xpBurstFlushTimer) clearTimeout(xpBurstFlushTimer);
    xpBurstFlushTimer = setTimeout(() => {
        xpBurstFlushTimer = null;
        const burst = xpAggregator.flushPending();
        if (!burst) return;
        const actionKey = `xp-burst-${++xpBurstSeq}`;
        showSeasonPassToast(`+${burst.amount} XP`, label);
        presentationTelemetry.emitOnce('XP', PRESENTATION_EVENTS.XP.AGGREGATE,
            { amount: burst.amount, events: burst.events }, actionKey);
        presentationTelemetry.emitOnce('XP', PRESENTATION_EVENTS.XP.UI_SHOW, {}, actionKey);
        const sound = selectXpSound({ leveledUp, bonus });
        window.AudioManager?.play(sound, { bus: 'sfx' });
        presentationTelemetry.emitOnce('XP', PRESENTATION_EVENTS.XP.SOUND, { sound }, actionKey);
        // The toast carries autoDismissMs 4200 + removeDelayMs 320; record when
        // the XP UI is actually gone so "hidden at rest" (§6) is checkable from
        // the log rather than only by eye.
        setTimeout(() => {
            presentationTelemetry.emitOnce('XP', PRESENTATION_EVENTS.XP.UI_HIDE, { amount: burst.amount }, actionKey);
        }, 4520);
    }, 260);
}

// Death, a blocking menu, or leaving gameplay must not leave a pending burst
// waiting to fire over the next screen (§6).
export function cancelXpFeedback() {
    if (xpBurstFlushTimer) clearTimeout(xpBurstFlushTimer);
    xpBurstFlushTimer = null;
    if (xpAggregator.isPending()) {
        xpAggregator.cancel();
        presentationTelemetry.emit('XP', PRESENTATION_EVENTS.XP.CLEANUP, { reason: 'cancelled' });
    }
}

function presentXp({ xpAwarded, source, tiersCrossed }) {
    presentationTelemetry.emit('XP', PRESENTATION_EVENTS.XP.GAIN, { amount: xpAwarded, source });
    xpAggregator.add(xpAwarded);
    flushXpBurst('Dossier progress retained.', { leveledUp: tiersCrossed.length > 0 });
}

export function wireSeasonPassXpEvents() {
    if (wired) return;
    wired = true;
    const record = detail => {
        if (window.game?.performanceProfile !== 'gameplay' || window.game?.isPlayerDead || window.game?.loadingPaused || !currentRunId) return;
        const runId = currentRunId;
        void runSeasonAction(() => seasonPass.recordEvent({ runId, ...detail }));
    };
    window.addEventListener('season-objective-complete', ({ detail }) => {
        if (!['mission', 'story', 'camp-quest', 'black-box', 'survivor'].includes(detail?.source)) return;
        record({ kind: 'objective', id: detail.id });
        if (detail.source === 'camp-quest') record({ kind: 'activity', id: `camp:${detail.id}` });
    });
    window.addEventListener('lore-terminal-read', ({ detail }) => {
        if (detail?.loreKey && window.game?._readLoreKeys?.has(detail.loreKey)) {
            record({ kind: 'objective', id: `terminal:${detail.loreKey}` });
        }
    });
    window.addEventListener('enemy-killed', ({ detail }) => {
        if (detail?.isBoss && detail.encounterId) record({ kind: 'boss', id: detail.encounterId });
    });
    window.addEventListener('depth-tier-changed', ({ detail }) => {
        record({ kind: 'depth', id: `depth:${detail?.tier}`, tier: detail?.tier, crossing: Boolean(detail?.crossing) });
    });
    for (const [event, outcome] of [['player-extracted', 'extracted'], ['player-death', 'failed']]) {
        window.addEventListener(event, () => {
            if (!currentRunId) return;
            const runId = currentRunId;
            void runSeasonAction(() => seasonPass.settleRun(runId, outcome));
        });
    }
    window.addEventListener('season-companion-stage-complete', ({ detail }) => {
        record({ kind: 'activity', id: `companion:${detail?.id}` });
    });
    window.addEventListener('fabrication-complete', ({ detail }) => {
        if (!detail?.id) return;
        void runSeasonAction(() => seasonPass.completeOnboarding('fabricated'));
        if (window.fabricator?.isFabricated(detail.id)) {
            void runSeasonAction(() => seasonPass.recordActivity(`fabrication:${detail.id}`));
        }
    });
    window.addEventListener('fabricated-weapon-equipped', () => {
        void runSeasonAction(() => seasonPass.completeOnboarding('equipped'));
    });
    window.addEventListener('storage', () => {
        void runSeasonAction(() => seasonPass.refresh());
    });
}

function updatePinnedObjective() {
    const target = seasonPass.state.pinnedTarget;
    if (!target) return;
    const item = getSeasonOneCosmetic(target.itemdefid);
    if (!item) return;
    window.objectiveRegistry?.trackObjective({
        id: 'season:pinned', source: 'season', label: `${item.name} — RANK ${item.rank}`,
        current: seasonPass.getCurrentTier(), target: Number(item.rank), priority: 60, persistent: true,
        status: seasonPass.isClaimed(Number(item.rank), item.track) ? 'completed' : 'active'
    });
}

function isModalOpen() {
    const modal = document.getElementById('season-pass-modal');
    return Boolean(modal) && !modal.classList.contains('hidden');
}

function updateMenuStatus() {
    const status = document.getElementById('season-pass-command-status');
    if (status) status.textContent = `RANK ${seasonPass.getCurrentTier()} / ${TOTAL_TIERS}`;
}

function compatibilityText(reward) {
    const item = getSeasonOneCosmetic(reward.itemdefid);
    if (!item) return reward.kind === 'supply_bundle' ? 'Banked supplies' : 'Class chassis choice';
    const labels = { talon: 'Scout Talon SMG', talon_c: 'Scout Talon-C', tesla_lock: 'Engineer Tesla Lock', SCOUT: 'Scout', TANK: 'Tank', ENGINEER: 'Engineer', all: 'Universal' };
    const base = labels[item.compatibility] ?? item.compatibility;
    return item.category === 'weapon_finish' ? `${base} (Finish)` : base;
}

function renderRewardVisual(reward) {
    const catalog = reward.itemdefid != null ? getItemCatalogEntry(reward.itemdefid) : null;
    const image = catalog?.localImg || catalog?.img;
    return image ? `<img class="season-pass-slot__art" src="${assetUrl(image)}" alt="" loading="lazy">`
        : '<span class="season-pass-slot__art season-pass-slot__art--glyph" aria-hidden="true">◈</span>';
}

function equipStatus(item) {
    if (!item || !window.itemOwnership?.isOwned(item.itemdefid)) return 'Refresh pending';
    const cls = window.loadout?.getActiveClass?.()?.toUpperCase();
    if (item.category === 'chassis' && item.compatibility !== cls) return `Requires ${item.compatibility}`;
    if (item.category === 'weapon_finish' && window.loadout?.getActiveArchetype?.() !== item.compatibility) return `Requires ${compatibilityText(item)}`;
    return null;
}

function equipSeasonItem(itemdefid) {
    const item = getSeasonOneCosmetic(itemdefid);
    if (!item || equipStatus(item)) return false;
    const method = { chassis: 'equipChassisSkin', weapon_finish: 'equipSkin', charm: 'equipCharm', decal: 'equipDecal' }[item.category];
    const equipped = window.loadout?.[method]?.(item.itemdefid);
    if (equipped) {
        window.dispatchEvent(new CustomEvent('season-item-equipped', { detail: { itemdefid } }));
    }
    return equipped;
}

function renderTierCard(tier) {
    const slot = track => {
        const reward = seasonPass.state.receipts[seasonPass.claimKey(tier, track)]?.reward ?? seasonPass.getReward(tier, track);
        if (!reward) return '<div class="season-pass-slot season-pass-slot--empty">—</div>';
        const claimed = seasonPass.isClaimed(tier, track);
        const available = seasonPass.canClaim(tier, track);
        const pending = seasonPass.state.receipts[seasonPass.claimKey(tier, track)];
        let action = '<span class="season-pass-slot__state">Locked</span>';
        if (claimed) {
            action = `<span class="season-pass-slot__state">${reward.itemdefid ? window.itemOwnership?.isOwned(reward.itemdefid) ? 'Owned ✓' : 'Delivered (Unowned)' : 'Banked ✓'}</span><button class="season-pass-claim-btn" data-reveal="${tier}" data-track="${track}">View</button>`;
            if (reward.itemdefid && window.itemOwnership?.isOwned(reward.itemdefid)) {
                const reason = equipStatus(getSeasonOneCosmetic(reward.itemdefid));
                action += `<button class="season-pass-claim-btn" data-equip="${reward.itemdefid}" ${reason ? 'disabled' : ''}>${reason ?? 'Equip for run'}</button>`;
            }
        } else if (pending) {
            action = '<button class="season-pass-claim-btn" data-retry>Pending — retry</button>';
        } else if (available && reward.kind === 'class_choice') {
            const unowned = SEASON_ONE_CLASS_CHOICES.filter(id => !window.itemOwnership?.isOwned(id));
            action = `<div class="class-choice-wrap"><span class="season-pass-slot__state">CHOOSE:</span><div class="class-choice-btns">`
                + SEASON_ONE_CLASS_CHOICES.map(id => `<button class="season-pass-claim-btn season-pass-claim-btn--choice" data-choice="${id}" ${unowned.length && !unowned.includes(id) ? 'disabled' : ''}>${getSeasonOneCosmetic(id).compatibility}${!unowned.includes(id) ? ' ✓' : ''}</button>`).join('') + `</div></div>`;
        } else if (track === 'premium') {
            action = '<span class="season-pass-slot__state season-pass-slot__state--preview">CLASSIFIED</span>';
        } else if (available) {
            action = '<button class="season-pass-claim-btn" data-retry>Deliver</button>';
        } else if (reward.itemdefid) {
            action += `<button class="season-pass-claim-btn" data-pin="${reward.itemdefid}">Track</button>`;
        }
        return `<div class="season-pass-slot season-pass-slot--${track} season-pass-slot--${claimed ? 'claimed' : available ? 'claimable' : 'locked'}">
            <div class="season-pass-slot__reward">${renderRewardVisual(reward)}<div><div class="season-pass-slot__label">${reward.label}</div><div class="season-one-note">${compatibilityText(reward)}</div></div></div>${action}</div>`;
    };
    return `<div class="season-pass-tier-row ${tier <= seasonPass.getCurrentTier() ? 'unlocked' : ''}"><div class="season-pass-tier-number">${tier}</div>${slot('free')}${slot('premium')}</div>`;
}

function renderSeasonPassBody() {
    const body = document.getElementById('season-pass-body');
    const summary = document.getElementById('season-pass-progress-summary');
    if (!body || !summary) return;
    const progress = seasonPass.getTierProgress();
    const week = seasonPass.getReleasedWeeks();
    const dispatch = WEEKLY_DISPATCHES[Math.max(0, week - 1)];
    const retroactive = 1 + TIER_REWARDS.slice(0, progress.tier).filter(row => row.premium).length;

    summary.innerHTML = `<div class="season-pass-telemetry-row">
        <div class="season-pass-chip season-pass-chip--tier">RANK ${progress.tier} / ${TOTAL_TIERS}</div>
        <div class="season-pass-chip season-pass-chip--xp">${seasonPass.getTotalXp().toLocaleString()} XP</div>
        <div class="season-pass-progress-bar-wrap"><div class="season-pass-progress-bar"><div class="season-pass-progress-fill" style="width:${Math.round(progress.fraction * 100)}%"></div></div>
        <span class="season-pass-xp-next">${progress.tier === TOTAL_TIERS ? 'DOSSIER COMPLETE' : `${progress.xpIntoTier} / ${XP_PER_TIER} XP`}</span></div>
        <div class="season-pass-chip season-pass-chip--sync">${window.electronAPI ? '● STEAM SYNC' : '● LOCAL SYNC'}</div>
        <div class="season-pass-chip season-pass-chip--preview" title="10 cosmetics on classified track (retroactive unlock)">10 CLASSIFIED (${retroactive} READY)</div>
    </div>
    <details class="season-dispatch-drawer">
        <summary class="season-dispatch-summary">
            <span class="dispatch-kicker">◈ FIELD DISPATCH // WEEK ${week}</span>
            <span class="dispatch-title">${dispatch.title}</span>
            <span class="dispatch-toggle">EXPAND ▾</span>
        </summary>
        <div class="dispatch-body">${dispatch.text}</div>
    </details>
    ${deliveryMessage ? `<div class="season-delivery-alert" role="status">◈ ${deliveryMessage}</div>` : ''}
    <div class="season-pass-tabs">${[['tiers', 'Dossier'], ['bounties', 'Directives'], ['workshop', 'Fragment Workshop']].map(([id, label]) => `<button class="season-pass-tab-btn ${activeTab === id ? 'active' : ''}" data-tab="${id}">${label}</button>`).join('')}</div>`;

    summary.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => { activeTab = btn.dataset.tab; renderSeasonPassBody(); }));

    if (activeTab === 'tiers') {
        body.innerHTML = `<div class="season-pass-tier-list">${PASS_CHAPTERS.map(chapter => `<h3 class="season-one-chapter">${chapter.name} · ${chapter.startTier}–${chapter.endTier}</h3><div class="season-pass-tier-header-row"><div>RANK</div><div>FREE TRACK</div><div>CLASSIFIED TRACK</div></div>${Array.from({ length: 10 }, (_, i) => renderTierCard(chapter.startTier + i)).join('')}`).join('')}</div>`;
    } else if (activeTab === 'bounties') {
        body.innerHTML = `<div class="season-tab-telemetry-bar">
            <span class="telemetry-pill">DIRECTIVES: <strong>${week * 3} / 24</strong></span>
            <span class="telemetry-pill">SETTLEMENT: <strong>AUTO-RETAINED</strong></span>
            <span class="telemetry-pill">EXPIRATION: <strong>PERMANENT</strong></span>
        </div>`
            + Array.from({ length: week }, (_, index) => `<h3 class="season-one-chapter">Week ${index + 1} · ${WEEKLY_DISPATCHES[index].title}</h3><div class="bounty-grid">${seasonPass.getActiveWeeklies().filter(d => d.week === index + 1).map(d => `<div class="bounty-card ${d.completed ? 'completed' : ''}"><div class="bounty-card__header"><div class="bounty-card__title">${d.title}</div><span class="bounty-xp-badge">${d.completed ? '1,000 XP ✓' : '+1,000 XP'}</span></div><p class="bounty-card__desc">${d.desc}</p><div class="bounty-card__meter-wrap"><div class="bounty-card__meter"><div class="bounty-card__fill" style="width:${Math.min(100, Math.round((d.progress / d.target) * 100))}%"></div></div><span class="bounty-card__count">${d.progress} / ${d.target}</span></div></div>`).join('')}</div>`).join('');
    } else {
        const inventory = getLocalSeasonInventory();
        const commonCount = getItemCount(inventory.items, 1000);
        const rareCount = getItemCount(inventory.items, 1100);
        body.innerHTML = `<div class="fragment-ledger-bar">
            <div class="fragment-pill fragment-pill--common">
                <span class="fragment-icon">⬢</span>
                <span class="fragment-label">COMMON FRAGMENTS</span>
                <strong class="fragment-val">${commonCount}</strong>
                <span class="fragment-cap">ALLOWANCE: ${seasonPass.state.fragments.common} / ${week * 3} (MAX 24)</span>
            </div>
            <div class="fragment-pill fragment-pill--rare">
                <span class="fragment-icon">◈</span>
                <span class="fragment-label">RARE FRAGMENTS</span>
                <strong class="fragment-val">${rareCount}</strong>
                <span class="fragment-cap">ALLOWANCE: MAX 8 (1/WEEK)</span>
            </div>
        </div>`
            + `<div class="bounty-grid">${Object.values(DETERMINISTIC_RECIPES).map(recipe => {
                const crafted = inventory.receipts[`${SEASON_ONE.id}:craft:${recipe.id}`];
                const owned = getItemCount(inventory.items, recipe.outputItemdefid) > 0;
                const missing = recipe.ingredients.some(i => getItemCount(inventory.items, i.itemdefid) < i.quantity);
                const cost = recipe.ingredients.map(i => `${i.quantity} ${i.itemdefid === 1000 ? 'Common' : 'Rare'}`).join(' + ');
                return `<div class="bounty-card">
                    <div class="bounty-card__header">
                        <div class="bounty-card__title">${recipe.name}</div>
                        <span class="recipe-cost-pill">${cost}</span>
                    </div>
                    <p class="bounty-card__desc">${compatibilityText({ itemdefid: recipe.outputItemdefid })} · Once per season</p>
                    <button class="season-pass-claim-btn" data-craft="${recipe.id}" data-owned="${owned}" ${crafted || missing || window.electronAPI ? 'disabled' : ''}>${crafted ? 'Crafted ✓' : window.electronAPI ? 'Service required' : missing ? 'Missing fragments' : owned ? 'Craft duplicate' : 'Craft cosmetic'}</button>
                </div>`;
            }).join('')}</div>`;
    }
    body.querySelectorAll('[data-equip]').forEach(btn => btn.addEventListener('click', () => {
        try { if (equipSeasonItem(Number(btn.dataset.equip))) btn.textContent = 'Equipped ✓'; }
        catch { btn.textContent = 'Retry'; }
    }));
    body.querySelectorAll('[data-retry]').forEach(btn => btn.addEventListener('click', () => { void runSeasonAction(); }));
    body.querySelectorAll('[data-pin]').forEach(btn => btn.addEventListener('click', () => {
        void runSeasonAction(() => seasonPass.completeOnboarding('target', { itemdefid: Number(btn.dataset.pin) }));
    }));
    body.querySelectorAll('[data-choice]').forEach(btn => btn.addEventListener('click', () => {
        btn.disabled = true;
        void runSeasonAction(() => seasonPass.claim(15, 'free', { selectedChoice: Number(btn.dataset.choice), ownedChoices: SEASON_ONE_CLASS_CHOICES.filter(id => window.itemOwnership?.isOwned(id)) }));
    }));
    body.querySelectorAll('[data-craft]').forEach(btn => btn.addEventListener('click', () => {
        btn.disabled = true;
        void runSeasonAction(() => craftLocalSeasonRecipe(Number(btn.dataset.craft), { confirmOwned: btn.dataset.owned === 'true' }));
    }));
    body.querySelectorAll('[data-reveal]').forEach(btn => btn.addEventListener('click', () => {
        progressionCeremonyQueue.push({ tier: Number(btn.dataset.reveal), track: btn.dataset.track });
        if (!progressionCeremonyActive) showNextProgressionReward();
    }));
}

export function openSeasonPassModal() {
    const modal = document.getElementById('season-pass-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    renderSeasonPassBody();
    void runSeasonAction();
    flushQueuedSeasonPassToasts();
    if (!progressionCeremonyActive) showNextProgressionReward();

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
    if (progressionCeremonyActive) dismissProgressionReward();
    document.getElementById('season-pass-btn')?.focus?.();
    document.querySelectorAll('.season-pass-toast').forEach((toast) => toast.remove());
}

export function handleSeasonPassKeyDown(event) {
    const ceremony = document.getElementById('progression-reward-overlay');
    if (ceremony && !ceremony.classList.contains('hidden')) {
        // B/Escape cannot discard an *unclaimed* reward; once the grant has
        // landed it becomes an ordinary continue (Sprint 29 §7).
        const action = resolveCeremonyKeyAction({
            code: event.code,
            revealStage: ceremony.dataset.revealStage ?? null
        });
        if (action) event.preventDefault();
        if (event.code === 'Escape' && seasonPass.isClaimed(Number(ceremony.dataset.tier), ceremony.dataset.track)) dismissProgressionReward();
        else if (action === 'claim') claimProgressionReward();
        else if (action === 'continue') dismissProgressionReward();
        return;
    }
    const modal = document.getElementById('season-pass-modal');
    if (!modal || modal.classList.contains('hidden')) return;

    if (event.code === 'KeyQ' || event.code === 'KeyE') {
        event.preventDefault();
        const tabs = ['tiers', 'bounties', 'workshop'];
        activeTab = tabs[(tabs.indexOf(activeTab) + (event.code === 'KeyQ' ? 2 : 1)) % tabs.length];
        renderSeasonPassBody();
        const activeTabBtn = modal.querySelector(`.season-pass-tab-btn[data-tab="${activeTab}"]`);
        activeTabBtn?.focus?.();
        return;
    }

    if (event.code === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
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
    if (!window.electronAPI) void loadVaultData().then(() => runSeasonAction()).catch(() => { deliveryMessage = 'Local inventory unavailable — delivery will retry from Dossier.'; });
    updateMenuStatus();
}
