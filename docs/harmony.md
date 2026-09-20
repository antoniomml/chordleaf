# Chord identification

[← User guide](guide.md)

The identifier works from notes, independently of the chord-position catalog. It returns every matching interpretation in its formula vocabulary, ranked for usability. It cannot determine a unique harmonic function without musical context or enumerate every theoretical naming system.

## Pitch and bass

Standard tuning uses MIDI pitches `[40, 45, 50, 55, 59, 64]` (E2 A2 D3 G3 B3 E4). A fretted string adds its fret number; `-1` removes the string. Pitch classes are deduplicated for matching, while the model retains individual notes and octaves internally. The bass is the minimum sounding MIDI pitch, which is not necessarily on the lowest-numbered string when notes cross in register.

The interface names shapes relative to the capo and indicates the active capo. The model also accepts a capo offset for callers that need concert-pitch identification.

## Formulas and spelling

The vocabulary includes major/minor/diminished/augmented triads, power chords, sus2/sus4, sixths, 6/9, added tones, major/dominant/minor/minor-major sevenths, half-diminished and diminished sevenths, ninths, elevenths, thirteenths, suspended sevenths/ninths, altered dominant/minor sevenths and selected Lydian major extensions.

Alterations include b5, #5, b9, #9, #11 and b13 in compatible combinations. Every observed pitch must belong to the formula. Roots and perfect fifths are the only optional tones in incomplete matches; missing roots require opt-in and at least three distinct pitches. Missing thirds, sevenths or defining altered extensions are never silently assumed. Thirteenth voicings without the eleventh are represented explicitly; `7add13` distinguishes a shape without the ninth.

Notes are spelled by their diatonic degrees relative to the selected root, so C diminished seventh contains Bbb, not a theoretically misleading A. The model accepts a flats preference for callers; the simplified interface uses the default spelling. Equivalent root spellings are not duplicated in the result list. If a slash bass needs a double accidental, the symbol uses a single-accidental enharmonic equivalent while the detailed notes retain theoretical spelling.

Chord-symbol conventions follow the distinction between added tones and extensions described in [Open Music Theory: Chord Symbols](https://viva.pressbooks.pub/openmusictheory/chapter/chord-symbols/). Inversion naming follows the actual bass pitch; see [Open Music Theory: Inversion](https://viva.pressbooks.pub/openmusictheory/chapter/inversion/). The treatment of extension voicings is informed by [Altered and Extended Chords](https://viva.pressbooks.pub/openmusictheory/chapter/altered-and-extended-dominant-chords/).

## Ambiguity and ordering

Exact pitch-class matches appear before incomplete matches. Within each group, root-position readings precede inversions, then shorter symbols precede more complex ones. This is a display heuristic, not a probability estimate or key inference. Symmetric diminished and augmented chords retain their alternative roots. C–E–G–A supports both C6 and Am7/C; the surrounding music decides which is useful.

An incomplete result explicitly carries `(no5)`, `(no1)` or both in its symbol. These annotations survive parsing, transposition, insertion and export. A single distinct note produces no chord claim. Unmatched clusters produce an explanatory empty state, not an invented name. This version does not enumerate arbitrary polychords, non-chord pedal basses, quartal naming systems, alternate tunings or every enharmonic interpretation.

## Applying a result

Insertion and replacement retain the chosen six-string shape. Replacement compares normalized bracket tokens and preserves lyrics, section labels and longer chord names. The user can replace all matching occurrences or one occurrence, identified by its line. The chosen shape is stored per symbol, so existing occurrences of that same symbol share it. Sheet references follow replacements of all occurrences. An immediate undo restores the previous song data.
