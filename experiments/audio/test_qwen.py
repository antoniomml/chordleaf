import unittest
from unittest.mock import patch
from types import SimpleNamespace
from qwen_worker import aligned_groups, restore_transcript_text, trim_alignment_lead, repetition_start, generate_segments


def item(text, start, end):
    return SimpleNamespace(text=text, start_time=start, end_time=end)


class AlignmentTests(unittest.TestCase):
    def test_loop_retry_does_not_starve_the_rest_of_the_song(self):
        outputs=iter(['oh '*1000,'A real verse.','Another verse.'])
        calls=[]
        def generate(chunk, **options):
            calls.append(options)
            return SimpleNamespace(text=next(outputs),generation_tokens=10,segments=[])
        chunks=SimpleNamespace(split_audio_into_chunks=lambda *args,**kwargs:[([0]*16000,0),([0]*16000,30)])
        with patch.dict('sys.modules',{'mlx_audio.stt.models.qwen3_asr.qwen3_asr':chunks}):
            segments,partial=generate_segments(SimpleNamespace(generate=generate),[0],'English')
        self.assertEqual([s['text'] for s in segments],['A real verse.','Another verse.'])
        self.assertEqual([s['start'] for s in segments],[0,30])
        self.assertFalse(partial)
        self.assertEqual(len(calls),3)
        self.assertEqual(calls[1]['repetition_penalty'],1.15)

    def test_decoder_loop_is_distinguished_from_a_repeated_chorus(self):
        text='A real verse. '+('oh '*1000)
        self.assertEqual(repetition_start(text),len('A real verse. '))
        self.assertIsNone(repetition_start('Porque te vas. '*8))
        self.assertIsNone(repetition_start('oh '*12))
        self.assertEqual(repetition_start('A verse. '+('la vida es bonita '*30)),len('A verse. '))
    def test_intro_cannot_occupy_a_ten_second_first_word_without_warning(self):
        words, _ = aligned_groups([item('In',0.48,12),item('a',12,12.2),
                                   item('little',12.2,12.6)],0,30,0)
        self.assertEqual(trim_alignment_lead(words),1)
        self.assertAlmostEqual(words[0]['start'],11.4)
        self.assertEqual(words[0]['timing'],'grouped')
        self.assertEqual(words[0]['end'],12)

    def test_short_sung_word_and_coarse_segments_are_not_trimmed(self):
        words, _ = aligned_groups([item('Hoy',0,2),item('canto',2,2.5)],0,30,0)
        self.assertEqual(trim_alignment_lead(words),0)
        segment=[{'text':'Hoy canto','start':0,'end':30,'timing':'segment'}]
        self.assertEqual(trim_alignment_lead(segment),0)

    def test_transcript_punctuation_case_and_tokens_survive_alignment(self):
        words, _ = aligned_groups([item('hoy', 0, 1), item('canto', 1, 2),
                                   item('aqui', 2, 3)], 0, 4, 0)
        original_times=[(w['start'],w['end']) for w in words]
        self.assertTrue(restore_transcript_text(words, 'Hoy canto. Aqui!'))
        self.assertEqual([w['text'] for w in words], ['Hoy','canto.','Aqui!'])
        self.assertEqual([(w['start'],w['end']) for w in words], original_times)

    def test_incomplete_alignment_cannot_rewrite_transcript(self):
        words, _ = aligned_groups([item('dos', 0, 1)], 0, 2, 0)
        self.assertFalse(restore_transcript_text(words, 'uno dos'))
        self.assertEqual(words[0]['text'], 'dos')

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
