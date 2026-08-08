let runSequence = 0;

export function mixRunEntropy(randomWord, timestamp, sequence) {
    let value = (Number(randomWord) >>> 0)
        ^ (Number(timestamp) >>> 0)
        ^ Math.imul((Number(sequence) >>> 0) || 1, 0x9e3779b1);
    value = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
    value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
    return (value ^ (value >>> 16)) >>> 0 || 1;
}

export function createFreshRunEntropy() {
    runSequence = (runSequence + 1) >>> 0;
    const words = new Uint32Array(1);
    if (globalThis.crypto?.getRandomValues) {
        globalThis.crypto.getRandomValues(words);
    } else {
        words[0] = (Math.random() * 0xffffffff) >>> 0;
    }
    return mixRunEntropy(words[0], Date.now(), runSequence);
}
