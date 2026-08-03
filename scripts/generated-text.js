export function normalizeGeneratedText(value) {
    return String(value ?? '').replace(/\r\n?/g, '\n');
}

export function generatedTextMatches(existing, expected) {
    return normalizeGeneratedText(existing) === normalizeGeneratedText(expected);
}
