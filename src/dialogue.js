const DIALOGUE_CHAR_INTERVAL_MS = 18;
const DIALOGUE_LINE_GAP_MS = 150;

const CLASS_COLORS = {
    SCOUT: { glow: '#7dff5a', rgb: '125, 255, 90' },
    TANK: { glow: '#ffb700', rgb: '255, 183, 0' },
    ENGINEER: { glow: '#00e5ff', rgb: '0, 229, 255' }
};

const MOTHERSHIP_LINES = [
    { text: "MOTHERSHIP: AGENT {CLASS}. YOU'RE ALIVE.", pauseMs: 400 },
    { text: 'MOTHERSHIP: YOUR SHIP TOOK A HYPERSONIC STRIKE ON DESCENT.' },
    { text: "MOTHERSHIP: YOU'VE CRASHED IN SECTOR 9. STRUCTURE UNKNOWN." },
    { text: 'MOTHERSHIP: SCATTERED SUPPLY CACHES ARE DETECTABLE BY YOUR SUIT.' },
    { text: 'MOTHERSHIP: SALVAGE CONSOLE IS NEAR YOUR WRECKAGE. BANK SALVAGE THERE AND REBUILD YOUR SHIP, SYSTEM BY SYSTEM.' },
    { text: 'MOTHERSHIP: RESTORE EVERY SYSTEM AND WE CAN PULL YOU OFF THIS ROCK, AGENT.' },
    { text: 'MOTHERSHIP: AWAITING YOUR RESPONSE, AGENT.' }
];

const CLASS_BRIEFING_LINES = {
    SCOUT: { text: 'MOTHERSHIP: NOTE: YOUR SCOUT FRAME READS ENHANCED PICKUP ACQUISITION RANGE. USE IT.' },
    TANK:  { text: 'MOTHERSHIP: NOTE: YOUR TANK FRAME PROVIDES SUPERIOR EXOSUIT ENDURANCE. O₂ DRAIN IS REDUCED.' },
    ENGINEER: { text: 'MOTHERSHIP: NOTE: YOUR ENGINEER FRAME GRANTS 20% CONSOLE DISCOUNT. PRIORITIZE UPGRADES EARLY.' }
};

const CHOICE_REPLY = {
    skip: 'MOTHERSHIP: ACKNOWLEDGED. RETURN CACHES TO THE SALVAGE CONSOLE.',
    tutorial: 'MOTHERSHIP: CONFIRMED. DISPLAYING OPERATIONAL BRIEFING NOW.'
};

const O2_MILESTONE_LINES = {
    SCOUT: [
        { text: "SYSTEM: O₂ FIELD LIFE SUPPORT AT 100%. BASE CONSOLE STABILIZED.", pauseMs: 400 },
        { text: "MOTHERSHIP: AGENT. SCAN DETECTS A POWERED FABRICATION FOUNDRY IN SECTOR 9." },
        { text: "MOTHERSHIP: COARDS UPLOADED TO THE COMPASS. GO AND LOCATE THAT FOUNDRY FOR GEAR PRINTING." },
        { text: "WARNING: RADAR WARNING! A RETALIATION BOSS SIGNATURE IS CLOSING ON THE BASE." }
    ],
    TANK: [
        { text: "SYSTEM: O₂ FIELD ACTIVE. STABILIZER SHIELD ENGAGED.", pauseMs: 400 },
        { text: "MOTHERSHIP: TANK UNIT. LONG-RANGE SCANNER HAS RETRIEVED FABRICATOR SIGNAL COARDS." },
        { text: "MOTHERSHIP: WE NEED THAT PRINTING STATION OPERATIONAL. LOCATE THE FOUNDRY IMMEDIATELY." },
        { text: "ALERT: DEFENSIVE GRID WARNING! A HUGE CYBERSNAIL BOSS RETALIATION IS ON APPROACH." }
    ],
    ENGINEER: [
        { text: "SYSTEM: O₂ GRID ONLINE. POWER DISTRIBUTED TO BASE FIXTURES.", pauseMs: 400 },
        { text: "MOTHERSHIP: ENGINEER. AN ACTIVE FABRICATOR SIGNAL HAS BEEN INTERCEPTED NEARBY." },
        { text: "MOTHERSHIP: FAB BAY ACCESSIBLE VIA IN-WORLD FOUNDRY. FOLLOW THE RADAR COMPASS EDGE." },
        { text: "CAUTION: MILESTONE PROVOKED! A RETALIATION BOSS HAS INITIATED A COUNTERATTACK." }
    ]
};

const MILESTONE_LINES = {
    o2Bubble: O2_MILESTONE_LINES,
    hullExpansion: {
        SCOUT: [
            { text: 'SYSTEM: HULL INTEGRITY EXPANDED. STRUCTURAL CAPACITY INCREASED.', pauseMs: 400 },
            { text: 'MOTHERSHIP: CRYOGENIC SHIELDING IS OPERATIONAL. A RETALIATION SIGNATURE IS APPROACHING.' }
        ],
        TANK: [
            { text: 'SYSTEM: HEAVY SHIP PLATING ENGAGED. STRUCTURAL CAPACITY INCREASED.', pauseMs: 400 },
            { text: 'MOTHERSHIP: HULL ENHANCEMENTS COMPLETE. A CRYOGENIC RETALIATION SIGNATURE IS APPROACHING.' }
        ],
        ENGINEER: [
            { text: 'SYSTEM: BULKHEAD INTEGRATION STABILIZED. STRUCTURAL CAPACITY INCREASED.', pauseMs: 400 },
            { text: 'MOTHERSHIP: HULL BAY IS ONLINE. A CRYOGENIC RETALIATION SIGNATURE IS APPROACHING.' }
        ]
    },
    radarNode: {
        SCOUT: [
            { text: 'SYSTEM: SCANNER MAST ONLINE. RADAR FIELD ESTABLISHED.', pauseMs: 400 },
            { text: 'MOTHERSHIP: BIOTIC ZONE READINGS UPLOADED. A RETALIATION SIGNATURE IS CLOSING IN.' }
        ],
        TANK: [
            { text: 'SYSTEM: RADAR ANTENNA ENGAGED. SIGNAL RETRIEVAL OPTIMIZED.', pauseMs: 400 },
            { text: 'MOTHERSHIP: SCANNER MAST IS ONLINE. A RETALIATION SIGNATURE IS CLOSING IN.' }
        ],
        ENGINEER: [
            { text: 'SYSTEM: UPLINK TERMINAL SYNCHRONIZED. RADAR TRANSMITTER ACTIVE.', pauseMs: 400 },
            { text: 'MOTHERSHIP: RADAR MATRIX LOCKED. A RETALIATION SIGNATURE IS CLOSING IN.' }
        ]
    },
    reactorCompressor: {
        SCOUT: [
            { text: 'SYSTEM: REACTOR COMPRESSOR ACTIVE. POWER GRID STABILIZED.', pauseMs: 400 },
            { text: 'MOTHERSHIP: FINAL SYSTEM REBOOT COMMENCING. DEFEND THE WRECK.' },
            { text: 'MOTHERSHIP: ...WAIT. THE CORE READS INCOMPLETE. ONE COMPONENT IS STILL MISSING.', pauseMs: 400 },
            { text: 'SYSTEM: DEEP STRUCTURE SIGNAL LOCKED, FAR PAST THE BIO SECTOR. COORDINATES ON THE FIELD COMPASS.' }
        ],
        TANK: [
            { text: 'SYSTEM: POWER REACTOR GRID ENGAGED. FULL SHIELD ENERGY RESTORED.', pauseMs: 400 },
            { text: 'MOTHERSHIP: POWER COMPRESSOR STABILIZED. DEFEND THE WRECK.' },
            { text: 'MOTHERSHIP: ...HOLD. CORE MANIFEST INCOMPLETE. ONE COMPONENT IS STILL MISSING.', pauseMs: 400 },
            { text: 'SYSTEM: DEEP STRUCTURE SIGNAL LOCKED, FAR PAST THE BIO SECTOR. COORDINATES ON THE FIELD COMPASS.' }
        ],
        ENGINEER: [
            { text: 'SYSTEM: COMPRESSOR CONTROL ACTIVE. POWER CHANNELS SYNCHRONIZED.', pauseMs: 400 },
            { text: 'MOTHERSHIP: REACTOR AUXILIARY ONLINE. DEFEND THE WRECK.' },
            { text: 'MOTHERSHIP: ...ANOMALY. CORE CHECKSUM FAILS — ONE COMPONENT IS STILL MISSING.', pauseMs: 400 },
            { text: 'SYSTEM: DEEP STRUCTURE SIGNAL LOCKED, FAR PAST THE BIO SECTOR. COORDINATES ON THE FIELD COMPASS.' }
        ]
    }
};

