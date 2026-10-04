#!/usr/bin/env python3
"""Local voice generation with Qwen3-TTS (Apache-2.0): design, then clone.

Run with the tools venv (docs/voice-generation-pipeline.md):

    ~/tools/voice/.venv-qwen/bin/python scripts/voice/qwen_voice.py design --roles mothership briggs queen --takes 3
    ~/tools/voice/.venv-qwen/bin/python scripts/voice/qwen_voice.py lines --roles briggs --locale en

design  For each role in scripts/voice/voice-cast.json, VoiceDesign renders
        `--takes` auditions of the role's reference read from its casting-bible
        identity description, to art/source/voice/auditions/<role>/take_<n>.wav
        with a JSON sidecar (prompt revision, seed, model, device, timing).
lines   For each role with a chosen audition in scripts/voice/cast-selection.json,
        the Base model builds a reusable clone prompt from that audition and
        renders every line for the role from scripts/voice/voice-lines.json as a
        dry master: art/source/voice/lines/<locale>/<key>.wav. Post chains and
        encoding to the game (public/audio/voice/lines) are a separate step, so
        the dry master is always kept (casting bible section 17).

The GPU is used when CUDA works (float16 + SDPA: the RTX 2070 SUPER is Turing,
which has no bfloat16 and cannot run FlashAttention 2); otherwise float32 on CPU.
"""
import argparse
import json
import os
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CAST = ROOT / 'scripts/voice/voice-cast.json'
LINES = ROOT / 'scripts/voice/voice-lines.json'
SELECTION = ROOT / 'scripts/voice/cast-selection.json'
OUT = ROOT / 'art/source/voice'
MODELS = Path(os.environ.get('HB_VOICE_MODELS', Path.home() / 'tools/voice/models'))
LANGUAGE = {'en': 'English', 'de': 'German', 'es-419': 'Spanish', 'pt-BR': 'Portuguese',
            'ru': 'Russian', 'ja': 'Japanese', 'zh-CN': 'Chinese'}


def load_model(name):
    import torch
    from qwen_tts import Qwen3TTSModel
    cuda = torch.cuda.is_available()
    if not cuda:
        torch.set_num_threads(os.cpu_count() or 8)
    model = Qwen3TTSModel.from_pretrained(
        str(MODELS / name),
        device_map='cuda:0' if cuda else 'cpu',
        dtype=torch.float16 if cuda else torch.float32,
        attn_implementation='sdpa',
    )
    return model, ('cuda' if cuda else 'cpu')


def design(args):
    import soundfile as sf
    import torch
    cast = {r['id']: r for r in json.loads(CAST.read_text())['roles']}
    model, device = load_model('Qwen3-TTS-12Hz-1.7B-VoiceDesign')
    for role_id in args.roles:
        role = cast[role_id]
        out = OUT / 'auditions' / role_id
        out.mkdir(parents=True, exist_ok=True)
        for take in range(1, args.takes + 1):
            seed = args.seed + take
            torch.manual_seed(seed)
            text = args.text or role['referenceText']
            start = time.time()
            wavs, sr = model.generate_voice_design(text=text, language='English', instruct=role['description'])
            elapsed = time.time() - start
            path = out / f'take_{take}.wav'
            sf.write(path, wavs[0], sr)
            meta = {'role': role_id, 'promptRevision': role['promptRevision'], 'take': take, 'seed': seed,
                    'model': 'Qwen3-TTS-12Hz-1.7B-VoiceDesign', 'device': device, 'text': text,
                    'seconds': round(len(wavs[0]) / sr, 2), 'renderSeconds': round(elapsed, 1)}
            path.with_suffix('.json').write_text(json.dumps(meta, indent=2) + '\n')
            print(f'[design] {role_id} take {take}: {meta["seconds"]}s audio in {meta["renderSeconds"]}s on {device}')


def lines(args):
    import soundfile as sf
    selection = json.loads(SELECTION.read_text())
    entries = [e for e in json.loads(LINES.read_text())['lines'] if e['locale'] == args.locale and e['role'] in args.roles]
    model, device = load_model('Qwen3-TTS-12Hz-1.7B-Base')
    for role_id in args.roles:
        choice = selection.get(role_id)
        if not choice:
            print(f'[lines] {role_id}: no audition chosen in {SELECTION.relative_to(ROOT)}; skipping')
            continue
        audition = OUT / 'auditions' / role_id / f'take_{choice["take"]}'
        ref_text = json.loads(audition.with_suffix('.json').read_text())['text']
        prompt = model.create_voice_clone_prompt(ref_audio=str(audition.with_suffix('.wav')), ref_text=ref_text)
        todo = [e for e in entries if e['role'] == role_id]
        if args.limit:
            todo = todo[:args.limit]
        for entry in todo:
            path = OUT / 'lines' / args.locale / f'{entry["key"]}.wav'
            if path.exists() and not args.force:
                continue
            path.parent.mkdir(parents=True, exist_ok=True)
            start = time.time()
            wavs, sr = model.generate_voice_clone(text=entry['spoken'], language=LANGUAGE[args.locale], voice_clone_prompt=prompt)
            sf.write(path, wavs[0], sr)
            print(f'[lines] {entry["key"]}: {len(wavs[0]) / sr:.1f}s in {time.time() - start:.1f}s on {device}')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='cmd', required=True)
    d = sub.add_parser('design')
    d.add_argument('--roles', nargs='+', required=True)
    d.add_argument('--takes', type=int, default=3)
    d.add_argument('--seed', type=int, default=4900)
    d.add_argument('--text', help='override the reference read (smoke tests)')
    d.set_defaults(func=design)
    ln = sub.add_parser('lines')
    ln.add_argument('--roles', nargs='+', required=True)
    ln.add_argument('--locale', default='en', choices=sorted(LANGUAGE))
    ln.add_argument('--limit', type=int, default=0)
    ln.add_argument('--force', action='store_true')
    ln.set_defaults(func=lines)
    args = parser.parse_args()
    args.func(args)


if __name__ == '__main__':
    main()
