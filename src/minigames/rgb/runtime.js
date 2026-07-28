// RGB gray-box DOM runtime. Data-driven from content.js against the pure
// state machine in state.js — mounts inside Hunker Bunker's existing
// aspect-preserving #game-viewport stage (docs/mini-games/rgb/README.md),
// not a second platform shell. Authored art, cinematics, ambience, SFX, music,
// and voice all remain data-driven and use the main game's audio mix.

import {
    CHAPTERS,
    CHAPTER_ORDER,
    CHAPTER_FLOWCHARTS,
    ENDINGS,
    GAME_OVERS,
    ITEMS,
    CONTENT_WARNING,
    INTRO_CINEMATIC,
    resolveCinematicSteps,
    resolveCinematicAssets
} from './content.js';
import { playCinematicSequence } from './cinematicPlayer.js';
import {
    createRunState,
    addItem,
    addEvidence,
    setPain,
    advanceTime,
    applyChoice,
    completeCalibration,
    chooseFinal,
    attemptRescue,
    recordKioskAttempt,
    resolveOutcome,
    gameOver
} from './state.js';
import { isHotspotAvailable } from './gating.js';
import {
    saveCheckpoint,
    recordEnding,
    recordGameOver,
    recordDiscoveredBeat,
    saveRgbSave,
    unlockChapter,
    saveChapterSnapshot,
    getChapterSnapshot
} from './save.js';
import { createActionRouter, ACTION_SETS } from '../../inputActions.js';
import { mapBrowserGamepad } from '../../browserGamepad.js';
import { AudioManager } from '../../audio.js';
import { createRgbAudioController, getDialogueSpeaker } from './audio.js';
import { assetUrl } from '../../assetUrl.js';

const NAV_REPEAT_MS = 220;
const STICK_THRESHOLD = 0.5;
const ROUTE_BEATS = Object.freeze({
    reply_to_lucia: { axis: 'FAMILY', choice: 'ANSWERED LUCIA', consequence: 'The shift started late; Lucia was heard.' },
    enter_now: { axis: 'FAMILY', choice: 'ENTERED NOW', consequence: 'The clock won the first decision.' },
    double_tap_honest: { axis: 'TRUTH', choice: 'LEFT THE ERROR VISIBLE', consequence: '4A learned trust; the miss remained reviewable.' },
    double_tap_falsify: { axis: 'TRUTH', choice: 'CLEANED THE METRIC', consequence: 'The numbers improved; the record did not.' },
    request_marisol_witness: { axis: 'SOLIDARITY', choice: 'ASKED MARISOL TO STAY', consequence: 'Her testimony may help, but staying has a cost.' },
    release_marisol_from_request: { axis: 'SOLIDARITY', choice: 'RELEASED MARISOL', consequence: 'She kept her own deadline; Elias lost a witness.' },
    keep_notebook: { axis: 'EVIDENCE', choice: 'KEPT THE NOTEBOOK', consequence: 'The calibration record remains available later.' },
    surrender_notebook: { axis: 'EVIDENCE', choice: 'SURRENDERED THE NOTEBOOK', consequence: 'Review controls the physical record.' },
    request_billing_agent: { axis: 'ACCESS', choice: 'OPENED A BILLING CASE', consequence: 'A formal trail now exists.' },
    call_lucia: { axis: 'FAMILY', choice: 'CALLED LUCIA BACK', consequence: 'The callback changes what the kiosk exit means.' },
    give_up: { axis: 'ACCESS', choice: 'GAVE UP AT THE KIOSK', consequence: 'The treatment remained locked.' },
    follow_utility_map: { axis: 'ACCESS', choice: 'FOLLOWED THE UTILITY MAP', consequence: 'Elias chose an unauthorized route forward.' },
    walk_away: { axis: 'SYSTEM', choice: 'PRESERVED THE PROFILE', consequence: '4A survives inside the system loop.' },
    expose_profile: { axis: 'SYSTEM', choice: 'EXPOSED THE PROFILE', consequence: 'The evidence route depends on what was preserved.' },
    sever_trunk: { axis: 'SYSTEM', choice: 'SEVERED THE TRUNK', consequence: '4A is freed only if Elias can complete the rescue.' },
    rescue_recenter: { axis: 'RESCUE', choice: 'RECENTERED 4A', consequence: 'The practiced calibration became a rescue action.' },
    rescue_recenter_again: { axis: 'RESCUE', choice: 'RECENTERED 4A AGAIN', consequence: 'Persistence kept the rescue route alive.' },
    rescue_fumble: { axis: 'RESCUE', choice: 'GRABBED THE CHASSIS', consequence: 'Force replaced calibration at the final moment.' }
});

const EVIDENCE_LABELS = Object.freeze({
    camera_discrepancy: 'Missing pre-impact footage',
    swab_photo: 'Inconclusive swab photograph',
    payroll_record: 'Itemized payroll record',
    kiosk_record: 'Medi-kiosk denial record',
    training_profile: '4A training profile'
});

const SCENE_INTROS = Object.freeze({
    parking_lot: 'Elias is in his sedan before the night shift. Check the medicine bottle, his balance, Lucia’s message, and the notebook before entering RGB.',
    warehouse: 'Inside the warehouse, Elias must calibrate robot 4A while the production clock measures every movement.',
    incident_review: 'After the collision, company review asks Elias to choose what enters the official record and what disappears.',
    medi_kiosk: 'His employment and coverage terminated, Elias faces an automated kiosk holding Lucia’s medication behind glass.',
    server_room: 'The utility route leads to RGB’s server room, where Elias discovers that his own work trained 4A.',
    sector_four: 'The severed trunk has caused a fire and collapse. Elias is pinned in Sector Four while 4A approaches through the smoke.'
});

function uniqueLines(lines = []) {
    const seen = new Set();
    return lines
        .map((line) => String(line ?? '').trim())
        .filter((line) => line && !seen.has(line) && seen.add(line));
}

