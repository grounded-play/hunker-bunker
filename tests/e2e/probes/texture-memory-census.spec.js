import { test } from '@playwright/test';
import fs from 'node:fs';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Texture memory census: boots the pinned map, streams the chunks around the
// start, waits for models, then sums every texture the scene's materials use.
//   HB_PROBES=1 TEXTURE_CENSUS_OUT=/tmp/census.json npx playwright test -c <gpu config> \
//     tests/e2e/probes/texture-memory-census.spec.js
test('texture memory census', async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1600, height: 900 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForFunction(() => window.game?.performanceProfile === 'gameplay', null, { timeout: 30_000 });
    await page.evaluate(() => {
        const game = window.game;
        game.fixedRunEntropy = true;
        game.globalSeedOffset = 424242;
        game.respawnPlayer();
        game.setGodMode?.(true);
    });
    await page.waitForTimeout(4000);
    // Walk the player through the start area so chunks and model swaps stream in.
    for (const [x, z] of [[0, 0], [24, 0], [24, 24], [0, 24], [-24, 24], [-24, 0], [-24, -24], [0, -24], [24, -24], [0, 0]]) {
        await page.evaluate(([px, pz]) => {
            window.game.teleportPlayerTo(px, pz, { safeFloor: false });
            window.game.snapCameraToPlayer?.();
        }, [x, z]);
        await page.waitForTimeout(2500);
    }
    await page.waitForTimeout(6000);
    const census = await page.evaluate(() => {
        const game = window.game;
        const seen = new Map();
        const bytesFor = (texture) => {
            const image = texture.image ?? {};
            const width = image.width ?? image.naturalWidth ?? texture.mipmaps?.[0]?.width ?? 0;
            const height = image.height ?? image.naturalHeight ?? texture.mipmaps?.[0]?.height ?? 0;
            const depth = image.depth ?? 1;
            if (texture.isCompressedTexture || texture.isCompressedArrayTexture) {
                const sum = (texture.mipmaps ?? []).reduce((total, level) => total + (level.data?.byteLength ?? 0), 0);
                return { width, height, depth, bytes: sum, compressed: true };
            }
            const mips = texture.generateMipmaps !== false && texture.minFilter !== 1006 && texture.minFilter !== 1003 ? 4 / 3 : 1;
            return { width, height, depth, bytes: Math.round(width * height * depth * 4 * mips), compressed: false };
        };
        const visit = (texture, owner) => {
            if (!texture?.isTexture || seen.has(texture.uuid)) return;
            const info = bytesFor(texture);
            const source = texture.userData?.mimeType || texture.image?.currentSrc || texture.image?.src || texture.name || '';
            seen.set(texture.uuid, { ...info, name: texture.name || '', owner, source: String(source).slice(-90) });
        };
        game.scene.traverse((object) => {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
                if (!material) continue;
                const owner = object.userData?.modelType || object.parent?.userData?.modelType || object.name || object.type;
                for (const value of Object.values(material)) visit(value, owner);
                for (const uniform of Object.values(material.uniforms ?? {})) visit(uniform?.value, owner);
                for (const uniform of Object.values(material.userData?.stickerUniforms ?? {})) visit(uniform?.value, 'stickers');
            }
        });
        for (const uniform of Object.values(game.floorSplatShared ?? {})) visit(uniform?.value, 'floorSplat');
        for (const uniform of Object.values(game.floorShaderUniforms ?? {})) visit(uniform?.value, 'floor');
        return { textures: [...seen.values()], rendererTextures: game.renderer.info.memory.textures };
    });
    fs.writeFileSync(process.env.TEXTURE_CENSUS_OUT || 'texture-census.json', JSON.stringify(census, null, 1));
    const total = census.textures.reduce((sum, texture) => sum + texture.bytes, 0);
    console.log(`textures ${census.textures.length} (renderer ${census.rendererTextures}), ~${(total / 1048576).toFixed(0)} MiB`);
});
