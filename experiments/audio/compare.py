"""Exploratory sequence comparison against untimed, potentially transposed sheets.

This is NOT time-weighted chord accuracy: it finds a best matching contiguous
reference passage and shift. Alignment and shift are estimated on this sample.
"""
import re
import numpy as np

PITCH = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def parse_chord(label):
    # Guitar sheets sometimes use /5- as a diminished fifth, not a slash bass.
    label = re.sub(r'm7/5-$', 'm7b5', label)
    match = re.fullmatch(r"([A-G])([#b]?)([^/]*)(?:/([A-G])([#b]?))?", label)
    if not match:
        raise ValueError(f"Unsupported reference chord: {label}")
    note, accidental, quality, bass, bass_acc = match.groups()
    if quality.startswith(':'):
        harte = {'maj': '', 'min': 'm', 'maj7': 'maj7', 'min7': 'm7',
                 '7': '7', 'dim': 'dim', 'dim7': 'dim7', 'hdim7': 'm7b5',
                 'aug': 'aug', 'minmaj7': 'mmaj7', 'maj6': '6', 'min6': 'm6',
                 'sus2': 'sus2', 'sus4': 'sus4'}
        if quality[1:] not in harte:
            raise ValueError(f'Unsupported Harte quality: {label}')
        quality = harte[quality[1:]]
    pitch = (PITCH[note] + (1 if accidental == "#" else -1 if accidental == "b" else 0)) % 12
    quality = re.sub(r"([+-])(5|9|11|13)", lambda m: ("#" if m[1] == "+" else "b") + m[2], quality)
    quality = re.sub(r"^M(?=\d)", "maj", quality)
    quality = {"5+": "aug", "aug7": "7#5"}.get(quality, quality)
    family = ("dim" if quality.startswith("dim") or quality.startswith("m7b5") else
              "aug" if quality.startswith("aug") or quality == "7#5" else
              "sus" if "sus" in quality else
              "minor" if quality.startswith("m") and not quality.startswith("maj") else "major")
    bass_pitch = pitch if not bass else (PITCH[bass] + (1 if bass_acc == "#" else -1 if bass_acc == "b" else 0)) % 12
    return pitch, family, quality, bass_pitch


def same(a, b, shift, level):
    root = a[0] == (b[0] + shift) % 12
    if level == "root":
        return root
    if level == "family":
        return root and a[1] == b[1]
    if level == "quality":
        return root and a[2] == b[2]
    return root and a[2] == b[2] and a[3] == (b[3] + shift) % 12


def collapse(labels):
    result = []
    for label in labels:
        if label == "N":
            continue
        if not result or parse_chord(label) != parse_chord(result[-1]):
            result.append(label)
    return result


def align(predicted, reference, shift=None, free_ends=True):
    """Semi-global edit alignment: all predictions vs a contiguous PDF passage.

    Root mismatch costs 1, family/detail mismatches add 0.2/0.1; insertion and
    deletion cost 1. One shift for the whole passage. All candidates retained
    for audit. Rates count gaps as failures and are descriptive only.
    """
    predicted, reference = collapse(predicted), collapse(reference)
    if not predicted or not reference:
        raise ValueError("Comparison needs nonempty chord sequences")
    p, r = list(map(parse_chord, predicted)), list(map(parse_chord, reference))
    n, m = len(p), len(r)
    candidates = []
    for shift in range(12) if shift is None else [shift % 12]:
        cost = np.zeros((n + 1, m + 1))
        cost[:, 0] = np.arange(n + 1)
        if not free_ends:
            cost[0, :] = np.arange(m + 1)
        trace = np.zeros((n + 1, m + 1), dtype=np.int8)
        for i in range(1, n + 1):
            for j in range(1, m + 1):
                penalty = (not same(p[i-1], r[j-1], shift, "root")) + 0.2 * (p[i-1][1] != r[j-1][1]) + 0.1 * (p[i-1][2] != r[j-1][2])
                choices = [cost[i-1, j-1] + penalty, cost[i-1, j] + 1, cost[i, j-1] + 1]
                trace[i, j] = np.argmin(choices)
                cost[i, j] = min(choices)
        j = int(np.argmin(cost[n])) if free_ends else m
        end, i, rows = j, n, []
        total = float(cost[n, j])
        while i or (j and not free_ends):
            operation = int(trace[i, j]) if i and j else (1 if i else 2)
            if operation == 0:
                rows.append({"predicted": predicted[i-1], "reference": reference[j-1], "referenceIndex": j-1,
                             **{level: same(p[i-1], r[j-1], shift, level) for level in ["root", "family", "quality", "exact"]}})
                i -= 1; j -= 1
            elif operation == 1:
                rows.append({"predicted": predicted[i-1], "reference": None}); i -= 1
            else:
                rows.append({"predicted": None, "reference": reference[j-1], "referenceIndex": j-1}); j -= 1
        rows.reverse()
        candidates.append({"shift": shift if shift <= 6 else shift - 12, "cost": total,
                           "referenceStart": j, "referenceEnd": end, "pairs": rows,
                           "counts": {level: sum(bool(row.get(level)) for row in rows) for level in ["root", "family", "quality", "exact"]},
                           "alignmentLength": len(rows)})
    best = min(candidates, key=lambda row: row["cost"])
    return {**best, "shiftCosts": [{"shift": c["shift"], "cost": c["cost"]} for c in candidates],
            "predictedChanges": n, "referenceChanges": m,
            "method": "untimed best-passage alignment; not audio accuracy"}