function hydrateRunState(save) {
    const base = createRunState();
    const snapshot = getChapterSnapshot(save, save.checkpoint);
    if (snapshot) {
        return {
            ...base,
            checkpoint: save.checkpoint,
            timeBand: Number.isFinite(snapshot.timeBand) ? snapshot.timeBand : save.run.timeBand,
            pain: typeof snapshot.pain === 'string' ? snapshot.pain : save.run.pain,
            evidence: Array.isArray(snapshot.evidence) ? [...snapshot.evidence] : [...save.run.evidence],
            inventory: Array.isArray(snapshot.inventory) ? [...snapshot.inventory] : [...save.run.inventory],
            routeHistory: Array.isArray(snapshot.routeHistory)
                ? snapshot.routeHistory.map((e) => ({ ...e }))
                : [...(save.run.routeHistory ?? [])],
            flags: { ...base.flags, ...save.run.flags, ...(snapshot.flags ?? {}) }
        };
    }
    return {
        ...base,
        checkpoint: save.checkpoint,
        timeBand: save.run.timeBand,
        pain: save.run.pain,
        evidence: [...save.run.evidence],
        inventory: [...save.run.inventory],
        routeHistory: [...(save.run.routeHistory ?? [])],
        flags: { ...base.flags, ...save.run.flags }
    };
}

function snapshotRun(save, runState) {
    return {
        ...save,
        checkpoint: runState.checkpoint,
        run: {
            timeBand: runState.timeBand,
            pain: runState.pain,
            evidence: [...runState.evidence],
            inventory: [...runState.inventory],
            routeHistory: [...runState.routeHistory],
            flags: { ...runState.flags }
        }
    };
}

function applyEffects(runState, effects) {
    if (!effects) return runState;
    let next = runState;
    if (effects.item) next = addItem(next, effects.item);
    for (const item of effects.items ?? []) next = addItem(next, item);
    if (effects.evidence) next = addEvidence(next, effects.evidence);
    if (effects.pain) next = setPain(next, effects.pain);
    if (effects.timeCost) next = advanceTime(next, effects.timeCost);
    if (effects.kioskAttempt) next = recordKioskAttempt(next);
    if (effects.choice) next = applyChoice(next, effects.choice);
    if (effects.calibration) {
        next = completeCalibration(next, effects.calibration.quality, effects.calibration.honest);
    }
    if (effects.finalChoice) next = chooseFinal(next, effects.finalChoice);
    if (effects.rescue) next = attemptRescue(next, effects.rescue);
    return next;
}

