#!/usr/bin/env node
/**
 * Build scripts/voice/voice-cast.json from the casting bible.
 *
 *     node scripts/voice/build-voice-cast.mjs
 *
 * The eleven speaking roles were designed in
 * docs/elevenlabs-voice-design-prompts-11-core-roles-2026-08-25.md. Its VOICE
 * DESCRIPTION blocks are natural-language identity prompts, which is exactly
 * what Qwen3-TTS VoiceDesign takes, so the same casting carries over to the
 * local pipeline (docs/voice-generation-pipeline.md). This keeps the document
 * the single source: edit a role there and rebuild.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CASTING_DOC = path.join(ROOT, 'docs/elevenlabs-voice-design-prompts-11-core-roles-2026-08-25.md');
// Roles the narrative catalogs never covered (camp trees, wanderers, Tina).
export const SUPPORTING_CASTING_DOC = path.join(ROOT, 'docs/voice-design-prompts-supporting-cast-2026-10-26.md');
const OUT = path.join(ROOT, 'scripts/voice/voice-cast.json');

// Heading text in the casting bible -> stable speaker id used for files.
export const ROLE_IDS = Object.freeze({
    'Mothership Command': 'mothership',
    'System / Exosuit': 'system',
    'Bunker / Facilities Director': 'bunker',
    'The Queen': 'queen',
    'Sister Martha': 'martha',
    'Commander Briggs': 'briggs',
    'Overseer Kaelen': 'kaelen',
    'Dr. Okonkwo-Vass': 'okonkwo',
    'Nahl, the Suture': 'nahl',
    'Vey, the Listener': 'vey',
    'Rhun, the Shield': 'rhun'
});

export const SUPPORTING_ROLE_IDS = Object.freeze({
    'Aria, Queen Mimic': 'aria',
    'Mayor Tina': 'tina',
    'Manic Hacker': 'wanderer_hacker',
    'Corpo Shadow Runner': 'wanderer_corpo',
    'Foxhole Shadow': 'wanderer_foxhole',
    'Crash Survivor Queen': 'wanderer_survivor',
    'Space ABG Tripper': 'wanderer_abg',
    'Species Chrysalis': 'wanderer_chrysalis'
});

const HUMAN_CAST = new Set(['martha', 'briggs', 'kaelen', 'okonkwo']);
const HIVE_ALLIES = new Set(['nahl', 'vey', 'rhun']);

/**
 * Spoken text from a display or preview line: drop ElevenLabs [tags], UI
 * speaker prefixes and terminal markers, read O₂ as "oxygen", and bring
 * shouted all-caps lines to sentence case so TTS reads words, not letters.
 */
export function cleanPerformanceText(text, { stripLocalizedPrefix = false } = {}) {
    let out = String(text ?? '')
        .replace(/\[[^\]]*\]/g, ' ')
        .replace(/^\s*>\s*/, '');
    // One speaker prefix at most: a German "KAELEN: DAS FLÜSTERN SAGT: ..."
    // lost its first words when both strips ran. Translated or sentence-case
    // prefixes ("Kaelen:", "БРИГГС:", "布里格斯：") are only removed when the
    // line is known to carry one, so a sentence that merely contains a colon
    // early on keeps its words.
    const shoutedPrefix = /^\s*[A-Z][A-Z .'-]{1,40}:\s+/;
    if (shoutedPrefix.test(out)) out = out.replace(shoutedPrefix, '');
    else if (stripLocalizedPrefix) out = out.replace(/^\s*[^:：]{1,30}[:：]\s*/u, '');
    out = out.replace(/\s+/g, ' ').trim();
    // Case first, then O₂: replacing it first left "oxygen" lowercase inside
    // a shouted line, so the line no longer read as shouted.
    const letters = (out.match(/\p{L}/gu) ?? []).join('');
    const shouted = letters.length > 3 && letters === letters.toUpperCase() && letters !== letters.toLowerCase();
    if (shouted) {
        out = out.toLowerCase().replace(/(^|[.!?]\s+)(\p{Ll})/gu, (m, lead, ch) => lead + ch.toUpperCase());
    }
    out = out.replace(/(^|[.!?]\s+)[Oo]₂/g, '$1Oxygen').replace(/[Oo]₂|\b[Oo]2\b/g, 'oxygen');
    return out.replace(/^(\p{Ll})/u, (ch) => ch.toUpperCase());
}

