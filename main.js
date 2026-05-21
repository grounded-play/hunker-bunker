import { AudioManager } from './src/audio.js';
const startBtn = document.getElementById('start-game'); // INITIALIZE button
const playBtn = document.getElementById('enter-fullscreen'); // PLAY GAME button
const splash = document.getElementById('splash');
const menu = document.getElementById('menu');
const loadingScreen = document.getElementById('loading-screen');
const transitionOverlay = document.getElementById('transition-overlay');
const loaderBar = document.querySelector('.loader-bar');
const loaderStatus = document.querySelector('.loader-status');

const splashDebugToggle = document.getElementById('splash-debug-toggle');
const splashFsToggle = document.getElementById('splash-fs-toggle');
const mainDebugToggle = document.getElementById('main-debug-toggle');
const gameViewport = document.getElementById('game-viewport');
const gameStageContainer = document.getElementById('game-container');
const touchMoveControl = document.getElementById('touch-move-control');
const touchMoveRing = touchMoveControl?.querySelector('.touch-move-control__ring');
const touchMoveThumb = touchMoveControl?.querySelector('.touch-move-control__thumb');
const touchControlsSetting = document.getElementById('touch-controls-setting');
const mainTouchToggle = document.getElementById('main-touch-toggle');

const DESIGN_STAGE = {
    width: 177,
    height: 100
};

const state = {
    settings: {
        debug: false,
        sound: true,
        fullscreen: false,
        touchControls: false
    },
    onlineCount: 1,
    gameInitialized: false
};

const gearSpinState = {
    rotation: 0,
    velocity: 0,
    targetVelocity: 0,
    lastTime: performance.now()
};

let stageResizeObserver = null;
let activeTouchPointerId = null;

function isTouchDevice() {
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const touchPoints = navigator.maxTouchPoints > 0;
    const touchEvents = 'ontouchstart' in window;
    const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
    const narrowViewport = window.innerWidth <= 900 || window.innerHeight <= 900;

    return coarsePointer || touchPoints || touchEvents || (mobileUserAgent && narrowViewport);
}

function setTouchDeviceMode() {
    const touchDevice = isTouchDevice();
    document.body.classList.toggle('touch-device', touchDevice);

    if (mainTouchToggle) {
        mainTouchToggle.checked = !!state.settings.touchControls;
    }

    syncTouchSettingsVisibility();
    syncTouchMoveControlVisibility();
}

function syncTouchSettingsVisibility() {
    if (!touchControlsSetting) return;
    const isHUD = !document.getElementById('ui')?.classList.contains('hidden');
    touchControlsSetting.classList.toggle('hidden', !isHUD);
}

function syncTouchMoveControlVisibility() {
    if (!touchMoveControl) return;

    const isHUD = !document.getElementById('ui')?.classList.contains('hidden');
    const shouldShow = isHUD && state.settings.touchControls;
    touchMoveControl.classList.toggle('hidden', !shouldShow);

    if (!shouldShow) {
        activeTouchPointerId = null;
        touchMoveControl.classList.remove('active');
        touchMoveThumb?.style.setProperty('transform', 'translate(-50%, -50%)');
        window.game?.setVirtualInput?.(0, 0);
    }
}

function installTouchMoveControl() {
    if (!touchMoveControl || !touchMoveRing || !touchMoveThumb) return;

    const maxThumbOffset = () => touchMoveRing.clientWidth * 0.22;

    const resetTouchControl = () => {
        activeTouchPointerId = null;
        touchMoveControl.classList.remove('active');
        touchMoveThumb.style.transform = 'translate(-50%, -50%)';
        window.game?.setVirtualInput?.(0, 0);
    };

    const updateTouchVector = (clientX, clientY) => {
        const rect = touchMoveRing.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = clientX - centerX;
        const deltaY = clientY - centerY;
        const radius = Math.max(rect.width * 0.36, 1);
        const distance = Math.hypot(deltaX, deltaY);
        const clampRatio = distance > radius ? radius / distance : 1;
        const clampedX = deltaX * clampRatio;
        const clampedY = deltaY * clampRatio;
        const thumbRange = maxThumbOffset();
        const thumbScale = radius > 0 ? thumbRange / radius : 0;

        touchMoveThumb.style.transform = `translate(calc(-50% + ${clampedX * thumbScale}px), calc(-50% + ${clampedY * thumbScale}px))`;
        window.game?.setVirtualInput?.(clampedX / radius, clampedY / radius);
    };

    touchMoveRing.addEventListener('pointerdown', (event) => {
        activeTouchPointerId = event.pointerId;
        touchMoveControl.classList.add('active');
        touchMoveRing.setPointerCapture(event.pointerId);
        updateTouchVector(event.clientX, event.clientY);
        event.preventDefault();
    });

    touchMoveRing.addEventListener('pointermove', (event) => {
        if (event.pointerId !== activeTouchPointerId) return;
        updateTouchVector(event.clientX, event.clientY);
        event.preventDefault();
    });

    const releaseTouchControl = (event) => {
        if (event.pointerId !== activeTouchPointerId) return;
        resetTouchControl();
    };

    touchMoveRing.addEventListener('pointerup', releaseTouchControl);
    touchMoveRing.addEventListener('pointercancel', releaseTouchControl);
    touchMoveRing.addEventListener('lostpointercapture', resetTouchControl);
}

