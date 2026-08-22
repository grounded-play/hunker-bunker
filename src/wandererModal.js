// ── Wanderer Encounter Modal & Choice UI ─────────────────────────────
// Interactive HUD modal for Befriending or Chasing Off wanderers at the crash site.

let modalContainer = null;

export function renderWandererModal(wanderer, { onBefriend, onChaseOff, onClose } = {}) {
    if (!wanderer) return;

    if (modalContainer && modalContainer.parentNode) {
        modalContainer.parentNode.removeChild(modalContainer);
        modalContainer = null;
    }

    const viewport = document.getElementById('game-viewport') || document.body;

    modalContainer = document.createElement('div');
    modalContainer.id = 'wanderer-encounter-modal';
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
    card.style.width = '640px';
    card.style.maxWidth = '90vw';
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
    titleEl.innerHTML = `<span style="color:#29b6f6; font-size:12px; letter-spacing:2px;">[ SURVIVOR TRANSMISSION ]</span><br><strong style="color:#ffffff; font-size:20px; text-transform:uppercase;">${wanderer.name || wanderer.title}</strong> <span style="color:#78909c; font-size:14px;">— ${wanderer.title}</span>`;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
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

    // Dialogue Body
    const body = document.createElement('div');
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.gap = '12px';

    const greetingBox = document.createElement('div');
    greetingBox.style.backgroundColor = 'rgba(0, 20, 30, 0.6)';
    greetingBox.style.borderLeft = '3px solid #00bcd4';
    greetingBox.style.padding = '12px';
    greetingBox.style.fontSize = '14px';
    greetingBox.style.lineHeight = '1.5';
    greetingBox.style.color = '#e0f7fa';
    greetingBox.textContent = `"${wanderer.greeting}"`;
    body.appendChild(greetingBox);

    const questionBox = document.createElement('div');
    questionBox.style.backgroundColor = 'rgba(30, 15, 20, 0.4)';
    questionBox.style.borderLeft = '3px solid #ff9800';
    questionBox.style.padding = '12px';
    questionBox.style.fontSize = '14px';
    questionBox.style.lineHeight = '1.5';
    questionBox.style.color = '#fff3e0';
    questionBox.innerHTML = `<strong>Inquiry:</strong> "${wanderer.question}"`;
    body.appendChild(questionBox);

    // Perks preview
    const perksBox = document.createElement('div');
    perksBox.style.display = 'grid';
    perksBox.style.gridTemplateColumns = '1fr 1fr';
    perksBox.style.gap = '10px';
    perksBox.style.fontSize = '12px';

    const passiveCol = document.createElement('div');
    passiveCol.style.backgroundColor = '#071015';
    passiveCol.style.border = '1px solid #1b3842';
    passiveCol.style.padding = '8px';
    passiveCol.style.borderRadius = '4px';
    passiveCol.innerHTML = `<span style="color:#81c784; font-weight:bold;">PASSIVE: ${wanderer.passiveBuff?.name || 'Tactical Aura'}</span><br><span style="color:#b0bec5;">${wanderer.passiveBuff?.desc || ''}</span>`;

    const assistCol = document.createElement('div');
    assistCol.style.backgroundColor = '#071015';
    assistCol.style.border = '1px solid #1b3842';
    assistCol.style.padding = '8px';
    assistCol.style.borderRadius = '4px';
    assistCol.innerHTML = `<span style="color:#4fc3f7; font-weight:bold;">ASSIST: ${wanderer.assistAbility?.name || 'Combat Fire'}</span><br><span style="color:#b0bec5;">${wanderer.assistAbility?.desc || ''}</span>`;

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
        questBox.innerHTML = `<span style="color:#aed581; font-weight:bold;">PERSONAL QUEST: ${wanderer.quest.title}</span> — <span style="color:#c5e1a5;">${wanderer.quest.desc}</span> (Unlocks Custom Suit)`;
        body.appendChild(questBox);
    }

    card.appendChild(body);

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
    chaseBtn.innerHTML = `⚠️ CHASE OFF / INTIMIDATE<br><span style="font-size:11px; opacity:0.8;">(+${wanderer.chaseLoot?.scrap || 30} Scrap Cache)</span>`;
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
        closeWandererModal();
        onChaseOff?.(wanderer);
    };

    // Befriend Button
    const befriendBtn = document.createElement('button');
    befriendBtn.innerHTML = `🤝 BEFRIEND / RECRUIT<br><span style="font-size:11px; opacity:0.8;">(Join as 3D Companion)</span>`;
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
        closeWandererModal();
        onBefriend?.(wanderer);
    };

    footer.appendChild(chaseBtn);
    footer.appendChild(befriendBtn);
    card.appendChild(footer);

    modalContainer.appendChild(card);
    viewport.appendChild(modalContainer);
}

export function closeWandererModal() {
    if (modalContainer && modalContainer.parentNode) {
        modalContainer.parentNode.removeChild(modalContainer);
        modalContainer = null;
    }
}
