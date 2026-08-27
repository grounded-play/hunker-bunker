let runSequence = 0;

export function mixRunEntropy(randomWord, timestamp, sequence) {
    let value = (Number(randomWord) >>> 0)
        ^ (Number(timestamp) >>> 0)
        ^ Math.imul((Number(sequence) >>> 0) || 1, 0x9e3779b1);
    value = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
    value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
    return (value ^ (value >>> 16)) >>> 0 || 1;
}

export function createFreshRunEntropy(previousEntropy = null) {
    const previous = Number(previousEntropy) >>> 0;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        runSequence = (runSequence + 1) >>> 0;
        const words = new Uint32Array(1);
        if (globalThis.crypto?.getRandomValues) {
            globalThis.crypto.getRandomValues(words);
        } else {
            words[0] = (Math.random() * 0xffffffff) >>> 0;
        }
        const entropy = mixRunEntropy(words[0], Date.now(), runSequence);
        if (!previous || entropy !== previous) return entropy;
    }
    // Even a broken/randomly stubbed entropy source cannot repeat the prior
    // layout. The odd Weyl increment guarantees a different non-zero word.
    return (previous + 0x9e3779b1) >>> 0 || 1;
}
