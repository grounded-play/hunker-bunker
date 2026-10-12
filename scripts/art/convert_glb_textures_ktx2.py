#!/usr/bin/env python3
"""Re-encode the textures inside GLBs as KTX2 (Basis UASTC) so they stay
compressed on the GPU: about a quarter of the memory of the same textures
decoded from PNG/JPEG/WebP, with no visible change.

Only the images change. Every other byte range in the binary chunk (meshes,
meshopt-compressed streams, animation) is copied through; each texture points
at its KTX2 image through KHR_texture_basisu. Colour maps (base colour,
emissive) encode in sRGB; normal, metallic-roughness and occlusion maps encode
linear, normal maps with basisu's normal-map tuning.

Needs the basisu encoder (Basis Universal, built from source):
  python3 scripts/art/convert_glb_textures_ktx2.py --basisu /path/to/basisu FILE.glb [...]
  python3 scripts/art/convert_glb_textures_ktx2.py --basisu ... --dir public/3d/runtime/new3ds
Already-converted files are skipped.
"""

import argparse
import io
import json
import struct
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

GLB_MAGIC = 0x46546C67
JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def read_glb(path):
    data = Path(path).read_bytes()
    magic, version, _ = struct.unpack_from('<III', data, 0)
    if magic != GLB_MAGIC or version != 2:
        raise ValueError(f'{path}: not a glTF 2 binary')
    json_length, json_type = struct.unpack_from('<II', data, 12)
    assert json_type == JSON_CHUNK
    gltf = json.loads(data[20:20 + json_length])
    offset = 20 + json_length
    binary = b''
    if offset < len(data):
        bin_length, bin_type = struct.unpack_from('<II', data, offset)
        assert bin_type == BIN_CHUNK
        binary = data[offset + 8:offset + 8 + bin_length]
    return gltf, binary


def write_glb(path, gltf, binary):
    text = json.dumps(gltf, separators=(',', ':')).encode('utf8')
    text += b' ' * ((4 - len(text) % 4) % 4)
    binary += b'\0' * ((4 - len(binary) % 4) % 4)
    total = 12 + 8 + len(text) + (8 + len(binary) if binary else 0)
    with open(path, 'wb') as out:
        out.write(struct.pack('<III', GLB_MAGIC, 2, total))
        out.write(struct.pack('<II', len(text), JSON_CHUNK))
        out.write(text)
        if binary:
            out.write(struct.pack('<II', len(binary), BIN_CHUNK))
            out.write(binary)


def texture_source(texture):
    for key in ('EXT_texture_webp', 'KHR_texture_basisu', 'EXT_texture_avif'):
        source = texture.get('extensions', {}).get(key, {}).get('source')
        if source is not None:
            return source
    return texture.get('source')


def image_roles(gltf):
    """Per image: 'color', 'normal' or 'linear'."""
    roles = {}
    textures = gltf.get('textures', [])

    def mark(info, role):
        if not info:
            return
        image = texture_source(textures[info['index']])
        if image is None:
            return
        current = roles.get(image)
        # Colour wins: an image shared with a colour slot must stay sRGB.
        if current == 'color' or role == 'color':
            roles[image] = 'color'
        elif current is None:
            roles[image] = role

    for material in gltf.get('materials', []):
        pbr = material.get('pbrMetallicRoughness', {})
        mark(pbr.get('baseColorTexture'), 'color')
        mark(material.get('emissiveTexture'), 'color')
        mark(pbr.get('metallicRoughnessTexture'), 'linear')
        mark(material.get('occlusionTexture'), 'linear')
        mark(material.get('normalTexture'), 'normal')
        for extension in material.get('extensions', {}).values():
            for key, value in extension.items():
                if isinstance(value, dict) and 'index' in value:
                    mark(value, 'color' if 'color' in key.lower() or 'sheen' in key.lower() else 'linear')
    return roles


def encode_ktx2(basisu, image_bytes, role, workdir, name):
    image = Image.open(io.BytesIO(image_bytes))
    has_alpha = image.mode in ('RGBA', 'LA', 'PA') or 'transparency' in image.info
    image = image.convert('RGBA' if has_alpha and role == 'color' else 'RGB')
    source = Path(workdir) / f'{name}.png'
    target = Path(workdir) / f'{name}.ktx2'
    image.save(source)
    command = [basisu, '-uastc', '-uastc_level', '2', '-uastc_rdo_l', '1.0', '-mipmap', '-ktx2',
               '-ktx2_zstandard_level', '18', str(source), '-output_file', str(target)]
    if role != 'color':
        command.insert(1, '-linear')
    if role == 'normal':
        command.insert(1, '-normal_map')
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, cwd=workdir)
    return target.read_bytes()


