"""Local research pipeline. stdout is reserved for the JSON result."""
import argparse
import json
import os
import sys

import av
import numpy as np
from scipy.ndimage import median_filter

RATE = 16000
MAX_SECONDS = 600
NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def decode(path):
    """Bound decoded samples as well as uploaded bytes (including compressed files)."""
    pieces, count = [], 0
    resampler = av.AudioResampler(format="fltp", layout="mono", rate=RATE)
    with av.open(path) as container:
        for frame in container.decode(audio=0):
            for mono in resampler.resample(frame):
                samples = mono.to_ndarray().flatten()
                count += len(samples)
                if count > RATE * MAX_SECONDS:
                    raise ValueError("duration")
                pieces.append(samples)
        for mono in resampler.resample(None):
            pieces.append(mono.to_ndarray().flatten())
    audio = np.concatenate(pieces) if pieces else np.array([], dtype=np.float32)
    if not RATE <= len(audio) <= RATE * MAX_SECONDS:
        raise ValueError("duration")
    if not np.isfinite(audio).all():
        raise ValueError("decode")
    return audio.astype(np.float32)


def chords(audio):
    """FFT chroma + major/minor templates. Scores are NOT probabilities."""
    size, hop = 4096, 1600  # 100 ms grid; centered 256 ms analysis windows
    padded = np.pad(audio, (size // 2, size // 2))
    windows = np.lib.stride_tricks.sliding_window_view(padded, size)[::hop]
    spectrum = abs(np.fft.rfft(windows * np.hanning(size), axis=1)) ** 2
    freqs = np.fft.rfftfreq(size, 1 / RATE)
    selected = (freqs >= 65) & (freqs <= 2100)
    pitch = np.rint(69 + 12 * np.log2(freqs[selected] / 440)).astype(int) % 12
    chroma = np.stack([spectrum[:, selected][:, pitch == p].sum(axis=1)
                       for p in range(12)], axis=1)
    chroma = median_filter(chroma, size=(5, 1)) ** 0.5
    chroma /= np.maximum(np.linalg.norm(chroma, axis=1, keepdims=True), 1e-12)
    templates, labels = [], []
    for root, name in enumerate(NOTES):
        for third, suffix in [(4, ""), (3, "m")]:
            template = np.zeros(12)
            template[[(root + step) % 12 for step in (0, third, 7)]] = 1 / np.sqrt(3)
            templates.append(template)
            labels.append(name + suffix)
    scores = chroma @ np.array(templates).T
    # Viterbi discourages frame-to-frame flicker without forcing a key or tempo.
    cost = scores[0].copy()
    back = np.zeros((len(scores), 24), dtype=int)
    transition = np.full((24, 24), -0.15)
    np.fill_diagonal(transition, 0)
    for i in range(1, len(scores)):
        candidates = cost[:, None] + transition
        back[i] = candidates.argmax(axis=0)
        cost = candidates.max(axis=0) + scores[i]
    states = np.zeros(len(scores), dtype=int)
    states[-1] = cost.argmax()
    for i in range(len(scores) - 1, 0, -1):
        states[i - 1] = back[i, states[i]]
    rms = np.sqrt(np.mean(windows ** 2, axis=1))
    silence = max(0.003, float(rms.max()) * 0.025)
    names = [labels[s] if rms[i] > silence and scores[i, s] >= 0.60 else "N"
             for i, s in enumerate(states)]
    result = []
    duration = len(audio) / RATE
    for i, name in enumerate(names):
        start, end = i * hop / RATE, min((i + 1) * hop / RATE, duration)
        if start >= end:
            continue
        if result and result[-1]["label"] == name:
            result[-1]["end"] = end
        else:
            result.append({"start": start, "end": end, "label": name})
    return result


def analyze(path, lyrics=True, language=None, engine="neural", lyrics_engine="whisper"):
    if os.environ.get("CHORDLEAF_AUDIO_OFFLINE") == "1":
        from offline import require_offline
        require_offline()
    audio = decode(path)
    if engine == "neural":
        from neural import recognize
        detected = recognize(audio, RATE, temporary_parent=os.environ.get("CHORDLEAF_AUDIO_TMPDIR"))
        chord_engine = "lv-chordia/1.1.0-submission"
    elif engine == "baseline":
        detected = chords(audio)
        chord_engine = "chroma-triads-v1"
    else:
        raise ValueError("engine")
    result = {"version": 1, "duration": len(audio) / RATE,
              "chords": detected, "words": [],
              "engines": {"chords": chord_engine, "lyrics": None}}
    if lyrics and lyrics_engine == "qwen":
        try:
            from qwen_worker import transcribe
            transcription = transcribe(path, language)
            result.update(words=transcription['words'], transcript=transcription['transcript'],
                          warnings=transcription['warnings'], rawAlignment=transcription['rawAlignment'])
            result['engines']['lyrics'] = transcription['engine']
        except Exception:
            result['warnings'] = ['lyrics-failed']
    elif lyrics and lyrics_engine == "whisper":
        try:
            from faster_whisper import WhisperModel
            model_name = os.environ.get("CHORDLEAF_WHISPER_MODEL", "small")
            model = WhisperModel(model_name, device="cpu", compute_type="int8",
                                 local_files_only=os.environ.get("CHORDLEAF_AUDIO_OFFLINE") == "1")
            segments, info = model.transcribe(
                audio, language=language, word_timestamps=True,
                vad_filter=False, condition_on_previous_text=False, beam_size=5,
            )
            for line, segment in enumerate(segments):
                for word in segment.words or []:
                    start, end = max(0, word.start), min(result["duration"], word.end)
                    if word.word.strip() and end > start:
                        result["words"].append({"start": start,
                                                "end": end,
                                                "text": word.word.strip(), "line": line})
            result["engines"]["lyrics"] = "faster-whisper/" + model_name
            result["language"] = info.language
        except Exception:
            # Chord inference has already succeeded. A missing/corrupt Whisper
            # model or transcription error must not discard those results.
            result["words"] = []
            result["engines"]["lyrics"] = None
            result["warnings"] = ["lyrics-failed"]
    elif lyrics:
        raise ValueError("lyrics_engine")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("file")
    parser.add_argument("--no-lyrics", action="store_true")
    parser.add_argument("--language", choices=["es", "en"])
    parser.add_argument("--engine", choices=["neural", "baseline"], default="neural")
    parser.add_argument("--lyrics-engine", choices=["whisper", "qwen"], default="whisper")
    args = parser.parse_args()
    try:
        print(json.dumps(analyze(args.file, not args.no_lyrics, args.language, args.engine, args.lyrics_engine), allow_nan=False))
    except Exception as error:
        code = "duration" if isinstance(error, ValueError) and str(error) == "duration" else "analysis"
        if isinstance(error, av.error.FFmpegError):
            code = "decode"
        print(json.dumps({"error": code}))
        sys.exit(1)