function syncStageMetrics() {
    if (!gameViewport) return;

    const rect = gameViewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const unit = Math.min(rect.width / DESIGN_STAGE.width, rect.height / DESIGN_STAGE.height);
    gameViewport.style.setProperty('--vu', `${unit}px`);
}

function refreshGameLayout() {
    syncStageMetrics();

    if (window.game?.scale?.refresh) {
        requestAnimationFrame(() => {
            window.game.scale.refresh();
        });
    }
}

function queueGameLayoutRefresh(frameCount = 3) {
    let framesRemaining = frameCount;

    const step = () => {
        refreshGameLayout();
        framesRemaining -= 1;

        if (framesRemaining > 0) {
            requestAnimationFrame(step);
        }
    };

    requestAnimationFrame(step);
}

function installStageLayoutSync() {
    syncStageMetrics();

    if (stageResizeObserver || !gameViewport || !('ResizeObserver' in window)) return;

    stageResizeObserver = new ResizeObserver(() => {
        refreshGameLayout();
    });
    stageResizeObserver.observe(gameViewport);
    if (gameStageContainer) {
        stageResizeObserver.observe(gameStageContainer);
    }
}

// --- Initialization ---
if (playBtn) {
    playBtn.addEventListener('click', () => {
        triggerDoorTransition(
            () => {
                if (splash) splash.classList.add('hidden');
                if (menu) {
                    menu.classList.remove('hidden');
                    queueGameLayoutRefresh();
                }
            },
            () => {
                if (state.settings.fullscreen) {
                    document.documentElement.requestFullscreen().catch(() => { });
                }
            }
        );
    });
}

if (startBtn) {
    startBtn.addEventListener('click', () => {
        triggerDoorTransition(
            () => {
                if (menu) menu.classList.add('hidden');
                document.getElementById('ui').classList.remove('hidden');
                syncTouchSettingsVisibility();
                syncTouchMoveControlVisibility();

                const gameContainer = document.getElementById('game-container');
                const viewport = document.getElementById('game-viewport');
                if (gameContainer && viewport) {
                    viewport.insertBefore(gameContainer, document.getElementById('ui'));
                    gameContainer.classList.add('fullscreen-mode');
                    queueGameLayoutRefresh();
                }
            },
            () => {
                console.log("Mission Initialized. Tactical HUD Active.");
            }
        );
    });
}

// Settings Handlers
if (splashDebugToggle) {
    splashDebugToggle.addEventListener('change', (e) => {
        state.settings.debug = e.target.checked;
        setDebugMode(state.settings.debug);
        if (mainDebugToggle) mainDebugToggle.checked = state.settings.debug;
    });
}

if (splashFsToggle) {
    splashFsToggle.addEventListener('change', (e) => {
        state.settings.fullscreen = e.target.checked;
        if (state.settings.fullscreen) {
            document.documentElement.requestFullscreen().catch(() => { });
        } else {
            if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
        }
    });
}

// Fullscreen State Sync Listener
document.addEventListener('fullscreenchange', () => {
    const isFs = !!document.fullscreenElement;
    state.settings.fullscreen = isFs;
    if (splashFsToggle) splashFsToggle.checked = isFs;
    if (mainFsToggle) mainFsToggle.checked = isFs;
    queueGameLayoutRefresh();
});

// Global UI Updates
function setDebugMode(active) {
    if (active) {
        document.body.classList.add('show-debug');
    } else {
        document.body.classList.remove('show-debug');
    }
}

// FPS Counter (Debug Tool)
let lastTime = performance.now();
let frames = 0;
const fpsDisplay = document.getElementById('fps-counter');

function updateFPS() {
    frames++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
        if (fpsDisplay) fpsDisplay.textContent = `FPS: ${frames}`;
        frames = 0;
        lastTime = now;
    }
    requestAnimationFrame(updateFPS);
}
requestAnimationFrame(updateFPS);

