const DIALOGUE_CHAR_INTERVAL_MS = 18;
const DIALOGUE_LINE_GAP_MS = 150;

const CLASS_COLORS = {
    SCOUT: { glow: '#7dff5a', rgb: '125, 255, 90' },
    TANK: { glow: '#ffb700', rgb: '255, 183, 0' },
    ENGINEER: { glow: '#00e5ff', rgb: '0, 229, 255' }
};

const MOTHERSHIP_LINES = [
    { text: "AGENT {CLASS}. YOU'RE ALIVE.", pauseMs: 400 },
    { text: 'YOUR SHIP TOOK A HYPERSONIC STRIKE ON DESCENT.' },
    { text: "YOU'VE CRASHED IN SECTOR 9. STRUCTURE UNKNOWN." },
    { text: 'SCATTERED SUPPLY CACHES ARE DETECTABLE BY YOUR SUIT.' },
    { text: 'SALVAGE CONSOLE IS NEAR YOUR WRECKAGE. UPLINK THERE FOR EXTRACTION.' },
    { text: 'AWAITING YOUR RESPONSE, AGENT.' }
];

const CLASS_BRIEFING_LINES = {
    SCOUT: { text: 'NOTE: YOUR SCOUT FRAME READS ENHANCED PICKUP ACQUISITION RANGE. USE IT.' },
    TANK:  { text: 'NOTE: YOUR TANK FRAME PROVIDES SUPERIOR EXOSUIT ENDURANCE. O₂ DRAIN IS REDUCED.' },
    ENGINEER: { text: 'NOTE: YOUR ENGINEER FRAME GRANTS 20% CONSOLE DISCOUNT. PRIORITIZE UPGRADES EARLY.' }
};

