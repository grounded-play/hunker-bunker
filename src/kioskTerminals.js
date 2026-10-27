/**
 * The machines the player walks up to, as machines: each terminal's existing
 * UI is seated in a kiosk frame (src/kioskFrame.js) without touching the code
 * that renders it. Elements are moved, never rebuilt, so every id, listener
 * and focus rule keeps working, and the Foundry hub can still borrow the Fab
 * Bay panels by id.
 *
 *   Fabrication Bay  Auto-Mart: the screen shows the bay, A1-A4 are the
 *                    aisles, B2 exits; the Lotto aisle swaps to the
 *                    Slot-O-Mart (reels spin with the roll, the lever rolls)
 *   Main terminal    Meridian MK IV-B: the screen shows the terminal, the
 *                    three windows below are its departments
 *   Black-Ice 21     the cabinet: the screen shows the table, the four
 *                    buttons are DEAL, HIT, STAND, DOUBLE
 */
import { createKioskFrame } from './kioskFrame.js';
import { t } from './i18n.js';
import { BEZEL_SEATS, KIOSK_CONTROLS } from './data/kioskControls.js';
import { TerminalBezelController } from './terminalBezelInteractivity.js';

const SLOT_MACHINE = 'slot_minimart_overlay';
// The Slot-O-Mart's pull lever, in % of its frame (the painting has no hole
// there; the roll is one pull away from the reels).
const SLOT_LEVER = { x: 75.5, y: 55, w: 6.5, h: 28 };

function screenWrapper(doc, className) {
    const wrapper = doc.createElement('div');
    wrapper.className = `kiosk-screen ${className}`;
    return wrapper;
}

function moveInto(target, element) {
    if (element && element.parentNode !== target) target.appendChild(element);
}

const BEZEL_LAYER = '.bezel-interactive-layer';

/**
 * Seat the bezel interactivity layer (src/terminalBezelInteractivity.js) on
 * the machine: each control moves onto its painted counterpart
 * (src/data/kioskControls.js), a control the machine lacks is hidden. The
 * controller keeps its listeners because elements are moved, not rebuilt.
 * Returns restore(), which puts every control back in the layer.
 */
function seatBezel(frame, content, overlayName) {
    const layer = content.querySelector(BEZEL_LAYER);
    const controls = KIOSK_CONTROLS[overlayName];
    if (!layer || !controls) return () => {};
    const moved = [];
    for (const [selector, control] of BEZEL_SEATS) {
        const element = layer.querySelector(selector);
        if (!element) continue;
        moved.push({ element, parent: element.parentNode, next: element.nextSibling, hidden: element.hidden });
        if (controls[control]) moveInto(frame.slot(control), element);
        else element.hidden = true;
    }
    layer.classList.add('bezel-interactive-layer--seated');
    return () => {
        for (const { element, parent, next, hidden } of moved.reverse()) {
            parent.insertBefore(element, next?.parentNode === parent ? next : null);
            element.hidden = hidden;
        }
        layer.classList.remove('bezel-interactive-layer--seated');
    };
}

/**
 * The Fabrication Bay as the Auto-Mart, for the machine in the world: mount
 * it when the bay opens from the machine. When the modal hides, the bay's
 * markup goes back exactly as it was (the Foundry hub borrows those panels).
 * Returns null if the markup is missing.
 */