function updateGearSpin(now) {
    const overlay = transitionOverlay || document.getElementById('transition-overlay');
    const dt = Math.min((now - gearSpinState.lastTime) / 1000, 0.05);
    gearSpinState.lastTime = now;

    if (overlay?.classList.contains('closing-v')) {
        gearSpinState.targetVelocity = 150;
    } else if (overlay?.classList.contains('opening-h')) {
        gearSpinState.targetVelocity = -120;
    } else {
        gearSpinState.targetVelocity = 0;
    }

    const smoothing = 1 - Math.exp(-dt * 7.5);
    gearSpinState.velocity += (gearSpinState.targetVelocity - gearSpinState.velocity) * smoothing;
    gearSpinState.rotation += gearSpinState.velocity * dt;

    if (overlay) {
        overlay.style.setProperty('--gear-rotation', `${gearSpinState.rotation}deg`);
    }

    requestAnimationFrame(updateGearSpin);
}
requestAnimationFrame(updateGearSpin);

// About Modal Logic
const aboutBtn = document.getElementById('about-btn');
const aboutModal = document.getElementById('about-modal');
const closeAbout = document.getElementById('close-about');

if (aboutBtn && aboutModal) {
    aboutBtn.addEventListener('click', () => aboutModal.classList.remove('hidden'));
}
if (closeAbout && aboutModal) {
    closeAbout.addEventListener('click', () => aboutModal.classList.add('hidden'));
}

// Typography Diagnostic Toggle (Debug Tool)
const typoToggle = document.getElementById('toggle-typo');
if (typoToggle) {
    typoToggle.addEventListener('click', () => {
        document.body.classList.toggle('show-typo');
    });
}

// Settings Modal Logic
const settingsPopup = document.getElementById('settings-popup');
const closeSettings = document.getElementById('close-settings');
const mainFsToggle = document.getElementById('main-fs-toggle');
const settingsBtns = document.querySelectorAll('.open-settings-btn');
const abortBtn = document.getElementById('abort-mission');

if (settingsBtns.length > 0 && settingsPopup) {
    settingsBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Only show Abort Mission if we are actually in the tactical HUD
            const isHUD = !document.getElementById('ui').classList.contains('hidden');
            if (abortBtn) {
                if (isHUD) abortBtn.classList.remove('hidden');
                else abortBtn.classList.add('hidden');
            }

            syncTouchSettingsVisibility();
            settingsPopup.classList.remove('hidden');
            if (mainDebugToggle) mainDebugToggle.checked = state.settings.debug;
            if (mainFsToggle) mainFsToggle.checked = state.settings.fullscreen;
            if (mainTouchToggle) mainTouchToggle.checked = !!state.settings.touchControls;
        });
    });
}

if (abortBtn) {
    abortBtn.addEventListener('click', () => {
        const confirmModal = document.getElementById('confirm-modal');
        if (confirmModal) confirmModal.classList.remove('hidden');
    });
}

const confirmYes = document.getElementById('confirm-yes');
const confirmNo = document.getElementById('confirm-no');

if (confirmNo) {
    confirmNo.addEventListener('click', () => {
        const confirmModal = document.getElementById('confirm-modal');
        if (confirmModal) confirmModal.classList.add('hidden');
    });
}

if (confirmYes) {
    confirmYes.addEventListener('click', () => {
        const confirmModal = document.getElementById('confirm-modal');
        if (confirmModal) confirmModal.classList.add('hidden');
        if (settingsPopup) settingsPopup.classList.add('hidden');

        triggerDoorTransition(
            () => {
                if (document.getElementById('ui')) document.getElementById('ui').classList.add('hidden');
                syncTouchSettingsVisibility();
                syncTouchMoveControlVisibility();
                if (menu) menu.classList.remove('hidden');

                const gameContainer = document.getElementById('game-container');
                const mapBox = document.querySelector('.map-box');
                if (gameContainer && mapBox) {
                    mapBox.insertBefore(gameContainer, mapBox.querySelector('.module-scanline'));
                    gameContainer.classList.remove('fullscreen-mode');
                    queueGameLayoutRefresh();
                }
            },
            null
        );
    });
}
if (closeSettings && settingsPopup) {
    closeSettings.addEventListener('click', () => settingsPopup.classList.add('hidden'));
}

if (mainDebugToggle) {
    mainDebugToggle.addEventListener('change', (e) => {
        state.settings.debug = e.target.checked;
        setDebugMode(state.settings.debug);
        if (splashDebugToggle) splashDebugToggle.checked = state.settings.debug;
    });
}

if (mainFsToggle) {
    mainFsToggle.addEventListener('change', (e) => {
        state.settings.fullscreen = e.target.checked;
        if (splashFsToggle) splashFsToggle.checked = state.settings.fullscreen;

        if (state.settings.fullscreen) {
            document.documentElement.requestFullscreen().catch(() => { });
        } else {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
            }
        }
    });
}

