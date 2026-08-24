import { describe, expect, it } from 'vitest';
import { assetUrl } from './assetUrl.js';

describe('assetUrl', () => {
    it('routes unpacked media assets to app.asar.unpacked directory', () => {
        expect(assetUrl('/cutscenes/tank-intro.webm', 'file:///opt/game/resources/app.asar/dist/index.html'))
            .toBe('file:///opt/game/resources/app.asar.unpacked/dist/cutscenes/tank-intro.webm');
        expect(assetUrl('/audio/ost/Kaelens Sleeping Machine.mp3', 'file:///opt/game/resources/app.asar/dist/index.html'))
            .toBe('file:///opt/game/resources/app.asar.unpacked/dist/audio/ost/Kaelens%20Sleeping%20Machine.mp3');
        expect(assetUrl('/3d/Scout.glb', 'file:///opt/game/resources/app.asar/dist/index.html'))
            .toBe('file:///opt/game/resources/app.asar.unpacked/dist/3d/Scout.glb');
    });

    it('keeps non-unpacked public assets inside app.asar dist directory', () => {
        expect(assetUrl('/door_bio.png', 'file:///opt/game/resources/app.asar/dist/index.html'))
            .toBe('file:///opt/game/resources/app.asar/dist/door_bio.png');
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

