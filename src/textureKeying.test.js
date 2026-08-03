import { describe, expect, it } from 'vitest';

import { applyBlackChromaKey, applyGreenChromaKey } from './textureKeying.js';

function makeImageData(width, height, fill = [80, 80, 80, 255]) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
        data[i] = fill[0];
        data[i + 1] = fill[1];
        data[i + 2] = fill[2];
        data[i + 3] = fill[3];
    }
    return { width, height, data };
}

function setPixel(imageData, x, y, rgba) {
    const i = ((y * imageData.width) + x) * 4;
    imageData.data[i] = rgba[0];
    imageData.data[i + 1] = rgba[1];
    imageData.data[i + 2] = rgba[2];
    imageData.data[i + 3] = rgba[3];
}

function alphaAt(imageData, x, y) {
    return imageData.data[((y * imageData.width) + x) * 4 + 3];
}

describe('applyBlackChromaKey', () => {
    it('removes edge-connected black JPEG halos while preserving interior dark detail', () => {
        const imageData = makeImageData(7, 7);

        for (let x = 0; x < 7; x += 1) {
            setPixel(imageData, x, 0, [32, 29, 31, 255]);
            setPixel(imageData, x, 6, [31, 30, 28, 255]);
        }
        for (let y = 0; y < 7; y += 1) {
            setPixel(imageData, 0, y, [30, 30, 32, 255]);
            setPixel(imageData, 6, y, [31, 28, 30, 255]);
        }

        setPixel(imageData, 3, 3, [22, 22, 22, 255]);
        setPixel(imageData, 2, 3, [6, 6, 6, 255]);

        const result = applyBlackChromaKey(imageData, { threshold: 10, edgeThreshold: 34 });

        expect(result.keyedPixels).toBeGreaterThan(0);
        expect(alphaAt(imageData, 0, 0)).toBe(0);
        expect(alphaAt(imageData, 6, 3)).toBe(0);
        expect(alphaAt(imageData, 3, 3)).toBe(255);
        expect(alphaAt(imageData, 2, 3)).toBe(0);
    });
});

describe('applyGreenChromaKey', () => {
    it('removes an edge-connected green matte but preserves enclosed green detail', () => {
        const imageData = makeImageData(7, 7, [0, 245, 18, 255]);
        for (let y = 1; y < 6; y += 1) {
            for (let x = 1; x < 6; x += 1) setPixel(imageData, x, y, [70, 70, 70, 255]);
        }
        setPixel(imageData, 3, 3, [20, 220, 40, 255]);

        const result = applyGreenChromaKey(imageData);

        expect(result.keyedPixels).toBe(24);
        expect(alphaAt(imageData, 0, 0)).toBe(0);
        expect(alphaAt(imageData, 3, 3)).toBe(255);
    });
});
