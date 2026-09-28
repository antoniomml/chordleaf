import os
import subprocess
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import numpy as np
from analyze import analyze, RATE


class OfflineTests(unittest.TestCase):
    def test_python_network_guard_blocks_resolution(self):
        # Separate process: audit hooks cannot be removed in the test runner.
        script = "from offline import require_offline; import socket; require_offline(); socket.getaddrinfo('example.com',443)"
        result = subprocess.run([sys.executable, '-c', script], cwd=Path(__file__).parent,
                                capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Network disabled for local audio inference', result.stderr)

    def test_failed_whisper_preserves_chords(self):
        def fail(*a, **kw):
            raise RuntimeError('model unavailable')
        with patch('analyze.decode', return_value=np.zeros(RATE)), \
             patch.dict(sys.modules, {'faster_whisper': SimpleNamespace(WhisperModel=fail)}), \
             patch.dict(os.environ, {'CHORDLEAF_AUDIO_OFFLINE': '0'}):
            result = analyze('unused', engine='baseline')
        self.assertEqual(result['words'], [])
        self.assertEqual(result['chords'], [{'start': 0, 'end': 1, 'label': 'N'}])
        self.assertEqual(result['warnings'], ['lyrics-failed'])
        self.assertIsNone(result['engines']['lyrics'])

    def test_failed_qwen_preserves_chords(self):
        with patch('analyze.decode', return_value=np.zeros(RATE)), \
             patch('qwen_worker.transcribe', side_effect=RuntimeError('model unavailable')), \
             patch.dict(os.environ, {'CHORDLEAF_AUDIO_OFFLINE': '0'}):
            result = analyze('unused', engine='baseline', lyrics_engine='qwen')
        self.assertEqual(result['words'], [])
        self.assertEqual(result['chords'], [{'start': 0, 'end': 1, 'label': 'N'}])
        self.assertEqual(result['warnings'], ['lyrics-failed'])
        self.assertIsNone(result['engines']['lyrics'])

    def test_whisper_words_are_checked_after_clipping(self):
        words = [SimpleNamespace(word='valid', start=.8, end=1.2),
                 SimpleNamespace(word='past end', start=1.1, end=1.2),
                 SimpleNamespace(word='before start', start=-2, end=-1)]
        model = SimpleNamespace(transcribe=lambda *a, **kw: (
            [SimpleNamespace(words=words)], SimpleNamespace(language='en')))
        with patch('analyze.decode', return_value=np.zeros(RATE)), \
             patch.dict(sys.modules, {'faster_whisper': SimpleNamespace(WhisperModel=lambda *a, **kw: model)}), \
             patch.dict(os.environ, {'CHORDLEAF_AUDIO_OFFLINE': '0'}):
            result = analyze('unused', engine='baseline')
        self.assertEqual(result['words'], [{'start': .8, 'end': 1., 'text': 'valid', 'line': 0}])


if __name__ == '__main__':
    unittest.main()
