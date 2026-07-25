// RGB gray-box DOM runtime. Data-driven from content.js against the pure
// state machine in state.js — mounts inside Hunker Bunker's existing
// aspect-preserving #game-viewport stage (docs/mini-games/rgb/README.md),
// not a second platform shell. Placeholder shapes per production-plan.md
// Phase 2; final art/audio is a later pass.

import { CHAPTERS, ENDINGS, GAME_OVERS, ITEMS, CONTENT_WARNING } from './content.js';
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
    canExpose,
    resolveOutcome,
    gameOver
} from './state.js';
import { saveCheckpoint, recordEnding, recordGameOver, saveRgbSave } from './save.js';
import { createActionRouter, ACTION_SETS } from '../../inputActions.js';
import { mapBrowserGamepad } from '../../browserGamepad.js';

const NAV_REPEAT_MS = 220;
const STICK_THRESHOLD = 0.5;

function hydrateRunState(save) {
    const base = createRunState();
    return {
        ...base,
        checkpoint: save.checkpoint,
        timeBand: save.run.timeBand,
        pain: save.run.pain,
        evidence: [...save.run.evidence],
        inventory: [...save.run.inventory],
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
            flags: { ...runState.flags }
        }
    };
}

function isHotspotAvailable(hotspot, runState, visited) {
    if (hotspot.once && visited.has(hotspot.id)) return false;
    for (const dep of hotspot.requiresAllOf ?? []) {
        if (!visited.has(dep)) return false;
    }
    const req = hotspot.requires;
    if (req) {
        if (req.flags) {
            for (const [key, expected] of Object.entries(req.flags)) {
                if (Boolean(runState.flags[key]) !== Boolean(expected)) return false;
            }
        }
        if (Number.isFinite(req.maxTimeBand) && runState.timeBand > req.maxTimeBand) return false;
        if (req.canExpose && !canExpose(runState)) return false;
        if (req.painSet && runState.pain === 'stable') return false;
    }
    return true;
}