if (mainTouchToggle) {
    mainTouchToggle.addEventListener('change', (e) => {
        state.settings.touchControls = e.target.checked;
        e.target.checked = state.settings.touchControls;
        localStorage.setItem('hunker_touch_controls_enabled', String(state.settings.touchControls));
        syncTouchMoveControlVisibility();
    });
}

function triggerDoorTransition(onClosed, onOpened) {
    const overlay = transitionOverlay || document.getElementById('transition-overlay');
    if (!overlay) {
        if (onClosed) onClosed();
        if (onOpened) onOpened();
        return;
    }

    // 1. Prepare for vertical close
    overlay.classList.add('visible');
    overlay.classList.add('closing-v');
    AudioManager.play('ui_boot1', { volume: 0.5 });

    // Force reflow
    void overlay.offsetWidth;

    // 2. Start closing
    requestAnimationFrame(() => {
        overlay.classList.add('active');
        AudioManager.play('door_slam_vertical', { volume: 0.4 });
        AudioManager.play('door_gears_spin', { volume: 0.25 });
    });

    // 3. Once closed, swap content and prepare horizontal open
    setTimeout(() => {
        spawnSmoke(0, 0, 30, true); // Slam smoke
        if (onClosed) onClosed();

        // Swap classes
        overlay.classList.remove('closing-v', 'active');
        overlay.classList.add('opening-h');

        // Force reflow
        void overlay.offsetWidth;

        // 4. Start opening after a small "hold" gap
        setTimeout(() => {
            spawnSmoke(0, 0, 30, false); // Separation smoke
            overlay.classList.add('active');
            AudioManager.play('door_slide_horiz', { volume: 0.4 });
            AudioManager.play('door_gears_spin', { volume: 0.25 });
            if (onOpened) onOpened();
        }, 300);

        // 5. Cleanup
        setTimeout(() => {
            overlay.classList.remove('visible', 'opening-h', 'active');
        }, 1200);
    }, 900);
}

function spawnSmoke(x, y, count, isVertical = true) {
    const overlay = document.getElementById('transition-overlay');
    if (!overlay) return;

    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'smoke-particle';

        // Randomize size
        const size = 20 + Math.random() * 40;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;

        // Randomize position along the seam
        if (isVertical) {
            // Horizontal seam across the middle
            p.style.left = `${Math.random() * 100}%`;
            p.style.top = `calc(50% - ${size / 2}px)`;
            p.style.setProperty('--dx', `${(Math.random() - 0.5) * 100}px`);
            p.style.setProperty('--dy', `${(Math.random() - 0.5) * 50}px`);
        } else {
            // Vertical seam down the middle
            p.style.top = `${Math.random() * 100}%`;
            p.style.left = `calc(50% - ${size / 2}px)`;
            p.style.setProperty('--dx', `${(Math.random() - 0.5) * 50}px`);
            p.style.setProperty('--dy', `${(Math.random() - 0.5) * 100}px`);
        }

        overlay.appendChild(p);
        setTimeout(() => p.remove(), 1500);
    }
}

// Character Selection Logic
const charCards = document.querySelectorAll('.char-card');
const previewIcon = document.getElementById('char-preview-icon');
const previewSprite = document.getElementById('char-preview-sprite');
const previewDoor = document.getElementById('char-preview-door');
const previewName = document.getElementById('char-preview-name');
const previewSpriteContext = previewSprite?.getContext('2d', { willReadFrequently: true }) ?? null;
const PREVIEW_FRAME_COUNT = 4;
const PREVIEW_FRAME_MS = 140;
const PREVIEW_FRONT_ROW = 0;
const PREVIEW_DOOR_CLOSE_MS = 360;
const PREVIEW_DOOR_HOLD_MS = 220;
const PREVIEW_DOOR_OPEN_MS = 520;
const CHROMA_GREEN_MIN = 70;
const CHROMA_DOMINANCE_START = 14;
const CHROMA_DOMINANCE_FULL = 36;

let previewFrameIndex = 0;
let previewAnimationTimer = null;
let previewDoorTimer = null;
let pendingPreviewType = null;
let activePreviewType = 'SCOUT';
const previewSpriteImages = new Map();

const heroData = {
    'SCOUT': { icon: '◈', name: 'SCOUT', sprite: '/scout_walk.png' },
    'TANK': { icon: '⬢', name: 'TANK', sprite: '/tank_walk.png' },
    'ENGINEER': { icon: '⬣', name: 'ENGINEER', sprite: '/engineer_walk.png' }
};

