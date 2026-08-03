function getPixelIndex(pixelIndex) {
    return pixelIndex * 4;
}

function isBlackChromaPixel(data, pixelIndex, threshold) {
    const i = getPixelIndex(pixelIndex);
    const a = data[i + 3];
    if (a <= 4) return true;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const luma = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
    const chroma = max - min;

    if (max <= threshold) return true;
    return luma <= threshold * 1.18 && max <= threshold * 1.8 && chroma <= threshold * 0.95;
}

export function applyBlackChromaKey(imageData, { threshold = 15, edgeThreshold = null } = {}) {
    if (!imageData?.data || !Number.isFinite(imageData.width) || !Number.isFinite(imageData.height)) {
        return { keyedPixels: 0 };
    }

    const width = Math.max(0, Math.floor(imageData.width));
    const height = Math.max(0, Math.floor(imageData.height));
    const totalPixels = width * height;
    if (totalPixels <= 0) return { keyedPixels: 0 };

    const data = imageData.data;
    const conservativeThreshold = Math.max(0, Number(threshold) || 0);
    const floodThreshold = Math.max(
        conservativeThreshold,
        Number.isFinite(edgeThreshold) ? edgeThreshold : Math.max(34, conservativeThreshold + 18)
    );
    const visited = new Uint8Array(totalPixels);
    const queue = new Int32Array(totalPixels);
    let head = 0;
    let tail = 0;
    let keyedPixels = 0;

    const enqueue = (pixelIndex) => {
        if (pixelIndex < 0 || pixelIndex >= totalPixels || visited[pixelIndex]) return;
        if (!isBlackChromaPixel(data, pixelIndex, floodThreshold)) return;
        visited[pixelIndex] = 1;
        queue[tail] = pixelIndex;
        tail += 1;
    };

    for (let x = 0; x < width; x += 1) {
        enqueue(x);
        enqueue((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y += 1) {
        enqueue(y * width);
        enqueue(y * width + (width - 1));
    }

    while (head < tail) {
        const pixelIndex = queue[head];
        head += 1;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);

        if (x > 0) enqueue(pixelIndex - 1);
        if (x < width - 1) enqueue(pixelIndex + 1);
        if (y > 0) enqueue(pixelIndex - width);
        if (y < height - 1) enqueue(pixelIndex + width);
    }

    for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex += 1) {
        const i = getPixelIndex(pixelIndex);
        if (visited[pixelIndex] || isBlackChromaPixel(data, pixelIndex, conservativeThreshold)) {
            if (data[i + 3] !== 0) keyedPixels += 1;
            data[i + 3] = 0;
        }
    }

    return { keyedPixels };
}

function isGreenChromaPixel(data, pixelIndex, { minGreen, dominance }) {
    const i = getPixelIndex(pixelIndex);
    if (data[i + 3] <= 4) return true;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    return g >= minGreen && g >= r * dominance && g >= b * dominance;
}

// Generated art deliberately uses chroma green around its outer silhouette.
// Flooding only from image edges removes that matte without erasing authored
// green lights/details enclosed inside the object.
export function applyGreenChromaKey(imageData, { minGreen = 80, dominance = 1.3 } = {}) {
    if (!imageData?.data || !Number.isFinite(imageData.width) || !Number.isFinite(imageData.height)) {
        return { keyedPixels: 0 };
    }
    const width = Math.max(0, Math.floor(imageData.width));
    const height = Math.max(0, Math.floor(imageData.height));
    const totalPixels = width * height;
    if (totalPixels <= 0) return { keyedPixels: 0 };

    const data = imageData.data;
    const options = {
        minGreen: Math.max(0, Number(minGreen) || 0),
        dominance: Math.max(1, Number(dominance) || 1)
    };
    const visited = new Uint8Array(totalPixels);
    const queue = new Int32Array(totalPixels);
    let head = 0;
    let tail = 0;
    let keyedPixels = 0;
    const enqueue = (pixelIndex) => {
        if (pixelIndex < 0 || pixelIndex >= totalPixels || visited[pixelIndex]) return;
        if (!isGreenChromaPixel(data, pixelIndex, options)) return;
        visited[pixelIndex] = 1;
        queue[tail++] = pixelIndex;
    };

    for (let x = 0; x < width; x += 1) {
        enqueue(x);
        enqueue((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y += 1) {
        enqueue(y * width);
        enqueue(y * width + width - 1);
    }
    while (head < tail) {
        const pixelIndex = queue[head++];
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        if (x > 0) enqueue(pixelIndex - 1);
        if (x < width - 1) enqueue(pixelIndex + 1);
        if (y > 0) enqueue(pixelIndex - width);
        if (y < height - 1) enqueue(pixelIndex + width);
    }
    for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex += 1) {
        if (!visited[pixelIndex]) continue;
        const i = getPixelIndex(pixelIndex);
        if (data[i + 3] !== 0) keyedPixels += 1;
        data[i + 3] = 0;
    }
    return { keyedPixels };
}
