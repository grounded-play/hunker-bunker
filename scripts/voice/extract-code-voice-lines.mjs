/**
 * Spoken lines that live in code, not in the locale catalogs: camp
 * conversation trees, wanderer encounters, interaction sequences, and
 * speaker-prefixed literals ("MOTHERSHIP: ...", "MAYOR TINA: ...") shown as
 * radio transmissions. They are English-only text in every language, so they
 * are rendered once, in English (docs/voice-generation-pipeline.md).
 *
 * Keys start with `code.`. Structured sources key by their own ids; literals
 * key by a hash of their normalized text, so a reworded line simply becomes a
 * new line to render. The runtime matches displayed text against each line's
 * `display`, which the encoder copies into the manifest (`texts`).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanPerformanceText } from './build-voice-cast.mjs';
import { normalizeVoiceText } from '../../src/voiceLines.js';
import { NPC_DIALOGUE_TREES } from '../../src/npcDialogueTrees.js';
import { INTERACTION_SEQUENCES } from '../../src/interactionSequenceRunner.js';
import { WANDERER_ARCHETYPES } from '../../src/wandererSystem.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Speaker label as displayed -> cast role. Labels not listed (WORKBENCH,
// CAUSE, WARNING, EXOSUIT DOCKED, ...) are HUD notices, not speech.
export const CODE_SPEAKER_ROLES = Object.freeze({
    MOTHERSHIP: 'mothership',
    SYSTEM: 'system',
    BUNKER: 'bunker',
    QUEEN: 'queen',
    BRIGGS: 'briggs',
    'COMMANDER BRIGGS': 'briggs',
    MARTHA: 'martha',
    'SISTER MARTHA': 'martha',
    KAELEN: 'kaelen',
    'OVERSEER KAELEN': 'kaelen',
    TINA: 'tina',
    'MAYOR TINA': 'tina',
    'TEACUP SIREN': 'tina'
});

const TREE_SPEAKER_ROLES = Object.freeze({
    'Sister Martha': 'martha',
    'Commander Briggs': 'briggs',
    'Overseer Kaelen': 'kaelen',
    'Aria (Queen Mimic)': 'aria',
    'Dr. Nahl': 'nahl'
});

export const WANDERER_ROLES = Object.freeze({
    manic_hacker: 'wanderer_hacker',
    corpo_runner: 'wanderer_corpo',
    foxhole_buddy: 'wanderer_foxhole',
    crash_queen: 'wanderer_survivor',
    abg_tripper: 'wanderer_abg',
    species_hybrid: 'wanderer_chrysalis'
});

const CAMP_LEADER_ROLES = Object.freeze({ camp_meridian: 'kaelen', camp_tallow: 'martha', camp_vesper: 'briggs' });

const LITERAL = /(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g;
const PREFIXED = /^\s*>?\s*([A-Z][A-Z .'-]{1,30}?):\s+(.+)$/s;

function unescapeLiteral(text) {
    return text
        .replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})/gi, (m, braced, plain) => String.fromCodePoint(parseInt(braced ?? plain, 16)))
        .replace(/\\n/g, ' ')
        .replace(/\\(.)/g, '$1');
}

/**
 * Lowercase stage directions ("(chittering softly)") are performance notes,
 * not words; shouted asides ("(DEGRADED — RECENTLY ROBBED)") are read.
 */
function spokenFrom(display) {
    const words = String(display).replace(/\([a-z][a-z ,'-]*\)\s*/g, '').replace(/\s*&\s*/g, ' and ');
    return cleanPerformanceText(words).replace(/\s+([.,!?])/g, '$1').replace(/\s+/g, ' ').trim();
}

const hash = (text) => crypto.createHash('sha1').update(text).digest('hex').slice(0, 10);

function codeSourceFiles(root) {
    const src = fs.readdirSync(path.join(root, 'src'), { recursive: true })
        .map((file) => path.join('src', String(file)))
        .filter((file) => file.endsWith('.js') && !file.includes('.test.') && !file.startsWith(path.join('src', 'locales')));
    return ['main.js', ...src].sort();
}

/** A literal is a line only when it is whole: no template slots, no dangling clause. */
function isWholeLine(text) {
    if (/\$\{|\{[A-Z_]+\}/.test(text)) return false;
    if (/[—:,-]\s*$/.test(text)) return false;
    return text.split(/\s+/).filter(Boolean).length >= 3;
}

export function extractCodeVoiceLines({ root = ROOT, recordedTexts = new Set() } = {}) {
    const lines = [];
    const seen = new Set(recordedTexts);
    const add = (key, role, display) => {
        const spoken = spokenFrom(display);
        const normalized = normalizeVoiceText(display);
        if (!spoken || !normalized || seen.has(normalized)) return;
        seen.add(normalized);
        lines.push({ key, locale: 'en', role, source: 'code', display, spoken });
    };

    for (const [treeId, tree] of Object.entries(NPC_DIALOGUE_TREES)) {
        for (const [nodeId, node] of Object.entries(tree.nodes ?? {})) {
            const role = TREE_SPEAKER_ROLES[node.speaker ?? tree.name];
            if (role && node.dialogue) add(`code.tree.${treeId}.${nodeId}`, role, node.dialogue);
        }
    }
    for (const [archetypeId, archetype] of Object.entries(WANDERER_ARCHETYPES)) {
        const role = WANDERER_ROLES[archetypeId];
        for (const field of ['greeting', 'dialogueBefriend', 'dialogueChase']) {
            if (role && archetype[field]) add(`code.wanderer.${archetypeId}.${field}`, role, archetype[field]);
        }
    }
    for (const [sequenceId, sequence] of Object.entries(INTERACTION_SEQUENCES)) {
        (sequence.steps ?? []).forEach((step, index) => {
            if (step.do !== 'line' || !step.text) return;
            const role = step.speaker === 'leader' ? CAMP_LEADER_ROLES[sequence.campId] : CODE_SPEAKER_ROLES[String(step.speaker).toUpperCase()];
            if (role) add(`code.sequence.${sequenceId}.${index}`, role, step.text);
        });
    }
    for (const file of codeSourceFiles(root)) {
        const source = fs.readFileSync(path.join(root, file), 'utf8');
        for (const match of source.matchAll(LITERAL)) {
            if (match[1] === '`' && match[2].includes('${')) continue;
            const display = unescapeLiteral(match[2]);
            const prefixed = PREFIXED.exec(display);
            const role = prefixed && CODE_SPEAKER_ROLES[prefixed[1].trim()];
            if (!role || !isWholeLine(prefixed[2])) continue;
            add(`code.${role}.${hash(normalizeVoiceText(display))}`, role, display.replace(/^\s*>\s*/, ''));
        }
    }
    return lines;
}
