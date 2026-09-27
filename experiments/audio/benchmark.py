"""Run both chord engines against an explicit local manifest; never downloads audio.

Usage: python experiments/audio/benchmark.py manifest.json output-directory
Manifest = [{id, audio, pdf, chords: [...], shift: optional int,
             freeEnds: optional bool, note: provenance / excerpt caveats}]
PDF references must be visually verified before treating them as benchmark data.
"""
import argparse
import hashlib
import importlib.metadata
import json
from pathlib import Path
import platform
import time

from analyze import decode, chords
from compare import align
from neural import recognize


def run(manifest, output):
    output.mkdir(parents=True, exist_ok=True)
    results = []
    for item in manifest:
        path = Path(item['audio']).resolve()
        audio = decode(str(path))
        result = {"id": item['id'], "pdf": item['pdf'], "note": item.get('note'),
                  "audioSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                  "duration": len(audio) / 16000, "reference": item['chords'], "engines": {}}
        for engine, function in [("baseline", chords), ("neural", recognize)]:
            started = time.perf_counter()
            events = function(audio)
            seconds = time.perf_counter() - started
            comparison = align([c['label'] for c in events], item['chords'],
                               shift=item.get('shift'), free_ends=item.get('freeEnds', True))
            result['engines'][engine] = {"seconds": seconds, "chords": events, "comparison": comparison}
            print(item['id'], engine, round(seconds, 2), comparison['counts'], flush=True)
        (output / (item['id'] + '.json')).write_text(json.dumps(result, ensure_ascii=False, indent=2))
        results.append(result)
    report = {"schema": 1, "hardware": platform.platform(), "processor": platform.machine(),
              "packages": {name: importlib.metadata.version(name) for name in ['lv-chordia','torch','librosa','numpy','scipy']},
              "warning": "Untimed exploratory agreement with user arrangements, not time-weighted audio accuracy. Transposition/passage selection may be estimated on these same excerpts. No training or holdout evaluation.",
              "results": results}
    (output / 'benchmark.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    run(json.loads(args.manifest.read_text()), args.output)
