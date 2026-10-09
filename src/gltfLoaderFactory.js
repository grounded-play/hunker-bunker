/**
 * Every glTF loader in the game, configured once: meshopt geometry and KTX2
 * (Basis Universal) textures. Model textures ship as KTX2 so they stay
 * compressed on the GPU (scripts/art/convert_glb_textures_ktx2.py).
 *
 * KTX2Loader picks its GPU target format from a renderer's extensions. The
 * game registers its renderer; anything that loads a model before then
 * (or in a scene with no game renderer) is configured from a throwaway WebGL2
 * context, so no loader ever meets a KTX2 texture unconfigured.
 */
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { assetUrl } from './assetUrl.js';

let ktx2Loader = null;

function probeRenderer() {
    const canvas = globalThis.document?.createElement?.('canvas');
    const gl = canvas?.getContext?.('webgl2') ?? null;
    const extensions = new Map();
    for (const name of [
        'WEBGL_compressed_texture_astc', 'WEBGL_compressed_texture_etc1', 'WEBGL_compressed_texture_etc',
        'WEBGL_compressed_texture_s3tc', 'EXT_texture_compression_bptc', 'WEBGL_compressed_texture_pvrtc',
        'WEBKIT_WEBGL_compressed_texture_pvrtc'
    ]) {
        const extension = gl?.getExtension?.(name);
        if (extension) extensions.set(name, extension);
    }
    // Keep only what detectSupport reads, then free the context.
    const astcProfiles = extensions.get('WEBGL_compressed_texture_astc')?.getSupportedProfiles?.() ?? [];
    gl?.getExtension?.('WEBGL_lose_context')?.loseContext?.();
    return {
        extensions: {
            has: (name) => extensions.has(name),
            get: (name) => (name === 'WEBGL_compressed_texture_astc' ? { getSupportedProfiles: () => astcProfiles } : extensions.get(name))
        }
    };
}

/** The shared KTX2 loader (null outside a browser). */
export function getKtx2Loader() {
    if (typeof globalThis.document === 'undefined') return null;
    if (!ktx2Loader) ktx2Loader = new KTX2Loader().setTranscoderPath(assetUrl('/basis/'));
    if (!ktx2Loader.workerConfig) ktx2Loader.detectSupport(probeRenderer());
    return ktx2Loader;
}

/** Configure KTX2 from the game's own renderer (call once it exists). */
export function registerKtx2Renderer(renderer) {
    if (typeof globalThis.document === 'undefined' || !renderer?.extensions) return;
    if (!ktx2Loader) ktx2Loader = new KTX2Loader().setTranscoderPath(assetUrl('/basis/'));
    ktx2Loader.detectSupport(renderer);
}

export function createGltfLoader(manager) {
    const loader = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
    const ktx2 = getKtx2Loader();
    if (ktx2) loader.setKTX2Loader(ktx2);
    return loader;
}