function fenced(section, heading) {
    const at = section.indexOf(`### ${heading}`);
    if (at < 0) return '';
    const open = section.indexOf('```', at);
    const start = section.indexOf('\n', open) + 1;
    const end = section.indexOf('```', start);
    return section.slice(start, end).trim();
}

function bullets(section, heading) {
    const at = section.indexOf(`### ${heading}`);
    if (at < 0) return [];
    const rest = section.slice(at + heading.length + 4);
    const stop = rest.search(/\n#{2,3} /);
    return (stop >= 0 ? rest.slice(0, stop) : rest)
        .split('\n')
        .filter((line) => line.startsWith('- '))
        .map((line) => line.slice(2).trim());
}

function postChainTable(doc) {
    const at = doc.search(/^## \d+\. Post-processing boundaries/m);
    const rows = {};
    if (at < 0) return rows;
    for (const [index, line] of doc.slice(at).split('\n').entries()) {
        if (index > 0 && line.startsWith('## ')) break;
        const cells = line.split('|').map((c) => c.trim());
        if (cells.length >= 4 && cells[1] && !/^[-:]+$/.test(cells[1]) && cells[1] !== 'Role') rows[cells[1]] = cells[2];
    }
    return rows;
}

function chainKeyFor(id, name) {
    if (HUMAN_CAST.has(id)) return 'Human cast';
    if (HIVE_ALLIES.has(id)) return 'Hive allies';
    if (id.startsWith('wanderer_')) return 'Wanderers';
    if (id === 'tina') return 'Tina';
    return name.split(/[ /,]/)[0] === 'The' ? 'Queen' : name.split(/[ /,]/)[0];
}

export function buildVoiceCast(doc, roleIds = ROLE_IDS, source = CASTING_DOC) {
    const chains = postChainTable(doc);
    const roles = [];
    const sections = doc.split(/\n(?=## \d+\. Prompt \d+ — )/);
    for (const section of sections) {
        const head = /^## \d+\. Prompt \d+ — (.+)$/m.exec(section);
        if (!head) continue;
        const name = head[1].trim();
        const id = roleIds[name];
        if (!id) throw new Error(`casting bible role not mapped: ${name}`);
        const preview = fenced(section, 'PREVIEW TEXT');
        // Opening preview paragraphs, at least ~25 words: a 10-20 s
        // reference read for cloning.
        let referenceText = '';
        for (const paragraph of preview.split(/\n\s*\n/)) {
            referenceText = `${referenceText} ${cleanPerformanceText(paragraph)}`.trim();
            if (referenceText.split(/\s+/).length >= 25) break;
        }
        const chainKey = chainKeyFor(id, name);
        roles.push({
            id,
            name,
            promptRevision: `VD-${id.toUpperCase()}-01`,
            description: fenced(section, 'VOICE DESCRIPTION'),
            referenceText,
            previewText: cleanPerformanceText(preview),
            direction: bullets(section, 'Direction after saving the voice'),
            reject: bullets(section, 'Reject if'),
            postChain: chains[chainKey] ?? ''
        });
    }
    return { source: path.relative(ROOT, source), roles };
}

/** The core bible's eleven roles, then the supporting cast. */
export function buildFullVoiceCast(readFile = (file) => fs.readFileSync(file, 'utf8')) {
    const core = buildVoiceCast(readFile(CASTING_DOC));
    const supporting = buildVoiceCast(readFile(SUPPORTING_CASTING_DOC), SUPPORTING_ROLE_IDS, SUPPORTING_CASTING_DOC);
    return { sources: [core.source, supporting.source], roles: [...core.roles, ...supporting.roles] };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    const cast = buildFullVoiceCast();
    fs.writeFileSync(OUT, `${JSON.stringify(cast, null, 2)}\n`);
    console.log(`[voice-cast] ${cast.roles.length} roles -> ${path.relative(ROOT, OUT)}`);
}
