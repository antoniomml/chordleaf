"""Offline, model-agnostic song-passage benchmark (Whisper, Parakeet, Qwen).

All models consume identical local mono 16 kHz PCM, without reference hints.
Manifest: [{id,audio,start,end,reference,language,split}]. Model JSON maps an
engine name to a cached local path. No downloads or remote inference occur.
"""
import argparse
import dataclasses
import hashlib
import json
from pathlib import Path
import re
import sys
import time
import unicodedata
import wave
from analyze import decode, RATE
from offline import require_offline


def normalize(text):
    return re.findall(r'\w+', unicodedata.normalize('NFKC', text).lower().replace("i'm", 'i am').replace('i’m', 'i am'))


def distance(a, b):
    previous = list(range(len(b)+1))
    for i, x in enumerate(a, 1):
        current = [i]
        for j, y in enumerate(b, 1):
            current.append(min(current[-1]+1, previous[j]+1, previous[j-1]+(x != y)))
        previous = current
    return previous[-1]


def run(manifest, engine, model_path, output):
    require_offline()
    output.mkdir(parents=True, exist_ok=True)
    started = time.perf_counter()
    if engine == 'parakeet':
        from parakeet_mlx import from_pretrained
        model = from_pretrained(str(model_path))
    elif engine.startswith('qwen'):
        from mlx_audio.stt.utils import load
        model = load(Path(model_path), strict=True)
    else:
        from faster_whisper import WhisperModel
        model = WhisperModel(str(model_path), device='cpu', compute_type='int8', cpu_threads=4, local_files_only=True)
    load_seconds = time.perf_counter() - started
    rows = []
    for item in manifest:
        audio = decode(item['audio'])
        assert 0 <= item['start'] < item['end'] <= len(audio)/RATE
        audio = audio[round(item['start']*RATE):round(item['end']*RATE)]
        pcm = output / 'input.wav'
        with wave.open(str(pcm), 'wb') as stream:
            stream.setnchannels(1); stream.setsampwidth(2); stream.setframerate(RATE)
            stream.writeframes((audio.clip(-1,1)*32767).astype('<i2').tobytes())
        # Quantize the same way for every backend, including Whisper.
        started = time.perf_counter()
        record = {**item, 'engine': engine, 'modelPath': str(model_path), 'modelLoadSeconds': load_seconds,
                  'pcmSha256': hashlib.sha256(pcm.read_bytes()).hexdigest(), 'networkBlocked': True}
        try:
            if engine == 'parakeet':
                result = model.transcribe(str(pcm))
                prediction = result.text
                record['alignment'] = dataclasses.asdict(result)
            elif engine.startswith('qwen'):
                result = model.generate(str(pcm), max_tokens=512, temperature=0, language=None)
                prediction = result.text
                record['segments'] = result.segments
            else:
                segments, info = model.transcribe(str(pcm), language=None, word_timestamps=True,
                                                   vad_filter=False, condition_on_previous_text=False, beam_size=5)
                segments = list(segments)
                prediction = ' '.join(s.text.strip() for s in segments)
                record['segments'] = [{'start': s.start, 'end': s.end, 'text': s.text} for s in segments]
            record.update(prediction=prediction, edits=distance(normalize(item['reference']), normalize(prediction)),
                          referenceWords=len(normalize(item['reference'])))
        except Exception as error:
            record['error'] = str(error)
        record['seconds'] = time.perf_counter() - started
        rows.append(record)
        (output / 'results.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2, default=float))
        print(item['id'], engine, record.get('edits'), round(record['seconds'],2), record.get('error',''), flush=True)
    pcm.unlink(missing_ok=True)


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest',type=Path); parser.add_argument('engine'); parser.add_argument('model',type=Path); parser.add_argument('output',type=Path)
    args=parser.parse_args();run(json.loads(args.manifest.read_text()),args.engine,args.model,args.output)
