import unittest
import numpy as np
from analyze import chords, RATE


class ChordTests(unittest.TestCase):
    def test_silence(self):
        self.assertEqual(chords(np.zeros(RATE * 3)), [{"start": 0, "end": 3, "label": "N"}])

    def test_synthetic_progression(self):
        signals = []
        for notes in [(60, 64, 67), (57, 60, 64), (53, 57, 60), (55, 59, 62)]:
            t = np.arange(RATE * 3) / RATE
            signals.append(sum(np.sin(2 * np.pi * 440 * 2 ** ((n - 69) / 12) * t) for n in notes) * 0.2)
        detected = chords(np.concatenate(signals))
        for time, expected in [(1.5, "C"), (4.5, "Am"), (7.5, "F"), (10.5, "G")]:
            self.assertEqual(next(c["label"] for c in detected if c["start"] <= time < c["end"]), expected)
        self.assertEqual(detected[-1]["end"], 12)

if __name__ == "__main__":
    unittest.main()