export class DialogueManager {
    // Movement, vitals, pickup, HUD counter, dead ends, enemy intel, compass,
    // console, console access, deposit, goals -- keep in sync with the
    // _trackTutorialProgress(N) calls in startTutorialSequence.
    static TUTORIAL_STEP_COUNT = 11;

    constructor({
        dialogId = 'mothership-dialogue',
        panelId = 'mothership-dialogue-panel',
        bodyId = 'mothership-dialogue-body',
        classBadgeId = 'mothership-class-badge',
        choicesId = 'mothership-dialogue-choices',
        skipChoiceId = 'mothership-choice-skip',
        tutorialChoiceId = 'mothership-choice-tutorial',
        tutorialPromptId = 'tutorial-prompt',
        tutorialPromptTextId = 'tutorial-prompt-text',
        tutorialPromptIconId = 'tutorial-prompt-icon',
        closeButtonId = 'close-mothership-dialogue',
        setInputEnabled = null
    } = {}) {
        this.dialogEl = document.getElementById(dialogId);
        this.panelEl = document.getElementById(panelId);
        this.bodyEl = document.getElementById(bodyId);
        this.classBadgeEl = document.getElementById(classBadgeId);
        this.choicesEl = document.getElementById(choicesId);
        this.skipBtn = document.getElementById(skipChoiceId);
        this.tutorialBtn = document.getElementById(tutorialChoiceId);

        this.tutorialPromptEl = document.getElementById(tutorialPromptId);
        this.tutorialPromptTextEl = document.getElementById(tutorialPromptTextId);
        this.tutorialPromptIconEl = document.getElementById(tutorialPromptIconId);
        this.closeBtn = document.getElementById(closeButtonId);

        this.setInputEnabled = typeof setInputEnabled === 'function' ? setInputEnabled : null;

        this.dialogueRunId = 0;
        this.activeDialogueRunId = 0;
        this.activeChoiceResolver = null;
        this.currentPlayerType = 'SCOUT';

        // Default skip-button copy captured once so temporary relabels (milestone
        // / brief transmissions) always restore to a known-good state even when
        // dialogues overlap or cancel each other mid-flight.
        this._defaultSkipLabel = this.skipBtn?.querySelector('.choice-card__label')?.textContent ?? '';
        this._defaultSkipHint = this.skipBtn?.querySelector('.choice-card__hint')?.textContent ?? '';

        this.tutorialRunId = 0;
        this.activeTutorialRunId = 0;
        this.activeTutorialPromptCard = null;

        this.handleDialogueKey = (event) => {
            if (!this.activeDialogueRunId) return;
            if (event.code === 'Escape') {
                event.preventDefault();
                this.requestSkip();
                return;
            }
            if (event.code === 'Enter' || event.code === 'Space') {
                event.preventDefault();
                if (this.isTyping) {
                    this.completeTypingInstantly = true;
                } else if (this.choicesEl && !this.choicesEl.classList.contains('hidden')) {
                    const active = document.activeElement;
                    if (active === this.tutorialBtn || (this.tutorialBtn?.classList.contains('selected') && active !== this.skipBtn)) {
                        this.resolveChoice('tutorial');
                    } else {
                        this.resolveChoice('skip');
                    }
                }
                return;
            }
            if (this.choicesEl && !this.choicesEl.classList.contains('hidden')) {
                const availableChoices = [this.skipBtn, this.tutorialBtn].filter(
                    (btn) => btn && !btn.classList.contains('hidden')
                );
                if (['KeyW', 'KeyA', 'ArrowUp', 'ArrowLeft'].includes(event.code)) {
                    event.preventDefault();
                    if (availableChoices.length) {
                        const target = availableChoices[0];
                        target.focus();
                        target.classList.add('selected');
                        availableChoices[1]?.classList.remove('selected');
                    }
                    return;
                }
                if (['KeyS', 'KeyD', 'ArrowDown', 'ArrowRight'].includes(event.code)) {
                    event.preventDefault();
                    if (availableChoices.length) {
                        const target = availableChoices[availableChoices.length - 1];
                        target.focus();
                        target.classList.add('selected');
                        availableChoices[0]?.classList.remove('selected');
                    }
                    return;
                }
            }
            if (event.code === 'Digit1') {
                event.preventDefault();
                this.resolveChoice('skip');
                return;
            }
            if (event.code === 'Digit2') {
                if (this.tutorialBtn && !this.tutorialBtn.classList.contains('hidden')) {
                    event.preventDefault();
                    this.resolveChoice('tutorial');
                }
            }
        };

        this.skipBtn?.addEventListener('click', () => {
            this.resolveChoice('skip');
        });
        this.tutorialBtn?.addEventListener('click', () => {
            this.resolveChoice('tutorial');
        });
        this.closeBtn?.addEventListener('click', () => {
            this.requestSkip();
        });
        this.tutorialPromptEl?.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            this.hideTutorialPrompt();
        });
    }

    async openMothershipDialogue({ playerType = 'SCOUT' } = {}) {
        if (!this.dialogEl || !this.panelEl || !this.bodyEl || !this.choicesEl) {
            return 'skip';
        }

        this.cancelDialogue();

        const runId = ++this.dialogueRunId;
        this.activeDialogueRunId = runId;

        this.applyClassTheme(playerType);
        this.bodyEl.replaceChildren();
        this.choicesEl.classList.add('hidden');
        this.choicesEl.classList.remove('is-visible');

        this.dialogEl.classList.remove('hidden');
        this.dialogEl.classList.remove('is-revealed');
        this.dialogEl.setAttribute('aria-hidden', 'false');
        this.panelEl.classList.remove('is-closing');

        requestAnimationFrame(() => {
            if (this.activeDialogueRunId !== runId) return;
            this.panelEl.classList.add('is-open');
            window.setTimeout(() => {
                if (this.activeDialogueRunId !== runId) return;
                this.dialogEl.classList.add('is-revealed');
            }, 220);
        });

        this.setInputEnabled?.(false);
        window.AudioManager?.play('door_slide_horiz', { volume: 0.5 });
        this.initDialogueListeners();

        const allLines = [...MOTHERSHIP_LINES];
        const classBriefing = CLASS_BRIEFING_LINES[playerType];
        if (classBriefing) {
            allLines.splice(allLines.length - 1, 0, classBriefing);
        }

        this.determineSpeakerSetup(allLines);

        for (const line of allLines) {
            const resolvedLine = line.text.replace('{CLASS}', playerType);
            await this.typeLine(runId, resolvedLine);
            if (!this.isDialogueRunActive(runId)) return 'skip';

            const pauseMs = line.pauseMs ?? DIALOGUE_LINE_GAP_MS;
            await this.sleep(runId, pauseMs);
            if (!this.isDialogueRunActive(runId)) return 'skip';
        }

        this.choicesEl.classList.remove('hidden');
        requestAnimationFrame(() => {
            if (!this.isDialogueRunActive(runId)) return;
            this.choicesEl.classList.add('is-visible');
            if (this.skipBtn && !this.skipBtn.classList.contains('hidden')) {
                this.skipBtn.focus();
                this.skipBtn.classList.add('selected');
                this.tutorialBtn?.classList.remove('selected');
            } else if (this.tutorialBtn && !this.tutorialBtn.classList.contains('hidden')) {
                this.tutorialBtn.focus();
                this.tutorialBtn.classList.add('selected');
            }
            // Choices reduce available text height; re-pin to newest line.
            this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
            window.setTimeout(() => {
                if (!this.isDialogueRunActive(runId)) return;
                this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
            }, 40);
        });
        window.AudioManager?.play('class_lock', { volume: 0.4 });

        const choice = await new Promise((resolve) => {
            this.activeChoiceResolver = resolve;
        });
        if (!this.isDialogueRunActive(runId)) return 'skip';

        window.AudioManager?.play('ui_click', { volume: 0.6 });
        await this.typeLine(runId, CHOICE_REPLY[choice] ?? CHOICE_REPLY.skip);
        await this.sleep(runId, 260);

        await this.closeDialogue(runId);
        return choice;
    }

    async openO2MilestoneDialogue({ playerType = 'SCOUT', goalKey = 'o2Bubble' } = {}) {
        if (!this.dialogEl || !this.panelEl || !this.bodyEl || !this.choicesEl) {
            return;
        }

        this.cancelDialogue();

        const runId = ++this.dialogueRunId;
        this.activeDialogueRunId = runId;

        this.applyClassTheme(playerType);
        this.bodyEl.replaceChildren();
        this.choicesEl.classList.add('hidden');
        this.choicesEl.classList.remove('is-visible');

        this.dialogEl.classList.remove('hidden');
        this.dialogEl.classList.remove('is-revealed');
        this.dialogEl.setAttribute('aria-hidden', 'false');
        this.panelEl.classList.remove('is-closing');

        requestAnimationFrame(() => {
            if (this.activeDialogueRunId !== runId) return;
            this.panelEl.classList.add('is-open');
            window.setTimeout(() => {
                if (this.activeDialogueRunId !== runId) return;
                this.dialogEl.classList.add('is-revealed');
            }, 220);
        });

        this.setInputEnabled?.(false);
        window.AudioManager?.play('door_slide_horiz', { volume: 0.5 });
        this.initDialogueListeners();

        const milestoneLines = MILESTONE_LINES[goalKey] ?? O2_MILESTONE_LINES;
        const lines = milestoneLines[playerType] ?? milestoneLines.SCOUT;
        this.determineSpeakerSetup(lines);

        for (const line of lines) {
            await this.typeLine(runId, line.text);
            if (!this.isDialogueRunActive(runId)) return;

            const pauseMs = line.pauseMs ?? DIALOGUE_LINE_GAP_MS;
            await this.sleep(runId, pauseMs);
            if (!this.isDialogueRunActive(runId)) return;
        }

        // Configure choices to show a single button
        this.setSkipChoiceCopy('[A] ACKNOWLEDGED. GET READY.', 'CLOSE AND DEFEND BASE');

        // Hide tutorial button for this dialogue
        if (this.tutorialBtn) this.tutorialBtn.classList.add('hidden');

        this.choicesEl.classList.remove('hidden');
        requestAnimationFrame(() => {
            if (!this.isDialogueRunActive(runId)) return;
            this.choicesEl.classList.add('is-visible');
            this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
            window.setTimeout(() => {
                if (!this.isDialogueRunActive(runId)) return;
                this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
            }, 40);
        });
        window.AudioManager?.play('class_lock', { volume: 0.4 });

        await new Promise((resolve) => {
            this.activeChoiceResolver = resolve;
        });

        // Restore original labels
        this.restoreSkipChoiceCopy();
        if (this.tutorialBtn) this.tutorialBtn.classList.remove('hidden');

        if (!this.isDialogueRunActive(runId)) return;

        window.AudioManager?.play('ui_click', { volume: 0.6 });
        await this.closeDialogue(runId);
    }

    async openBriefTransmission({ playerType = 'SCOUT', lines = [] } = {}) {
        if (!this.dialogEl || !this.panelEl || !this.bodyEl || !this.choicesEl) return;
        if (this.activeDialogueRunId) {
            // Another dialogue owns the panel — wait for it to finish instead of
            // silently dropping this transmission (the old behavior lost text).
            const idle = await this.waitForDialogueIdle(15000);
            if (!idle) return;
        }

        const normalizedLines = lines
            .map((line) => String((line && typeof line === 'object' ? line.text : line) ?? '').trim())
            .filter(Boolean);
        if (!normalizedLines.length) return;

        this.cancelDialogue();

        const runId = ++this.dialogueRunId;
        this.activeDialogueRunId = runId;

        this.applyClassTheme(playerType);
        this.bodyEl.replaceChildren();
        this.choicesEl.classList.add('hidden');
        this.choicesEl.classList.remove('is-visible');

        this.dialogEl.classList.remove('hidden');
        this.dialogEl.classList.remove('is-revealed');
        this.dialogEl.setAttribute('aria-hidden', 'false');
        this.panelEl.classList.remove('is-closing');

        requestAnimationFrame(() => {
            if (this.activeDialogueRunId !== runId) return;
            this.panelEl.classList.add('is-open');
            window.setTimeout(() => {
                if (this.activeDialogueRunId !== runId) return;
                this.dialogEl.classList.add('is-revealed');
            }, 160);
        });

        this.setInputEnabled?.(false);
        window.AudioManager?.play('door_slide_horiz', { volume: 0.42 });
        this.initDialogueListeners();
        this.determineSpeakerSetup(normalizedLines);

        for (const line of normalizedLines) {
            await this.typeLine(runId, line);
            if (!this.isDialogueRunActive(runId)) return;
            await this.sleep(runId, 320);
        }

        this.setSkipChoiceCopy('[A] CONTINUE', 'DISMISS TRANSMISSION');
        this.tutorialBtn?.classList.add('hidden');
        this.choicesEl.classList.remove('hidden');
        requestAnimationFrame(() => this.choicesEl.classList.add('is-visible'));

        await new Promise((resolve) => {
            this.activeChoiceResolver = resolve;
        });

        this.restoreSkipChoiceCopy();
        this.tutorialBtn?.classList.remove('hidden');
        if (!this.isDialogueRunActive(runId)) {
            this.setInputEnabled?.(true);
            return;
        }

        await this.closeDialogue(runId);
        this.setInputEnabled?.(true);
    }

    async startTutorialSequence({ game } = {}) {
        if (!game || !this.tutorialPromptEl) {
            return;
        }

        this.cancelTutorial();
        const runId = ++this.tutorialRunId;
        this.activeTutorialRunId = runId;

        // docs/objective-system-spec.md rollout step 6 (tutorial, last).
        // TUTORIAL_STEP_COUNT below must match the number of _trackTutorialProgress
        // calls after it -- a mismatch just under/over-reports progress, it
        // doesn't break the sequence itself.
        window.objectiveRegistry?.trackObjective?.({
            id: 'tutorial:onboarding',
            source: 'tutorial',
            label: 'ONBOARDING',
            current: 0,
            target: DialogueManager.TUTORIAL_STEP_COUNT,
            priority: 90
        });

        await this.tutorialStepMovement(runId, game);
        if (!this.isTutorialRunActive(runId)) return;
        this._trackTutorialProgress(1);

        await this.tutorialStepVitals(runId);
        if (!this.isTutorialRunActive(runId)) return;
        this._trackTutorialProgress(2);

        await this.tutorialStepPickup(runId);
        if (!this.isTutorialRunActive(runId)) return;
        this._trackTutorialProgress(3);

        await this.tutorialStepHudCounter(runId);
        if (!this.isTutorialRunActive(runId)) return;
        this._trackTutorialProgress(4);

        await this.tutorialStepDeadEnds(runId);
        if (!this.isTutorialRunActive(runId)) return;
        this._trackTutorialProgress(5);

        await this.tutorialStepEnemyIntel(runId);
        if (!this.isTutorialRunActive(runId)) return;
        this._trackTutorialProgress(6);

        await this.tutorialStepCompass(runId);
        if (!this.isTutorialRunActive(runId)) return;
        this._trackTutorialProgress(7);

        await this.tutorialStepConsole(runId, game);
        if (!this.isTutorialRunActive(runId)) return;
        this._trackTutorialProgress(8);

        await this.tutorialStepConsoleAccess(runId);
        if (!this.isTutorialRunActive(runId)) return;
        this._trackTutorialProgress(9);

        await this.tutorialStepDeposit(runId);
        if (!this.isTutorialRunActive(runId)) return;
        this._trackTutorialProgress(10);

        await this.tutorialStepGoals(runId);
        if (!this.isTutorialRunActive(runId)) return;
        this._trackTutorialProgress(11);

        await this.showTutorialPrompt(runId, {
            icon: '✓',
            text: 'GOOD. YOU KNOW WHAT TO DO, AGENT.'
        });
        window.AudioManager?.play('class_lock', { volume: 0.5 });
        await this.sleep(runId, 3000);

        this.hideTutorialPrompt(runId);
        this.activeTutorialRunId = 0;
        window.objectiveRegistry?.resolveObjective?.('tutorial:onboarding', 'complete');
    }

    _trackTutorialProgress(current) {
        window.objectiveRegistry?.trackObjective?.({
            id: 'tutorial:onboarding',
            current,
            target: DialogueManager.TUTORIAL_STEP_COUNT
        });
    }

    cancelDialogue() {
        if (!this.activeDialogueRunId) return;

        this.activeDialogueRunId = 0;
        this.activeChoiceResolver?.('skip');
        this.activeChoiceResolver = null;

        this.cleanupDialogueListeners();
        this.panelEl?.classList.remove('is-open', 'is-closing');
        this.dialogEl?.classList.add('hidden');
        this.dialogEl?.classList.remove('is-revealed');
        this.dialogEl?.setAttribute('aria-hidden', 'true');
        this.choicesEl?.classList.add('hidden');
        this.choicesEl?.classList.remove('is-visible');

        const stablePortraitEl = document.getElementById('dialogue-stable-portrait');
        if (stablePortraitEl) stablePortraitEl.classList.add('hidden');
        this.panelEl?.classList.remove('dialogue-layout--single-speaker');
        this.restoreSkipChoiceCopy();
        this.tutorialBtn?.classList.remove('hidden');

        // Tearing a dialogue down returns control to the player. Callers that
        // open a new dialogue immediately re-disable input themselves; callers
        // that end gameplay (game over) also disable it on their own path.
        this.setInputEnabled?.(true);
    }

    // Wait (poll) until no dialogue run owns the shared panel. Returns true when
    // idle, false if the timeout elapsed while still busy.
    waitForDialogueIdle(timeoutMs = 10000) {
        return new Promise((resolve) => {
            const startedAt = performance.now();
            const check = () => {
                if (!this.activeDialogueRunId) {
                    resolve(true);
                    return;
                }
                if (performance.now() - startedAt >= timeoutMs) {
                    resolve(false);
                    return;
                }
                window.setTimeout(check, 150);
            };
            check();
        });
    }

    setSkipChoiceCopy(label, hint) {
        const skipLabel = this.skipBtn?.querySelector('.choice-card__label');
        const skipHint = this.skipBtn?.querySelector('.choice-card__hint');
        if (skipLabel) skipLabel.textContent = label;
        if (skipHint) skipHint.textContent = hint;
    }

    restoreSkipChoiceCopy() {
        this.setSkipChoiceCopy(this._defaultSkipLabel, this._defaultSkipHint);
    }

    cancelTutorial() {
        if (!this.activeTutorialRunId) return;
        this.activeTutorialRunId = 0;
        window.objectiveRegistry?.resolveObjective?.('tutorial:onboarding', 'abandoned');
        this.hideTutorialPrompt();
        document.querySelectorAll('.tutorial-prompt[data-tutorial-stack-card="true"]').forEach((prompt) => {
            this.dismissTutorialCard(prompt);
        });

        // Clean up any potential focus pulses
        document.getElementById('vitals-panel')?.classList.remove('tutorial-focus-pulse');
        document.getElementById('pickup-counter-panel')?.classList.remove('tutorial-focus-pulse');
        document.getElementById('weapon-status-panel')?.classList.remove('tutorial-focus-pulse');
        document.querySelector('.touch-move-control__compass-face')?.classList.remove('tutorial-focus-pulse');
        document.getElementById('console-hud-prompt')?.classList.remove('tutorial-focus-pulse');
        document.getElementById('terminal-deposit-all')?.classList.remove('tutorial-focus-pulse');
        document.getElementById('o2-generator-section')?.classList.remove('tutorial-focus-pulse');
    }

    async closeDialogue(runId) {
        if (!this.isDialogueRunActive(runId)) return;

        window.AudioManager?.play('door_slam_vertical', { volume: 0.4 });

        this.panelEl.classList.remove('is-open');
        this.panelEl.classList.add('is-closing');
        await this.sleep(runId, 280);

        if (!this.isDialogueRunActive(runId)) return;

        this.panelEl.classList.remove('is-closing');
        this.dialogEl.classList.add('hidden');
        this.dialogEl.classList.remove('is-revealed');
        this.dialogEl.setAttribute('aria-hidden', 'true');
        this.choicesEl.classList.add('hidden');
        this.choicesEl.classList.remove('is-visible');

        const stablePortraitEl = document.getElementById('dialogue-stable-portrait');
        if (stablePortraitEl) stablePortraitEl.classList.add('hidden');
        this.panelEl.classList.remove('dialogue-layout--single-speaker');

        this.cleanupDialogueListeners();

        this.activeDialogueRunId = 0;
        this.activeChoiceResolver = null;
        this.setInputEnabled?.(true);
    }

    requestSkip() {
        this.cancelDialogue();
    }

    async typeLine(runId, line) {
        if (!this.isDialogueRunActive(runId)) return;

        const speaker = this.getDialogueSpeaker(line);
        const row = document.createElement('div');
        if (this.isSingleSpeaker) {
            row.className = 'mothership-line mothership-line--no-portrait';
            row.innerHTML = `
                <div class="mothership-line__body">
                    <div class="mothership-line__text"></div>
                </div>
            `;
        } else {
            row.className = 'mothership-line';
            row.innerHTML = `
                <div class="mothership-line__head" aria-hidden="true">
                    <img class="mothership-line__portrait" alt="" />
                    <span class="mothership-line__scanline"></span>
                </div>
                <div class="mothership-line__body">
                    <div class="mothership-line__speaker"></div>
                    <div class="mothership-line__text"></div>
                </div>
            `;
            row.querySelector('.mothership-line__portrait').src = assetUrl(speaker.portrait);
            row.querySelector('.mothership-line__speaker').textContent = speaker.name;
        }

        const isIntimate = /[a-z]/.test(speaker.cleanText) && !line.startsWith('SYSTEM:') && !line.startsWith('WARNING:') && !line.startsWith('ALERT:') && !line.startsWith('CAUTION:');
        if (isIntimate) {
            row.classList.add('mothership-line--intimate');
        }

        if (speaker.name === 'THE QUEEN') {
            playQueenSting();
        }

        const textEl = row.querySelector('.mothership-line__text');
        textEl.textContent = '> █';
        this.bodyEl.appendChild(row);
        this.bodyEl.scrollTop = this.bodyEl.scrollHeight;

        const textToType = speaker.cleanText;
        this.isTyping = true;
        this.completeTypingInstantly = false;

        for (let index = 0; index < textToType.length; index++) {
            if (!this.isDialogueRunActive(runId)) {
                this.isTyping = false;
                return;
            }
            if (this.completeTypingInstantly) {
                break;
            }

            if (index === 0) {
                window.AudioManager?.playVoiceForMessage(speaker, textToType);
            }

            const nextText = textToType.slice(0, index + 1);
            textEl.textContent = `> ${nextText}█`;
            this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
            const isSpace = (textToType[index] === ' ');
            const isStart = (index === 0);
            const playChance = isSpace || isStart || (Math.random() < 0.22);
            if (playChance) {
                window.AudioManager?.playVoiceForMessage(speaker, textToType.slice(index, index + 3));
            }
            
            let charDelay = DIALOGUE_CHAR_INTERVAL_MS;
            if (typeof window !== 'undefined' && window.state?.settings?.textSpeed) {
                const speed = window.state.settings.textSpeed;
                if (speed === 'fast') charDelay = 10;
                else if (speed === 'instant') charDelay = 0;
            }

            if (charDelay > 0) {
                await this.sleep(runId, charDelay);
            }
        }

        this.isTyping = false;
        if (!this.isDialogueRunActive(runId)) return;
        textEl.textContent = `> ${textToType}`;
    }

    getDialogueSpeaker(line = '') {
        const text = String(line ?? '').trim();
        const playerType = this.currentPlayerType ?? 'SCOUT';
        let cleanText = text;
        let name;
        let portrait;

        if (/^(SYSTEM|WARNING|ALERT|CAUTION):/.test(text)) {
            name = 'EXOSUIT OS';
            portrait = '/lore_portraits/survivor_04.webp';
            cleanText = text.replace(/^(SYSTEM|WARNING|ALERT|CAUTION):\s*/, '');
        } else if (/^(BUNKER|FACILITIES):/.test(text)) {
            name = 'BUNKER AUTO-ANNOUNCER';
            portrait = '/lore_portraits/survivor_08.webp';
            cleanText = text.replace(/^(BUNKER|FACILITIES):\s*/, '');
        } else if (text.startsWith('MOTHERSHIP:')) {
            name = 'MOTHERSHIP COMMAND';
            portrait = '/lore_portraits/survivor_00.webp';
            cleanText = text.replace(/^MOTHERSHIP:\s*/, '');
        } else if (text.startsWith('SISTER MARTHA:')) {
            name = 'SISTER MARTHA';
            portrait = '/lore_portraits/tallow_martha.webp';
            cleanText = text.replace(/^SISTER MARTHA:\s*/, '');
        } else if (text.startsWith('COMMANDER BRIGGS:')) {
            name = 'COMMANDER BRIGGS';
            portrait = '/lore_portraits/vesper_briggs.webp';
            cleanText = text.replace(/^COMMANDER BRIGGS:\s*/, '');
        } else if (text.startsWith('OVERSEER KAELEN:')) {
            name = 'OVERSEER KAELEN';
            portrait = '/lore_portraits/meridian_kaelen.jpg';
            cleanText = text.replace(/^OVERSEER KAELEN:\s*/, '');
        } else if (/^(KAELEN|MARTHA|BRIGGS|NAHL|VEY|RHUN):/.test(text)) {
            const speakerMap = {
                KAELEN: { name: 'OVERSEER KAELEN', portrait: '/lore_portraits/survivor_10.webp' },
                MARTHA: { name: 'SISTER MARTHA', portrait: '/lore_portraits/survivor_09.webp' },
                BRIGGS: { name: 'COMMANDER BRIGGS', portrait: '/lore_portraits/survivor_06.webp' },
                NAHL: { name: 'NAHL, THE SUTURE', portrait: '/lore_portraits/survivor_05.webp' },
                VEY: { name: 'VEY, THE LISTENER', portrait: '/lore_portraits/survivor_11.webp' },
                RHUN: { name: 'RHUN, THE SHIELD', portrait: '/lore_portraits/queen_00.webp' }
            };
            const prefix = text.split(':')[0];
            const mapped = speakerMap[prefix];
            name = mapped.name;
            portrait = mapped.portrait;
            cleanText = text.replace(/^[A-Z]+:\s*/, '');
        } else if (text.startsWith('QUEEN:')) {
            name = 'THE QUEEN';
            portrait = '/lore_portraits/queen_00.webp';
            cleanText = text.replace(/^QUEEN:\s*/, '');
        } else {
            if (playerType === 'TANK') {
                name = 'TANK OPERATOR LINK';
                portrait = '/lore_portraits/survivor_02.webp';
            } else if (playerType === 'ENGINEER') {
                name = 'ENGINEER OPERATOR LINK';
                portrait = '/lore_portraits/survivor_03.webp';
            } else {
                name = 'SCOUT OPERATOR LINK';
                portrait = '/lore_portraits/survivor_01.webp';
            }
        }
        return { name, portrait, cleanText };
    }

    determineSpeakerSetup(allLines) {
        const uniqueSpeakers = new Map();
        for (const line of allLines) {
            const speaker = this.getDialogueSpeaker(line.text ?? line);
            uniqueSpeakers.set(speaker.name, speaker);
        }

        const stablePortraitEl = document.getElementById('dialogue-stable-portrait');
        const dialoguePanelEl = this.panelEl;

        if (uniqueSpeakers.size === 1) {
            this.isSingleSpeaker = true;
            const speakerInfo = Array.from(uniqueSpeakers.values())[0];

            if (stablePortraitEl) {
                const img = stablePortraitEl.querySelector('.dialogue-stable-portrait__img');
                if (img) img.src = assetUrl(speakerInfo.portrait);
                const nameEl = stablePortraitEl.querySelector('.dialogue-stable-portrait__name');
                if (nameEl) nameEl.textContent = speakerInfo.name;
                stablePortraitEl.classList.remove('hidden');
            }
            if (dialoguePanelEl) {
                dialoguePanelEl.classList.add('dialogue-layout--single-speaker');
            }
        } else {
            this.isSingleSpeaker = false;
            if (stablePortraitEl) {
                stablePortraitEl.classList.add('hidden');
            }
            if (dialoguePanelEl) {
                dialoguePanelEl.classList.remove('dialogue-layout--single-speaker');
            }
        }

        // Queen panel styling override (Sprint 19 Wave 3)
        const hasQueen = Array.from(uniqueSpeakers.keys()).some(name => name.includes('QUEEN') || name.includes('Queen') || name.includes('THE QUEEN'));
        if (hasQueen && dialoguePanelEl) {
            const obedience = (typeof window !== 'undefined' ? window.game?.act2?.getState?.()?.queenObedience : 0) ?? 0;
            if (obedience >= 1) {
                dialoguePanelEl.style.setProperty('--terminal-glow', '#f59e0b'); // amber
                dialoguePanelEl.style.setProperty('--terminal-glow-rgb', '245, 158, 11');
                dialoguePanelEl.classList.add('dialogue-layout--queen-warm');
                dialoguePanelEl.classList.remove('dialogue-layout--queen-hostile');
            } else {
                dialoguePanelEl.style.setProperty('--terminal-glow', '#ff2222'); // sharp red
                dialoguePanelEl.style.setProperty('--terminal-glow-rgb', '255, 34, 34');
                dialoguePanelEl.classList.add('dialogue-layout--queen-hostile');
                dialoguePanelEl.classList.remove('dialogue-layout--queen-warm');
            }
        } else if (dialoguePanelEl) {
            dialoguePanelEl.classList.remove('dialogue-layout--queen-warm', 'dialogue-layout--queen-hostile');
            // Reapply default class theme
            const theme = CLASS_COLORS[this.currentPlayerType] ?? CLASS_COLORS.SCOUT;
            dialoguePanelEl.style.setProperty('--terminal-glow', theme.glow);
            dialoguePanelEl.style.setProperty('--terminal-glow-rgb', theme.rgb);
        }
    }

    resolveChoice(choice) {
        if (!this.activeDialogueRunId) return;
        if (!this.activeChoiceResolver) return;

        const resolve = this.activeChoiceResolver;
        this.activeChoiceResolver = null;
        resolve(choice);
    }

    applyClassTheme(playerType) {
        const theme = CLASS_COLORS[playerType] ?? CLASS_COLORS.SCOUT;
        this.currentPlayerType = playerType;
        this.panelEl.style.setProperty('--terminal-glow', theme.glow);
        this.panelEl.style.setProperty('--terminal-glow-rgb', theme.rgb);
        if (this.tutorialPromptEl) {
            this.tutorialPromptEl.style.setProperty('--tutorial-glow', theme.glow);
            this.tutorialPromptEl.style.setProperty('--tutorial-glow-rgb', theme.rgb);
        }
        if (this.classBadgeEl) {
            this.classBadgeEl.textContent = `${playerType} LINK [ENCRYPTED]`;
        }
    }

    async tutorialStepMovement(runId, game) {
        await this.showTutorialPrompt(runId, {
            icon: 'WASD',
            text: 'WASD / ARROW KEYS — NAVIGATE THE STRUCTURE'
        });

        const startPos = game.getPlayerPosition?.() ?? { x: 0, z: 0 };
        let movedMs = 0;

        await this.waitUntil(runId, ({ deltaMs }) => {
            if (game.isPlayerMoving?.()) {
                movedMs += deltaMs;
            }
            const pos = game.getPlayerPosition?.() ?? startPos;
            const distance = Math.hypot((pos.x ?? 0) - (startPos.x ?? 0), (pos.z ?? 0) - (startPos.z ?? 0));
            return movedMs >= 2000 || distance > 3;
        }, { timeoutMs: 18000, intervalMs: 80 });

        this.hideTutorialPrompt(runId);
    }

    async tutorialStepVitals(runId) {
        await this.showTutorialPrompt(runId, {
            icon: '♥',
            text: 'VITALS ARE NOW IN THE TOP HUD. KEEP AN EYE ON HEARTS + O₂ AT ALL TIMES.'
        });

        const panel = document.getElementById('vitals-panel');
        panel?.classList.add('tutorial-focus-pulse');
        await this.sleep(runId, 3200);
        panel?.classList.remove('tutorial-focus-pulse');
        this.hideTutorialPrompt(runId);
    }

    async tutorialStepPickup(runId) {
        await this.showTutorialPrompt(runId, {
            icon: '◍',
            text: 'APPROACH SUPPLY CACHES. YOUR SUIT WILL AUTO-COLLECT THEM.'
        });

        await this.waitForWindowEvent(runId, 'pickup-collected', 45000);
        this.hideTutorialPrompt(runId);
    }

    async tutorialStepHudCounter(runId) {
        await this.showTutorialPrompt(runId, {
            icon: '◎',
            text: 'TRACK YOUR CACHE INVENTORY IN THE TOP PANEL.'
        });

        const panel = document.getElementById('pickup-counter-panel');
        panel?.classList.add('tutorial-focus-pulse');
        await this.sleep(runId, 3000);
        panel?.classList.remove('tutorial-focus-pulse');
        this.hideTutorialPrompt(runId);
    }

    async tutorialStepDeadEnds(runId) {
        await this.showTutorialPrompt(runId, {
            icon: '⬡',
            text: 'DEAD-END PILLAR CLUSTERS ARE REWARD CACHES — DENSER LOOT, NO ENEMIES. EXPLORE ALL BRANCHES.'
        });
        await this.sleep(runId, 3200);
        this.hideTutorialPrompt(runId);
    }

    async tutorialStepEnemyIntel(runId) {
        await this.showTutorialPrompt(runId, {
            icon: '!',
            text: 'HOSTILE INTEL: CYBER SNAILS TAKE 2 SHOTS. LAND ONE HIT TO EXPOSE THEIR WEAK STATE.'
        });

        const weaponPanel = document.getElementById('weapon-status-panel');
        weaponPanel?.classList.add('tutorial-focus-pulse');

        const hitEnemy = await this.waitForWindowEvent(runId, 'enemy-hit', 26000);
        if (hitEnemy) {
            await this.showTutorialPrompt(runId, {
                icon: '!',
                text: 'RED SNAIL = 1 HP REMAINING. IT WILL CHARGE FASTER AFTER THAT FIRST HIT.'
            });
            await this.sleep(runId, 2400);
        } else {
            await this.sleep(runId, 1400);
        }

        weaponPanel?.classList.remove('tutorial-focus-pulse');
        this.hideTutorialPrompt(runId);
    }

    async tutorialStepCompass(runId) {
        await this.showTutorialPrompt(runId, {
            icon: 'N',
            text: "THE COMPASS MARKS YOUR SHIP'S CRASH SITE. THAT IS YOUR EXTRACTION POINT."
        });

        const compass = document.querySelector('.touch-move-control__compass-face');
        compass?.classList.add('tutorial-focus-pulse');
        await this.sleep(runId, 4000);
        compass?.classList.remove('tutorial-focus-pulse');
        this.hideTutorialPrompt(runId);
    }

    async tutorialStepConsole(runId, game) {
        await this.showTutorialPrompt(runId, {
            icon: 'E',
            text: "WHEN YOU'RE READY, RETURN TO THE CONSOLE NEAR YOUR WRECK. PRESS [E] TO UPLINK."
        });

        const consolePrompt = document.getElementById('console-hud-prompt');
        consolePrompt?.classList.add('tutorial-focus-pulse');

        await this.waitUntil(runId, () => {
            const distance = Number(game.getActiveConsoleDistance?.());
            return Number.isFinite(distance) && distance <= 4;
        }, { timeoutMs: 20000, intervalMs: 80 });

        consolePrompt?.classList.remove('tutorial-focus-pulse');
        this.hideTutorialPrompt(runId);
    }

    async tutorialStepConsoleAccess(runId) {
        await this.showTutorialPrompt(runId, {
            icon: 'E',
            text: 'OPEN THE TERMINAL WITH [E] TO ACCESS BANKING AND THE O₂ GENERATOR MODULE.'
        });

        const modal = document.getElementById('console-terminal-modal');
        await this.waitUntil(runId, () => Boolean(modal && !modal.classList.contains('hidden')), {
            timeoutMs: 16000,
            intervalMs: 80
        });

        this.hideTutorialPrompt(runId);
    }

    async tutorialStepDeposit(runId) {
        await this.showTutorialPrompt(runId, {
            icon: '⤴',
            text: 'RUN LOOT HAS BEEN AUTOMATICALLY SECURED AND BANKED.'
        });
        await this.sleep(runId, 2600);
        this.hideTutorialPrompt(runId);
    }

    async tutorialStepGoals(runId) {
        await this.showTutorialPrompt(runId, {
            icon: '◈',
            text: 'REPAIR THE O₂ GENERATOR FIRST. UPGRADING AGAIN WILL EXPAND THE BLUE O₂ FIELD.'
        });

        const generatorSection = document.getElementById('o2-generator-section');
        generatorSection?.classList.add('tutorial-focus-pulse');

        const upgraded = await this.waitForWindowEvent(runId, 'o2-generator-upgraded', 18000);
        if (!upgraded) {
            await this.sleep(runId, 2200);
        }

        generatorSection?.classList.remove('tutorial-focus-pulse');
        this.hideTutorialPrompt(runId);

        await this.showTutorialPrompt(runId, {
            icon: '◌',
            text: 'WHEN THE BLUE CIRCLE APPEARS ON THE FLOOR, STAND INSIDE IT TO REFILL O₂.'
        });
        await this.sleep(runId, 2600);
        this.hideTutorialPrompt(runId);
    }

    async showTutorialPrompt(runId, { icon = '', text = '' } = {}) {
        if (!this.tutorialPromptEl) return;
        if (!this.isTutorialRunActive(runId)) return;

        const stack = document.querySelector('.hud-notification-stack');
        const prompt = this.tutorialPromptEl.cloneNode(true);
        prompt.removeAttribute('id');
        prompt.dataset.tutorialStackCard = 'true';
        // Keep tutorials in the same HUD hierarchy, but below the most urgent
        // system/radio cards so they don't crowd out other on-screen text.
        prompt.dataset.notificationPriority = '15';
        prompt.dataset.autoDismissMs = String(Math.max(3600, Math.min(7600, text.length * 45)));
        prompt.dataset.removeDelayMs = '220';
        prompt.classList.add('hud-stack-card');
        prompt.classList.add('hidden');
        prompt.classList.remove('is-visible', 'is-exiting');
        const promptIcon = prompt.querySelector('.tutorial-prompt__icon');
        const promptText = prompt.querySelector('.tutorial-prompt__text');
        if (promptIcon) {
            promptIcon.removeAttribute('id');
            promptIcon.textContent = icon;
            promptIcon.classList.toggle('hidden', !icon);
        }
        if (promptText) {
            promptText.removeAttribute('id');
            promptText.textContent = text;
        }
        prompt.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            this.dismissTutorialCard(prompt);
        });

        this.activeTutorialPromptCard = prompt;
        stack?.append(prompt);
        window.updateHudNotificationDeck?.();

        prompt.classList.remove('hidden', 'is-exiting');
        requestAnimationFrame(() => {
            if (!this.isTutorialRunActive(runId)) return;
            prompt.classList.add('is-visible');
            window.updateHudNotificationDeck?.();
        });

        const visibleCards = Array.from(document.querySelectorAll('.hud-stack-card:not(.hidden)'))
            .filter((card) => card.dataset.dismissing !== 'true');
        for (const oldCard of visibleCards.slice(5)) {
            this.dismissTutorialCard(oldCard);
        }
        window.updateHudNotificationDeck?.();
    }

    hideTutorialPrompt(runId = this.activeTutorialRunId) {
        if (runId && !this.isTutorialRunActive(runId) && runId !== this.activeTutorialRunId) return;

        this.dismissTutorialCard(this.activeTutorialPromptCard);
        this.activeTutorialPromptCard = null;
    }

    dismissTutorialCard(prompt) {
        if (!prompt || prompt.dataset.dismissing === 'true') return;
        if (typeof window.dismissHudNotificationCard === 'function') {
            window.dismissHudNotificationCard(prompt);
            return;
        }
        prompt.dataset.dismissing = 'true';
        prompt.classList.remove('is-visible');
        prompt.classList.add('is-exiting');
        window.setTimeout(() => prompt.remove(), 220);
    }

    waitUntil(runId, predicate, { timeoutMs = 10000, intervalMs = 100 } = {}) {
        return new Promise((resolve) => {
            const startedAt = performance.now();
            let previousTick = startedAt;

            const step = () => {
                if (!this.isTutorialRunActive(runId)) {
                    resolve(false);
                    return;
                }

                const now = performance.now();
                const elapsedMs = now - startedAt;
                const deltaMs = now - previousTick;
                previousTick = now;

                if (predicate({ elapsedMs, deltaMs })) {
                    resolve(true);
                    return;
                }

                if (elapsedMs >= timeoutMs) {
                    resolve(false);
                    return;
                }

                window.setTimeout(step, intervalMs);
            };

            step();
        });
    }

    waitForWindowEvent(runId, eventName, timeoutMs = 10000) {
        return new Promise((resolve) => {
            if (!this.isTutorialRunActive(runId)) {
                resolve(false);
                return;
            }

            let settled = false;
            const finish = (value) => {
                if (settled) return;
                settled = true;
                window.removeEventListener(eventName, onEvent);
                window.clearTimeout(timer);
                resolve(value);
            };

            const onEvent = () => finish(true);
            const timer = window.setTimeout(() => finish(false), timeoutMs);
            window.addEventListener(eventName, onEvent, { once: true });
        });
    }

    sleep(runId, delayMs) {
        // Adjust pause duration based on global textSpeed setting
        if (typeof window !== 'undefined' && window.state?.settings?.textSpeed) {
            const speed = window.state.settings.textSpeed;
            if (speed === 'fast') delayMs = Math.floor(delayMs / 2);
            else if (speed === 'instant') delayMs = 0;
        }

        if (delayMs <= 0) {
            return Promise.resolve(this.isDialogueRunActive(runId) || this.isTutorialRunActive(runId));
        }

        return new Promise((resolve) => {
            let elapsed = 0;
            const interval = 20;
            const check = () => {
                if (!this.isDialogueRunActive(runId) && !this.isTutorialRunActive(runId)) {
                    resolve(false);
                    return;
                }
                if (this.skipPause) {
                    this.skipPause = false;
                    resolve(true);
                    return;
                }
                elapsed += interval;
                if (elapsed >= delayMs) {
                    resolve(true);
                    return;
                }
                window.setTimeout(check, interval);
            };
            window.setTimeout(check, interval);
        });
    }

    isDialogueRunActive(runId) {
        return this.activeDialogueRunId === runId;
    }

    isTutorialRunActive(runId) {
        return this.activeTutorialRunId === runId;
    }

    initDialogueListeners() {
        window.addEventListener('keydown', this.handleDialogueKey);
        this.handlePanelClick = () => {
            if (this.isTyping) {
                this.completeTypingInstantly = true;
            } else {
                this.skipPause = true;
            }
        };
        this.panelEl?.addEventListener('click', this.handlePanelClick);
    }

    cleanupDialogueListeners() {
        window.removeEventListener('keydown', this.handleDialogueKey);
        if (this.handlePanelClick) {
            this.panelEl?.removeEventListener('click', this.handlePanelClick);
            this.handlePanelClick = null;
        }
    }
}

