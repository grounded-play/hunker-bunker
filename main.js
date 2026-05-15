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

const state = {
    settings: {
        debug: false, 
        sound: true,
        fullscreen: false
    },
    onlineCount: 1,
    gameInitialized: false
};

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

if (settingsBtns.length > 0 && settingsPopup) {
    settingsBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            settingsPopup.classList.remove('hidden');
            if (mainDebugToggle) mainDebugToggle.checked = state.settings.debug;
            if (mainFsToggle) mainFsToggle.checked = state.settings.fullscreen;
        });
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
    
    // Force reflow
    void overlay.offsetWidth;
    
    // 2. Start closing
    requestAnimationFrame(() => {
        overlay.classList.add('active');
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
                }
            }
        }
    });
});

// Initial State Setup
document.addEventListener('DOMContentLoaded', async () => {
    setDebugMode(false);
    
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
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                if (loaderStatus) loaderStatus.textContent = "SYSTEMS ONLINE";
                setTimeout(() => {
                    triggerDoorTransition(
                        () => { if (loadingScreen) loadingScreen.classList.add('hidden'); },
                        null
                    );
                }, 500);
            }
            if (loaderBar) loaderBar.style.width = `${progress}%`;
            if (progress < 100 && loaderStatus) {
                const statuses = ["SYNCING GRID...", "CALIBRATING SCANNER...", "ESTABLISHING UPLINK...", "READY"];
                loaderStatus.textContent = statuses[Math.floor(progress / 30)] || "READY";
            }
        }, 150);
    }
});

setDebugMode(false);
