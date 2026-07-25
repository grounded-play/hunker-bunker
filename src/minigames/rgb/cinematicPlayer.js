// Plays a sequence of RGB cinematic beats inside a container element. Each
// step tries its video first; when the video is missing or fails to load —
// the rail cinematics in docs/mini-games/rgb/cinematic-rail-prompts.md are a
// work in progress and mostly don't exist yet — it falls back to the still
// end-frame image, holds it, then fades to the next step. A step with only
// an image (no video declared at all) goes straight to the held-image path.
// Clicking the layer skips the current step.

import { AudioManager } from '../../audio.js';

export const IMAGE_HOLD_MS = 2600;
export const FADE_MS = 350;

function playStep(container, step) {
    return new Promise((resolve) => {
        container.replaceChildren();
        let settled = false;
        let fallbackTimer = 0;
        const finish = () => {
            if (settled) return;
            settled = true;
            clearTimeout(fallbackTimer);
            window.removeEventListener('keydown', onKey);
            container.onclick = null;
            resolve();
        };
        const onKey = (event) => {
            if (event.code === 'Escape') return;
            event.preventDefault();
            finish();
        };
        container.onclick = finish;
        window.addEventListener('keydown', onKey);

        const status = document.createElement('div');
        status.className = 'rgb-cinematic__status';
        status.textContent = step.label ?? 'ARCHIVE CINEMATIC // RESTORING SIGNAL';
        const skip = document.createElement('div');
        skip.className = 'rgb-cinematic__skip';
        skip.textContent = 'PRESS ANY KEY TO SKIP';
        container.append(status, skip);

        const showImage = () => {
            if (settled) return;
            clearTimeout(fallbackTimer);
            if (!step.image) {
                finish();
                return;
            }
            container.replaceChildren();
            const img = document.createElement('img');
            img.className = 'rgb-cinematic__image';
            img.src = step.image;
            img.alt = '';
            const imageSkip = skip.cloneNode(true);
            container.append(img, imageSkip);
            fallbackTimer = setTimeout(finish, IMAGE_HOLD_MS);
        };

        if (!step.video) {
            showImage();
            return;
        }

        const video = document.createElement('video');
        video.className = 'rgb-cinematic__video';
        video.src = step.video;
        video.autoplay = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.muted = AudioManager.globalMuted;
        video.volume = Math.min(1, Math.max(0, AudioManager.masterVolume));
        video.addEventListener('ended', finish);
        video.addEventListener('error', showImage);
        video.addEventListener('playing', () => clearTimeout(fallbackTimer), { once: true });
        container.prepend(video);
        fallbackTimer = setTimeout(showImage, 3000);
        video.play().catch(showImage);
    });
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function playCinematicSequence(container, steps) {
    if (!container || !steps || steps.length === 0) return;
    container.classList.remove('hidden');
    for (const step of steps) {
        container.classList.remove('rgb-cinematic--visible');
        await wait(FADE_MS);
        container.classList.add('rgb-cinematic--visible');
        await playStep(container, step);
    }
    container.classList.remove('rgb-cinematic--visible');
    await wait(FADE_MS);
    container.onclick = null;
    container.classList.add('hidden');
    container.replaceChildren();
}
