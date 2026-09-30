"""Shared UI/worker language names for the two installed lyric engines."""
import json
from pathlib import Path
config = Path(__file__).with_name('audio-languages.json')
if not config.is_file():
    config = Path(__file__).resolve().parents[2] / 'src' / 'audio-languages.json'
LANGUAGES = json.loads(config.read_text())
