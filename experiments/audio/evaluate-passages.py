"""Compare explicit lyric-anchored passages; never infer missing PDF repeats.

Manifest: [{id,start,end,chords,shift?,split}]. Each ENGINE_DIR/id-engines.json
contains engines.{name}.chords; optional ChordMini LAB files under chordmini/.
Bounds must be chosen independently of predicted chord labels. Scores describe
untimed arrangement agreement; they do not measure temporal audio accuracy.
"""
import argparse
import json
from pathlib import Path
from compare import align


def smooth_bridges(events, threshold):
    """Experimental A-X-A filter; never adopted on the basis of training scores."""
    result = [dict(e) for e in events]
    i = 1
    while i < len(result) - 1:
        a, b, c = result[i-1:i+2]
        if a['label'] == c['label'] != 'N' and b['end'] - b['start'] < threshold:
            a['end'] = c['end']
            del result[i:i+2]
            i = max(1, i-1)
        else:
            i += 1
    return result


def evaluate(manifest, directory):
    output = []
    for item in manifest:
        data = json.loads((directory / (item['id'] + '-engines.json')).read_text())
        engines = {k: v['chords'] for k, v in data['engines'].items()}
        for name in ['BTC', 'ChordNet']:
            path = directory / 'chordmini' / name / (item['id'] + '.lab')
            if path.exists():
                engines[name] = [{'start': float(a), 'end': float(b), 'label': c}
                                 for a, b, c in (line.split() for line in path.read_text().splitlines())]
        for threshold in [.2, .4]:
            engines[f'neural-bridge-{threshold}'] = smooth_bridges(engines['neural'], threshold)
        result = {**item, 'engines': {}}
        for name, events in engines.items():
            # Include intervals overlapping the independently chosen lyric window.
            labels = [e['label'] for e in events if e['end'] > item['start'] and e['start'] < item['end']]
            result['engines'][name] = align(labels, item['chords'], shift=item.get('shift'), free_ends=False)
        output.append(result)
    return {'warning': 'Untimed exploratory PDF agreement, not chord accuracy. Window edges use imperfect ASR anchors; shifts may be estimated on the same passages.', 'results': output}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('directory', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    args.output.write_text(json.dumps(evaluate(json.loads(args.manifest.read_text()), args.directory), ensure_ascii=False, indent=2))
