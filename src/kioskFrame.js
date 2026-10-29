/**
 * Kiosk frames: a menu seated inside a physical machine.
 *
 * The machines are chroma-keyed overlay paintings (public/ui/overlays/, keyed
 * and measured by scripts/ui/key-kiosk-overlays.py into
 * src/data/kioskOverlays.json). The real UI lives in the painted holes: the
 * screen, aisle buttons, slot reels, readouts. The machine is zoomed so its
 * working area fills the modal, as if the player has stepped up to it, and the
 * painting sits on top with its holes clear, so the bezel overlaps the UI's
 * edges like glass in a cabinet.
 *
 * Roles name the holes so callers never deal in indices:
 *   screen     the largest hole
 *   aisle1..n  buttons stacked in a column beside the screen, top to bottom
 *   row1..n    windows or buttons in a row below the screen, left to right
 *   reel1..n   tall narrow windows above the screen (a slot machine's reels)
 *   side1..n   anything else (gaps in a cabinet's side art); left empty
 */
import { assetUrl } from './assetUrl.js';
import KIOSK_OVERLAYS from './data/kioskOverlays.json';

export { KIOSK_OVERLAYS };

/** Name every cutout of an overlay by role. */
export function kioskRoles(overlay) {
    const [screen, ...rest] = overlay.cutouts;
    const roles = { screen };
    const reels = rest.filter((hole) => hole.h > hole.w * 1.6 && hole.y + hole.h <= screen.y + 1).sort((a, b) => a.x - b.x);
    // A column sits beside the screen, within its height; anything lower is a row.
    const column = rest.filter((hole) => !reels.includes(hole) && hole.x >= screen.x + screen.w && hole.y + hole.h <= screen.y + screen.h + 2).sort((a, b) => a.y - b.y);
    const row = rest.filter((hole) => !reels.includes(hole) && !column.includes(hole) && hole.y >= screen.y + screen.h - 1).sort((a, b) => a.x - b.x);
    const side = rest.filter((hole) => !reels.includes(hole) && !column.includes(hole) && !row.includes(hole)).sort((a, b) => a.y - b.y);
    reels.forEach((hole, index) => { roles[`reel${index + 1}`] = hole; });
    column.forEach((hole, index) => { roles[`aisle${index + 1}`] = hole; });
    row.forEach((hole, index) => { roles[`row${index + 1}`] = hole; });
    side.forEach((hole, index) => { roles[`side${index + 1}`] = hole; });
    return roles;
}

/**
 * The rectangle (in % of the frame) that has to fit the modal. A machine
 * painted on a transparent field (outer edges blank, the game blurred around
 * it) is shown whole; a full-bleed painting is zoomed to its holes plus a
 * margin of machine, as if the player has stepped up to it.
 */
export function kioskFocus(overlay, pad = 7, extra = []) {
    const b = overlay.bounds;
    if (b && (b.w < 99.5 || b.h < 99.5)) {
        return { x: Math.max(0, b.x - 1), y: Math.max(0, b.y - 1), w: Math.min(100, b.w + 2), h: Math.min(100, b.h + 2) };
    }
    const holes = [...overlay.cutouts, ...extra];
    const x0 = Math.max(0, Math.min(...holes.map((h) => h.x)) - pad);
    const y0 = Math.max(0, Math.min(...holes.map((h) => h.y)) - pad);
    const x1 = Math.min(100, Math.max(...holes.map((h) => h.x + h.w)) + pad);
    const y1 = Math.min(100, Math.max(...holes.map((h) => h.y + h.h)) + pad);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * Plate size and offset (px) that fit `focus` inside a `width` x `height`
 * box, centred, for an overlay of the given pixel aspect.
 */
export function kioskPlacement({ width, height }, aspect, focus) {
    const ratio = aspect[0] / aspect[1];
    const plateWidth = Math.min(width / (focus.w / 100), (height / (focus.h / 100)) * ratio);
    const plateHeight = plateWidth / ratio;
    return {
        width: plateWidth,
        height: plateHeight,
        left: width / 2 - plateWidth * (focus.x + focus.w / 2) / 100,
        top: height / 2 - plateHeight * (focus.y + focus.h / 2) / 100,
        scale: plateWidth / aspect[0]
    };
}

/**
 * Seat `content` (the modal's content box) in a machine. Returns slot(role)
 * to fill holes, setOverlay(name) to swap machines while keeping the slots'
 * children, and dispose().
 */
export function createKioskFrame(content, { overlay, hotspots = {}, doc = globalThis.document } = {}) {
    const plate = doc.createElement('div');
    plate.className = 'kiosk-plate';
    plate.setAttribute('aria-hidden', 'false');
    const art = doc.createElement('img');
    art.className = 'kiosk-plate__art';
    art.alt = '';
    art.setAttribute('aria-hidden', 'true');
    art.decoding = 'async';
    const slots = new Map();
    let current = null;
    let roles = {};
    let focus = null;

    function slot(role) {
        if (!slots.has(role)) {
            const element = doc.createElement('div');
            element.className = `kiosk-slot kiosk-slot--${role.replace(/\d+$/, '')}`;
            element.dataset.kioskRole = role;
            plate.insertBefore(element, art);
            slots.set(role, element);
            place(element, roles[role] ?? hotspots[content.dataset.kiosk]?.[role]);
        }
        return slots.get(role);
    }

    function place(element, rect) {
        element.hidden = !rect;
        if (!rect) return;
        element.style.left = `${rect.x}%`;
        element.style.top = `${rect.y}%`;
        element.style.width = `${rect.w}%`;
        element.style.height = `${rect.h}%`;
    }

    function layout() {
        if (!current) return;
        const box = content.getBoundingClientRect?.() ?? { width: 0, height: 0 };
        if (!box.width || !box.height) return;
        const at = kioskPlacement(box, current.aspect, focus);
        plate.style.width = `${at.width}px`;
        plate.style.height = `${at.height}px`;
        plate.style.left = `${at.left}px`;
        plate.style.top = `${at.top}px`;
        content.style.setProperty('--kiosk-scale', at.scale.toFixed(4));
    }

    function setOverlay(name) {
        const next = KIOSK_OVERLAYS[name];
        if (!next || next === current) return;
        current = next;
        roles = kioskRoles(next);
        const extra = Object.values(hotspots[name] ?? {});
        focus = kioskFocus(next, 7, extra);
        art.src = assetUrl(next.image);
        content.dataset.kiosk = name;
        // Holes nobody fills stay empty glass; only slots in use are placed.
        for (const [role, element] of slots) place(element, roles[role] ?? hotspots[name]?.[role]);
        layout();
    }

    /** Whether this machine has a hole (or hotspot) for the role. */
    function has(role) {
        return Boolean(roles[role] ?? hotspots[content.dataset.kiosk]?.[role]);
    }

    content.classList.add('kiosk-framed');
    plate.appendChild(art);
    content.prepend(plate);
    setOverlay(overlay);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(layout) : null;
    observer?.observe(content);

    return {
        slot,
        has,
        setOverlay,
        layout,
        getOverlay: () => content.dataset.kiosk,
        getRoles: () => ({ ...roles }),
        dispose() {
            observer?.disconnect();
            content.classList.remove('kiosk-framed');
            delete content.dataset.kiosk;
            plate.remove();
        }
    };
}