function getPreviewSpriteImage(path) {
    if (!path) return Promise.resolve(null);

    const cached = previewSpriteImages.get(path);
    if (cached) {
        return cached instanceof Promise ? cached : Promise.resolve(cached);
    }

    const imagePromise = new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            previewSpriteImages.set(path, image);
            resolve(image);
        };
        image.onerror = reject;
        image.src = path;
    });

    previewSpriteImages.set(path, imagePromise);
    return imagePromise;
}

function applyChromaKey(imageData) {
    const data = imageData.data;

    for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const strongestOther = Math.max(red, blue);
        const dominance = green - strongestOther;

        if (green < CHROMA_GREEN_MIN || dominance <= CHROMA_DOMINANCE_START) {
            continue;
        }

        const alphaFactor = 1 - Math.min(
            1,
            (dominance - CHROMA_DOMINANCE_START) / (CHROMA_DOMINANCE_FULL - CHROMA_DOMINANCE_START)
        );

        data[index + 3] = Math.round(data[index + 3] * alphaFactor);

        if (alphaFactor < 1) {
            data[index + 1] = Math.min(green, strongestOther + 12);
        }
    }

    return imageData;
}

async function renderPreviewFrame(type, frameIndex = previewFrameIndex) {
    const data = heroData[type];
    if (!data || !previewSprite || !previewSpriteContext) return;

    const image = await getPreviewSpriteImage(data.sprite).catch(() => null);
    if (!image || !heroData[type] || heroData[type].sprite !== data.sprite) return;

    const frameWidth = Math.floor(image.width / PREVIEW_FRAME_COUNT);
    const frameHeight = Math.floor(image.height / PREVIEW_FRAME_COUNT);
    const sourceX = frameIndex * frameWidth;
    const sourceY = PREVIEW_FRONT_ROW * frameHeight;

    if (previewSprite.width !== frameWidth || previewSprite.height !== frameHeight) {
        previewSprite.width = frameWidth;
        previewSprite.height = frameHeight;
    }

    previewSpriteContext.clearRect(0, 0, frameWidth, frameHeight);
    previewSpriteContext.imageSmoothingEnabled = false;
    previewSpriteContext.drawImage(
        image,
        sourceX,
        sourceY,
        frameWidth,
        frameHeight,
        0,
        0,
        frameWidth,
        frameHeight
    );

    const frame = previewSpriteContext.getImageData(0, 0, frameWidth, frameHeight);
    previewSpriteContext.putImageData(applyChromaKey(frame), 0, 0);
}

function syncHeroPreview(type) {
    const data = heroData[type];
    if (!data) return;

    activePreviewType = type;
    if (previewIcon) previewIcon.textContent = data.icon;
    if (previewName) previewName.textContent = data.name;
    previewFrameIndex = 0;
    void renderPreviewFrame(type, previewFrameIndex);
}

function startHeroPreviewAnimation() {
    if (!previewSprite || previewAnimationTimer !== null) return;

    previewAnimationTimer = window.setInterval(() => {
        previewFrameIndex = (previewFrameIndex + 1) % PREVIEW_FRAME_COUNT;
        void renderPreviewFrame(activePreviewType, previewFrameIndex);
    }, PREVIEW_FRAME_MS);
}

function triggerHeroPreviewSwap(type) {
    if (!heroData[type]) return;

    if (!previewDoor) {
        syncHeroPreview(type);
        return;
    }

    pendingPreviewType = type;

    if (previewDoorTimer !== null) {
        return;
    }

    const targetType = pendingPreviewType;
    previewDoor.classList.remove('opening', 'ready-to-open');
    previewDoor.classList.add('active', 'closing');
    AudioManager.play('door_slam_vertical', { volume: 0.2 });
    AudioManager.play('door_gears_spin', { volume: 0.12 });

    previewDoorTimer = window.setTimeout(() => {
        syncHeroPreview(targetType);
        previewDoor.classList.remove('closing');
        previewDoor.classList.add('ready-to-open');

        window.setTimeout(() => {
            void previewDoor.offsetWidth;
            previewDoor.classList.remove('ready-to-open');
            previewDoor.classList.add('opening');
            AudioManager.play('door_slide_horiz', { volume: 0.18 });
            AudioManager.play('door_gears_spin', { volume: 0.1 });
        }, PREVIEW_DOOR_HOLD_MS);

        previewDoorTimer = window.setTimeout(() => {
            previewDoor.classList.remove('active', 'opening', 'ready-to-open');
            previewDoorTimer = null;

            if (pendingPreviewType !== targetType) {
                const queuedType = pendingPreviewType;
                pendingPreviewType = null;
                triggerHeroPreviewSwap(queuedType);
                return;
            }

            pendingPreviewType = null;
        }, PREVIEW_DOOR_HOLD_MS + PREVIEW_DOOR_OPEN_MS);
    }, PREVIEW_DOOR_CLOSE_MS);
}

