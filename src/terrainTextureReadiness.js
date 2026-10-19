/**
 * TextureLoader returns a Texture immediately. ThreeGame gives that texture a
 * small checker canvas so a slow request never exposes transparent geometry,
 * but the checker is not valid input for the permanent floor texture arrays.
 */
export function isTerrainTextureReady(texture) {
    const image = texture?.image;
    const hasPixels = Boolean(image && (image.naturalWidth || image.width));
    return hasPixels && texture?.userData?.isProceduralFallback === false;
}
