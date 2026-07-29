const path = require('node:path');

const SAVE_SCHEMA_VERSION = 1;
const MAX_VALUE_BYTES = 1024 * 1024;
const JSON_VALUE_KEYS = new Set([
    'hb_achievements_v1',
    'hb_act2_v1',
    'hb_arc_v1',
    'hb_bank',
    'hb_bank_v1',
    'hb_black_box_v1',
    'hb_codex_v1',
    'hb_fabricator_v1',
    'hb_loadout_v1',
    'hb_minigame_rgb_v1',
    'hb_profile_v1',
    'hb_run_stats_v1',
    'hb_world_memory_v1'
]);

const KNOWN_SAVE_KEYS = Object.freeze([
    ...JSON_VALUE_KEYS,
    'hb_achievements_button_shown_v1',
    'hb_active_class_v1',
    'hb_equipped_decal',
    'hb_equipped_patch',
    'hb_equipped_weapon_finish',
    'hb_fps',
    'hb_resolution_preset',
    'hb_text_floor',
    'hb_ui_scale',
    'hb_wrapped',
    'hb_best_score_*',
    'hb_daily_v1_*'
].sort());

function sanitizeSaveData(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const safe = {};
    for (const [key, value] of Object.entries(raw)) {
        if (!/^hb_[a-zA-Z0-9_]+$/.test(key) || typeof value !== 'string') continue;
        if (Buffer.byteLength(value, 'utf8') > MAX_VALUE_BYTES) continue;
        if (JSON_VALUE_KEYS.has(key)) {
            try {
                const parsed = JSON.parse(value);
                if (parsed === null || typeof parsed !== 'object') continue;
            } catch {
                continue;
            }
        }
        safe[key] = value;
    }
    return safe;
}

function migrateSaveDocument(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return { schemaVersion: SAVE_SCHEMA_VERSION, data: {}, migrated: false };
    }
    if (raw.schemaVersion === SAVE_SCHEMA_VERSION && raw.data) {
        return { schemaVersion: SAVE_SCHEMA_VERSION, data: sanitizeSaveData(raw.data), migrated: false };
    }
    return { schemaVersion: SAVE_SCHEMA_VERSION, data: sanitizeSaveData(raw), migrated: true };
}

function serializeSaveDocument(data, now = new Date()) {
    return `${JSON.stringify({
        schemaVersion: SAVE_SCHEMA_VERSION,
        updatedAt: now.toISOString(),
        data: sanitizeSaveData(data)
    })}\n`;
}

function parseSaveText(text) {
    return migrateSaveDocument(JSON.parse(text));
}

function loadSaveWithBackup(fs, filename) {
    const candidates = [
        { filename, source: 'primary' },
        { filename: `${filename}.bak`, source: 'backup' }
    ];
    for (const candidate of candidates) {
        try {
            const document = parseSaveText(fs.readFileSync(candidate.filename, 'utf8'));
            return { ...document, source: candidate.source };
        } catch { /* try next candidate */ }
    }
    return { schemaVersion: SAVE_SCHEMA_VERSION, data: {}, migrated: false, source: 'empty' };
}

function writeSaveAtomic(fs, filename, data, now = new Date()) {
    const directory = path.dirname(filename);
    const temp = `${filename}.tmp`;
    const backup = `${filename}.bak`;
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(temp, serializeSaveDocument(data, now), { encoding: 'utf8', mode: 0o600 });
    if (fs.existsSync(filename)) {
        try {
            parseSaveText(fs.readFileSync(filename, 'utf8'));
            fs.copyFileSync(filename, backup);
        } catch { /* never replace a known-good backup with corrupt primary data */ }
    }
    fs.renameSync(temp, filename);
}

module.exports = {
    SAVE_SCHEMA_VERSION,
    KNOWN_SAVE_KEYS,
    sanitizeSaveData,
    migrateSaveDocument,
    serializeSaveDocument,
    parseSaveText,
    loadSaveWithBackup,
    writeSaveAtomic
};