export function mountRgb({ root, save, storage, onExit }) {
    if (!root) throw new Error('mountRgb requires a root element');
    const backingStorage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);

    let currentSave = save;
    let runState = hydrateRunState(currentSave);
    runState = applyEffects(runState, CHAPTERS[runState.checkpoint]?.initialEffects);
    let visited = new Set();
    // warning | chapterCard | scene | inventory | recap | pause | ending | gameover | cinematic
    let mode = 'warning';
    let focusIndex = 0;
    let revealHeld = false;
    let lastNavAt = 0;
    let destroyed = false;
    let resolvedEndingId = null;
    let resolvedGameOverId = null;
    let dialogueLines = ['Select an available action to continue the archive reconstruction.'];
    let dialogueSpeaker = null;
    let pendingPickup = null;
    let activeCutaway = null;
    // How many of the current chapter's three authored hints have been asked
    // for. Resets per chapter; never affects endings (scene-flow.md).
    let hintsShown = 0;

    const actionRouter = createActionRouter();
    const rgbAudio = createRgbAudioController();
    actionRouter.setActionSet(ACTION_SETS.ARCHIVE);

    root.classList.remove('hidden');
    root.classList.add('rgb-root');
    root.replaceChildren();

    // Cinematic overlay lives as a sibling of #rgb-root (not a child) so
    // render()'s root.replaceChildren() never wipes it mid-playback.
    const cinematicLayer = document.createElement('div');
    cinematicLayer.className = 'rgb-cinematic hidden';
    root.parentElement?.appendChild(cinematicLayer);

    window.dispatchEvent(new CustomEvent('rgb-started'));

    try {
        AudioManager.stopAmbience({ stopMusic: true, musicFadeSeconds: 0.25 });
        void rgbAudio.load();
        rgbAudio.enterChapter(runState.checkpoint);
    } catch {
        // best-effort audio start
    }

    function persist() {
        currentSave = snapshotRun(currentSave, runState);
        saveRgbSave(backingStorage, currentSave);
    }

    function currentChapter() {
        return CHAPTERS[runState.checkpoint];
    }

    function focusableHotspots() {
        return currentChapter().hotspots.filter((h) => isHotspotAvailable(h, runState, visited));
    }

    function chapterNumber(chapterId = runState.checkpoint) {
        return CHAPTER_ORDER.indexOf(chapterId) + 1;
    }

    function hintsEnabled() {
        return currentSave.settings?.hints !== 'off';
    }

    function cutawayForHotspot(hotspot) {
        if (hotspot.cutaway) return { zoom: 1, ...hotspot.cutaway };
        if (!hotspot.object) return null;
        const centerX = ((hotspot.x ?? 0) + (hotspot.w ?? 180) / 2) / 1280 * 100;
        const centerY = ((hotspot.y ?? 0) + (hotspot.h ?? 56) / 2) / 800 * 100;
        return {
            image: currentChapter().bg,
            label: hotspot.label,
            focusX: Math.max(8, Math.min(92, centerX)),
            focusY: Math.max(8, Math.min(92, centerY)),
            zoom: hotspot.cutawayZoom ?? 1.65
        };
    }

    function recordRouteBeat(hotspot) {
        save = recordDiscoveredBeat(save, hotspot.id);
        saveRgbSave(localStorage, save);
        const beat = ROUTE_BEATS[hotspot.id];
        if (!beat || runState.routeHistory.some((entry) => entry.hotspotId === hotspot.id)) return;
        runState = {
            ...runState,
            routeHistory: [
                ...runState.routeHistory,
                {
                    hotspotId: hotspot.id,
                    chapterId: runState.checkpoint,
                    chapter: chapterNumber(),
                    ...beat
                }
            ]
        };
    }

    function renderChapterFlowchart(chapterId) {
        const flowchartData = CHAPTER_FLOWCHARTS[chapterId ?? runState.checkpoint];
        if (!flowchartData) return null;

        const container = document.createElement('div');
        container.className = 'rgb-flowchart';

        const header = document.createElement('div');
        header.className = 'rgb-flowchart__header';
        header.innerHTML = `<span>FLOWCHART</span> <strong>${flowchartData.title.toUpperCase()}</strong>`;

        const tree = document.createElement('div');
        tree.className = 'rgb-flowchart__tree';

        const waves = {};
        for (const node of flowchartData.nodes) {
            waves[node.wave] = waves[node.wave] || [];
            waves[node.wave].push(node);
        }

        const discoveredSet = new Set(save.discoveredBeats ?? []);
        const currentRunSet = new Set(runState.routeHistory.map((e) => e.hotspotId).concat(Array.from(visited)));

        Object.keys(waves).sort((a, b) => Number(a) - Number(b)).forEach((waveNum) => {
            const waveCol = document.createElement('div');
            waveCol.className = `rgb-flowchart__wave rgb-flowchart__wave--${waveNum}`;

            const waveTag = document.createElement('div');
            waveTag.className = 'rgb-flowchart__wave-tag';
            waveTag.textContent = `WAVE ${waveNum}`;
            waveCol.append(waveTag);

            for (const node of waves[waveNum]) {
                const nodeEl = document.createElement('div');
                nodeEl.className = 'rgb-flowchart__node';

                const isCurrent = currentRunSet.has(node.id);
                const isPast = !isCurrent && discoveredSet.has(node.id);

                if (isCurrent) {
                    nodeEl.classList.add('rgb-flowchart__node--current');
                    if (node.isChoice) nodeEl.classList.add('rgb-flowchart__node--choice');
                    nodeEl.innerHTML = `
                        <div class="rgb-flowchart__badge">${node.branch ? `${node.branch} · ACTIVE` : 'ACTIVE RUN'}</div>
                        <div class="rgb-flowchart__title">${node.label}</div>
                        ${node.consequence ? `<div class="rgb-flowchart__desc">${node.consequence}</div>` : ''}
                    `;
                } else if (isPast) {
                    nodeEl.classList.add('rgb-flowchart__node--discovered');
                    nodeEl.innerHTML = `
                        <div class="rgb-flowchart__badge rgb-flowchart__badge--past">${node.branch ? `${node.branch} · PAST RUN` : 'PAST RUN'}</div>
                        <div class="rgb-flowchart__title">${node.label}</div>
                        ${node.consequence ? `<div class="rgb-flowchart__desc">${node.consequence}</div>` : ''}
                    `;
                } else {
                    nodeEl.classList.add('rgb-flowchart__node--hidden');
                    nodeEl.innerHTML = `
                        <div class="rgb-flowchart__badge rgb-flowchart__badge--hidden">${node.branch ? `${node.branch} · LOCKED` : 'UNEXPLORED'}</div>
                        <div class="rgb-flowchart__title">??? UNDISCOVERED PATH ???</div>
                        <div class="rgb-flowchart__desc">Explore alternative choices in another run to reveal.</div>
                    `;
                }
                waveCol.append(nodeEl);
            }
            tree.append(waveCol);
        });

        container.append(header, tree);
        return container;
    }

    function render() {
        root.replaceChildren();
        if (mode === 'warning') return renderWarning();
        if (mode === 'chapterCard') return renderChapterCard();
        if (mode === 'ending') return renderEndingCard();
        if (mode === 'gameover') return renderGameOverCard();

        const chapter = currentChapter();
        const scene = document.createElement('div');
        scene.className = 'rgb-scene';

        const header = document.createElement('div');
        header.className = 'rgb-header';

        const titleRow = document.createElement('div');
        titleRow.className = 'rgb-header__title-row';

        const title = document.createElement('div');
        title.className = 'rgb-header__title';
        title.textContent = chapter.title;

        const progress = document.createElement('div');
        progress.className = 'rgb-header__progress';
        progress.textContent = `CHAPTER ${chapterNumber()} OF ${CHAPTER_ORDER.length}`;

        const settingsBtn = document.createElement('button');
        settingsBtn.type = 'button';
        settingsBtn.className = 'calibrate-btn open-settings-btn rgb-settings-btn';
        settingsBtn.setAttribute('aria-label', 'Settings');
        settingsBtn.title = 'Settings';
        settingsBtn.textContent = '⚙';
        settingsBtn.addEventListener('click', () => {
            const settingsPopup = document.getElementById('settings-popup');
            if (settingsPopup) {
                settingsPopup.classList.remove('hidden');
                settingsPopup.setAttribute('aria-hidden', 'false');
            }
        });

        const pathBtn = document.createElement('button');
        pathBtn.type = 'button';
        pathBtn.className = 'rgb-path-btn';
        pathBtn.textContent = `PATH ${runState.routeHistory.length}`;
        pathBtn.setAttribute('aria-label', 'Open path history and recap');
        pathBtn.addEventListener('click', () => {
            mode = 'recap';
            render();
        });

        titleRow.append(progress, title, pathBtn, settingsBtn);

        const goal = document.createElement('div');
        goal.className = 'rgb-header__goal';
        goal.textContent = chapter.goal;

        header.append(titleRow, goal);
        scene.append(header);

        const stage = document.createElement('div');
        stage.className = 'rgb-stage-layer';
        stage.classList.toggle('rgb-stage-layer--cutaway', Boolean(activeCutaway));
        const stageImage = activeCutaway?.image ?? chapter.bg;
        if (stageImage) {
            const bgImg = document.createElement('img');
            bgImg.className = 'rgb-stage-bg';
            bgImg.src = assetUrl(stageImage);
            bgImg.alt = '';
            if (activeCutaway) {
                bgImg.style.setProperty('--rgb-cutaway-x', `${activeCutaway.focusX ?? 50}%`);
                bgImg.style.setProperty('--rgb-cutaway-y', `${activeCutaway.focusY ?? 50}%`);
                bgImg.style.setProperty('--rgb-cutaway-zoom', activeCutaway.zoom ?? 1);
            }
            stage.appendChild(bgImg);
        }
        if (activeCutaway?.label) {
            const cutawayLabel = document.createElement('div');
            cutawayLabel.className = 'rgb-cutaway-label';
            cutawayLabel.textContent = activeCutaway.label;
            stage.append(cutawayLabel);
        }
        scene.append(stage);

        const actionDeck = document.createElement('div');
        actionDeck.className = 'rgb-action-deck';
        actionDeck.classList.toggle('rgb-action-deck--cutaway', Boolean(activeCutaway));
        actionDeck.setAttribute('aria-label', 'Available actions');
        const ready = new Set(focusableHotspots().map((h) => h.id));
        chapter.hotspots.forEach((hotspot) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'rgb-hotspot';
            const itemId = hotspot.pickup?.items?.[0]
                ?? hotspot.effects?.item
                ?? hotspot.effects?.items?.[0];
            const iconSrc = hotspot.icon ?? ITEMS[itemId]?.icon;
            if (iconSrc) {
                const icon = document.createElement('img');
                icon.className = 'rgb-hotspot__icon';
                icon.src = assetUrl(iconSrc);
                icon.alt = '';
                btn.append(icon);
            }
            const label = document.createElement('span');
            label.className = 'rgb-hotspot__label';
            label.textContent = hotspot.label;
            btn.append(label);
            btn.style.setProperty('--rgb-x', hotspot.x ?? 0);
            btn.style.setProperty('--rgb-y', hotspot.y ?? 0);
            btn.style.setProperty('--rgb-w', hotspot.w ?? 180);
            btn.style.setProperty('--rgb-h', hotspot.h ?? 56);
            btn.classList.toggle('rgb-hotspot--choice', Boolean(hotspot.choice));
            btn.classList.toggle('rgb-hotspot--object', Boolean(hotspot.object));
            btn.classList.toggle('rgb-hotspot--inventory-action', Boolean(hotspot.inventoryAction));
            const isDone = hotspot.once && visited.has(hotspot.id);
            const isReady = ready.has(hotspot.id);
            btn.classList.toggle('rgb-hotspot--done', Boolean(isDone));
            btn.classList.toggle('rgb-hotspot--locked', !isReady && !isDone);
            btn.classList.toggle('rgb-hotspot--reveal', revealHeld);
            btn.disabled = !isReady;
            btn.addEventListener('click', () => activateHotspot(hotspot));
            actionDeck.appendChild(btn);
        });
        stage.append(actionDeck);

        const dialogue = document.createElement('div');
        dialogue.className = 'rgb-dialogue';
        if (chapter.dialogueClass) dialogue.classList.add(chapter.dialogueClass);
        dialogue.id = 'rgb-dialogue';
        dialogue.setAttribute('aria-live', 'polite');
        stage.append(dialogue);

        if (hintsShown > 0) stage.append(buildHintPanel(chapter));

        const footer = document.createElement('div');
        footer.className = 'rgb-footer';
        footer.textContent = hintsEnabled()
            ? 'TAB INVENTORY · HOLD Q REVEAL · H HINT · R RECAP · ESC PAUSE'
            : 'TAB INVENTORY · HOLD Q REVEAL · R RECAP · ESC PAUSE';
        scene.append(footer);

        root.append(scene);
        renderDialogueLines(dialogueLines, dialogueSpeaker);

        if (mode === 'inventory') renderInventoryOverlay();
        if (mode === 'recap') renderRecapOverlay();
        if (mode === 'pause') renderPauseOverlay();

        applyFocus();
    }

    function dismissWarning() {
        // Loading or restarting Chapter 1 always restores the authored intro;
        // retained inventory in an archive save must not suppress the opening.
        if (currentSave.checkpoint === 'parking_lot') {
            mode = 'cinematic';
            root.replaceChildren();
            playCinematicSequence(cinematicLayer, [INTRO_CINEMATIC], {
                background: INTRO_CINEMATIC.image,
                onNarration: (line) => rgbAudio.narrate(line)
            }).then(() => {
                mode = 'chapterCard';
                render();
            });
        } else {
            mode = 'chapterCard';
            render();
        }
    }

    function renderWarning() {
        const overlay = document.createElement('div');
        overlay.className = 'rgb-warning';
        const body = document.createElement('div');
        body.className = 'rgb-warning__body';
        body.textContent = CONTENT_WARNING;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rgb-warning__continue';
        btn.textContent = 'CONTINUE';
        btn.addEventListener('click', dismissWarning);
        overlay.append(body, btn);
        root.append(overlay);
        btn.focus();
    }

    // The three authored hints per chapter escalate: what Elias notices, what
    // the clue is, then the action outright. Asking for one never affects the
    // ending or completion (scene-flow.md), so nothing here touches run state.
    function buildHintPanel(chapter) {
        const panel = document.createElement('div');
        panel.className = 'rgb-hints';
        panel.setAttribute('aria-live', 'polite');

        const title = document.createElement('div');
        title.className = 'rgb-hints__title';
        const total = (chapter.hints ?? []).length;
        title.textContent = `HINT ${Math.min(hintsShown, total)} OF ${total}`;
        panel.append(title);

        for (const hint of (chapter.hints ?? []).slice(0, hintsShown)) {
            const p = document.createElement('p');
            p.textContent = hint;
            panel.append(p);
        }

        if (hintsShown >= total) {
            const exhausted = document.createElement('div');
            exhausted.className = 'rgb-hints__exhausted';
            exhausted.textContent = 'No further hints for this chapter.';
            panel.append(exhausted);
        }
        return panel;
    }

    function revealNextHint() {
        if (!hintsEnabled()) return;
        const total = (currentChapter().hints ?? []).length;
        if (hintsShown >= total) return;
        hintsShown += 1;
        render();
    }

    // Machine voices (the kiosk, the mainframe, HR's script) are labelled
    // distinctly from the people, so a denial never reads as something a
    // person chose to say.
    function renderDialogueLines(lines, speaker) {
        const dialogue = root.querySelector('#rgb-dialogue');
        if (!dialogue) return;
        dialogue.replaceChildren();

        if (speaker) {
            const tag = document.createElement('div');
            tag.className = 'rgb-dialogue-speaker';
            tag.dataset.speaker = speaker;
            tag.textContent = speaker;
            dialogue.appendChild(tag);
        }

        for (const [index, line] of uniqueLines(lines).entries()) {
            const p = document.createElement('p');
            p.style.setProperty('--rgb-line-index', index);
            const prompt = document.createElement('span');
            prompt.className = 'rgb-dialogue-prompt';
            prompt.textContent = '❯';
            p.append(prompt, document.createTextNode(` ${line}`));
            dialogue.appendChild(p);
        }

        if (pendingPickup) {
            const take = document.createElement('button');
            take.type = 'button';
            take.className = 'rgb-dialogue__take';
            take.textContent = pendingPickup.label ?? 'TAKE';
            take.addEventListener('click', takePendingPickup);
            dialogue.append(take);
        } else if (activeCutaway) {
            const back = document.createElement('button');
            back.type = 'button';
            back.className = 'rgb-dialogue__take rgb-dialogue__return';
            back.textContent = 'RETURN TO SCENE';
            back.addEventListener('click', dismissCutaway);
            dialogue.append(back);
        }

        requestAnimationFrame(() => {
            dialogue.scrollTop = dialogue.scrollHeight;
        });
    }

    function dismissCutaway() {
        activeCutaway = null;
        dialogueLines = [
            `Back in ${currentChapter().title.replace(/^Chapter \d+:\s*/, '')}.`,
            SCENE_INTROS[runState.checkpoint]
        ];
        dialogueSpeaker = 'NARRATOR';
        rgbAudio.narrate(dialogueLines);
        render();
    }

    function takePendingPickup() {
        if (!pendingPickup) return;
        const itemIds = pendingPickup.items ?? [];
        for (const itemId of itemIds) runState = addItem(runState, itemId);
        const labels = itemIds.map((itemId) => ITEMS[itemId]?.label ?? itemId);
        pendingPickup = null;
        dialogueLines = [...dialogueLines, `Added to inventory: ${labels.join(', ')}.`];
        persist();
        render();
    }

    // A chapter used to slam-cut from a cinematic straight into a live hotspot
    // grid. This gives the goal a beat to land before anything is clickable.
    function renderChapterCard() {
        const chapter = currentChapter();
        const card = document.createElement('div');
        card.className = 'rgb-chapter-card';

        const eyebrow = document.createElement('div');
        eyebrow.className = 'rgb-chapter-card__eyebrow';
        eyebrow.textContent = `CHAPTER ${chapterNumber()} OF ${CHAPTER_ORDER.length}`;

        const title = document.createElement('div');
        title.className = 'rgb-chapter-card__title';
        title.textContent = chapter.title.replace(/^Chapter \d+:\s*/, '');

        const goal = document.createElement('div');
        goal.className = 'rgb-chapter-card__goal';
        goal.textContent = chapter.goal;

        const cont = document.createElement('button');
        cont.type = 'button';
        cont.className = 'rgb-chapter-card__continue';
        cont.textContent = 'CONTINUE';
        cont.addEventListener('click', dismissChapterCard);

        card.append(eyebrow, title, goal, cont);
        root.append(card);
        cont.focus();
    }

    function dismissChapterCard() {
        if (mode !== 'chapterCard') return;
        mode = 'scene';
        dialogueLines = [SCENE_INTROS[runState.checkpoint] ?? currentChapter().goal];
        dialogueSpeaker = 'NARRATOR';
        rgbAudio.narrate(dialogueLines);
        render();
    }

    function renderInventoryOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'rgb-overlay rgb-inventory';
        const title = document.createElement('div');
        title.className = 'rgb-overlay__title';
        title.textContent = 'INVENTORY';
        overlay.append(title);
        if (runState.inventory.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'rgb-overlay__empty';
            empty.textContent = 'Nothing carried yet.';
            overlay.append(empty);
        } else {
            const grid = document.createElement('div');
            grid.className = 'rgb-inventory__grid';
            for (const itemId of runState.inventory) {
                const item = ITEMS[itemId];
                const cell = document.createElement('div');
                cell.className = 'rgb-inventory__item';
                if (item?.icon) {
                    const img = document.createElement('img');
                    img.className = 'rgb-inventory__icon';
                    img.src = assetUrl(item.icon);
                    img.alt = '';
                    cell.append(img);
                }
                const label = document.createElement('div');
                label.className = 'rgb-inventory__label';
                label.textContent = item?.label ?? itemId;
                cell.append(label);
                grid.append(cell);
            }
            overlay.append(grid);
        }
        root.append(overlay);
    }

    // game-design.md asks the recap to state the current goal, known facts,
    // and consequential choices — not just counters.
    function consequentialChoices() {
        const { flags } = runState;
        const lines = [];
        if (flags.heardFullMessage) lines.push('Answered Lucia before the shift.');
        if (flags.noticedMarisolPressure) lines.push("Noticed Marisol's pickup deadline.");
        if (runState.calibrationQuality > 0) {
            lines.push(flags.honestErrorLog
                ? 'Left the calibration error visible in the log.'
                : 'Edited the metric before review.');
        }
        if (flags.keptNotebook) lines.push('Kept the calibration notebook.');
        if (flags.marisolWitness) {
            lines.push(flags.marisolHarmed
                ? 'Marisol stayed as a witness, and it cost her.'
                : 'Marisol stayed as a witness.');
        }
        if (flags.swabCompleted) lines.push('Photographed the inconclusive swab.');
        if (flags.billingCase) lines.push('Opened a billing case.');
        if (flags.luciaCallback) lines.push('Called Lucia back from the kiosk.');
        return lines;
    }

    function renderRecapOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'rgb-overlay rgb-recap';
        const title = document.createElement('div');
        title.className = 'rgb-overlay__title';
        title.textContent = 'YOUR PATH';

        const intro = document.createElement('div');
        intro.className = 'rgb-recap__intro';
        intro.textContent = `Current objective — ${currentChapter().goal}`;

        const status = document.createElement('div');
        status.className = 'rgb-recap__status';
        const statusItems = [
            ['ELIAS', runState.pain],
            ['TIME', runState.timeBand],
            ['4A TRUST', String(runState.trust4A ?? 0)],
            ['EVIDENCE', String(runState.evidence.length)]
        ];
        for (const [label, value] of statusItems) {
            const chip = document.createElement('div');
            chip.className = 'rgb-recap__status-chip';
            chip.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
            status.append(chip);
        }

        const rail = document.createElement('div');
        rail.className = 'rgb-route-rail';
        const currentIndex = CHAPTER_ORDER.indexOf(runState.checkpoint);
        CHAPTER_ORDER.forEach((chapterId, index) => {
            const node = document.createElement('div');
            node.className = 'rgb-route-node';
            node.classList.add(index < currentIndex
                ? 'rgb-route-node--complete'
                : index === currentIndex
                    ? 'rgb-route-node--current'
                    : 'rgb-route-node--future');
            node.innerHTML = `<span>${index + 1}</span><strong>${CHAPTERS[chapterId].title}</strong>`;
            rail.append(node);
        });

        const heading = document.createElement('div');
        heading.className = 'rgb-recap__heading';
        heading.textContent = 'DECISIONS THAT CHANGED THIS RUN';

        const timeline = document.createElement('div');
        timeline.className = 'rgb-route-timeline';
        for (const entry of runState.routeHistory) {
            const card = document.createElement('article');
            card.className = 'rgb-route-entry';
            card.innerHTML = `
                <div class="rgb-route-entry__meta">CH ${entry.chapter} · ${entry.axis}</div>
                <div class="rgb-route-entry__choice">${entry.choice}</div>
                <div class="rgb-route-entry__consequence">${entry.consequence}</div>
            `;
            timeline.append(card);
        }
        if (runState.routeHistory.length === 0) {
            const legacyChoices = consequentialChoices();
            const empty = document.createElement('div');
            empty.className = 'rgb-overlay__empty';
            empty.textContent = legacyChoices.length > 0
                ? legacyChoices.join(' ')
                : 'Your first consequential decision will appear here.';
            timeline.append(empty);
        }

        const evidenceHeading = document.createElement('div');
        evidenceHeading.className = 'rgb-recap__heading';
        evidenceHeading.textContent = 'EVIDENCE PRESERVED';
        const evidenceList = document.createElement('div');
        evidenceList.className = 'rgb-recap__evidence';
        evidenceList.textContent = runState.evidence.length > 0
            ? runState.evidence.map((id) => EVIDENCE_LABELS[id] ?? id).join(' · ')
            : 'No evidence preserved yet.';

        const flowchartHeading = document.createElement('div');
        flowchartHeading.className = 'rgb-recap__heading';
        flowchartHeading.textContent = 'NARRATIVE BRANCH TREE & UNLOCKED PATHS';

        const flowchartEl = renderChapterFlowchart(runState.checkpoint);

        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'rgb-recap__close';
        close.textContent = 'RETURN TO SCENE';
        close.addEventListener('click', () => {
            mode = 'scene';
            render();
        });

        overlay.append(title, intro, status, rail, heading, timeline, evidenceHeading, evidenceList);
        if (flowchartEl) {
            overlay.append(flowchartHeading, flowchartEl);
        }
        overlay.append(close);
        root.append(overlay);
        close.focus();
    }

    function renderPauseOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'rgb-overlay rgb-pause';
        const title = document.createElement('div');
        title.className = 'rgb-overlay__title';
        title.textContent = 'PAUSED';
        const resumeBtn = document.createElement('button');
        resumeBtn.type = 'button';
        resumeBtn.textContent = 'RESUME';
        resumeBtn.addEventListener('click', () => { mode = 'scene'; render(); });
        const settingsBtn = document.createElement('button');
        settingsBtn.type = 'button';
        settingsBtn.className = 'open-settings-btn';
        settingsBtn.textContent = 'SETTINGS';
        settingsBtn.addEventListener('click', () => {
            const settingsPopup = document.getElementById('settings-popup');
            if (settingsPopup) {
                settingsPopup.classList.remove('hidden');
                settingsPopup.setAttribute('aria-hidden', 'false');
            }
        });
        const exitBtn = document.createElement('button');
        exitBtn.type = 'button';
        exitBtn.textContent = 'EXIT SIMULATION';
        exitBtn.addEventListener('click', handleExit);
        overlay.append(title, resumeBtn, settingsBtn, exitBtn);
        root.append(overlay);
        resumeBtn.focus();
    }

    function renderEndingCard() {
        const ending = ENDINGS[resolvedEndingId];
        const card = document.createElement('div');
        card.className = 'rgb-card rgb-card--ending';
        card.dataset.ending = ending.id;
        if (ending.art) {
            const art = document.createElement('img');
            art.className = 'rgb-card__art';
            art.src = assetUrl(ending.art);
            art.alt = '';
            card.append(art);
        }
        const title = document.createElement('div');
        title.className = 'rgb-card__title';
        title.textContent = ending.title;
        const body = document.createElement('div');
        body.className = 'rgb-card__body';
        body.textContent = ending.body;

        const flowchartEl = renderChapterFlowchart(runState.checkpoint);

        const exitBtn = document.createElement('button');
        exitBtn.type = 'button';
        exitBtn.textContent = 'EXIT SIMULATION';
        exitBtn.addEventListener('click', handleExit);
        card.append(title, body);
        if (flowchartEl) {
            card.append(flowchartEl);
        }
        card.append(exitBtn);
        root.append(card);
        exitBtn.focus();
    }

    function renderGameOverCard() {
        const info = GAME_OVERS[resolvedGameOverId];
        const card = document.createElement('div');
        card.className = 'rgb-card rgb-card--gameover';
        const title = document.createElement('div');
        title.className = 'rgb-card__title';
        title.textContent = info.title;
        const body = document.createElement('div');
        body.className = 'rgb-card__body';
        body.textContent = info.body;

        const retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.textContent = info.id === 'crushed' ? 'RETRY RESCUE' : 'RETRY';
        retryBtn.addEventListener('click', () => retryGameOver(info));

        const loadBtn = document.createElement('button');
        loadBtn.type = 'button';
        loadBtn.textContent = 'LOAD CHAPTER';
        loadBtn.addEventListener('click', () => loadChapterFromCheckpoint());

        const exitBtn = document.createElement('button');
        exitBtn.type = 'button';
        exitBtn.textContent = 'EXIT SIMULATION';
        exitBtn.addEventListener('click', handleExit);

        card.append(title, body, retryBtn, loadBtn, exitBtn);
        root.append(card);
        retryBtn.focus();
    }

    function applyFocus() {
        if (activeCutaway) {
            root.querySelector('.rgb-dialogue__take')?.focus();
            return;
        }
        const list = focusableHotspots();
        if (list.length === 0) return;
        focusIndex = Math.max(0, Math.min(focusIndex, list.length - 1));
        const target = list[focusIndex];
        const buttons = root.querySelectorAll('.rgb-hotspot');
        buttons.forEach((btn, i) => {
            const hotspot = currentChapter().hotspots[i];
            btn.classList.toggle('rgb-hotspot--focused', hotspot?.id === target?.id);
        });
        const targetIndex = currentChapter().hotspots.findIndex((h) => h.id === target?.id);
        if (targetIndex >= 0) buttons[targetIndex]?.focus();
    }

    function moveFocus(delta) {
        const list = focusableHotspots();
        if (list.length === 0) return;
        focusIndex = (focusIndex + delta + list.length) % list.length;
        applyFocus();
    }

    function activateHotspot(hotspot) {
        if (mode !== 'scene') return;
        if (!isHotspotAvailable(hotspot, runState, visited)) return;

        dialogueLines = uniqueLines(hotspot.lines ?? []);
        dialogueSpeaker = getDialogueSpeaker(hotspot.id);
        pendingPickup = hotspot.pickup ? { ...hotspot.pickup } : null;
        activeCutaway = cutawayForHotspot(hotspot);
        const priorState = runState;
        const cinematicSteps = resolveCinematicSteps(hotspot.id, priorState);
        // Cinematic choices receive purpose-written narration over the moving
        // image. Ordinary scene/cutaway actions speak their displayed lines.
        if (cinematicSteps.length === 0) rgbAudio.hotspot(hotspot.id, dialogueLines);
        runState = applyEffects(runState, hotspot.effects);
        recordRouteBeat(hotspot);
        visited.add(hotspot.id);
        persist();

        const proceed = () => {
            if (!hotspot.advances) {
                mode = 'scene';
                render();
                return;
            }
            const failure = gameOver(runState);
            if (failure) {
                showGameOver(failure);
                return;
            }
            const ending = resolveOutcome(runState);
            if (ending) {
                showEnding(ending);
                return;
            }
            const chapter = currentChapter();
            if (chapter.next) {
                transitionToChapter(chapter.next);
                return;
            }
            mode = 'scene';
            render();
        };

        if (cinematicSteps.length > 0) {
            activeCutaway = null;
            mode = 'cinematic';
            const scene = root.querySelector('.rgb-scene');
            scene?.classList.add('rgb-scene--cinematic');
            playCinematicSequence(cinematicLayer, resolveCinematicAssets(cinematicSteps), {
                background: currentChapter().bg,
                transitionDelayMs: 320,
                onNarration: (line) => rgbAudio.narrate(line)
            }).then(() => {
                scene?.classList.remove('rgb-scene--cinematic');
                proceed();
            });
        } else {
            proceed();
        }
    }

    function transitionToChapter(chapterId) {
        runState = { ...runState, checkpoint: chapterId };
        runState = applyEffects(runState, CHAPTERS[chapterId]?.initialEffects);
        visited = new Set();
        focusIndex = 0;
        hintsShown = 0;
        activeCutaway = null;
        dialogueLines = [`Archive reconstruction resumed: ${CHAPTERS[chapterId].title}.`];
        dialogueSpeaker = null;
        currentSave = saveCheckpoint(currentSave, chapterId);
        currentSave = unlockChapter(currentSave, chapterId);
        currentSave = saveChapterSnapshot(currentSave, chapterId, runState);
        persist();
        window.dispatchEvent(new CustomEvent('rgb-checkpoint', { detail: { checkpoint: chapterId } }));
        rgbAudio.enterChapter(chapterId);
        mode = 'chapterCard';
        render();
    }

    function showEnding(endingId) {
        resolvedEndingId = endingId;
        currentSave = recordEnding(currentSave, endingId);
        persist();
        window.dispatchEvent(new CustomEvent('rgb-ending-reached', { detail: { endingId } }));
        window.dispatchEvent(new CustomEvent('rgb-completed', {
            detail: { endingId, evidenceCount: runState.evidence.length }
        }));
        rgbAudio.ending(endingId);
        mode = 'ending';
        render();
    }

    function showGameOver(gameOverId) {
        resolvedGameOverId = gameOverId;
        currentSave = recordGameOver(currentSave, gameOverId);
        persist();
        mode = 'gameover';
        render();
    }

    function retryGameOver(info) {
        if (info.retryScope === 'chapter') {
            loadChapterFromCheckpoint();
            return;
        }
        const retryHotspot = currentChapter().hotspots.find((h) => h.id === info.retryFrom);
        for (const hotspot of currentChapter().hotspots) {
            if (hotspot.advances) visited.delete(hotspot.id);
        }
        if (retryHotspot?.effects?.rescue) runState = { ...runState, rescueOutcome: null };
        if (retryHotspot?.effects?.finalChoice) runState = { ...runState, finalChoice: null };
        dialogueLines = [
            'The archive rewinds to the last recoverable action.',
            SCENE_INTROS[runState.checkpoint]
        ];
        dialogueSpeaker = 'NARRATOR';
        rgbAudio.narrate(dialogueLines);
        mode = 'scene';
        render();
    }

    function loadChapterFromCheckpoint() {
        runState = hydrateRunState(currentSave);
        visited = new Set();
        focusIndex = 0;
        dialogueLines = [
            `Checkpoint restored: ${currentChapter().title}.`,
            SCENE_INTROS[runState.checkpoint]
        ];
        dialogueSpeaker = 'NARRATOR';
        rgbAudio.enterChapter(runState.checkpoint);
        rgbAudio.narrate(dialogueLines);
        mode = 'scene';
        render();
    }

    function handleExit() {
        persist();
        onExit?.();
    }

    function handleKeyDown(event) {
        if (destroyed) return;
        const { code } = event;
        if (mode === 'warning') {
            if (code === 'Enter' || code === 'Space') {
                event.preventDefault();
                dismissWarning();
            }
            return;
        }
        if (mode === 'chapterCard') {
            if (code === 'Enter' || code === 'Space' || code === 'KeyE' || code === 'Escape') {
                event.preventDefault();
                dismissChapterCard();
            }
            return;
        }
        if (mode === 'cinematic') return;
        if (code === 'KeyQ') {
            revealHeld = true;
            render();
            return;
        }
        if (mode === 'inventory' || mode === 'recap') {
            if (code === 'Tab' || code === 'Escape' || code === 'KeyR') {
                event.preventDefault();
                mode = 'scene';
                render();
            }
            return;
        }
        if (mode === 'pause') {
            if (code === 'Escape') {
                event.preventDefault();
                mode = 'scene';
                render();
            }
            return;
        }
        if (mode !== 'scene') return;
        if (activeCutaway) {
            if (code === 'Enter' || code === 'Space' || code === 'KeyE') {
                event.preventDefault();
                root.querySelector('.rgb-dialogue__take')?.click();
            } else if (code === 'Escape') {
                event.preventDefault();
                dismissCutaway();
            }
            return;
        }

        switch (code) {
            case 'ArrowUp':
            case 'KeyW':
            case 'ArrowLeft':
            case 'KeyA':
                event.preventDefault();
                moveFocus(-1);
                break;
            case 'ArrowDown':
            case 'KeyS':
            case 'ArrowRight':
            case 'KeyD':
                event.preventDefault();
                moveFocus(1);
                break;
            case 'Enter':
            case 'KeyE': {
                const list = focusableHotspots();
                if (list[focusIndex]) activateHotspot(list[focusIndex]);
                break;
            }
            case 'Tab':
                event.preventDefault();
                mode = 'inventory';
                render();
                break;
            case 'KeyH':
                event.preventDefault();
                revealNextHint();
                break;
            case 'KeyR':
                mode = 'recap';
                render();
                break;
            case 'Escape':
                mode = 'pause';
                render();
                break;
            default:
                break;
        }
    }

    function handleKeyUp(event) {
        if (event.code === 'KeyQ') {
            revealHeld = false;
            render();
        }
    }

    let gamepadFrame = null;
    function pollGamepad() {
        if (destroyed) return;
        const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
        const pad = pads?.[0] ? mapBrowserGamepad(pads[0]) : null;
        if (pad) {
            const { actions } = actionRouter.deriveActions(pad);
            const now = performance.now();
            if (mode === 'scene') {
                if (activeCutaway) {
                    if (actions.confirm) root.querySelector('.rgb-dialogue__take')?.click();
                    if (actions.back) dismissCutaway();
                    gamepadFrame = requestAnimationFrame(pollGamepad);
                    return;
                }
                const magX = Math.abs(actions.focus.x);
                const magY = Math.abs(actions.focus.y);
                if (now - lastNavAt > NAV_REPEAT_MS && (magX > STICK_THRESHOLD || magY > STICK_THRESHOLD)) {
                    lastNavAt = now;
                    moveFocus(magX >= magY ? Math.sign(actions.focus.x) : Math.sign(actions.focus.y));
                }
                if (actions.confirm) {
                    const list = focusableHotspots();
                    if (list[focusIndex]) activateHotspot(list[focusIndex]);
                }
                if (actions.inventory) { mode = 'inventory'; render(); }
                if (actions.back) { mode = 'pause'; render(); }
            } else if (mode === 'chapterCard') {
                if (actions.confirm || actions.back) dismissChapterCard();
            } else if ((mode === 'inventory' || mode === 'recap' || mode === 'pause') && actions.back) {
                mode = 'scene';
                render();
            }
            if (mode !== 'cinematic' && revealHeld !== actions.reveal) {
                revealHeld = actions.reveal;
                render();
            }
        }
        gamepadFrame = requestAnimationFrame(pollGamepad);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    gamepadFrame = requestAnimationFrame(pollGamepad);

    render();

    return {
        destroy() {
            destroyed = true;
            rgbAudio.destroy();
            AudioManager.startMenuMusic();
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if (gamepadFrame) cancelAnimationFrame(gamepadFrame);
            cinematicLayer.remove();
            root.replaceChildren();
            root.classList.add('hidden');
            root.classList.remove('rgb-root');
        }
    };
}
