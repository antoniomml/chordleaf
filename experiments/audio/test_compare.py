import unittest
from compare import align, parse_chord
from neural import display_label


class ComparisonTests(unittest.TestCase):
    def test_transposition_preserves_quality_and_bass(self):
        result = align(['F#', 'C#/F', 'Ebm7'], ['G', 'D/F#', 'Em7'], free_ends=False)
        self.assertEqual(result['shift'], -1)
        self.assertEqual(result['counts']['exact'], 3)

    def test_extensions_cannot_pass_as_exact_triads(self):
        result = align(['C', 'Dm', 'G'], ['Cmaj7', 'Dm7', 'G7'], shift=0, free_ends=False)
        self.assertEqual(result['counts']['root'], 3)
        self.assertEqual(result['counts']['quality'], 0)

    def test_missing_reference_change_counts_as_failure(self):
        result = align(['C', 'G7'], ['C', 'Am', 'G7'], shift=0, free_ends=False)
        self.assertEqual(result['alignmentLength'], 3)
        self.assertEqual(result['counts']['exact'], 2)

    def test_free_passage_keeps_prefix_and_suffix_out(self):
        result = align(['Dm7', 'G7'], ['Am', 'C', 'Dm7', 'G7', 'Cmaj7'], shift=0)
        self.assertEqual(result['counts']['exact'], 2)
        self.assertEqual(result['referenceStart'], 2)

    def test_pdf_alteration_notation(self):
        self.assertEqual(parse_chord('Dm7-5'), parse_chord('Dm7b5'))
        self.assertEqual(parse_chord('D#M11'), parse_chord('Ebmaj11'))
        self.assertEqual(parse_chord('Bb7-9'), parse_chord('Bb7b9'))
        self.assertEqual(parse_chord('Ab9+11'), parse_chord('Ab9#11'))
        self.assertEqual(parse_chord('Bm7/5-'), parse_chord('Bm7b5'))
        self.assertEqual(parse_chord('E5+'), parse_chord('Eaug'))
        self.assertEqual(parse_chord('Gaug7'), parse_chord('G7#5'))

    def test_harte_labels_keep_sevenths_and_degree_bass(self):
        examples={'D:hdim7':'Dm7b5','C#:min7':'C#m7','C#:maj/3':'C#/F',
                  'Bb:maj/3':'Bb/D','C:min/b7':'Cm/Bb','C:sus4(b7)':'C7sus4',
                  'Eb:maj7':'Ebmaj7','C:13':'C13','C:min9':'Cm9','N':'N'}
        for raw, expected in examples.items(): self.assertEqual(display_label(raw), expected)
        with self.assertRaises(ValueError): display_label('C:unrecognized')

    def test_external_model_notation_is_equivalent(self):
        result = align(['A#:min7', 'D#:7', 'G#:hdim7', 'F#:maj6'],
                       ['Bbm7', 'Eb7', 'Abm7b5', 'Gb6'], shift=0, free_ends=False)
        self.assertEqual(result['counts']['exact'], 4)
        with self.assertRaises(ValueError): parse_chord('C:unknown')

if __name__ == '__main__':
    unittest.main()
