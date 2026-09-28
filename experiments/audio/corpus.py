"""Inventory and run local full-song inference without treating PDFs as timed truth.

python corpus.py AUDIO_DIR PDF_INVENTORY OUTPUT [--limit 20]
PDF inventory is [{name,path,pages,text}]. Generated data stays in OUTPUT.
Internet sockets are blocked during decoding/inference, including model loading.
"""
import argparse
from collections import Counter
import hashlib
import importlib.metadata
import json
from pathlib import Path
import re
import platform
import time
import unicodedata

from analyze import decode
from neural import recognize
from offline import require_offline


def normalized(name):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', name.lower()).encode('ascii', 'ignore').decode())


def inventory(audio_dir, pdfs):
    lookup = {}
    for pdf in pdfs:
        lookup.setdefault(normalized(Path(pdf['name']).stem), []).append(pdf)
    rows = []
    for path in sorted(audio_dir.iterdir()):
        if path.suffix.lower() not in ('.mp3', '.m4a', '.wav', '.flac', '.ogg'):
            continue
        matches = lookup.get(normalized(path.stem), [])
        pdf = matches[0] if len(matches) == 1 else None
        # Eligibility is deliberately conservative: text presence is NOT approval
        # of completeness, arrangement identity, chord order or repeat expansion.
        status = ('ambiguous-name' if len(matches) > 1 else 'no-pdf' if not pdf else
                  'needs-ocr' if not pdf['text'].strip() else 'needs-manual-review')
        rows.append({'id': hashlib.sha256(path.name.encode()).hexdigest()[:12],
                     'name': path.stem, 'audio': str(path.resolve()),
                     'pdf': pdf['path'] if pdf else None, 'referenceStatus': status})
    return rows


def run(rows, output, limit):
    require_offline()
    reports = []
    for row in rows[:limit] if limit else rows:
        target = output / (row['id'] + '.json')
        sha = hashlib.sha256(Path(row['audio']).read_bytes()).hexdigest()
        if target.exists():
            cached = json.loads(target.read_text())
            if cached.get('audioSha256') == sha and cached.get('engine') == 'lv-chordia/1.1.0-submission' and 'error' not in cached:
                reports.append(cached)
                continue
        started = time.perf_counter()
        report = {**row, 'audioSha256': sha, 'engine': 'lv-chordia/1.1.0-submission', 'networkBlocked': True}
        try:
            audio = decode(row['audio'])
            events = recognize(audio)
            duration = len(audio) / 16000
            assert events and all(0 <= e['start'] < e['end'] <= duration for e in events)
            assert all(a['end'] <= b['start'] + .001 for a, b in zip(events, events[1:]))
            report.update(duration=duration, chords=events,
                          uniqueLabels=sorted({e['label'] for e in events if e['label'] != 'N'}),
                          unknownSeconds=sum(e['end'] - e['start'] for e in events if e['label'] == 'N'))
        except Exception as error:
            report['error'] = str(error)
        report['seconds'] = round(time.perf_counter() - started, 3)
        target.write_text(json.dumps(report, ensure_ascii=False, indent=2))
        reports.append(report)
        print(row['name'], report.get('duration'), report['seconds'], report.get('error', 'OK'), flush=True)
    summary = {'warning': 'Full-song inference smoke test, not accuracy. PDFs require manual passage/arrangement review before scoring.',
               'runtime': {'platform': platform.platform(), 'machine': platform.machine(),
                           'packages': {name: importlib.metadata.version(name) for name in
                                        ['lv-chordia', 'torch', 'librosa', 'numpy', 'scipy']}},
               'inventoryCounts': dict(Counter(r['referenceStatus'] for r in rows)),
               'processed': len(reports), 'successful': sum('error' not in r for r in reports),
               'audioSeconds': sum(r.get('duration', 0) for r in reports),
               'inferenceSeconds': sum(r['seconds'] for r in reports),
               'results': [{k: v for k, v in r.items() if k != 'chords'} for r in reports]}
    (output / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('audio_dir', type=Path)
    parser.add_argument('pdf_inventory', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--limit', type=int, default=0)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    rows = inventory(args.audio_dir, json.loads(args.pdf_inventory.read_text()))
    (args.output / 'inventory.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2))
    run(rows, args.output, args.limit)