export function mountFabricationKiosk({ doc = globalThis.document, onRoll = null } = {}) {
    const modal = doc?.getElementById('fabrication-modal');
    const content = modal?.querySelector('.fab-modal-content');
    if (!content || content.classList.contains('kiosk-framed')) return null;
    const nav = doc.getElementById('fab-aisle-nav');
    const aisles = ['hardware', 'weapons', 'lotto', 'all'].map((aisle) => doc.getElementById(`fab-aisle-btn-${aisle}`));
    const exit = doc.getElementById('close-fabrication-modal');
    const exitMarkup = exit?.innerHTML ?? '';
    const rollPanel = doc.getElementById('fab-roll-panel');
    const original = [...content.children];

    const screen = screenWrapper(doc, 'kiosk-screen--fab');
    for (const child of original) {
        if (child === nav || child === exit || child.matches?.(BEZEL_LAYER)) continue;
        screen.appendChild(child);
    }
    if (exit) {
        exit.classList.add('kiosk-exit');
        exit.innerHTML = `<span class="kiosk-exit__label">${t('ui.kiosk.exit')}</span>`;
    }

    const reels = [1, 2, 3].map((index) => {
        const reel = doc.createElement('div');
        reel.className = 'kiosk-reel';
        reel.setAttribute('aria-hidden', 'true');
        reel.innerHTML = '<div class="kiosk-reel__strip">◇<br>◈<br>⬢<br>✚<br>◎<br>★<br>◇</div>';
        reel.style.setProperty('--reel-delay', `${index * 0.12}s`);
        return reel;
    });
    const lever = doc.createElement('button');
    lever.type = 'button';
    lever.className = 'kiosk-lever';
    lever.setAttribute('aria-label', t('ui.kiosk.pull_lever'));
    lever.addEventListener('click', () => (onRoll ? onRoll() : doc.getElementById('fab-roll-btn')?.click()));

    const frame = createKioskFrame(content, {
        overlay: 'fab_automart_overlay',
        hotspots: { [SLOT_MACHINE]: { lever: SLOT_LEVER }, fab_automart_overlay: KIOSK_CONTROLS.fab_automart_overlay },
        doc
    });

    function seat() {
        const slotMachine = modal.dataset.activeAisle === 'lotto';
        frame.setOverlay(slotMachine ? SLOT_MACHINE : 'fab_automart_overlay');
        if (slotMachine) {
            moveInto(frame.slot('screen'), rollPanel);
            reels.forEach((reel, index) => moveInto(frame.slot(`reel${index + 1}`), reel));
            [...aisles, exit].forEach((button, index) => moveInto(frame.slot(`row${index + 1}`), button));
            moveInto(frame.slot('lever'), lever);
        } else {
            moveInto(frame.slot('screen'), screen);
            // The roll panel goes back above the grid, where the bay renders it.
            const grid = doc.getElementById('fab-recipe-grid');
            if (rollPanel && grid && rollPanel.parentNode !== screen) screen.insertBefore(rollPanel, grid);
            if (frame.has('aisle1')) {
                [...aisles, exit].forEach((button, index) => moveInto(frame.slot(`aisle${index + 1}`), button));
                if (nav) nav.hidden = true;
            } else {
                // A machine with one big screen: the aisles and exit are on it.
                aisles.forEach((button) => moveInto(nav, button));
                if (nav) { nav.hidden = false; screen.prepend(nav); }
                if (exit) moveInto(nav ?? screen, exit);
            }
        }
    }
    seat();

    // The bay marks the aisle on the modal; the reels spin while it reveals.
    const Observer = globalThis.MutationObserver;
    const aisleWatch = Observer ? new Observer(seat) : null;
    aisleWatch?.observe(modal, { attributes: true, attributeFilter: ['data-active-aisle'] });
    const reveal = doc.getElementById('fab-reveal');
    const spinWatch = Observer && reveal ? new Observer(() => {
        content.classList.toggle('kiosk-reels-spinning', reveal.dataset.state === 'spinning');
    }) : null;
    spinWatch?.observe(reveal, { attributes: true, attributeFilter: ['data-state'] });

    // The bay may build its bezel layer before or after the machine mounts.
    let unseat = () => {};
    const seatControls = () => {
        if (frame.getOverlay() !== 'fab_automart_overlay' || content.querySelector(`${BEZEL_LAYER}.bezel-interactive-layer--seated`)) return;
        unseat = seatBezel(frame, content, 'fab_automart_overlay');
    };
    seatControls();
    const layerWatch = Observer ? new Observer(seatControls) : null;
    layerWatch?.observe(content, { childList: true });

    let disposed = false;
    function dispose() {
        if (disposed) return;
        disposed = true;
        layerWatch?.disconnect();
        unseat();
        aisleWatch?.disconnect();
        spinWatch?.disconnect();
        closeWatch?.disconnect();
        frame.dispose();
        aisles.forEach((button) => moveInto(nav, button));
        if (exit) {
            exit.classList.remove('kiosk-exit');
            exit.innerHTML = exitMarkup;
        }
        if (nav) nav.hidden = false;
        // Every original child back in its original order (the roll panel too).
        for (const child of original) content.appendChild(child);
        if (rollPanel && !rollPanel.parentNode?.isConnected) content.insertBefore(rollPanel, doc.getElementById('fab-recipe-grid'));
        screen.remove();
        content.classList.remove('kiosk-reels-spinning');
    }
    const closeWatch = Observer ? new Observer(() => { if (modal.classList.contains('hidden')) dispose(); }) : null;
    closeWatch?.observe(modal, { attributes: true, attributeFilter: ['class'] });

    return { frame, seat, dispose };
}