charCards.forEach(card => {
    card.addEventListener('click', () => {
        AudioManager.play('ui_click', { volume: 0.6 });
        // Remove selected from others
        charCards.forEach(c => c.classList.remove('selected'));
        // Add to clicked
        card.classList.add('selected');

        // Update Preview
        const type = card.getAttribute('data-type');
        if (heroData[type]) {
            triggerHeroPreviewSwap(type);

            if (window.game?.updatePlayerType) {
                window.game.updatePlayerType(type);
                AudioManager.play('class_lock', { volume: 0.5 });
            }
        }
    });
});

// In-Universe Tactical Cursor and Hover React
function initTacticalCursor() {
    const cursor = document.createElement('div');
    cursor.id = 'tactical-cursor';

    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    cursor.appendChild(dot);

    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    cursor.appendChild(ring);

    ['tl', 'tr', 'bl', 'br'].forEach(dir => {
        const b = document.createElement('div');
        b.className = `cursor-bracket cursor-bracket-${dir}`;
        cursor.appendChild(b);
    });

    document.body.appendChild(cursor);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let curX = mouseX;
    let curY = mouseY;
    let targetScale = 1.0;
    let curScale = 1.0;
    const LERP_FACTOR = 0.15; // authentic retro mechanical delay
    let hasMoved = false;
    let touchFadeTimeout = null;

    let lastTouchTime = 0;

    window.addEventListener('mousemove', (e) => {
        // Ignore synthetic mousemove events triggered by touchscreen touch/taps
        if (Date.now() - lastTouchTime < 1000) return;

        // Ensure clientX and clientY are valid, finite numbers
        if (typeof e.clientX !== 'number' || typeof e.clientY !== 'number') return;
        if (isNaN(e.clientX) || isNaN(e.clientY) || !isFinite(e.clientX) || !isFinite(e.clientY)) return;

        // Filter out simulated browser events (common on clicks/focus transitions) 
        // that report false (0,0) or extremely small coordinates on either axis.
        if (e.clientX < 8 || e.clientY < 8) return;

        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Ensure cursor is visible on desktop move (clearing touch fade states)
        cursor.classList.remove('cursor-fade-out');
        targetScale = 1.0;
        if (touchFadeTimeout) {
            clearTimeout(touchFadeTimeout);
            touchFadeTimeout = null;
        }

        if (!hasMoved) {
            hasMoved = true;
            document.documentElement.classList.add('custom-cursor-enabled');
        }
    }, { passive: true });

    // Instantly support touchscreen interaction: show cursor on tap/drag and fade it out nicely
    window.addEventListener('touchstart', (e) => {
        lastTouchTime = Date.now();
        if (e.touches && e.touches[0]) {
            const touch = e.touches[0];
            
            // Snap position instantly to tapped coordinate to avoid sliding from previous location
            mouseX = touch.clientX;
            mouseY = touch.clientY;
            curX = mouseX;
            curY = mouseY;
            
            hasMoved = true;
            document.documentElement.classList.add('custom-cursor-enabled');
            cursor.classList.remove('cursor-fade-out');
            targetScale = 0.72; // Snappy touch tap compression
            
            if (touchFadeTimeout) {
                clearTimeout(touchFadeTimeout);
            }
            
            // Fade out cursor after a short delay following tap
            touchFadeTimeout = setTimeout(() => {
                cursor.classList.add('cursor-fade-out');
                targetScale = 0.65; // Collapse scale on fade-out
            }, 450);
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        lastTouchTime = Date.now();
        if (e.touches && e.touches[0]) {
            const touch = e.touches[0];
            mouseX = touch.clientX;
            mouseY = touch.clientY;
            
            cursor.classList.remove('cursor-fade-out');
            targetScale = 1.0; // scale up to 1.0 during active touch dragging
            if (touchFadeTimeout) {
                clearTimeout(touchFadeTimeout);
            }
        }
    }, { passive: true });

    window.addEventListener('touchend', () => {
        lastTouchTime = Date.now();
        if (touchFadeTimeout) {
            clearTimeout(touchFadeTimeout);
        }
        touchFadeTimeout = setTimeout(() => {
            cursor.classList.add('cursor-fade-out');
            targetScale = 0.65; // Collapse scale on fade-out
        }, 300);
    }, { passive: true });

    function updateCursorPosition() {
        curX += (mouseX - curX) * LERP_FACTOR;
        curY += (mouseY - curY) * LERP_FACTOR;

        // Snappy dynamic scale LERP for precise clicks and fadeouts
        curScale += (targetScale - curScale) * 0.35;

        // Keep the custom cursor perfectly centered on the physical pointer tip and scaled correctly
        cursor.style.transform = `translate3d(${curX}px, ${curY}px, 0) translate3d(-50%, -50%, 0) scale(${curScale})`;
        requestAnimationFrame(updateCursorPosition);
    }
    requestAnimationFrame(updateCursorPosition);

    window.addEventListener('pointerdown', (e) => {
        // Skip touchpointerdown events as touchscreen taps are custom-scaled via touchstart
        if (e.pointerType === 'touch') return;

        cursor.classList.add('cursor-clicking');
        targetScale = 0.72; // Snap scale down on press and hold
        
        // Spawn the click sonar ripple exactly at the smoothed cursor's position.
        // This is robust against synthetic pointer events and ensures precise alignment.
        const ripple = document.createElement('div');
        ripple.className = 'cursor-ripple';
        ripple.style.left = `${curX}px`;
        ripple.style.top = `${curY}px`;
        document.body.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });

    window.addEventListener('pointerup', (e) => {
        if (e.pointerType === 'touch') return;
        cursor.classList.remove('cursor-clicking');
        targetScale = 1.0; // Restore full scale on release
    });

    let currentHoverTarget = null;

    document.addEventListener('pointerover', (e) => {
        const target = e.target.closest('button, .char-card, .toggle, .calibrate-btn, .close-modal, .about-btn, a, input, select');
        if (target) {
            if (currentHoverTarget !== target) {
                currentHoverTarget = target;
                cursor.classList.add('cursor-hovering');
                // Play in-universe hover click blip
                AudioManager.play('ui_hover', { volume: 0.12, varyPitch: true });
            }
        }
    });

    document.addEventListener('pointerout', (e) => {
        const target = e.target.closest('button, .char-card, .toggle, .calibrate-btn, .close-modal, .about-btn, a, input, select');
        if (target) {
            const related = e.relatedTarget ? e.relatedTarget.closest('button, .char-card, .toggle, .calibrate-btn, .close-modal, .about-btn, a, input, select') : null;
            if (related !== currentHoverTarget) {
                currentHoverTarget = related;
                if (!related) {
                    cursor.classList.remove('cursor-hovering');
                }
            }
        }
    });
}

// Initial State Setup
document.addEventListener('DOMContentLoaded', async () => {
    initTacticalCursor();
    installStageLayoutSync();
    setTouchDeviceMode();
    installTouchMoveControl();
    window.addEventListener('resize', refreshGameLayout);
    window.addEventListener('orientationchange', refreshGameLayout);
    window.addEventListener('resize', setTouchDeviceMode);
    window.addEventListener('orientationchange', setTouchDeviceMode);

    setDebugMode(false);

    const mainAudioToggle = document.getElementById('main-audio-toggle');
    if (mainAudioToggle) {
        const storedAudio = localStorage.getItem('hunker_audio_enabled');
        if (storedAudio !== null) {
            mainAudioToggle.checked = storedAudio === 'true';
            AudioManager.toggleMute(!mainAudioToggle.checked);
        }

        mainAudioToggle.addEventListener('change', (e) => {
            AudioManager.toggleMute(!e.target.checked);
            localStorage.setItem('hunker_audio_enabled', e.target.checked);
            if (e.target.checked) AudioManager.play('ui_click', { volume: 0.6 });
        });
    }

    const storedTouchControls = localStorage.getItem('hunker_touch_controls_enabled');
    if (storedTouchControls !== null) {
        state.settings.touchControls = storedTouchControls === 'true';
    } else {
        state.settings.touchControls = isTouchDevice();
    }
    if (mainTouchToggle) {
        mainTouchToggle.checked = !!state.settings.touchControls;
    }

    // Load audio manifest
    const manifest = {
        images: ['/door.png'], // Add other large images if necessary
        audio: [
            { key: 'amb_bunker_loop', url: '/audio/vg2/amb_bunker_loop.wav' },
            { key: 'mainbg_music', url: '/audio/vg2/mainbg_music.mp3' },
            { key: 'amb_drip1', url: '/audio/vg2/amb_drip1.wav' },
            { key: 'amb_drip2', url: '/audio/vg2/amb_drip2.wav' },
            { key: 'amb_drip3', url: '/audio/vg2/amb_drip3.wav' },
            { key: 'amb_drip4', url: '/audio/vg2/amb_drip4.wav' },
            { key: 'amb_metal_stress1', url: '/audio/vg2/amb_metal_stress1.wav' },
            { key: 'amb_metal_stress2', url: '/audio/vg2/amb_metal_stress2.wav' },
            { key: 'amb_metal_stress3', url: '/audio/vg2/amb_metal_stress3.wav' },
            { key: 'door_slam_vertical1', url: '/audio/vg2/door_slam_vertical1.wav' },
            { key: 'door_slam_vertical2', url: '/audio/vg2/door_slam_vertical2.wav' },
            { key: 'door_slam_vertical3', url: '/audio/vg2/door_slam_vertical3.wav' },
            { key: 'door_slide_horiz1', url: '/audio/vg2/door_slide_horiz.wav' },
            { key: 'door_slide_horiz2', url: '/audio/vg2/door_slide_horiz2.wav' },
            { key: 'door_slide_horiz3', url: '/audio/vg2/door_slide_horiz3.wav' },
            { key: 'door_slide_horiz4', url: '/audio/vg2/door_slide_horiz4.wav' },
            { key: 'door_gears_spin1', url: '/audio/vg2/door_gears_spin1.wav' },
            { key: 'door_gears_spin2', url: '/audio/vg2/door_gears_spin2.wav' },
            { key: 'door_gears_spin3', url: '/audio/vg2/door_gears_spin3.wav' },
            { key: 'door_gears_spin4', url: '/audio/vg2/door_gears_spin4.wav' },
            { key: 'ui_boot1', url: '/audio/vg2/ui_boot.wav' },
            { key: 'ui_boot2', url: '/audio/vg2/ui_boot2.wav' },
            { key: 'ui_hover1', url: '/audio/vg2/ui_hover1.wav' },
            { key: 'ui_hover2', url: '/audio/vg2/ui_hover2.wav' },
            { key: 'ui_click1', url: '/audio/vg2/ui_click_confirm1.wav' },
            { key: 'ui_error1', url: '/audio/vg2/ui_error1.wav' },
            { key: 'ui_error2', url: '/audio/vg2/ui_error2.wav' },
            { key: 'ui_error3', url: '/audio/vg2/ui_error3.wav' },
            { key: 'ui_scan_ping1', url: '/audio/vg2/ui_scan_ping1.wav' },
            { key: 'ui_scan_ping2', url: '/audio/vg2/ui_scan_ping2.wav' },
            { key: 'ui_scan_ping3', url: '/audio/vg2/ui_scan_ping3.wav' },
            { key: 'ui_scan_ping4', url: '/audio/vg2/ui_scan_ping4.wav' },
            { key: 'class_lock1', url: '/audio/vg2/class_lock1.wav' },
            { key: 'class_lock2', url: '/audio/vg2/class_lock2.wav' },
            { key: 'class_lock3', url: '/audio/vg2/class_lock3.wav' },
            { key: 'class_lock4', url: '/audio/vg2/class_lock4.wav' }
        ]
    };

    // Clicks for generic buttons
    document.querySelectorAll('button, .toggle').forEach(el => {
        if (el.tagName === 'BUTTON' || el.classList.contains('toggle')) {
            el.addEventListener('click', () => {
                if (el.classList.contains('abort-btn')) AudioManager.play('ui_error', { volume: 0.6 });
                else AudioManager.play('ui_click', { volume: 0.6 });
            });
        }
    });

    const { ThreeGame } = await import('./src/threeGame.js');

    // Initialize preview with first selected
    const initialSelected = document.querySelector('.char-card.selected');
    if (initialSelected && heroData[initialSelected.getAttribute('data-type')]) {
        syncHeroPreview(initialSelected.getAttribute('data-type'));
    }
    startHeroPreviewAnimation();
    if (splashFsToggle) splashFsToggle.checked = false;
    if (splashDebugToggle) splashDebugToggle.checked = false;
    if (mainDebugToggle) mainDebugToggle.checked = false;
    syncTouchSettingsVisibility();
    syncTouchMoveControlVisibility();

    if (!window.game) {
        const initialType = initialSelected?.getAttribute('data-type') || 'SCOUT';
        window.game = new ThreeGame({
            parent: 'game-container',
            playerType: initialType
        });
    }

    await AudioManager.loadAssets(manifest, (progress, itemName) => {
        if (loaderBar) loaderBar.style.width = `${progress}%`;
        if (loaderStatus && itemName) {
            const parts = itemName.split('/');
            const filename = parts[parts.length - 1];
            loaderStatus.textContent = `LOADING ASSET: ${filename.toUpperCase()}`;
        }
    });

    if (loaderBar) loaderBar.style.width = `100%`;
    if (loaderStatus) loaderStatus.textContent = "[ CLICK ANYWHERE TO INITIALIZE ]";

    document.body.addEventListener('click', async () => {
        if (AudioManager.isUnlocked) return;
        await AudioManager.unlock();

        triggerDoorTransition(
            () => { if (loadingScreen) loadingScreen.classList.add('hidden'); },
            null
        );
    }, { once: true });
});

setDebugMode(false);
