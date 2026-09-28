# Third-party notices

## Guitar positions

`src/data/guitar.json` and `src/data/barres.json` derive from [`tombatossals/chords-db`](https://github.com/tombatossals/chords-db), file `lib/guitar.json`, downloaded September 20, 2026. Copyright © 2016 David Rubert. Its MIT license is reproduced in full in [`src/data/LICENSE.chords-db`](src/data/LICENSE.chords-db).

The transformation retains the frets of all positions, converting them to absolute fret numbers and normalizing roots and basses by pitch class. Barre annotations are retained by absolute fret pattern in `src/data/barres.json`; finger numbers are not included. The update script is `scripts/import-chords.mjs`. Positions are processed locally; normal use does not query a service.

The web distribution also includes the catalog license at `public/licenses/chords-db.txt`, linked from the chord browser.

## Document font

Google Sans Code uses the SIL Open Font License included in [`public/fonts/OFL-GoogleSansCode.txt`](public/fonts/OFL-GoogleSansCode.txt).

## Interface font

DM Sans is self-hosted as variable WOFF2 files from the official Google Fonts CSS service, retrieved September 21, 2026. Copyright 2014 The DM Sans Project Authors. The SIL Open Font License is included in [`public/fonts/OFL-DMSans.txt`](public/fonts/OFL-DMSans.txt). Latin and Latin Extended subsets preserve the existing interface typography without external requests.

Source: [Google Fonts DM Sans](https://github.com/google/fonts/tree/main/ofl/dmsans). Fonts are distributed unchanged under their own license.

## Dependencies

Exact versions appear in `pnpm-lock.yaml`. Each package retains its own license. This document does not replace those licenses. Chordleaf's original application code is licensed under the MIT license in LICENSE.

## Optional local audio experiment

The optional Python environment uses [faster-whisper](https://github.com/SYSTRAN/faster-whisper) and [lv-chordia](https://github.com/openmirlab/lv-chordia), a package of the pretrained models from Junyan Jiang, Ke Chen, Wei Li and Gus Xia, _Large-Vocabulary Chord Transcription via Chord Structure Decomposition_, ISMIR 2019 ([original repository](https://github.com/music-x-lab/ISMIR2019-Large-Vocabulary-Chord-Recognition)). These projects identify their code as MIT licensed; their installed distributions retain their own notices. The local lv-chordia installation includes the research checkpoints. No checkpoints are copied into Chordleaf's repository or web bundle. Exact tested dependencies are listed in `experiments/audio/requirements-neural.lock.txt`.

User PDFs, recordings and official preview audio used for the local pilot are not part of the software distribution and retain their respective rights.

## Optional lyric models and research data

Apple Silicon lyric inference optionally uses [MLX Audio](https://github.com/Blaizzy/mlx-audio) and the [Qwen3-ASR / ForcedAligner family](https://github.com/QwenLM/Qwen3-ASR/), downloaded separately from the MLX Community repositories. Pinned revisions appear in `experiments/audio/qwen_worker.py`; installed projects and downloaded models retain their own licenses and notices. No weights are embedded in the web application. NVIDIA Parakeet v3 and its MLX port were evaluated locally but are not an application dependency.

The chord-training research uses [GuitarSet 1.1.0](https://zenodo.org/records/3371780), by Qingyang Xi, Rachel M. Bittner, Johan Pauwels, Xuzhou Ye and Juan Pablo Bello, under CC BY 4.0. Please cite _GuitarSet: A Dataset for Guitar Transcription_, ISMIR 2018. Downloads, features and trained checkpoints stay outside Git.

The lyric benchmark uses [Jam-ALT](https://huggingface.co/datasets/jamendolyrics/jam-alt). Each recording keeps its own license, recorded by the download script; recordings and reference lyrics are not redistributed with this software or used here for training. This notice does not grant rights beyond those of the original datasets and models.