/** The main terminal as the Meridian MK IV-B console. */
export function mountTerminalKiosk({ doc = globalThis.document } = {}) {
    const content = doc?.querySelector('#console-terminal-modal .console-terminal-content');
    if (!content || content.classList.contains('kiosk-framed')) return null;
    const tabs = ['base', 'skills', 'objectives'].map((tab) => doc.getElementById(`terminal-tab-${tab}`));
    const screen = screenWrapper(doc, 'kiosk-screen--terminal');
    for (const child of [...content.children]) screen.appendChild(child);
    const frame = createKioskFrame(content, {
        overlay: 'console_kiosk_overlay',
        hotspots: { console_kiosk_overlay: KIOSK_CONTROLS.console_kiosk_overlay },
        doc
    });
    moveInto(frame.slot('screen'), screen);
    // The console's bolts, LEDs, port panel and maintenance hatch are live too.
    const bezel = new TerminalBezelController({ container: content, doc });
    const unseat = seatBezel(frame, content, 'console_kiosk_overlay');
    // Each visit starts at the top of the department.
    const modal = doc.getElementById('console-terminal-modal');
    const Observer = globalThis.MutationObserver;
    const openWatch = Observer && modal ? new Observer(() => {
        if (!modal.classList.contains('hidden')) screen.querySelectorAll('.terminal-tab-content').forEach((tab) => { tab.scrollTop = 0; });
    }) : null;
    openWatch?.observe(modal, { attributes: true, attributeFilter: ['class'] });
    // Department windows when the console has them; otherwise the tabs stay on screen.
    if (frame.has('row3')) tabs.forEach((tab, index) => moveInto(frame.slot(`row${index + 1}`), tab));
    return { frame, bezel, dispose: () => { openWatch?.disconnect(); unseat(); frame.dispose(); } };
}

/** The Black-Ice 21 cabinet: `press(key, code)` feeds its key handler. */
export function mountArcadeKiosk(overlay, { press, doc = globalThis.document } = {}) {
    const bezel = overlay?.querySelector('.arcade-cabinet-frame');
    if (!bezel || bezel.classList.contains('kiosk-framed')) return null;
    const screen = screenWrapper(doc, 'kiosk-screen--arcade');
    for (const child of [...bezel.children]) screen.appendChild(child);
    const frame = createKioskFrame(bezel, { overlay: 'arcade_cabinet_overlay', doc });
    moveInto(frame.slot('screen'), screen);
    const buttons = [[t('ui.kiosk.deal'), ' ', 'Space'], [t('ui.kiosk.hit'), '1', 'Digit1'], [t('ui.kiosk.stand'), '2', 'Digit2'], [t('ui.kiosk.double'), '3', 'Digit3']];
    // Round buttons in the cabinet's holes, or a lit button bar under the table.
    const bar = frame.has('row4') ? null : doc.createElement('div');
    if (bar) { bar.className = 'kiosk-arcade-bar'; screen.appendChild(bar); }
    buttons.forEach(([label, key, code], index) => {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'kiosk-arcade-btn';
        button.textContent = label;
        button.setAttribute('aria-label', label);
        button.addEventListener('click', () => press?.(key, code));
        moveInto(bar ?? frame.slot(`row${index + 1}`), button);
    });
    return { frame, dispose: () => frame.dispose() };
}
