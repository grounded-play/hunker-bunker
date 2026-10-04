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

pick    Transcribes every audition with Whisper and records the take whose
        transcript best matches its script (character error rate) as a
        provisional choice for roles not yet chosen by a person.
all     Missing auditions, provisional picks, then every role's lines in every
        language (English first), encoding each language when it completes.
        Re-runnable: finished lines are skipped, so a reboot only pauses it.

Every rendered line is transcribed and re-rendered (new seed, up to twice)
when the transcript misses the script (CER above --max-cer); a sidecar JSON
records the transcript, CER, seed and attempts.

The GPU is used when CUDA works (float16 + SDPA: the RTX 2070 SUPER is Turing,
which has no bfloat16 and cannot run FlashAttention 2); otherwise float32 on CPU.
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import time
import unicodedata
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CAST = ROOT / 'scripts/voice/voice-cast.json'
LINES = ROOT / 'scripts/voice/voice-lines.json'
SELECTION = ROOT / 'scripts/voice/cast-selection.json'
OUT = ROOT / 'art/source/voice'
MODELS = Path(os.environ.get('HB_VOICE_MODELS', Path.home() / 'tools/voice/models'))
LANGUAGE = {'en': 'English', 'de': 'German', 'es-419': 'Spanish', 'pt-BR': 'Portuguese',
            'ru': 'Russian', 'ja': 'Japanese', 'zh-CN': 'Chinese'}
WHISPER_LANG = {'en': 'en', 'de': 'de', 'es-419': 'es', 'pt-BR': 'pt', 'ru': 'ru', 'ja': 'ja', 'zh-CN': 'zh'}
LOCALE_ORDER = ['en', 'de', 'es-419', 'pt-BR', 'ru', 'ja', 'zh-CN']
_whisper = None


def whisper():
    global _whisper
    if _whisper is None:
        from faster_whisper import WhisperModel
        _whisper = WhisperModel('small', device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 8)
    return _whisper


def normalize(text):
    text = unicodedata.normalize('NFKC', str(text)).lower()
    return re.sub(r'[\W_]+', '', text)


def cer(reference, hypothesis):
    """Character error rate after dropping case, spacing and punctuation."""
    ref, hyp = normalize(reference), normalize(hypothesis)
    if not ref:
        return 0.0 if not hyp else 1.0
    prev = list(range(len(hyp) + 1))
    for i, rc in enumerate(ref, 1):
        cur = [i]
        for j, hc in enumerate(hyp, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (rc != hc)))
        prev = cur
    return prev[-1] / len(ref)


def transcribe(path, locale):
    segments, _ = whisper().transcribe(str(path), language=WHISPER_LANG[locale], beam_size=1, vad_filter=False)
    return ' '.join(seg.text.strip() for seg in segments).strip()


def line_seed(key, attempt):
    return int(hashlib.sha1(f'{key}:{attempt}'.encode()).hexdigest()[:8], 16)


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
            render_line(model, device, prompt, entry, args.locale, args.force, args.max_cer)


def render_line(model, device, prompt, entry, locale, force=False, max_cer=0.35):
    import soundfile as sf
    import torch
    path = OUT / 'lines' / locale / f'{entry["key"]}.wav'
    if path.exists() and not force:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    best = None
    for attempt in range(3):
        seed = line_seed(entry['key'], attempt)
        torch.manual_seed(seed)
        start = time.time()
        wavs, sr = model.generate_voice_clone(text=entry['spoken'], language=LANGUAGE[locale], voice_clone_prompt=prompt)
        elapsed = time.time() - start
        sf.write(path, wavs[0], sr)
        heard = transcribe(path, locale)
        score = cer(entry['spoken'], heard)
        result = {'key': entry['key'], 'role': entry['role'], 'locale': locale, 'seed': seed, 'attempt': attempt + 1,
                  'cer': round(score, 3), 'heard': heard, 'spoken': entry['spoken'], 'device': device,
                  'seconds': round(len(wavs[0]) / sr, 2), 'renderSeconds': round(elapsed, 1)}
        if best is None or score < best[0]:
            best = (score, wavs[0], sr, result)
        if score <= max_cer:
            break
    score, wav, sr, result = best
    sf.write(path, wav, sr)
    result['qa'] = 'pass' if score <= max_cer else 'review'
    path.with_suffix('.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f'[lines] {locale} {entry["key"]}: {result["seconds"]}s cer={result["cer"]} {result["qa"]} (try {result["attempt"]}) on {device}')


def pick(args):
    selection = json.loads(SELECTION.read_text())
    for role_dir in sorted((OUT / 'auditions').iterdir()):
        role_id = role_dir.name
        if role_id == 'developer' or (selection.get(role_id) and selection[role_id].get('by') != 'auto-qa'):
            continue
        scored = []
        for meta_path in sorted(role_dir.glob('take_*.json')):
            meta = json.loads(meta_path.read_text())
            heard = transcribe(meta_path.with_suffix('.wav'), 'en')
            scored.append((cer(meta['text'], heard), meta['take'], heard))
            print(f'[pick] {role_id} take {meta["take"]}: cer={scored[-1][0]:.3f}')
        if not scored:
            continue
        score, take, heard = min(scored)
        selection[role_id] = {'take': take, 'by': 'auto-qa', 'date': date.today().isoformat(),
                              'notes': f'provisional: most intelligible of {len(scored)} takes (CER {score:.3f}); confirm by listening'}
    SELECTION.write_text(json.dumps(selection, indent=2) + '\n')


def run_all(args):
    cast = [r['id'] for r in json.loads(CAST.read_text())['roles']]
    missing = [r for r in cast if not list((OUT / 'auditions' / r).glob('take_*.wav'))]
    if missing:
        design(argparse.Namespace(roles=missing, takes=args.takes, seed=4900, text=None))
    pick(args)
    selection = json.loads(SELECTION.read_text())
    roles = [r for r in cast if selection.get(r)]
    for locale in LOCALE_ORDER:
        lines(argparse.Namespace(roles=roles, locale=locale, limit=0, force=False, max_cer=args.max_cer))
        subprocess.run(['node', str(ROOT / 'scripts/voice/encode-voice-lines.mjs'), '--locale', locale], check=False)
        print(f'[all] {locale} complete')


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
    ln.add_argument('--max-cer', type=float, default=0.35)
    ln.set_defaults(func=lines)
    pk = sub.add_parser('pick')
    pk.set_defaults(func=pick)
    al = sub.add_parser('all')
    al.add_argument('--takes', type=int, default=2)
    al.add_argument('--max-cer', type=float, default=0.35)
    al.set_defaults(func=run_all)
    args = parser.parse_args()
    args.func(args)


if __name__ == '__main__':
    main()