const CHOICE_REPLY = {
    skip: 'ACKNOWLEDGED. RETURN CACHES TO THE SALVAGE CONSOLE.',
    tutorial: 'CONFIRMED. DISPLAYING OPERATIONAL BRIEFING NOW.'
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

export class DialogueManager {
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

        this.tutorialRunId = 0;
        this.activeTutorialRunId = 0;

        this.handleDialogueKey = (event) => {
            if (!this.activeDialogueRunId) return;
            if (event.code === 'Escape') {
                event.preventDefault();
                this.requestSkip();
                return;
            }
            if (event.code === 'Enter' || event.code === 'Space') {
                event.preventDefault();
                this.resolveChoice('skip');
                return;
            }
            if (event.code === 'KeyA') {
                event.preventDefault();
                this.resolveChoice('skip');
                return;
            }
            if (event.code === 'KeyB') {
                event.preventDefault();
                this.resolveChoice('tutorial');
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
        window.addEventListener('keydown', this.handleDialogueKey);

        const allLines = [...MOTHERSHIP_LINES];
        const classBriefing = CLASS_BRIEFING_LINES[playerType];
        if (classBriefing) {
            allLines.splice(allLines.length - 1, 0, classBriefing);
        }

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

    async openO2MilestoneDialogue({ playerType = 'SCOUT' } = {}) {
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
        window.addEventListener('keydown', this.handleDialogueKey);

        const lines = O2_MILESTONE_LINES[playerType] ?? O2_MILESTONE_LINES.SCOUT;

        for (const line of lines) {
            await this.typeLine(runId, line.text);
            if (!this.isDialogueRunActive(runId)) return;

            const pauseMs = line.pauseMs ?? DIALOGUE_LINE_GAP_MS;
            await this.sleep(runId, pauseMs);
            if (!this.isDialogueRunActive(runId)) return;
        }

        // Configure choices to show a single button
        const skipLabel = this.skipBtn?.querySelector('.choice-card__label');
        const skipHint = this.skipBtn?.querySelector('.choice-card__hint');
        const origLabel = skipLabel ? skipLabel.textContent : '';
        const origHint = skipHint ? skipHint.textContent : '';

        if (skipLabel) skipLabel.textContent = "[A] ACKNOWLEDGED. GET READY.";
        if (skipHint) skipHint.textContent = "CLOSE AND DEFEND BASE";

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
        if (skipLabel) skipLabel.textContent = origLabel;
        if (skipHint) skipHint.textContent = origHint;
        if (this.tutorialBtn) this.tutorialBtn.classList.remove('hidden');

        if (!this.isDialogueRunActive(runId)) return;

        window.AudioManager?.play('ui_click', { volume: 0.6 });
        await this.closeDialogue(runId);
    }

    async startTutorialSequence({ game, touchControlsEnabled = false } = {}) {
        if (!game || !this.tutorialPromptEl) {
            return;
        }

        this.cancelTutorial();
        const runId = ++this.tutorialRunId;
        this.activeTutorialRunId = runId;

        await this.tutorialStepMovement(runId, game, touchControlsEnabled);
        if (!this.isTutorialRunActive(runId)) return;

        await this.tutorialStepVitals(runId);
        if (!this.isTutorialRunActive(runId)) return;

        await this.tutorialStepPickup(runId);
        if (!this.isTutorialRunActive(runId)) return;

        await this.tutorialStepHudCounter(runId);
        if (!this.isTutorialRunActive(runId)) return;

        await this.tutorialStepDeadEnds(runId);
        if (!this.isTutorialRunActive(runId)) return;

        await this.tutorialStepEnemyIntel(runId);
        if (!this.isTutorialRunActive(runId)) return;

        await this.tutorialStepCompass(runId);
        if (!this.isTutorialRunActive(runId)) return;

        await this.tutorialStepConsole(runId, game, touchControlsEnabled);
        if (!this.isTutorialRunActive(runId)) return;

        await this.tutorialStepConsoleAccess(runId, touchControlsEnabled);
        if (!this.isTutorialRunActive(runId)) return;

        await this.tutorialStepDeposit(runId);
        if (!this.isTutorialRunActive(runId)) return;

        await this.tutorialStepGoals(runId);
        if (!this.isTutorialRunActive(runId)) return;

        await this.showTutorialPrompt(runId, {
            icon: '✓',
            text: 'GOOD. YOU KNOW WHAT TO DO, AGENT.'
        });
        window.AudioManager?.play('class_lock', { volume: 0.5 });
        await this.sleep(runId, 3000);

        this.hideTutorialPrompt(runId);
        this.activeTutorialRunId = 0;
    }

    cancelDialogue() {
        if (!this.activeDialogueRunId) return;

        this.activeDialogueRunId = 0;
        this.activeChoiceResolver?.('skip');
        this.activeChoiceResolver = null;

        window.removeEventListener('keydown', this.handleDialogueKey);
        this.panelEl?.classList.remove('is-open', 'is-closing');
        this.dialogEl?.classList.add('hidden');
        this.dialogEl?.classList.remove('is-revealed');
        this.dialogEl?.setAttribute('aria-hidden', 'true');
        this.choicesEl?.classList.add('hidden');
        this.choicesEl?.classList.remove('is-visible');

        this.setInputEnabled?.(false);
    }

    cancelTutorial() {
        if (!this.activeTutorialRunId) return;
        this.activeTutorialRunId = 0;
        this.hideTutorialPrompt();

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

        window.removeEventListener('keydown', this.handleDialogueKey);

        this.activeDialogueRunId = 0;
        this.activeChoiceResolver = null;
    }

    requestSkip() {
        if (!this.activeDialogueRunId) return;

        this.activeDialogueRunId = 0;
        window.removeEventListener('keydown', this.handleDialogueKey);
        this.panelEl?.classList.remove('is-open', 'is-closing');
        this.dialogEl?.classList.add('hidden');
        this.dialogEl?.classList.remove('is-revealed');
        this.dialogEl?.setAttribute('aria-hidden', 'true');
        this.choicesEl?.classList.add('hidden');
        this.choicesEl?.classList.remove('is-visible');

        if (this.activeChoiceResolver) {
            const resolve = this.activeChoiceResolver;
            this.activeChoiceResolver = null;
            resolve('skip');
        }
    }

    async typeLine(runId, line) {
        if (!this.isDialogueRunActive(runId)) return;

        const row = document.createElement('div');
        row.className = 'mothership-line';
        row.textContent = '> █';
        this.bodyEl.appendChild(row);
        this.bodyEl.scrollTop = this.bodyEl.scrollHeight;

        for (let index = 0; index < line.length; index++) {
            if (!this.isDialogueRunActive(runId)) return;

            const nextText = line.slice(0, index + 1);
            row.textContent = `> ${nextText}█`;
            this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
            window.AudioManager?.play('ui_scan_ping', { volume: 0.08, varyPitch: true });
            await this.sleep(runId, DIALOGUE_CHAR_INTERVAL_MS);
        }

        if (!this.isDialogueRunActive(runId)) return;
        row.textContent = `> ${line}`;
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

    async tutorialStepMovement(runId, game, touchControlsEnabled) {
        await this.showTutorialPrompt(runId, {
            icon: touchControlsEnabled ? 'TAP' : 'WASD',
            text: touchControlsEnabled
                ? 'MOVE PAD OR ARROW INPUT — NAVIGATE THE STRUCTURE'
                : 'WASD / ARROW KEYS — NAVIGATE THE STRUCTURE'
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
            text: 'DEAD-END CORRIDORS ARE REWARD CACHES — DENSER LOOT, NO ENEMIES. EXPLORE ALL BRANCHES.'
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

    async tutorialStepConsole(runId, game, touchControlsEnabled) {
        await this.showTutorialPrompt(runId, {
            icon: touchControlsEnabled ? 'TAP' : 'E',
            text: touchControlsEnabled
                ? "WHEN YOU'RE READY, RETURN TO THE CONSOLE NEAR YOUR WRECK. TAP TO UPLINK."
                : "WHEN YOU'RE READY, RETURN TO THE CONSOLE NEAR YOUR WRECK. PRESS [E] TO UPLINK."
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

    async tutorialStepConsoleAccess(runId, touchControlsEnabled) {
        await this.showTutorialPrompt(runId, {
            icon: touchControlsEnabled ? 'TAP' : 'E',
            text: touchControlsEnabled
                ? 'OPEN THE TERMINAL TO ACCESS BANKING AND THE O₂ GENERATOR MODULE.'
                : 'OPEN THE TERMINAL WITH [E] TO ACCESS BANKING AND THE O₂ GENERATOR MODULE.'
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

        if (this.tutorialPromptIconEl) {
            this.tutorialPromptIconEl.textContent = icon;
            this.tutorialPromptIconEl.classList.toggle('hidden', !icon);
        }
        if (this.tutorialPromptTextEl) {
            this.tutorialPromptTextEl.textContent = text;
        }

        this.tutorialPromptEl.classList.remove('hidden', 'is-exiting');
        requestAnimationFrame(() => {
            if (!this.isTutorialRunActive(runId)) return;
            this.tutorialPromptEl.classList.add('is-visible');
        });
    }

    hideTutorialPrompt(runId = this.activeTutorialRunId) {
        if (!this.tutorialPromptEl) return;
        if (runId && !this.isTutorialRunActive(runId) && runId !== this.activeTutorialRunId) return;

        this.tutorialPromptEl.classList.remove('is-visible');
        this.tutorialPromptEl.classList.add('is-exiting');
        window.setTimeout(() => {
            if (this.tutorialPromptEl.classList.contains('is-visible')) return;
            this.tutorialPromptEl.classList.add('hidden');
            this.tutorialPromptEl.classList.remove('is-exiting');
        }, 220);
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
        return new Promise((resolve) => {
            window.setTimeout(() => {
                resolve(this.isDialogueRunActive(runId) || this.isTutorialRunActive(runId));
            }, delayMs);
        });
    }

    isDialogueRunActive(runId) {
        return this.activeDialogueRunId === runId;
    }

    isTutorialRunActive(runId) {
        return this.activeTutorialRunId === runId;
    }
}
