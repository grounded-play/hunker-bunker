const startBtn = document.getElementById('start-game'); // INITIALIZE button
const playBtn = document.getElementById('enter-fullscreen'); // PLAY GAME button
const splash = document.getElementById('splash');
const menu = document.getElementById('menu');

const splashDebugToggle = document.getElementById('splash-debug-toggle');
const splashFsToggle = document.getElementById('splash-fs-toggle');
const mainDebugToggle = document.getElementById('main-debug-toggle');

const state = {
    settings: {
        debug: false, 
        sound: true,
        fullscreen: true
    },
    onlineCount: 1,
    gameInitialized: false
};

// --- Initialization ---
if (playBtn) {
    playBtn.addEventListener('click', () => {
        if (splash) splash.classList.add('hidden');
        if (menu) menu.classList.remove('hidden');
        if (state.settings.fullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
        }
    });
}

if (startBtn) {
    startBtn.addEventListener('click', () => {
        if (menu) menu.classList.add('hidden');
        document.getElementById('ui').classList.remove('hidden');
        
        // Clear hanging audio states
        if (window.Phaser) {
            const game = window.Phaser.Display.Canvas.CanvasPool.pool[0]?.parent?.game;
            if (game && game.sound) {
                game.sound.stopAll();
            }
        }
        
        console.log("Mission Initialized. Tactical HUD Active.");
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
            document.exitFullscreen().catch(() => {});
        }
    });
}

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
const settingsBtn = document.getElementById('open-settings');
const settingsPopup = document.getElementById('settings-popup');
const closeSettings = document.getElementById('close-settings');
const mainFsToggle = document.getElementById('main-fs-toggle');

if (settingsBtn && settingsPopup) {
    settingsBtn.addEventListener('click', () => {
        settingsPopup.classList.remove('hidden');
        if (mainDebugToggle) mainDebugToggle.checked = state.settings.debug;
        if (mainFsToggle) mainFsToggle.checked = state.settings.fullscreen;
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
        }
    });
});

// Initial State Setup
document.addEventListener('DOMContentLoaded', () => {
    setDebugMode(false);
    // Initialize preview with first selected
    const initialSelected = document.querySelector('.char-card.selected');
    if (initialSelected && heroData[initialSelected.getAttribute('data-type')]) {
        const data = heroData[initialSelected.getAttribute('data-type')];
        if (previewIcon) previewIcon.textContent = data.icon;
        if (previewName) previewName.textContent = data.name;
    }
    if (splashFsToggle) splashFsToggle.checked = true;
    if (splashDebugToggle) splashDebugToggle.checked = false;
    if (mainDebugToggle) mainDebugToggle.checked = false;
});

setDebugMode(false);
