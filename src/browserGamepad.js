export const BROWSER_GAMEPAD_DEADZONE = 0.18;
export const BROWSER_GAMEPAD_MENU_DEADZONE = 0.55;

function clampAxis(value) {
    const axis = Number(value) || 0;
    return Math.max(-1, Math.min(1, axis));
}

export function normalizeGamepadAxis(value, deadzone = BROWSER_GAMEPAD_DEADZONE) {
    const axis = clampAxis(value);
    return Math.abs(axis) > deadzone ? axis : 0;
}

export function isGamepadButtonPressed(button, threshold = 0.5) {
    if (!button) return false;
    return Boolean(button.pressed) || Number(button.value) >= threshold;
}

function readButton(buttons, index) {
    return isGamepadButtonPressed(buttons?.[index]);
}

export function inferBrowserGamepadType(id = '') {
    const normalized = String(id).toLowerCase();
    if (normalized.includes('dualsense') || normalized.includes('ps5')) return 'PS5Controller';
    if (normalized.includes('dualshock') || normalized.includes('playstation') || normalized.includes('ps4')) return 'PS4Controller';
    if (normalized.includes('switch') || normalized.includes('joy-con') || normalized.includes('joycon')) return 'SwitchProController';
    if (normalized.includes('xbox') || normalized.includes('xinput')) return 'XBoxOneController';
    return 'GenericGamepad';
}

export function mapBrowserGamepad(gamepad, {
    deadzone = BROWSER_GAMEPAD_DEADZONE,
    menuDeadzone = BROWSER_GAMEPAD_MENU_DEADZONE
} = {}) {
    if (!gamepad) return null;

    const buttons = Array.from(gamepad.buttons ?? []);
    const axes = Array.from(gamepad.axes ?? []);
    const moveX = normalizeGamepadAxis(axes[0], deadzone);
    const moveY = normalizeGamepadAxis(axes[1], deadzone);
    const cameraX = normalizeGamepadAxis(axes[2], deadzone);
    const cameraY = normalizeGamepadAxis(axes[3], deadzone);
    const menuX = normalizeGamepadAxis(axes[0], menuDeadzone);
    const menuY = normalizeGamepadAxis(axes[1], menuDeadzone);

    const mapped = {
        handle: `browser-gamepad:${gamepad.index ?? 0}`,
        type: inferBrowserGamepadType(gamepad.id),
        active: false,
        move: { x: moveX, y: moveY },
        camera: { x: cameraX, y: cameraY },
        // Shape parity with the Steam Input snapshot. The Web Gamepad API exposes
        // neither a trackpad nor a gyro, so there is no mouse-style aim source to
        // feed this here — it stays zero and the consumer falls back to stick aim.
        cameraDelta: { x: 0, y: 0 },
        fire: readButton(buttons, 7),
        interact: readButton(buttons, 0),
        reload: readButton(buttons, 2),
        melee: readButton(buttons, 3),
        // Y is the gameplay smash action and the archive Inventory action.
        // Keep both semantic fields populated so action-set routing can choose
        // the meaning without losing the browser fallback on Steam Deck.
        ability: readButton(buttons, 3),
        dash: readButton(buttons, 1),
        scan: readButton(buttons, 4),
        sprint: readButton(buttons, 6),
        pause: readButton(buttons, 9),
        toggleMap: readButton(buttons, 5) || readButton(buttons, 8) || readButton(buttons, 16),
        menuUp: readButton(buttons, 12) || menuY < 0,
        menuDown: readButton(buttons, 13) || menuY > 0,
        menuLeft: readButton(buttons, 14) || menuX < 0,
        menuRight: readButton(buttons, 15) || menuX > 0,
        // Treat RT as a second A/Confirm button in menus. It remains Fire in
        // gameplay because the action router chooses semantics by action set.
        menuConfirm: readButton(buttons, 0) || readButton(buttons, 7),
        menuBack: readButton(buttons, 1),
        // Dedicated bumpers for menu tab navigation, mirroring the "menu" action
        // set's left_bumper/right_bumper bindings in controller_neptune.vdf. Kept
        // separate from scan/fire/menuBack (which share buttons 1 and 8) so a
        // single back press can't also flip the active tab.
        menuTabLeft: readButton(buttons, 4),
        menuTabRight: readButton(buttons, 5)
    };

    mapped.active = Boolean(
        mapped.move.x || mapped.move.y || mapped.camera.x || mapped.camera.y
        || mapped.fire || mapped.interact || mapped.reload || mapped.melee || mapped.ability || mapped.dash
        || mapped.scan || mapped.sprint || mapped.pause
        || mapped.menuUp || mapped.menuDown || mapped.menuLeft || mapped.menuRight
        || mapped.menuConfirm || mapped.menuBack
        || mapped.menuTabLeft || mapped.menuTabRight
    );

    return mapped;
}

function analogMagnitude(vector) {
    return Math.hypot(Number(vector?.x) || 0, Number(vector?.y) || 0);
}

/**
 * Fill missing native Steam Input stick vectors from Chromium's standard
 * Gamepad view of the same physical controller. Steam can keep reporting
 * digital native actions while an old/stale layout leaves one or both analog
 * action handles neutral; in that state the normal all-or-nothing browser
 * fallback never takes ownership. Merging each stick independently preserves
 * native buttons while restoring movement, aim, and menu pointer input.
 */
export function mergeBrowserAnalogFallback(nativeController, browserControllers = [], deadzone = BROWSER_GAMEPAD_DEADZONE) {
    if (!nativeController) return nativeController;

    const findVector = (field) => browserControllers
        .map((controller) => controller?.[field])
        .find((vector) => analogMagnitude(vector) > deadzone);
    const move = analogMagnitude(nativeController.move) > deadzone
        ? nativeController.move
        : findVector('move') ?? nativeController.move;
    const camera = analogMagnitude(nativeController.camera) > deadzone
        ? nativeController.camera
        : findVector('camera') ?? nativeController.camera;

    if (move === nativeController.move && camera === nativeController.camera) return nativeController;
    return { ...nativeController, move, camera };
}
