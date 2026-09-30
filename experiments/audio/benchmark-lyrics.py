"""Compare cached Whisper models on explicit local, manually reviewed passages.

Manifest: [{id,audio,start,end,language,reference}]. Lyrics remain in local output.
Usage: python benchmark-lyrics.py manifest.json output.json --models small medium
No model download: prepare weights explicitly before running this benchmark.
"""
import argparse
import json
from pathlib import Path
import re
import time
from analyze import decode, RATE
from offline import require_offline


def words(text):
    return re.findall(r'\w+', text.lower().replace("i'm", 'i am'))


def edit_distance(reference, prediction):
    previous = list(range(len(prediction) + 1))
    for i, a in enumerate(reference, 1):
        current = [i]
        for j, b in enumerate(prediction, 1):
            current.append(min(current[-1] + 1, previous[j] + 1, previous[j-1] + (a != b)))
        previous = current
    return previous[-1]


def run(manifest, models, output):
    require_offline()
    from faster_whisper import WhisperModel
    results = []
    for name in models:
        model = WhisperModel(name, device='cpu', compute_type='int8', cpu_threads=4, local_files_only=True)
        for item in manifest:
            audio = decode(item['audio'])
            if not 0 <= item['start'] < item['end'] <= len(audio) / RATE:
                raise ValueError('Invalid passage bounds')
            audio = audio[round(item['start'] * RATE):round(item['end'] * RATE)]
            started = time.perf_counter()
            segments, _ = model.transcribe(audio, language=item['language'], word_timestamps=True,
                                           vad_filter=False, condition_on_previous_text=False, beam_size=5)
            prediction = ' '.join(s.text.strip() for s in segments)
            results.append({**item, 'model': name, 'prediction': prediction,
                            'wordEdits': edit_distance(words(item['reference']), words(prediction)),
                            'referenceWords': len(words(item['reference'])),
                            'seconds': time.perf_counter() - started, 'networkBlocked': True})
            output.write_text(json.dumps(results, ensure_ascii=False, indent=2))
            print(item['id'], name, results[-1]['wordEdits'], flush=True)
        del model


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--models', nargs='+', default=['small', 'medium'])
    args = parser.parse_args()
    run(json.loads(args.manifest.read_text()), args.models, args.output)
