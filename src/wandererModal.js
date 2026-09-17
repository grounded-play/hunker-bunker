import { t } from './i18n.js';
// ── Wanderer Encounter Modal & Choice UI ─────────────────────────────
// Interactive HUD modal for Befriending or Chasing Off wanderers at the crash site.

let modalContainer = null;
let previousFocus = null;
let handleModalKey = null;

export function renderWandererModal(wanderer, { onBefriend, onChaseOff, onClose } = {}) {
    if (!wanderer) return;
    if (typeof window !== 'undefined' && typeof window.isGameplayPhase === 'function' && !window.isGameplayPhase()) return;

    if (modalContainer) return;
    previousFocus = document.activeElement;

    const viewport = document.getElementById('game-viewport') || document.body;

    modalContainer = document.createElement('div');
    modalContainer.id = 'wanderer-encounter-modal';
    modalContainer.setAttribute('role', 'dialog');
    modalContainer.setAttribute('aria-modal', 'true');
    modalContainer.setAttribute('aria-label', t('ui.wanderer.survivor_named', { name: wanderer.name || wanderer.title }));
    modalContainer.style.position = 'absolute';
    modalContainer.style.top = '0';
    modalContainer.style.left = '0';
    modalContainer.style.width = '100%';
    modalContainer.style.height = '100%';
    modalContainer.style.backgroundColor = 'rgba(4, 8, 12, 0.85)';
    modalContainer.style.backdropFilter = 'blur(6px)';
    modalContainer.style.display = 'flex';
    modalContainer.style.alignItems = 'center';
    modalContainer.style.justifyContent = 'center';
    modalContainer.style.zIndex = '9999';
    modalContainer.style.fontFamily = "'Courier New', Courier, monospace";
    modalContainer.style.color = '#c6d8d3';

    const card = document.createElement('div');
    card.style.width = '720px';
    card.style.maxWidth = '92vw';
    card.style.backgroundColor = '#0b1318';
    card.style.border = '2px solid #336b87';
    card.style.boxShadow = '0 0 30px rgba(0, 200, 255, 0.25), inset 0 0 15px rgba(0, 0, 0, 0.8)';
    card.style.borderRadius = '8px';
    card.style.padding = '24px';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '16px';
    card.style.animation = 'fadeIn 0.25s ease-out';

    // Header
    const header = document.createElement('div');
    header.style.borderBottom = '1px solid #1e3a47';
    header.style.paddingBottom = '8px';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const titleEl = document.createElement('div');
    titleEl.innerHTML = `<span style="color:#29b6f6; font-size:12px; letter-spacing:2px;">${t('ui.wanderer.transmission')}</span><br><strong style="color:#ffffff; font-size:20px; text-transform:uppercase;">${wanderer.name || wanderer.title}</strong> <span style="color:#78909c; font-size:14px;">— ${wanderer.title}</span>`;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', t('ui.wanderer.close'));
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#78909c';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => {
        closeWandererModal();
        onClose?.();
    };

    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    card.appendChild(header);

    // Dialogue Body with Left Portrait & Right Content
    const mainContent = document.createElement('div');
    mainContent.style.display = 'flex';
    mainContent.style.gap = '20px';
    mainContent.style.alignItems = 'flex-start';

    // Left Column: Avatar Portrait
    const portraitCol = document.createElement('div');
    portraitCol.className = 'wanderer-modal-portrait-col';
    portraitCol.style.width = '148px';
    portraitCol.style.flexShrink = '0';
    portraitCol.style.display = 'flex';
    portraitCol.style.flexDirection = 'column';
    portraitCol.style.alignItems = 'center';
    portraitCol.style.gap = '8px';

    const avatarFrame = document.createElement('div');
    avatarFrame.style.position = 'relative';
    avatarFrame.style.width = '140px';
    avatarFrame.style.height = '140px';
    avatarFrame.style.borderRadius = '6px';
    avatarFrame.style.overflow = 'hidden';
    avatarFrame.style.border = '2px solid #29b6f6';
    avatarFrame.style.boxShadow = '0 0 18px rgba(41, 182, 246, 0.35)';
    avatarFrame.style.backgroundColor = '#050a0e';

    const avatarImg = document.createElement('img');
    avatarImg.src = wanderer.portrait || '/lore_portraits/survivor_foxhole.webp';
    avatarImg.alt = wanderer.name || wanderer.title;
    avatarImg.style.width = '100%';
    avatarImg.style.height = '100%';
    avatarImg.style.objectFit = 'cover';
    avatarImg.style.imageRendering = 'pixelated';

    const scanlines = document.createElement('div');
    scanlines.style.position = 'absolute';
    scanlines.style.inset = '0';
    scanlines.style.background = 'repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 1px, transparent 1px, transparent 2px)';
    scanlines.style.pointerEvents = 'none';

    avatarFrame.append(avatarImg, scanlines);

    const badgeEl = document.createElement('div');
    badgeEl.style.fontSize = '10px';
    badgeEl.style.letterSpacing = '1.5px';
    badgeEl.style.color = '#80deea';
    badgeEl.style.textAlign = 'center';
    badgeEl.style.textTransform = 'uppercase';
    badgeEl.style.fontWeight = 'bold';
    badgeEl.textContent = wanderer.familyId ? wanderer.familyId.replace('_', ' ') : t('ui.wanderer.wanderer');

    portraitCol.append(avatarFrame, badgeEl);
    mainContent.appendChild(portraitCol);

    // Right Column: Dialogue and Details
    const body = document.createElement('div');
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.gap = '12px';
    body.style.flex = '1';

    const greetingText = wanderer.greeting || wanderer.personality || "Survivor transmission channel open. We survived the breach.";
    const questionText = wanderer.question || (wanderer.resourceDemand ? `Requesting ${wanderer.resourceDemand.amount} ${wanderer.resourceDemand.type} to restore field integrity.` : (wanderer.reward?.text ? `Offer: ${wanderer.reward.text}. Can we establish an alliance?` : "Can we establish an alliance, or are our supplies better off in separate hands?"));

    const greetingBox = document.createElement('div');
    greetingBox.style.backgroundColor = 'rgba(0, 20, 30, 0.6)';
    greetingBox.style.borderLeft = '3px solid #00bcd4';
    greetingBox.style.padding = '12px';
    greetingBox.style.fontSize = '14px';
    greetingBox.style.lineHeight = '1.5';
    greetingBox.style.color = '#e0f7fa';
    greetingBox.textContent = t('ui.wanderer.quote', { text: greetingText });
    body.appendChild(greetingBox);

    const questionBox = document.createElement('div');
    questionBox.style.backgroundColor = 'rgba(30, 15, 20, 0.4)';
    questionBox.style.borderLeft = '3px solid #ff9800';
    questionBox.style.padding = '12px';
    questionBox.style.fontSize = '14px';
    questionBox.style.lineHeight = '1.5';
    questionBox.style.color = '#fff3e0';
    questionBox.innerHTML = `<strong>${t('ui.wanderer.inquiry')}</strong> ${t('ui.wanderer.quote', { text: questionText })}`;
    body.appendChild(questionBox);

    // Perks preview
    const perksBox = document.createElement('div');
    perksBox.style.display = 'grid';
    perksBox.style.gridTemplateColumns = '1fr 1fr';
    perksBox.style.gap = '10px';
    perksBox.style.fontSize = '12px';

    const passiveName = wanderer.passiveBuff?.name || 'FIELD COMPANION';
    const passiveDesc = wanderer.passiveBuff?.desc || 'Follows your route and rejoins you on later expeditions.';
    const passiveCol = document.createElement('div');
    passiveCol.style.backgroundColor = '#071015';
    passiveCol.style.border = '1px solid #1b3842';
    passiveCol.style.padding = '8px';
    passiveCol.style.borderRadius = '4px';
    passiveCol.innerHTML = `<strong style="color:#81c784">${passiveName}</strong><br>${passiveDesc}`;

    const assistName = wanderer.assistAbility?.name || 'COVERING FIRE';
    const assistCooldown = wanderer.assistAbility?.cooldown || 12;
    const assistDesc = wanderer.assistAbility?.desc || `2 damage to a visible hostile within 8u. Recharges in ${assistCooldown}s.`;
    const assistCol = document.createElement('div');
    assistCol.style.backgroundColor = '#071015';
    assistCol.style.border = '1px solid #1b3842';
    assistCol.style.padding = '8px';
    assistCol.style.borderRadius = '4px';
    assistCol.innerHTML = `<strong style="color:#4fc3f7">${assistName}</strong><br>${assistDesc}`;

    perksBox.appendChild(passiveCol);
    perksBox.appendChild(assistCol);
    body.appendChild(perksBox);

    // Quest preview
    if (wanderer.quest) {
        const questBox = document.createElement('div');
        questBox.style.backgroundColor = '#10170a';
        questBox.style.border = '1px solid #33691e';
        questBox.style.padding = '8px 12px';
        questBox.style.borderRadius = '4px';
        questBox.style.fontSize = '12px';
        const reward = wanderer.quest.rewardText || wanderer.quest.rewardSkinId || 'Class Skin Variant';
        questBox.textContent = t('ui.wanderer.quest_line', { title: wanderer.quest.title, desc: wanderer.quest.desc, reward });
        body.appendChild(questBox);
    }

    mainContent.appendChild(body);
    card.appendChild(mainContent);

    // Play greeting voice line upon modal opening
    if (typeof window !== 'undefined' && window.AudioManager?.playVoiceForMessage) {
        window.AudioManager.playVoiceForMessage({ name: wanderer.title || wanderer.name }, wanderer.greeting);
    }

    // Actions
    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.justifyContent = 'flex-end';
    footer.style.gap = '12px';
    footer.style.marginTop = '8px';
    footer.style.paddingTop = '12px';
    footer.style.borderTop = '1px solid #1e3a47';

    // Chase Off Button
    const chaseBtn = document.createElement('button');
    const supplies = ['tech', 'med', 'coin'].filter((key) => wanderer.chaseLoot?.[key] > 0)
        .map((key) => `${wanderer.chaseLoot[key]} ${key}`).join(', ');
    chaseBtn.textContent = t('ui.wanderer.decline', { supplies: supplies.toUpperCase() || t('ui.wanderer.supplies') });
    chaseBtn.style.padding = '10px 16px';
    chaseBtn.style.backgroundColor = '#3e1313';
    chaseBtn.style.border = '1px solid #e57373';
    chaseBtn.style.color = '#ffcdd2';
    chaseBtn.style.borderRadius = '4px';
    chaseBtn.style.cursor = 'pointer';
    chaseBtn.style.fontWeight = 'bold';
    chaseBtn.style.textAlign = 'center';
    chaseBtn.onmouseover = () => { chaseBtn.style.backgroundColor = '#5c1e1e'; };
    chaseBtn.onmouseout = () => { chaseBtn.style.backgroundColor = '#3e1313'; };
    chaseBtn.onclick = () => {
        if (wanderer.dialogueChase && typeof window !== 'undefined' && window.AudioManager?.playVoiceForMessage) {
            window.AudioManager.playVoiceForMessage({ name: wanderer.title || wanderer.name }, wanderer.dialogueChase);
        }
        closeWandererModal();
        onChaseOff?.(wanderer);
    };

    // Befriend Button
    const befriendBtn = document.createElement('button');
    befriendBtn.textContent = t('ui.wanderer.recruit');
    befriendBtn.style.padding = '10px 20px';
    befriendBtn.style.backgroundColor = '#13402e';
    befriendBtn.style.border = '1px solid #81c784';
    befriendBtn.style.color = '#e8f5e9';
    befriendBtn.style.borderRadius = '4px';
    befriendBtn.style.cursor = 'pointer';
    befriendBtn.style.fontWeight = 'bold';
    befriendBtn.style.textAlign = 'center';
    befriendBtn.onmouseover = () => { befriendBtn.style.backgroundColor = '#1d5e44'; };
    befriendBtn.onmouseout = () => { befriendBtn.style.backgroundColor = '#13402e'; };
    befriendBtn.onclick = () => {
        if (wanderer.dialogueBefriend && typeof window !== 'undefined' && window.AudioManager?.playVoiceForMessage) {
            window.AudioManager.playVoiceForMessage({ name: wanderer.title || wanderer.name }, wanderer.dialogueBefriend);
        }
        closeWandererModal();
        onBefriend?.(wanderer);
    };

    footer.appendChild(chaseBtn);
    footer.appendChild(befriendBtn);
    card.appendChild(footer);

    modalContainer.appendChild(card);
    viewport.appendChild(modalContainer);
    handleModalKey = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopImmediatePropagation();
            closeWandererModal();
            onClose?.();
        } else if (event.key === 'Tab') {
            const buttons = [closeBtn, chaseBtn, befriendBtn];
            const index = buttons.indexOf(document.activeElement);
            event.preventDefault();
            event.stopImmediatePropagation();
            buttons[(index + (event.shiftKey ? 2 : 1)) % buttons.length].focus();
        }
    };
    document.addEventListener('keydown', handleModalKey, true);
    befriendBtn.focus();
}

export function closeWandererModal() {
    if (handleModalKey) document.removeEventListener('keydown', handleModalKey, true);
    handleModalKey = null;
    if (modalContainer && modalContainer.parentNode) {
        modalContainer.parentNode.removeChild(modalContainer);
        modalContainer = null;
    }
    if (previousFocus?.isConnected) previousFocus.focus?.();
    previousFocus = null;
}
