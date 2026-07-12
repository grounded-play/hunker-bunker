// Context bridge: the only surface the game sees. Presence of
// window.electronAPI is the renderer's "am I in the desktop shell" check;
// its absence (plain web) must change nothing.
const { contextBridge, ipcRenderer } = require('electron');

// Restore the save file into localStorage BEFORE any page script runs.
// localStorage values are shared across isolated worlds, so writing here is
// visible to the game; only method *patching* needs the main world (the
// inline script in index.html handles that half).
try {
    const saved = ipcRenderer.sendSync('hb:getSaveDataSync') ?? {};
    for (const [key, value] of Object.entries(saved)) {
        if (key.startsWith('hb_')) window.localStorage.setItem(key, value);
    }
} catch (err) {
    console.warn('[hb] save restore failed:', err);
}

contextBridge.exposeInMainWorld('electronAPI', {
    getSaveData: () => ipcRenderer.invoke('hb:getSaveData'),
    onSaveDataChanged: (key, value) => ipcRenderer.send('hb:saveDataChanged', key, value),
    onSaveDataRemoved: (key) => ipcRenderer.send('hb:saveDataRemoved', key),
    unlockAchievement: (key) => ipcRenderer.send('hb:unlockAchievement', key),
    setStat: (key, value) => ipcRenderer.send('hb:setStat', key, value),
    getSteamInfo: () => ipcRenderer.invoke('hb:steamInfo'),
    setSteamInputPhase: (phase) => ipcRenderer.send('hb:steamInputPhase', phase),
    showGamepadTextInput: (inputMode, lineMode, description, maxCharacters, existingText) => ipcRenderer.invoke(
        'hb:showGamepadTextInput',
        inputMode,
        lineMode,
        description,
        maxCharacters,
        existingText
    ),
    showFloatingGamepadTextInput: (keyboardMode, x, y, width, height) => ipcRenderer.invoke(
        'hb:showFloatingGamepadTextInput',
        keyboardMode,
        x,
        y,
        width,
        height
    ),
    onSteamInputState: (handler) => {
        const listener = (_event, snapshot) => handler(snapshot);
        ipcRenderer.on('hb:steamInputState', listener);
        return () => ipcRenderer.removeListener('hb:steamInputState', listener);
    }
});
