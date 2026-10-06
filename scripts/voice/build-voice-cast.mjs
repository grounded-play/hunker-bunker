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
        .replace(/^\s*>\s*/, '')
        .replace(/^\s*[A-Z][A-Z .'-]{1,40}:\s+/, '');
    // Translated speaker prefixes ("БРИГГС:", "布里格斯：") are only removed
    // when the English line is known to carry one, so a sentence that merely
    // contains a colon early on keeps its words.
    if (stripLocalizedPrefix) out = out.replace(/^\s*[^:：]{1,30}[:：]\s*/u, '');
    out = out.replace(/O₂|O2(?=\b)/g, 'oxygen').replace(/\s+/g, ' ').trim();
    const letters = (out.match(/\p{L}/gu) ?? []).join('');
    const shouted = letters.length > 3 && letters === letters.toUpperCase() && letters !== letters.toLowerCase();
    if (shouted) {
        out = out.toLowerCase().replace(/(^|[.!?]\s+)(\p{Ll})/gu, (m, lead, ch) => lead + ch.toUpperCase());
    }
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
    const at = doc.indexOf('## 17. Post-processing boundaries');
    const rows = {};
    for (const line of doc.slice(at).split('\n')) {
        const cells = line.split('|').map((c) => c.trim());
        if (cells.length >= 4 && cells[1] && !/^[-:]+$/.test(cells[1]) && cells[1] !== 'Role') rows[cells[1]] = cells[2];
        if (line.startsWith('## 18.')) break;
    }
    return rows;
}

export function buildVoiceCast(doc) {
    const chains = postChainTable(doc);
    const roles = [];
    const sections = doc.split(/\n(?=## \d+\. Prompt \d+ — )/);
    for (const section of sections) {
        const head = /^## \d+\. Prompt \d+ — (.+)$/m.exec(section);
        if (!head) continue;
        const name = head[1].trim();
        const id = ROLE_IDS[name];
        if (!id) throw new Error(`casting bible role not mapped: ${name}`);
        const preview = fenced(section, 'PREVIEW TEXT');
        // Opening preview paragraphs, at least ~25 words: a 10-20 s
        // reference read for cloning.
        let referenceText = '';
        for (const paragraph of preview.split(/\n\s*\n/)) {
            referenceText = `${referenceText} ${cleanPerformanceText(paragraph)}`.trim();
            if (referenceText.split(/\s+/).length >= 25) break;
        }
        const chainKey = HUMAN_CAST.has(id) ? 'Human cast' : HIVE_ALLIES.has(id) ? 'Hive allies' : name.split(/[ /,]/)[0] === 'The' ? 'Queen' : name.split(/[ /,]/)[0];
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
    return { source: path.relative(ROOT, CASTING_DOC), roles };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    const cast = buildVoiceCast(fs.readFileSync(CASTING_DOC, 'utf8'));
    fs.writeFileSync(OUT, `${JSON.stringify(cast, null, 2)}\n`);
    console.log(`[voice-cast] ${cast.roles.length} roles -> ${path.relative(ROOT, OUT)}`);
}
