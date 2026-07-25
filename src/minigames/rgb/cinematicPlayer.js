// Plays a sequence of RGB cinematic beats inside a container element. Each
// step tries its video first; when the video is missing or fails to load —
// the rail cinematics in docs/mini-games/rgb/cinematic-rail-prompts.md are a
// work in progress and mostly don't exist yet — it falls back to the still
// end-frame image, holds it, then fades to the next step. A step with only
// an image (no video declared at all) goes straight to the held-image path.
// Clicking the layer skips the current step.

export const IMAGE_HOLD_MS = 2600;
export const FADE_MS = 350;

function probeVideoExists(src) {
    if (typeof fetch !== 'function') return Promise.resolve(false);
    return fetch(src, { method: 'HEAD' })
        .then((res) => res.ok)
        .catch(() => false);
}

function playStep(container, step) {
    return new Promise((resolve) => {
        container.replaceChildren();
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
        };
        container.onclick = finish;

        const showImage = () => {
            if (!step.image) {
                finish();
                return;
            }
            container.replaceChildren();
            const img = document.createElement('img');
            img.className = 'rgb-cinematic__image';
            img.src = step.image;
            img.alt = '';
            container.append(img);
            setTimeout(finish, IMAGE_HOLD_MS);
        };

        if (!step.video) {
            showImage();
            return;
        }

        probeVideoExists(step.video).then((exists) => {
            if (settled) return;
            if (!exists) {
                showImage();
                return;
            }
            const video = document.createElement('video');
            video.className = 'rgb-cinematic__video';
            video.src = step.video;
            video.autoplay = true;
            video.playsInline = true;
            video.addEventListener('ended', finish);
            video.addEventListener('error', showImage);
            container.append(video);
            video.play().catch(showImage);
        });
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