function applyEffects(runState, effects) {
    if (!effects) return runState;
    let next = runState;
    if (effects.item) next = addItem(next, effects.item);
    if (effects.evidence) next = addEvidence(next, effects.evidence);
    if (effects.pain) next = setPain(next, effects.pain);
    if (effects.timeCost) next = advanceTime(next, effects.timeCost);
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
    let visited = new Set();
    let mode = 'warning'; // warning | scene | inventory | recap | pause | ending | gameover
    let focusIndex = 0;
    let revealHeld = false;
    let lastNavAt = 0;
    let destroyed = false;
    let resolvedEndingId = null;
    let resolvedGameOverId = null;

    const actionRouter = createActionRouter();
    actionRouter.setActionSet(ACTION_SETS.ARCHIVE);

    root.classList.remove('hidden');
    root.classList.add('rgb-root');
    root.replaceChildren();

    window.dispatchEvent(new CustomEvent('rgb-started'));

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

    function render() {
        root.replaceChildren();
        if (mode === 'warning') return renderWarning();
        if (mode === 'ending') return renderEndingCard();
        if (mode === 'gameover') return renderGameOverCard();

        const chapter = currentChapter();
        const scene = document.createElement('div');
        scene.className = 'rgb-scene';

        const header = document.createElement('div');
        header.className = 'rgb-header';
        const title = document.createElement('div');
        title.className = 'rgb-header__title';
        title.textContent = chapter.title;
        const goal = document.createElement('div');
        goal.className = 'rgb-header__goal';
        goal.textContent = chapter.goal;
        header.append(title, goal);
        scene.append(header);

        const stage = document.createElement('div');
        stage.className = 'rgb-stage-layer';
        const ready = new Set(focusableHotspots().map((h) => h.id));
        chapter.hotspots.forEach((hotspot) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'rgb-hotspot';
            btn.textContent = hotspot.label;
            btn.style.left = `calc(var(--stage-px, 1px) * ${hotspot.x})`;
            btn.style.top = `calc(var(--stage-px, 1px) * ${hotspot.y})`;
            btn.style.width = `calc(var(--stage-px, 1px) * ${hotspot.w})`;
            btn.style.height = `calc(var(--stage-px, 1px) * ${hotspot.h})`;

            const isDone = hotspot.once && visited.has(hotspot.id);
            const isReady = ready.has(hotspot.id);
            btn.classList.toggle('rgb-hotspot--done', Boolean(isDone));
            btn.classList.toggle('rgb-hotspot--locked', !isReady && !isDone);
            btn.classList.toggle('rgb-hotspot--reveal', revealHeld);
            btn.disabled = !isReady;
            btn.addEventListener('click', () => activateHotspot(hotspot));
            stage.appendChild(btn);
        });
        scene.append(stage);

        const dialogue = document.createElement('div');
        dialogue.className = 'rgb-dialogue';
        dialogue.id = 'rgb-dialogue';
        scene.append(dialogue);

        const footer = document.createElement('div');
        footer.className = 'rgb-footer';
        footer.textContent = 'TAB INVENTORY · HOLD Q REVEAL · R RECAP · ESC PAUSE';
        scene.append(footer);

        root.append(scene);

        if (mode === 'inventory') renderInventoryOverlay();
        if (mode === 'recap') renderRecapOverlay();
        if (mode === 'pause') renderPauseOverlay();

        applyFocus();
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
        btn.addEventListener('click', () => {
            mode = 'scene';
            render();
        });
        overlay.append(body, btn);
        root.append(overlay);
        btn.focus();
    }

    function renderDialogueLines(lines) {
        const dialogue = root.querySelector('#rgb-dialogue');
        if (!dialogue) return;
        dialogue.replaceChildren();
        for (const line of lines ?? []) {
            const p = document.createElement('p');
            p.textContent = line;
            dialogue.appendChild(p);
        }
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
            const list = document.createElement('ul');
            for (const itemId of runState.inventory) {
                const li = document.createElement('li');
                li.textContent = ITEMS[itemId]?.label ?? itemId;
                list.appendChild(li);
            }
            overlay.append(list);
        }
        root.append(overlay);
    }

    function renderRecapOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'rgb-overlay rgb-recap';
        const title = document.createElement('div');
        title.className = 'rgb-overlay__title';
        title.textContent = 'RECAP';
        const goal = document.createElement('div');
        goal.textContent = `Goal: ${currentChapter().goal}`;
        const pain = document.createElement('div');
        pain.textContent = `Elias: ${runState.pain}`;
        const evidence = document.createElement('div');
        evidence.textContent = `Evidence gathered: ${runState.evidence.length}`;
        overlay.append(title, goal, pain, evidence);
        root.append(overlay);
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
        const exitBtn = document.createElement('button');
        exitBtn.type = 'button';
        exitBtn.textContent = 'EXIT SIMULATION';
        exitBtn.addEventListener('click', handleExit);
        overlay.append(title, resumeBtn, exitBtn);
        root.append(overlay);
        resumeBtn.focus();
    }

    function renderEndingCard() {
        const ending = ENDINGS[resolvedEndingId];
        const card = document.createElement('div');
        card.className = 'rgb-card rgb-card--ending';
        const title = document.createElement('div');
        title.className = 'rgb-card__title';
        title.textContent = ending.title;
        const body = document.createElement('div');
        body.className = 'rgb-card__body';
        body.textContent = ending.body;
        const exitBtn = document.createElement('button');
        exitBtn.type = 'button';
        exitBtn.textContent = 'EXIT SIMULATION';
        exitBtn.addEventListener('click', handleExit);
        card.append(title, body, exitBtn);
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

        renderDialogueLines(hotspot.lines);
        runState = applyEffects(runState, hotspot.effects);
        visited.add(hotspot.id);
        persist();

        if (!hotspot.advances) {
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
        render();
    }

    function transitionToChapter(chapterId) {
        runState = { ...runState, checkpoint: chapterId };
        visited = new Set();
        focusIndex = 0;
        currentSave = saveCheckpoint(currentSave, chapterId);
        persist();
        window.dispatchEvent(new CustomEvent('rgb-checkpoint', { detail: { checkpoint: chapterId } }));
        mode = 'scene';
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
        mode = 'scene';
        render();
    }

    function loadChapterFromCheckpoint() {
        runState = hydrateRunState(currentSave);
        visited = new Set();
        focusIndex = 0;
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
                mode = 'scene';
                render();
            }
            return;
        }
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
            } else if ((mode === 'inventory' || mode === 'pause') && actions.back) {
                mode = 'scene';
                render();
            }
            if (revealHeld !== actions.reveal) {
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
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if (gamepadFrame) cancelAnimationFrame(gamepadFrame);
            root.replaceChildren();
            root.classList.add('hidden');
            root.classList.remove('rgb-root');
        }
    };
}
