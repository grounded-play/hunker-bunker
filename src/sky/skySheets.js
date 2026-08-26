// Canonical runtime contract for every animated sky atlas.
//
// Frames are stored in reading order: left-to-right, then top-to-bottom.
// UV rectangles returned here use a top-left origin; the renderer is
// responsible for translating that convention if its sampler uses bottom-left.

export const SKY_SHEET_PLAYBACK = Object.freeze({
    ONCE: 'once',
    LOOP: 'loop',
    HOLD: 'hold'
});

const sheet = ({
    url,
    columns,
    rows,
    cellWidth,
    cellHeight,
    frames,
    playback,
    renderAs,
    anchor = 'center'
}) => Object.freeze({
    url,
    columns,
    rows,
    cellWidth,
    cellHeight,
    frames,
    fps: 12,
    playback,
    renderAs,
    anchor,
    width: columns * cellWidth,
    height: rows * cellHeight
});

export const SKY_SHEETS = Object.freeze({
    sky_fx_comet_longtail: sheet({
        url: '/sky/fx_comet_longtail.png',
        columns: 4, rows: 2, cellWidth: 512, cellHeight: 512, frames: 8,
        playback: SKY_SHEET_PLAYBACK.ONCE,
        renderAs: 'billboard-path'
    }),
    sky_fx_meteor_shower: sheet({
        url: '/sky/fx_meteor_shower.png',
        columns: 4, rows: 2, cellWidth: 512, cellHeight: 512, frames: 8,
        playback: SKY_SHEET_PLAYBACK.ONCE,
        renderAs: 'billboard-radiant'
    }),
    sky_fx_reentry_debris: sheet({
        url: '/sky/fx_reentry_debris.png',
        columns: 5, rows: 2, cellWidth: 512, cellHeight: 512, frames: 10,
        playback: SKY_SHEET_PLAYBACK.ONCE,
        renderAs: 'billboard-path'
    }),
    sky_fx_satellite_tumble: sheet({
        url: '/sky/fx_satellite_tumble.png',
        columns: 4, rows: 4, cellWidth: 256, cellHeight: 256, frames: 16,
        playback: SKY_SHEET_PLAYBACK.LOOP,
        renderAs: 'billboard-orbit'
    }),
    sky_fx_mothership_transit: sheet({
        url: '/sky/fx_mothership_transit.png',
        columns: 4, rows: 4, cellWidth: 512, cellHeight: 512, frames: 16,
        playback: SKY_SHEET_PLAYBACK.ONCE,
        renderAs: 'billboard-path'
    }),
    sky_fx_spore_bloom_zenith: sheet({
        url: '/sky/fx_spore_bloom_zenith.png',
        columns: 4, rows: 3, cellWidth: 512, cellHeight: 512, frames: 12,
        playback: SKY_SHEET_PLAYBACK.HOLD,
        renderAs: 'billboard-fixed',
        anchor: 'zenith'
    }),
    sky_fx_sun_gutter: sheet({
        url: '/sky/fx_sun_gutter.png',
        columns: 4, rows: 4, cellWidth: 512, cellHeight: 512, frames: 16,
        playback: SKY_SHEET_PLAYBACK.ONCE,
        renderAs: 'billboard-body',
        anchor: 'primary-sun'
    }),
    sky_fx_lightning_fork: sheet({
        url: '/sky/fx_lightning_fork.png',
        columns: 3, rows: 2, cellWidth: 512, cellHeight: 1024, frames: 6,
        playback: SKY_SHEET_PLAYBACK.ONCE,
        renderAs: 'billboard-storm',
        anchor: 'storm-base'
    }),
    sky_fx_lightning_sheet: sheet({
        url: '/sky/fx_lightning_sheet.png',
        columns: 2, rows: 2, cellWidth: 1024, cellHeight: 512, frames: 4,
        playback: SKY_SHEET_PLAYBACK.ONCE,
        renderAs: 'storm-band'
    }),
    sky_fx_lightning_crawler: sheet({
        url: '/sky/fx_lightning_crawler.png',
        columns: 4, rows: 2, cellWidth: 1024, cellHeight: 256, frames: 8,
        playback: SKY_SHEET_PLAYBACK.ONCE,
        renderAs: 'billboard-storm',
        anchor: 'cloud-base'
    })
});

export function frameIndexForSkySheet(definition, elapsedSeconds) {
    const rawFrame = Math.max(0, Math.floor(elapsedSeconds * definition.fps));
    if (definition.playback === SKY_SHEET_PLAYBACK.LOOP) {
        return rawFrame % definition.frames;
    }
    return Math.min(rawFrame, definition.frames - 1);
}

export function isSkySheetFinished(definition, elapsedSeconds) {
    return definition.playback === SKY_SHEET_PLAYBACK.ONCE
        && elapsedSeconds >= definition.frames / definition.fps;
}

export function frameRectForSkySheet(definition, frameIndex) {
    const index = Math.max(0, Math.min(Math.floor(frameIndex), definition.frames - 1));
    const column = index % definition.columns;
    const row = Math.floor(index / definition.columns);
    const repeatX = 1 / definition.columns;
    const repeatY = 1 / definition.rows;
    const offsetX = column * repeatX;
    const offsetY = 1 - ((row + 1) * repeatY);
    return {
        column,
        row,
        u: offsetX,
        v: row * repeatY,
        width: repeatX,
        height: repeatY,
        offsetX,
        offsetY,
        repeatX,
        repeatY
    };
}

export function frameRectFor(definition, elapsedSeconds) {
    return frameRectForSkySheet(definition, frameIndexForSkySheet(definition, elapsedSeconds));
}

