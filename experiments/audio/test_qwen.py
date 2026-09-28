import unittest
from types import SimpleNamespace
from qwen_worker import aligned_groups


def item(text, start, end):
    return SimpleNamespace(text=text, start_time=start, end_time=end)


class AlignmentTests(unittest.TestCase):
    def test_zero_spans_preserve_every_token(self):
        words, adjusted = aligned_groups([item('uno', 0, 0), item('dos', 1, 2),
                                         item('tres', 2, 2)], 10, 15, 0)
        self.assertEqual([w['text'] for w in words], ['uno dos tres'])
        self.assertEqual(words[0]['timing'], 'grouped')
        self.assertEqual(adjusted, 2)

    def test_all_invalid_falls_back_to_segment(self):
        words, _ = aligned_groups([item('texto', 0, 0)], 10, 15, 2)
        self.assertEqual(words, [{'start': 10, 'end': 15, 'text': 'texto',
                                 'line': 2, 'timing': 'segment'}])

    def test_overlap_is_clamped_and_marked(self):
        words, adjusted = aligned_groups([item('uno', 0, 2), item('dos', 1, 3)], 0, 4, 0)
        self.assertEqual(words[1]['start'], words[0]['end'])
        self.assertEqual(words[1]['timing'], 'grouped')
        self.assertEqual(adjusted, 1)
