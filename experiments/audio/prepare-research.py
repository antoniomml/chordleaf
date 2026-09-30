"""Explicit download phase for reproducible local research; never uploads audio.

Run from the repository root. Dataset/model artifacts remain git-ignored.
Jam-ALT recordings are evaluation-only; retain each track's license metadata.
"""
import argparse
import hashlib
import json
from pathlib import Path
import urllib.request
from huggingface_hub import hf_hub_download, snapshot_download

JAM_REPO = 'jamendolyrics/jam-alt'
JAM_REV = '28302224954ef050fe752d1628dd9bac4fc8c02b'
MODELS = {
    'mlx-community/parakeet-tdt-0.6b-v3': 'ed2b7e8c15f9aaa0b5772e2efb986255eaef7e15',
    'mlx-community/Qwen3-ASR-0.6B-8bit': '89e96d92ba34aca20b3e29fb10cc284097d1219f',
    'mlx-community/Qwen3-ASR-1.7B-8bit': 'a8379a2e2f9e313c9292cdf1af4055ab56d50d55',
}


def jam(root):
    meta = hf_hub_download(JAM_REPO, 'metadata.jsonl', repo_type='dataset', revision=JAM_REV)
    rows = [json.loads(line) for line in Path(meta).read_text().splitlines()]
    manifest = []
    for language in ['en', 'es']:
        selected = sorted([r for r in rows if r['language'] == language],
                          key=lambda r: hashlib.sha256(r['name'].encode()).hexdigest())[:6]
        for index, row in enumerate(selected):
            audio = hf_hub_download(JAM_REPO, row['file_name'], repo_type='dataset', revision=JAM_REV)
            lines = [line for line in row['lines'] if line['text'].strip() and line['end'] > line['start']]
            start = max(0, lines[0]['start'] - .3)
            chosen = []
            for line in lines:
                if line['end'] - start > 45: break
                chosen.append(line)
            if not chosen: raise ValueError('No suitable first passage')
            manifest.append({'id': row['name'], 'audio': audio, 'language': language,
                             'start': start, 'end': chosen[-1]['end'] + .3,
                             'reference': ' '.join(line['text'].strip() for line in chosen),
                             'split': 'development' if index < 3 else 'test',
                             'source': JAM_REPO, 'revision': JAM_REV, 'license': row['license_type'],
                             'audioSha256': hashlib.sha256(Path(audio).read_bytes()).hexdigest()})
    (root / 'jam-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    (root / 'jam-source.json').write_text(json.dumps({'repo': JAM_REPO, 'revision': JAM_REV}, indent=2))


def guitarset(root):
    with urllib.request.urlopen('https://zenodo.org/api/records/3371780') as response:
        record = json.load(response)
    (root / 'record.json').write_text(json.dumps(record, indent=2))
    for item in record['files']:
        if item['key'] not in ['annotation.zip', 'audio_mono-mic.zip']: continue
        target = root / item['key']
        expected = item['checksum'].split(':')[1]
        if target.exists() and hashlib.md5(target.read_bytes()).hexdigest() == expected: continue
        temporary = target.with_suffix('.part')
        urllib.request.urlretrieve(item['links']['self'], temporary)
        if hashlib.md5(temporary.read_bytes()).hexdigest() != expected:
            raise ValueError('Dataset checksum mismatch')
        temporary.replace(target)


def models(root):
    rows = []
    for model, revision in MODELS.items():
        path = snapshot_download(model, revision=revision,
                                 allow_patterns=['*.json', '*.safetensors', '*.txt', '*.model'])
        rows.append({'id': model, 'revision': revision, 'path': path})
    (root / 'models.json').write_text(json.dumps(rows, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('kind', choices=['jam', 'guitarset', 'models'])
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    {'jam': jam, 'guitarset': guitarset, 'models': models}[args.kind](args.output)
