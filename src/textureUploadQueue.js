// Spreads GPU texture uploads across frames.
//
// three.js uploads a texture the first time something using it draws. A
// freshly mounted chunk or a late-loading prop can bring a dozen or more
// textures at once, and on the Steam Deck those uploads all landed in one
// frame: 1-3.6 s of texSubImage2D / compressedTexSubImage2D inside a single
// render call (freeze probe, ANGLE-GL with the CPU throttled, 2026-10-16).
// compileAsync covers shader programs but never uploads textures.
//
// The queue uploads with renderer.initTexture under a per-frame time budget.
// Anything not yet reached when it first draws is uploaded by three as
// before, so the queue can only make a frame cheaper, never wrong.

const TEXTURE_SLOTS = [
    'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap',
    'bumpMap', 'displacementMap', 'lightMap', 'specularMap', 'clearcoatMap', 'clearcoatNormalMap',
    'clearcoatRoughnessMap', 'sheenColorMap', 'sheenRoughnessMap', 'transmissionMap', 'thicknessMap',
    'iridescenceMap', 'iridescenceThicknessMap', 'anisotropyMap', 'specularColorMap', 'specularIntensityMap', 'matcap', 'gradientMap'
];

function isUploadable(texture) {
    return Boolean(texture?.isTexture) && !texture.isRenderTargetTexture && !texture.isVideoTexture && texture.version > 0;
}

export function collectMaterialTextures(root) {
    const textures = new Set();
    root?.traverse?.((object) => {
        const materials = Array.isArray(object.material) ? object.material : (object.material ? [object.material] : []);
        for (const material of materials) {
            for (const slot of TEXTURE_SLOTS) if (isUploadable(material[slot])) textures.add(material[slot]);
            for (const uniform of Object.values(material.uniforms ?? {})) {
                if (isUploadable(uniform?.value)) textures.add(uniform.value);
            }
        }
    });
    return textures;
}

export class TextureUploadQueue {
    constructor({ upload, now = () => performance.now() } = {}) {
        this.upload = upload;
        this.now = now;
        this.pending = [];
        this.queued = new WeakSet();
        this.uploaded = new WeakSet();
        this.waiters = [];
    }

    get size() {
        return this.pending.length;
    }

    // Queues every not-yet-uploaded texture under root. Resolves once all of
    // them have been uploaded by drain().
    enqueue(root) {
        const mine = [];
        for (const texture of collectMaterialTextures(root)) {
            if (this.uploaded.has(texture)) continue;
            mine.push(texture);
            if (this.queued.has(texture)) continue;
            this.queued.add(texture);
            this.pending.push(texture);
        }
        if (!mine.length) return Promise.resolve();
        return new Promise((resolve) => this.waiters.push({ textures: mine, resolve }));
    }

    // Uploads queued textures until budgetMs is spent; always at least one,
    // so the queue keeps moving on a slow device.
    drain(budgetMs = 3) {
        if (!this.pending.length || typeof this.upload !== 'function') return 0;
        const start = this.now();
        let count = 0;
        while (this.pending.length) {
            if (count > 0 && this.now() - start >= budgetMs) break;
            const texture = this.pending.shift();
            this.queued.delete(texture);
            try {
                this.upload(texture);
            } catch {
                // A texture that cannot upload early still uploads on first draw.
            }
            this.uploaded.add(texture);
            count += 1;
        }
        this.waiters = this.waiters.filter((waiter) => {
            if (!waiter.textures.every((texture) => this.uploaded.has(texture))) return true;
            waiter.resolve();
            return false;
        });
        return count;
    }
}
