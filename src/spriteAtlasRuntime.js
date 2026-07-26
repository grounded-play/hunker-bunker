function findActiveRuns(length, isActive) {
    const runs = [];
    let start = -1;
    for (let index = 0; index < length; index += 1) {
        const active = isActive(index);
        if (active && start < 0) start = index;
        if (!active && start >= 0) {
            runs.push([start, index]);
            start = -1;
        }
    }
    if (start >= 0) runs.push([start, length]);
    return runs;
}

/**
 * Detects the real transparent gaps in a generated sprite sheet and packs
 * complete poses into exact runtime cells. The source canvas is never changed.
 */
export function repackGeneratedSpriteAtlas(sourceCanvas, layout) {
    if (!layout?.repackFromTransparency) return sourceCanvas;

    const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = sourceCanvas;
    const pixels = sourceContext.getImageData(0, 0, width, height).data;
    const alphaAt = (x, y) => pixels[((y * width + x) * 4) + 3];
    const alphaThreshold = 8;

    const rowRuns = findActiveRuns(height, (y) => {
        for (let x = 0; x < width; x += 1) {
            if (alphaAt(x, y) > alphaThreshold) return true;
        }
        return false;
    });

    if (rowRuns.length !== layout.sourceRows) {
        console.warn(
            `[SpriteAtlas] Expected ${layout.sourceRows} pose rows for ${layout.name}, found ${rowRuns.length}; using source image`
        );
        return sourceCanvas;
    }

    const cellWidth = layout.cellWidth ?? 256;
    const cellHeight = layout.cellHeight ?? 256;
    const output = document.createElement('canvas');
    output.width = layout.columns * cellWidth;
    output.height = layout.rows * cellHeight;
    const outputContext = output.getContext('2d');
    outputContext.imageSmoothingEnabled = false;

    for (let row = 0; row < rowRuns.length; row += 1) {
        const [sourceY, sourceBottom] = rowRuns[row];
        const poseHeight = sourceBottom - sourceY;
        const columnRuns = findActiveRuns(width, (x) => {
            for (let y = sourceY; y < sourceBottom; y += 1) {
                if (alphaAt(x, y) > alphaThreshold) return true;
            }
            return false;
        });

        if (columnRuns.length !== layout.sourceColumns) {
            console.warn(
                `[SpriteAtlas] Expected ${layout.sourceColumns} poses in ${layout.name} row ${row}, found ${columnRuns.length}; using source image`
            );
            return sourceCanvas;
        }

        for (let column = 0; column < columnRuns.length; column += 1) {
            const [sourceX, sourceRight] = columnRuns[column];
            const poseWidth = sourceRight - sourceX;
            const maxWidth = cellWidth - 12;
            const maxHeight = cellHeight - 8;
            const scale = Math.min(1, maxWidth / poseWidth, maxHeight / poseHeight);
            const drawWidth = Math.max(1, Math.round(poseWidth * scale));
            const drawHeight = Math.max(1, Math.round(poseHeight * scale));
            const drawX = (column * cellWidth) + Math.round((cellWidth - drawWidth) / 2);
            const drawY = (row * cellHeight) + cellHeight - drawHeight - 4;

            outputContext.drawImage(
                sourceCanvas,
                sourceX,
                sourceY,
                poseWidth,
                poseHeight,
                drawX,
                drawY,
                drawWidth,
                drawHeight
            );
        }
    }

    return output;
}