def convert(path, basisu):
    gltf, binary = read_glb(path)
    images = gltf.get('images', [])
    if not images or all(image.get('mimeType') == 'image/ktx2' for image in images):
        return None
    views = gltf['bufferViews']
    bin_index = next((i for i, buffer in enumerate(gltf.get('buffers', [])) if 'uri' not in buffer and not buffer.get('extensions')), None)
    roles = image_roles(gltf)

    replacements = {}
    with tempfile.TemporaryDirectory() as workdir:
        for index, image in enumerate(images):
            if image.get('mimeType') == 'image/ktx2' or 'bufferView' not in image:
                continue
            view = views[image['bufferView']]
            raw = binary[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]
            replacements[image['bufferView']] = encode_ktx2(basisu, raw, roles.get(index, 'color'), workdir, f'image{index}')
            image['mimeType'] = 'image/ktx2'
            image.pop('uri', None)

    # Rebuild the binary chunk: replaced images get their KTX2 bytes; every
    # other range a view (or a meshopt stream) points into is copied through.
    out = bytearray()

    def append(chunk):
        while len(out) % 16:
            out.append(0)
        start = len(out)
        out.extend(chunk)
        return start

    moved = {}
    for index, view in enumerate(views):
        if index in replacements:
            view['byteOffset'] = append(replacements[index])
            view['byteLength'] = len(replacements[index])
            view.pop('byteStride', None)
            continue
        meshopt = view.get('extensions', {}).get('EXT_meshopt_compression')
        if meshopt and meshopt.get('buffer') == bin_index:
            key = (meshopt.get('byteOffset', 0), meshopt['byteLength'])
            if key not in moved:
                moved[key] = append(binary[key[0]:key[0] + key[1]])
            meshopt['byteOffset'] = moved[key]
        if view.get('buffer') == bin_index:
            key = (view.get('byteOffset', 0), view['byteLength'])
            if key not in moved:
                moved[key] = append(binary[key[0]:key[0] + key[1]])
            view['byteOffset'] = moved[key]
    if bin_index is not None:
        gltf['buffers'][bin_index]['byteLength'] = len(out)

    for texture in gltf.get('textures', []):
        source = texture_source(texture)
        if source is None or images[source].get('mimeType') != 'image/ktx2':
            continue
        extensions = texture.setdefault('extensions', {})
        extensions.pop('EXT_texture_webp', None)
        extensions.pop('EXT_texture_avif', None)
        extensions['KHR_texture_basisu'] = {'source': source}
        texture.pop('source', None)
    used = set(gltf.get('extensionsUsed', []))
    still_webp = any('EXT_texture_webp' in texture.get('extensions', {}) for texture in gltf.get('textures', []))
    if not still_webp:
        used.discard('EXT_texture_webp')
    used.add('KHR_texture_basisu')
    gltf['extensionsUsed'] = sorted(used)
    required = set(gltf.get('extensionsRequired', []))
    if not still_webp:
        required.discard('EXT_texture_webp')
    required.add('KHR_texture_basisu')
    gltf['extensionsRequired'] = sorted(required)

    before = Path(path).stat().st_size
    write_glb(path, gltf, bytes(out))
    return before, Path(path).stat().st_size, len(replacements)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--basisu', required=True)
    parser.add_argument('--dir', action='append', default=[])
    parser.add_argument('--jobs', type=int, default=2)
    parser.add_argument('files', nargs='*')
    args = parser.parse_args()
    files = [Path(f) for f in args.files]
    for directory in args.dir:
        files += sorted(Path(directory).rglob('*.glb'))

    def run(path):
        try:
            result = convert(path, args.basisu)
        except Exception as error:  # noqa: BLE001 - report and keep going
            return f'[ktx2] FAILED {path}: {error}'
        if result is None:
            return f'[ktx2] skip {path} (no images or already KTX2)'
        before, after, count = result
        return f'[ktx2] {path}: {count} textures, {before / 1e6:.2f} -> {after / 1e6:.2f} MB'

    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        for line in pool.map(run, files):
            print(line, flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
