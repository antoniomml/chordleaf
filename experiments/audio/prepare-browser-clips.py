"""Prepare three private held-on-device vocal passages for browser comparisons."""
import json
from pathlib import Path
from analyze import decode

import argparse
parser=argparse.ArgumentParser()
parser.add_argument("audio_directory", type=Path)
ROOT=parser.parse_args().audio_directory
DEST = Path('artifacts/browser-audio')
clips = [('guantanamera', 'Guantanamera - Guitarricadelafuente.mp3', 30, 'es'),
         ('more', 'More Than Words.mp3', 30, 'en'),
         ('porque', 'Por qué te vas.mp3', 30, 'es')]
result = []
for name, file, start, language in clips:
    audio = decode(ROOT / file)[start*16000:(start+25)*16000]
    target = name+'.f32'
    (DEST/target).write_bytes(audio.astype('<f4').tobytes())
    result.append({'name':name,'file':target,'language':language,'offset':start,'duration':len(audio)/16000})
(DEST/'clips.json').write_text(json.dumps(result,indent=2))
