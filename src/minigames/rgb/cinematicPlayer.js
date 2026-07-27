// Plays a sequence of RGB cinematic beats inside a container element. Each
// step tries its video first; when the video is missing or fails to load —
// the rail cinematics in docs/mini-games/rgb/cinematic-rail-prompts.md are a
// work in progress and mostly don't exist yet — it falls back to the still
// end-frame image, holds it, then fades to the next step. A step with only
// an image (no video declared at all) goes straight to the held-image path.
// A dedicated control skips the current step; ordinary clicks no longer
// destroy a clip while the player is trying to interact with the scene.

import { AudioManager } from '../../audio.js';
import { assetUrl } from '../../assetUrl.js';

export const IMAGE_HOLD_MS = 2600;
export const FADE_MS = 350;

function playStep(container, step, mediaStack) {
    return new Promise((resolve) => {
        let settled = false;
        let fallbackTimer = 0;
        let activeMedia = null;
        const replaceMedia = (media) => {
            const previousVideo = mediaStack.querySelector('video');
            if (previousVideo && previousVideo !== media) previousVideo.pause();
            activeMedia = media;
            mediaStack.replaceChildren(media);
        };
        const finish = () => {
            if (settled) return;
            settled = true;
            clearTimeout(fallbackTimer);
            if (activeMedia?.tagName === 'VIDEO') activeMedia.pause();
            window.removeEventListener('keydown', onKey);
            container.onclick = null;
            status.remove();
            skip.remove();
            resolve();
        };
        const onKey = (event) => {
            if (event.code === 'Escape') return;
            event.preventDefault();
            finish();
        };
        window.addEventListener('keydown', onKey);

        const status = document.createElement('div');
        status.className = 'rgb-cinematic__status';
        status.textContent = step.label ?? 'ARCHIVE CINEMATIC // RESTORING SIGNAL';
        const skip = document.createElement('div');
        skip.className = 'rgb-cinematic__skip';
        skip.textContent = 'PRESS A KEY TO SKIP';
        skip.setAttribute('role', 'button');
        skip.tabIndex = 0;
        skip.addEventListener('click', (event) => {
            event.stopPropagation();
            finish();
        });
        container.append(status, skip);

        const showImage = () => {
            if (settled) return;
            clearTimeout(fallbackTimer);
            if (!step.image) {
                finish();
                return;
            }
            const img = document.createElement('img');
            img.className = 'rgb-cinematic__image';
            img.src = assetUrl(step.image);
            img.alt = '';
            img.addEventListener('load', () => {
                replaceMedia(img);
            }, { once: true });
            fallbackTimer = setTimeout(finish, IMAGE_HOLD_MS);
        };

        if (!step.video) {
            showImage();
            return;
        }

        const video = document.createElement('video');
        video.className = 'rgb-cinematic__video';
        video.src = assetUrl(step.video);
        video.autoplay = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.muted = AudioManager.globalMuted;
        video.volume = Math.min(1, Math.max(0, AudioManager.masterVolume));
        video.addEventListener('ended', finish);
        video.addEventListener('error', showImage);
        video.addEventListener('playing', () => {
            clearTimeout(fallbackTimer);
            // Keep the previous clip's final frame visible until the next clip
            // has decoded and is genuinely playing.
            replaceMedia(video);
        }, { once: true });
        fallbackTimer = setTimeout(showImage, 3000);
        video.play().catch(showImage);
    });
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function playCinematicSequence(container, steps, {
    background = null,
    transitionDelayMs = 0
} = {}) {
    if (!container || !steps || steps.length === 0) return;
    container.replaceChildren();
    if (background) {
        const backdrop = document.createElement('img');
        backdrop.className = 'rgb-cinematic__backdrop';
        backdrop.src = assetUrl(background);
        backdrop.alt = '';
        container.append(backdrop);
    }
    const mediaStack = document.createElement('div');
    mediaStack.className = 'rgb-cinematic__media-stack';
    container.append(mediaStack);
    container.classList.remove('hidden');
    if (transitionDelayMs > 0) await wait(transitionDelayMs);
    container.classList.add('rgb-cinematic--visible');
    for (const step of steps) {
        await playStep(container, step, mediaStack);
    }
    container.classList.remove('rgb-cinematic--visible');
    await wait(FADE_MS);
    container.onclick = null;
    container.classList.add('hidden');
    container.replaceChildren();
}
