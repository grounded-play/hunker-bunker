#!/usr/bin/env node
/**
 * Build scripts/voice/voice-lines.json: every spoken narrative line, per
 * language, assigned to a cast role.
 *
 *     node scripts/voice/extract-voice-lines.mjs
 *
 * Lines are keyed by their i18n key (narrative.<catalog>.<path>), which is
 * stable across edits to the wording and already exists in all seven locale
 * files, so a generated file never needs renaming when a translation changes;
 * only re-rendering. The runtime (src/voiceLines.js) resolves a displayed line
 * back to the same key. Only speech is extracted: labels, choice buttons,
 * objective banners and titles stay silent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanPerformanceText } from './build-voice-cast.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'scripts/voice/voice-lines.json');
export const LOCALES = ['en', 'de', 'es-419', 'ja', 'pt-BR', 'ru', 'zh-CN'];

const LEADER_ROLE = { kaelen: 'kaelen', martha: 'martha', briggs: 'briggs', nahl: 'nahl', vey: 'vey', rhun: 'rhun', scientist: 'okonkwo' };

// catalog: narrative.<catalog>; match(pathParts) -> { role, register? } | null.
export const VOICE_LINE_RULES = Object.freeze([
    { catalog: 'leaderDialogue', match: ([leader, part]) => (part === 'stages' && LEADER_ROLE[leader] ? { role: LEADER_ROLE[leader] } : null) },
    { catalog: 'leaderDeathBeats', match: ([leader]) => (LEADER_ROLE[leader] ? { role: LEADER_ROLE[leader] } : null) },
    // The suit's own voice, in its three registers (corporate, glitched, reverent).
    { catalog: 'dialogue', match: ([register]) => ({ role: 'system', register }) },
    { catalog: 'mothershipReactive', match: (parts) => (parts.at(-1) === 'text' ? { role: 'mothership' } : null) },
    { catalog: 'directorAmbient', match: (parts) => (parts.at(-1) === 'text' ? { role: 'bunker' } : null) },
    { catalog: 'terminalEvents', match: (parts) => (parts.at(-1) === 'body' ? { role: 'bunker' } : null) },
    { catalog: 'classWreckageLogs', match: (parts) => (parts.at(-1) === 'payload' ? { role: 'system' } : null) },
    { catalog: 'loreClassLogs', match: () => ({ role: 'system' }) },
    // Developer commentary is read by the developer (a recording, not a design).
    { catalog: 'commentary', match: (parts) => (parts.at(-1) === 'body' ? { role: 'developer' } : null) }
]);

function* walk(node, parts = []) {
    if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i += 1) yield* walk(node[i], [...parts, String(i)]);
    } else if (node && typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) yield* walk(value, [...parts, key]);
    } else if (typeof node === 'string') {
        yield [parts, node];
    }
}

const SPEAKER_PREFIX = /^\s*>?\s*[A-Z][A-Z .'-]{1,40}:\s/;

export function extractVoiceLines(localesDir = path.join(ROOT, 'src/locales')) {
    const english = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8')).narrative ?? {};
    const englishText = new Map();
    for (const rule of VOICE_LINE_RULES) {
        for (const [parts, text] of walk(english[rule.catalog])) englishText.set(`narrative.${rule.catalog}.${parts.join('.')}`, text);
    }
    const lines = [];
    for (const locale of LOCALES) {
        const narrative = JSON.parse(fs.readFileSync(path.join(localesDir, `${locale}.json`), 'utf8')).narrative ?? {};
        for (const rule of VOICE_LINE_RULES) {
            for (const [parts, text] of walk(narrative[rule.catalog])) {
                const assigned = rule.match(parts);
                if (!assigned) continue;
                const key = `narrative.${rule.catalog}.${parts.join('.')}`;
                const prefixed = SPEAKER_PREFIX.test(englishText.get(key) ?? '');
                const spoken = cleanPerformanceText(text, { stripLocalizedPrefix: locale !== 'en' && prefixed });
                if (!spoken) continue;
                lines.push({ key, locale, ...assigned, display: text, spoken });
            }
        }
    }
    return lines;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    const lines = extractVoiceLines();
    fs.writeFileSync(OUT, `${JSON.stringify({ generatedFrom: 'src/locales/*.json', lines }, null, 1)}\n`);
    const perRole = {};
    for (const line of lines.filter((l) => l.locale === 'en')) perRole[line.role] = (perRole[line.role] ?? 0) + 1;
    console.log(`[voice-lines] ${lines.length} lines across ${LOCALES.length} locales -> ${path.relative(ROOT, OUT)}`);
    console.log('[voice-lines] English lines per role:', perRole);
}
