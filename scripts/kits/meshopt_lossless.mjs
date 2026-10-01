// Lossless meshopt pass for the kit pieces (after scripts/blender/texture_kit_pieces.py).
//
//   npm i --no-save @gltf-transform/core@4 @gltf-transform/extensions@4 meshoptimizer
//   node scripts/kits/meshopt_lossless.mjs public/3d/runtime/kits/modular-*/*.glb
//
// EXT_meshopt_compression over the existing float attributes with no
// quantization: decoded attributes are byte-identical and every triangle keeps
// its winding (the index codec may only rotate a triangle's corners). Verified
// 2026-10-01 on all 80 pieces; ~33% smaller. The game registers MeshoptDecoder
// on every GLTFLoader, unlike Draco (see src/glbDecoderSupport.test.js).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
let before = 0, after = 0;
for (const file of process.argv.slice(2)) {
    const { size } = (await import('node:fs')).statSync(file); before += size;
    const doc = await io.read(file);
    doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
    await io.write(file, doc);
    after += (await import('node:fs')).statSync(file).size;
}
console.log('meshopt lossless', before, '->', after);
