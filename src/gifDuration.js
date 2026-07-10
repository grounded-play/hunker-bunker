// Parses a GIF's total animation duration from its bytes so intro GIFs can be
// cut to the next scene right before they would loop.
//
// Walks the GIF89a block structure and sums Graphic Control Extension frame
// delays. Browsers clamp near-zero delays (<= 1 hundredth) up to 100ms, so we
// mirror that to match what the player actually sees.

export function gifDurationFromBytes(bytes) {
    try {
        if (!bytes || bytes.length < 14) return null;
        // 'GIF' magic
        if (bytes[0] !== 0x47 || bytes[1] !== 0x49 || bytes[2] !== 0x46) return null;

        let i = 13; // header (6) + logical screen descriptor (7)
        const gctFlag = bytes[10] & 0x80;
        if (gctFlag) {
            const gctSize = 2 << (bytes[10] & 0x07);
            i += 3 * gctSize;
        }

        const skipSubBlocks = () => {
            while (i < bytes.length) {
                const size = bytes[i];
                i += size + 1;
                if (size === 0) break;
            }
        };

        let totalHundredths = 0;
        let frames = 0;

        while (i < bytes.length) {
            const block = bytes[i];
            if (block === 0x3B) break; // trailer

            if (block === 0x21) { // extension
                const label = bytes[i + 1];
                i += 2;
                if (label === 0xF9 && i + 3 < bytes.length) { // graphic control
                    const delay = bytes[i + 2] | (bytes[i + 3] << 8);
                    totalHundredths += delay <= 1 ? 10 : delay; // browser clamp
                    frames += 1;
                }
                skipSubBlocks();
            } else if (block === 0x2C) { // image descriptor
                i += 9;
                const lctFlag = bytes[i] & 0x80;
                if (lctFlag) {
                    const lctSize = 2 << (bytes[i] & 0x07);
                    i += 3 * lctSize;
                }
                i += 1; // local color table flag byte
                i += 1; // LZW minimum code size
                skipSubBlocks();
            } else {
                break; // unknown block — stop rather than misparse
            }
        }

        if (frames <= 1 || totalHundredths <= 0) return null; // static or unreadable
        return totalHundredths * 10; // → milliseconds
    } catch {
        return null;
    }
}

const durationCache = new Map();

// Fetch + parse with caching. Returns null when the duration can't be known
// (static image, parse failure, network error) — callers keep their fallback.
export async function getGifDurationMs(src) {
    if (durationCache.has(src)) return durationCache.get(src);
    let duration = null;
    try {
        const response = await fetch(src);
        if (response.ok) {
            duration = gifDurationFromBytes(new Uint8Array(await response.arrayBuffer()));
        }
    } catch {
        duration = null;
    }
    durationCache.set(src, duration);
    return duration;
}
