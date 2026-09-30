"""Adapter for the pretrained ISMIR 2019 ensemble packaged by lv-chordia.

No checkpoint training or heuristic extension invention. Raw labels are retained.
"""
from contextlib import redirect_stdout
from pathlib import Path
import sys
import tempfile
import wave

import numpy as np
from scipy.signal import resample_poly

NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
PITCH = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
SUFFIXES = {
    "maj": "", "min": "m", "maj7": "maj7", "min7": "m7", "7": "7",
    "maj9": "maj9", "min9": "m9", "9": "9", "11": "11", "13": "13",
    "sus2": "sus2", "sus4": "sus4", "sus4(b7)": "7sus4",
    "dim": "dim", "dim7": "dim7", "hdim7": "m7b5", "aug": "aug",
}
DEGREES = {"1": 0, "b2": 1, "2": 2, "b3": 3, "3": 4, "4": 5,
           "b5": 6, "5": 7, "#5": 8, "b6": 8, "6": 9, "bb7": 9,
           "b7": 10, "7": 11}


def display_label(raw):
    if raw == "N":
        return "N"
    root, quality = raw.split(":", 1)
    quality, slash, bass = quality.partition("/")
    if quality not in SUFFIXES:
        raise ValueError(f"Unsupported chord quality: {raw}")
    label = root + SUFFIXES[quality]
    if slash:
        pitch = (PITCH[root[0]] + root.count("#") - root.count("b")) % 12
        label += "/" + NOTES[(pitch + DEGREES[bass]) % 12]
    return label


def recognize(audio, sample_rate=16000, temporary_parent=None):
    # All dependencies and checkpoint loading stay opt-in and outside the frontend.
    with redirect_stdout(sys.stderr):
        import torch
        from lv_chordia.chord_recognition import chord_recognition, MODEL_NAMES
        from lv_chordia.mir.common import CACHE_DATA_PATH
        # Upstream can silently keep random weights if a checkpoint is missing.
        # Refuse that path so output always comes from the pretrained ensemble.
        for name in MODEL_NAMES:
            if not (Path(CACHE_DATA_PATH) / (name + ".sdict")).is_file():
                raise RuntimeError("A pretrained chord checkpoint is missing")
        torch.set_num_threads(min(4, torch.get_num_threads()))
        if sample_rate != 22050:
            import math
            divisor = math.gcd(sample_rate, 22050)
            pcm = resample_poly(audio, 22050 // divisor, sample_rate // divisor)
        else:
            pcm = audio
        # PCM avoids codec discrepancies in the upstream soundfile loader.
        with tempfile.TemporaryDirectory(prefix="chordleaf-neural-", dir=temporary_parent) as directory:
            path = Path(directory) / "analysis.wav"
            with wave.open(str(path), "wb") as stream:
                stream.setnchannels(1)
                stream.setsampwidth(2)
                stream.setframerate(22050)
                stream.writeframes((np.clip(pcm, -1, 1) * 32767).astype("<i2").tobytes())
            predictions = chord_recognition(str(path), chord_dict_name="submission")
    duration = len(audio) / sample_rate
    result = []
    for item in predictions:
        start, end = max(0, item["start_time"]), min(duration, item["end_time"])
        if end <= start:
            continue
        result.append({"start": start, "end": end, "label": display_label(item["chord"]), "rawLabel": item["chord"]})
    if result and result[-1]["end"] < duration:
        # Upstream rounds to a frame; preserve full coverage with an unknown tail.
        result.append({"start": result[-1]["end"], "end": duration, "label": "N", "rawLabel": "N"})
    return result
