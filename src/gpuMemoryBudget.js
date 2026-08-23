import * as THREE from 'three';

function finiteDimension(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function textureDimensions(image) {
    if (!image) return { width: 0, height: 0, depth: 1 };
    return {
        width: finiteDimension(image.videoWidth ?? image.naturalWidth ?? image.width),
        height: finiteDimension(image.videoHeight ?? image.naturalHeight ?? image.height),
        depth: finiteDimension(image.depth) || 1
    };
}

function bytesPerTexturePixel(texture) {
    const channels = texture?.format === THREE.RedFormat || texture?.format === THREE.DepthFormat
        ? 1
        : texture?.format === THREE.RGFormat
            ? 2
            : texture?.format === THREE.RGBFormat
                ? 3
                : 4;
    if (texture?.type === THREE.FloatType) return channels * 4;
    if (texture?.type === THREE.HalfFloatType
        || texture?.type === THREE.ShortType
        || texture?.type === THREE.UnsignedShortType) return channels * 2;
    if (texture?.type === THREE.UnsignedIntType || texture?.type === THREE.IntType) return channels * 4;
    if (texture?.type === THREE.UnsignedShort4444Type
        || texture?.type === THREE.UnsignedShort5551Type) return 2;
    if (texture?.type === THREE.UnsignedInt248Type) return 4;
    return channels;
}

function imagePayloadBytes(image, bytesPerPixel) {
    if (!image) return 0;
    if (Array.isArray(image)) {
        return image.reduce((sum, entry) => sum + imagePayloadBytes(entry, bytesPerPixel), 0);
    }
    if (Number.isFinite(image?.data?.byteLength)) return image.data.byteLength;
    const { width, height, depth } = textureDimensions(image);
    return width * height * depth * bytesPerPixel;
}

export function estimateTextureBytes(texture) {
    if (!texture?.isTexture) return 0;
    const bytesPerPixel = bytesPerTexturePixel(texture);
    const mipmaps = Array.isArray(texture.mipmaps) ? texture.mipmaps : [];
    if (mipmaps.length > 0) {
        const mipBytes = mipmaps.reduce(
            (sum, mip) => sum + imagePayloadBytes(mip, bytesPerPixel),
            0
        );
        if (mipBytes > 0) return mipBytes;
    }
    const baseBytes = imagePayloadBytes(texture.image, bytesPerPixel);
    return texture.generateMipmaps === false ? baseBytes : Math.ceil(baseBytes * 4 / 3);
}

export function estimateGeometryBytes(geometry) {
    if (!geometry?.isBufferGeometry) return 0;
    const arrays = new Set();
    const addAttribute = (attribute) => {
        const array = attribute?.isInterleavedBufferAttribute
            ? attribute.data?.array
            : attribute?.array;
        if (array?.buffer) arrays.add(array);
    };
    for (const attribute of Object.values(geometry.attributes ?? {})) addAttribute(attribute);
    addAttribute(geometry.index);
    for (const attributes of Object.values(geometry.morphAttributes ?? {})) {
        for (const attribute of attributes ?? []) addAttribute(attribute);
    }
    return [...arrays].reduce((sum, array) => sum + (array.byteLength ?? 0), 0);
}

function visitScene(root, visitor) {
    if (!root) return;
    if (typeof root.traverse === 'function') {
        root.traverse(visitor);
        return;
    }
    const stack = [root];
    while (stack.length) {
        const node = stack.pop();
        visitor(node);
        for (const child of node?.children ?? []) stack.push(child);
    }
}

const MATERIAL_TEXTURE_SLOTS = [
    'map', 'alphaMap', 'aoMap', 'bumpMap', 'clearcoatMap',
    'clearcoatNormalMap', 'clearcoatRoughnessMap', 'displacementMap',
    'emissiveMap', 'envMap', 'gradientMap', 'iridescenceMap',
    'iridescenceThicknessMap', 'lightMap', 'matcap', 'metalnessMap',
    'normalMap', 'roughnessMap', 'sheenColorMap', 'sheenRoughnessMap',
    'specularMap', 'specularColorMap', 'specularIntensityMap',
    'thicknessMap', 'transmissionMap'
];

function textureValuesFromMaterial(material) {
    const values = [];
    for (const slot of MATERIAL_TEXTURE_SLOTS) if (material?.[slot]?.isTexture) values.push(material[slot]);
    for (const uniform of Object.values(material?.uniforms ?? {})) {
        const value = uniform?.value;
        if (value?.isTexture) values.push(value);
        else if (Array.isArray(value)) {
            for (const entry of value) if (entry?.isTexture) values.push(entry);
        }
    }
    return values;
}

function renderTargetDimensions(target) {
    return {
        width: finiteDimension(target?.width ?? target?.texture?.image?.width),
        height: finiteDimension(target?.height ?? target?.texture?.image?.height)
    };
}

export function estimateGpuMemory({ scene, renderer, composer } = {}) {
    const geometries = new Set();
    const materials = new Set();
    const textureObjects = new Set();
    const textureAllocationKeys = new WeakMap();
    let textureAllocations = 0;
    let geometryBytes = 0;
    let textureBytes = 0;
    let renderTargetBytes = 0;

    const addTexture = (texture, bucket = 'scene') => {
        if (!texture?.isTexture) return;
        textureObjects.add(texture);
        const source = texture.source && typeof texture.source === 'object'
            ? texture.source
            : texture;
        let sourceKeys = textureAllocationKeys.get(source);
        if (!sourceKeys) {
            sourceKeys = new Set();
            textureAllocationKeys.set(source, sourceKeys);
        }
        // Three.js can share one WebGLTexture between Texture clones when the
        // Source and upload-affecting parameters match. UV offset/repeat are
        // shader uniforms and deliberately absent from this key.
        const allocationKey = [
            texture.wrapS, texture.wrapT, texture.magFilter, texture.minFilter,
            texture.anisotropy, texture.format, texture.internalFormat,
            texture.type, texture.generateMipmaps, texture.premultiplyAlpha,
            texture.flipY, texture.unpackAlignment, texture.colorSpace
        ].join('|');
        if (sourceKeys.has(allocationKey)) return;
        sourceKeys.add(allocationKey);
        textureAllocations += 1;
        const bytes = estimateTextureBytes(texture);
        if (bucket === 'render-target') renderTargetBytes += bytes;
        else textureBytes += bytes;
    };

    visitScene(scene, (object) => {
        if (object?.geometry?.isBufferGeometry && !geometries.has(object.geometry)) {
            geometries.add(object.geometry);
            geometryBytes += estimateGeometryBytes(object.geometry);
        }
        const objectMaterials = Array.isArray(object?.material) ? object.material : [object?.material];
        for (const material of objectMaterials) {
            if (!material || materials.has(material)) continue;
            materials.add(material);
            for (const texture of textureValuesFromMaterial(material)) addTexture(texture);
        }
    });
    addTexture(scene?.background);
    addTexture(scene?.environment);

    const renderTargets = new Set([
        composer?.readBuffer,
        composer?.writeBuffer,
        composer?.renderTarget1,
        composer?.renderTarget2
    ].filter(Boolean));
    for (const target of renderTargets) {
        addTexture(target.texture, 'render-target');
        for (const texture of target.textures ?? []) addTexture(texture, 'render-target');
        addTexture(target.depthTexture, 'render-target');
        const { width, height } = renderTargetDimensions(target);
        const depthBytes = target.depthBuffer === false || target.depthTexture
            ? 0
            : width * height * 4;
        const samples = Math.max(0, Number(target.samples) || 0);
        // Multisampled targets retain their resolved texture plus per-sample
        // color/depth storage. Four bytes per color pixel is the common RGBA8
        // composer path; unusual formats remain an estimate by design.
        const multisampleBytes = samples > 0
            ? width * height * samples * (4 + (target.depthBuffer === false ? 0 : 4))
            : 0;
        renderTargetBytes += depthBytes + multisampleBytes;
    }

    const gl = renderer?.getContext?.();
    const drawingBufferWidth = finiteDimension(gl?.drawingBufferWidth ?? renderer?.domElement?.width);
    const drawingBufferHeight = finiteDimension(gl?.drawingBufferHeight ?? renderer?.domElement?.height);
    // Lower-bound estimate for RGBA8 color + 24/8 depth-stencil. Driver-owned
    // swap-chain buffering and compression are intentionally not guessed.
    const defaultFramebufferBytes = drawingBufferWidth * drawingBufferHeight * 8;
    const estimatedBytes = geometryBytes + textureBytes + renderTargetBytes + defaultFramebufferBytes;

    return {
        estimatedBytes,
        geometryBytes,
        textureBytes,
        renderTargetBytes,
        defaultFramebufferBytes,
        uniqueGeometries: geometries.size,
        uniqueMaterials: materials.size,
        uniqueTextures: textureAllocations,
        uniqueTextureObjects: textureObjects.size,
        drawingBufferWidth,
        drawingBufferHeight
    };
}

export function createGpuMemoryTracker({
    now = () => performance.now(),
    sampleIntervalMs = 10_000
} = {}) {
    let lastSampleAt = -Infinity;
    let cached = null;
    return {
        snapshot(context = {}, { force = false } = {}) {
            const currentTime = now();
            if (!cached || force || currentTime - lastSampleAt >= sampleIntervalMs) {
                cached = estimateGpuMemory(context);
                lastSampleAt = currentTime;
            }
            return cached;
        },
        reset() {
            cached = null;
            lastSampleAt = -Infinity;
        }
    };
}

export function captureHardwareCapabilities({ renderer, navigatorObject, isSteamDeck = false } = {}) {
    const gl = renderer?.getContext?.();
    let gpuVendor = null;
    let gpuRenderer = null;
    try {
        const debugInfo = gl?.getExtension?.('WEBGL_debug_renderer_info');
        if (debugInfo) {
            gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) ?? null;
            gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? null;
        }
    } catch {
        // Browser privacy settings may reject unmasked renderer access.
    }
    const readLimit = (constant) => {
        try {
            const value = gl?.getParameter?.(constant);
            return Number.isFinite(value) ? value : null;
        } catch {
            return null;
        }
    };
    return {
        isSteamDeck: Boolean(isSteamDeck),
        logicalCores: Number(navigatorObject?.hardwareConcurrency) || null,
        deviceMemoryGb: Number(navigatorObject?.deviceMemory) || null,
        gpuVendor,
        gpuRenderer,
        softwareRenderer: /swiftshader|llvmpipe|software rasterizer/i.test(`${gpuVendor ?? ''} ${gpuRenderer ?? ''}`),
        powerPreference: 'high-performance',
        maxTextureSize: readLimit(gl?.MAX_TEXTURE_SIZE),
        maxRenderbufferSize: readLimit(gl?.MAX_RENDERBUFFER_SIZE)
    };
}
