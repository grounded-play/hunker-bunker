import { describe, expect, it } from 'vitest';
import { assetUrl } from './assetUrl.js';

describe('assetUrl', () => {
    it('keeps public assets inside a packaged Electron dist directory', () => {
        expect(assetUrl('/cutscenes/tank-intro.webm', 'file:///opt/game/resources/app.asar/dist/index.html'))
            .toBe('file:///opt/game/resources/app.asar/dist/cutscenes/tank-intro.webm');
    });

    it('keeps public assets at the web origin root', () => {
        expect(assetUrl('/door_bio.png', 'https://qa.example/game/index.html'))
            .toBe('https://qa.example/game/door_bio.png');
    });

    it('does not rewrite remote, data, or already-relative URLs', () => {
        expect(assetUrl('https://cdn.example/movie.webm', 'file:///game/dist/index.html'))
            .toBe('https://cdn.example/movie.webm');
        expect(assetUrl('data:image/png;base64,AA==', 'file:///game/dist/index.html'))
            .toBe('data:image/png;base64,AA==');
        expect(assetUrl('./door.png', 'file:///game/dist/index.html')).toBe('./door.png');
    });
});
