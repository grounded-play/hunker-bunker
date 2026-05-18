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

const DESIGN_STAGE = {
    width: 177,
    height: 100
};

const state = {
    settings: {
        debug: false, 
        sound: true,
        fullscreen: false
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

function syncStageMetrics() {
    if (!gameViewport) return;

    const rect = gameViewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const unit = Math.min(rect.width / DESIGN_STAGE.width, rect.height / DESIGN_STAGE.height);
    gameViewport.style.setProperty('--vu', `${unit}px`);
}

function refreshGameLayout() {
    syncStageMetrics();

    if (window.game?.scale) {
        requestAnimationFrame(() => {
            window.game.scale.refresh();
        });
    }
}

function installStageLayoutSync() {
    syncStageMetrics();

    if (stageResizeObserver || !gameViewport || !('ResizeObserver' in window)) return;

    stageResizeObserver = new ResizeObserver(() => {
        refreshGameLayout();
    });
    stageResizeObserver.observe(gameViewport);
}

// --- Initialization ---
if (playBtn) {
    playBtn.addEventListener('click', () => {
        triggerDoorTransition(
            () => {
                if (splash) splash.classList.add('hidden');
                if (menu) menu.classList.remove('hidden');
            },
            () => {
                if (state.settings.fullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {});
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
                
                const gameContainer = document.getElementById('game-container');
                const viewport = document.getElementById('game-viewport');
                if (gameContainer && viewport) {
                    viewport.insertBefore(gameContainer, document.getElementById('ui'));
                    gameContainer.classList.add('fullscreen-mode');
                    setTimeout(refreshGameLayout, 50);
                }
                
                // Clear hanging audio states
                if (window.Phaser) {
                    const game = window.Phaser.Display.Canvas.CanvasPool.pool[0]?.parent?.game;
                    if (game && game.sound) {
                        game.sound.stopAll();
                    }
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
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        }
    });
}

// Fullscreen State Sync Listener
document.addEventListener('fullscreenchange', () => {
    const isFs = !!document.fullscreenElement;
    state.settings.fullscreen = isFs;
    if (splashFsToggle) splashFsToggle.checked = isFs;
    if (mainFsToggle) mainFsToggle.checked = isFs;
    setTimeout(refreshGameLayout, 50);
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

            settingsPopup.classList.remove('hidden');
            if (mainDebugToggle) mainDebugToggle.checked = state.settings.debug;
            if (mainFsToggle) mainFsToggle.checked = state.settings.fullscreen;
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
                if (menu) menu.classList.remove('hidden');
                
                const gameContainer = document.getElementById('game-container');
                const mapBox = document.querySelector('.map-box');
                if (gameContainer && mapBox) {
                    mapBox.insertBefore(gameContainer, mapBox.querySelector('.module-scanline'));
                    gameContainer.classList.remove('fullscreen-mode');
                    setTimeout(refreshGameLayout, 50);
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
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }
        }
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
            p.style.top = `calc(50% - ${size/2}px)`;
            p.style.setProperty('--dx', `${(Math.random() - 0.5) * 100}px`);
            p.style.setProperty('--dy', `${(Math.random() - 0.5) * 50}px`);
        } else {
            // Vertical seam down the middle
            p.style.top = `${Math.random() * 100}%`;
            p.style.left = `calc(50% - ${size/2}px)`;
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
const previewName = document.getElementById('char-preview-name');

const heroData = {
    'SCOUT': { icon: '◈', name: 'SCOUT' },
    'TANK': { icon: '⬢', name: 'TANK' },
    'ENGINEER': { icon: '⬣', name: 'ENGINEER' }
};

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
            if (previewIcon) previewIcon.textContent = heroData[type].icon;
            if (previewName) previewName.textContent = heroData[type].name;
            
            // Sync with Phaser Scan
            if (window.game) {
                const gameScene = window.game.scene.getScene('GameScene');
                if (gameScene && gameScene.updatePlayerType) {
                    gameScene.updatePlayerType(type);
                    AudioManager.play('class_lock', { volume: 0.5 });
                }
            }
        }
    });
});

// Initial State Setup
document.addEventListener('DOMContentLoaded', async () => {
    installStageLayoutSync();
    window.addEventListener('resize', refreshGameLayout);
    window.addEventListener('orientationchange', refreshGameLayout);

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

    const { GameScene } = await import('./src/game.js');

    // Initialize preview with first selected
    const initialSelected = document.querySelector('.char-card.selected');
    if (initialSelected && heroData[initialSelected.getAttribute('data-type')]) {
        const data = heroData[initialSelected.getAttribute('data-type')];
        if (previewIcon) previewIcon.textContent = data.icon;
        if (previewName) previewName.textContent = data.name;
    }
    if (splashFsToggle) splashFsToggle.checked = false;
    if (splashDebugToggle) splashDebugToggle.checked = false;
    if (mainDebugToggle) mainDebugToggle.checked = false;

    // --- Surgical Phaser Initialization ---
    if (window.Phaser && !window.game) {
        const config = {
            type: window.Phaser.AUTO,
            parent: 'game-container',
            scale: {
                mode: window.Phaser.Scale.RESIZE,
                width: '100%',
                height: '100%'
            },
            input: {
                touch: {
                    capture: false
                },
                mouse: {
                    capture: false
                }
            },
            scene: [GameScene],
            physics: {
                default: 'arcade',
                arcade: { debug: false }
            },
            backgroundColor: '#0b0d0f'
        };
        window.game = new window.Phaser.Game(config);
        
        // --- Loading Sequence Logic ---
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
        
        // Wait for first click
        document.body.addEventListener('click', async () => {
            if (AudioManager.isUnlocked) return;
            await AudioManager.unlock();
            
            triggerDoorTransition(
                () => { if (loadingScreen) loadingScreen.classList.add('hidden'); },
                null
            );
        }, { once: true });
    }
});

setDebugMode(false);
