// One conversation grammar (docs/planning/camp-interaction-and-cinematics-
// audit-2026-10-16.md §6): how a line and a choice read in the camp
// conversation window. Pure, so the rules are tested apart from the DOM.

// Live logs: staged lines were clicked through about 2 s apart and one closed
// after 1 s. Continue waits this long after a line appears, so a double press
// can't skip text nobody read.
export const CONTINUE_HOLD_MS = 600;
// A line longer than this splits into parts at a sentence boundary.
export const MAX_LINE_CHARS = 140;

const SPEAKER = /^([^:：\n]{1,32})[:：]\s*/u;
// Not after an initial ("Vesper, K.") or a title ("Dr.").
const SENTENCE_END = /(?<![\s,]\p{Lu}\.|\bDr\.)(?<=[.!?…—])\s+(?=\S)/gu;

/** "[ASK]" -> "Ask": the intent tag is a muted chip, not a bracketed shout. */
export function choiceToneLabel(tone = '') {
    const word = String(tone).replace(/[[\]]/g, '').trim().toLowerCase();
    return word ? word.charAt(0).toUpperCase() + word.slice(1) : '';
}

function splitBody(body, max) {
    if (body.length <= max) return [body];
    const cuts = [...body.matchAll(SENTENCE_END)].map((m) => ({ end: m.index, next: m.index + m[0].length }));
    if (!cuts.length) return [body];
    // The cut nearest the middle gives two parts of similar weight.
    const best = cuts.reduce((a, b) => (Math.abs(b.end - body.length / 2) < Math.abs(a.end - body.length / 2) ? b : a));
    return [...splitBody(body.slice(0, best.end), max), ...splitBody(body.slice(best.next), max)];
}

/**
 * Splits a long line into parts at sentence boundaries; each part keeps the
 * speaker prefix so the window shows who is talking. A single long sentence
 * stays whole.
 */
export function splitConversationLine(line, max = MAX_LINE_CHARS) {
    const text = String(line ?? '').trim();
    const speaker = text.match(SPEAKER);
    const prefix = speaker ? speaker[0] : '';
    const body = text.slice(prefix.length);
    return splitBody(body, max).map((part) => `${prefix}${part}`);
}

/**
 * The staged lines as shown: each part, plus the full line to voice on its
 * first part (recorded audio matches whole lines, so continuations are silent).
 */
export function pageConversationLines(lines, max = MAX_LINE_CHARS) {
    return (lines ?? []).flatMap((line) => splitConversationLine(line, max)
        .map((text, index) => ({ text, voice: index === 0 ? String(line) : '' })));
}