function playQueenSting() {
    if (typeof window === 'undefined' || !window.AudioManager || window.AudioManager.globalMuted) return;
    try {
        const audioCtx = window.AudioManager.audioCtx || window.audioCtx;
        if (!audioCtx) return;
        const now = audioCtx.currentTime;

        // Note 1: Eerie detuned triangle drone at 92.5Hz (F#2)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(92.5, now);

        // Lowpass filter to make it dark and heavy
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(180, now);

        osc1.connect(filter);
        filter.connect(gain1);
        gain1.connect(window.AudioManager.sfxGain || audioCtx.destination);

        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.linearRampToValueAtTime(0.24, now + 0.12);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

        osc1.start(now);
        osc1.stop(now + 1.0);

        // Note 2: Eerie slide down 0.22s later starting at 73.4Hz (D2) down to 55.0Hz (A1)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(73.4, now + 0.22);
        osc2.frequency.exponentialRampToValueAtTime(55.0, now + 0.85);

        osc2.connect(gain2);
        gain2.connect(window.AudioManager.sfxGain || audioCtx.destination);

        gain2.gain.setValueAtTime(0.001, now + 0.22);
        gain2.gain.linearRampToValueAtTime(0.35, now + 0.35);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.15);

        osc2.start(now + 0.22);
        osc2.stop(now + 1.25);
    } catch (err) {
        void err;
    }
}
import { assetUrl } from './assetUrl.js';
