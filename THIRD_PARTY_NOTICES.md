# Third-party notices

## Guitar positions

`src/data/guitar.json` and `src/data/barres.json` derive from [`tombatossals/chords-db`](https://github.com/tombatossals/chords-db), file `lib/guitar.json`, downloaded September 20, 2026. Copyright © 2016 David Rubert. Its MIT license is reproduced in full in [`src/data/LICENSE.chords-db`](src/data/LICENSE.chords-db).

The transformation retains the frets of all positions, converting them to absolute fret numbers and normalizing roots and basses by pitch class. Barre annotations are retained by absolute fret pattern in `src/data/barres.json`; finger numbers are not included. The update script is `scripts/import-chords.mjs`. Positions are processed locally; normal use does not query a service.

The web distribution also includes the catalog license at `public/licenses/chords-db.txt`, linked from the chord browser.

## Document font

Google Sans Code uses the SIL Open Font License included in [`public/fonts/OFL-GoogleSansCode.txt`](public/fonts/OFL-GoogleSansCode.txt).

## Dependencies

Exact versions appear in `pnpm-lock.yaml`. Each package retains its own license. This document does not replace those licenses or grant a license to chordi's original application code.
