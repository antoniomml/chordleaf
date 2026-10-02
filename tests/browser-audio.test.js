import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { normalizeWords } from "../src/browser-audio/timeline.js";
import { youtubeURL, recordTabAudio } from "../src/browser-audio/capture.js";
import { validateAnalysis } from "../src/audio-import.js";
import { estimateTuning } from "../src/browser-audio/tuning.js";
import catalog from "../src/browser-audio/catalog.json" with { type: "json" };
import {
  audioChunks,
  repetitionStart,
  asrTextTokens,
} from "../src/browser-audio/chunks.js";

test("instrumental ASR outputs remain empty without losing subsequent sung tokens", () => {
  assert.deepEqual(asrTextTokens([], 42), []);
  assert.deepEqual(asrTextTokens([7, 42], 42), []);
  assert.deepEqual(asrTextTokens([7, 42, 11, 12], 42), [11, 12]);
  assert.deepEqual(asrTextTokens([11, 12], 42), [11, 12]);
});

test("ASR chunks cover the file without overlaps and prefer a quiet boundary", () => {
  const audio = new Float32Array(60 * 16000).fill(0.2);
  audio.fill(0, 24 * 16000, 24.1 * 16000);
  const chunks = audioChunks(audio);
  assert.equal(chunks[0].start, 0);
  assert.ok(chunks[0].end >= 24 * 16000 && chunks[0].end <= 24.1 * 16000);
  assert.equal(chunks.at(-1).end, audio.length);
  for (let i = 0; i < chunks.length; i++) {
    assert.ok(chunks[i].end - chunks[i].start <= 25 * 16000);
    if (i) assert.equal(chunks[i].start, chunks[i - 1].end);
  }
});
test("ASR loop guard detects token cycles without discarding ordinary repeated phrases", () => {
  assert.equal(repetitionStart([1, 2, 3, 1, 2, 3]), null);
  assert.deepEqual(repetitionStart([9, ...Array(24).fill(1)]), {
    start: 1,
    keep: 2,
  });
  assert.deepEqual(
    repetitionStart([9, ...Array.from({ length: 24 }, (_, i) => i % 3)]),
    { start: 1, keep: 6 },
  );
});

test("alignment repairs inversions and zero duration without losing transcript order", () => {
  const raw = [
    { text: "Hola", start: 1, end: 2 },
    { text: "mundo,", start: 2, end: 2 },
    { text: "otra", start: 3, end: 4 },
    { text: "vez.", start: 3.9, end: 3.5 },
  ];
  const result = normalizeWords(raw, 5, 10, 1);
  assert.equal(
    result.words.map((w) => w.text).join(" "),
    "Hola mundo, otra vez.",
  );
  assert.equal(result.approximate, true);
  assert.equal(raw[1].end, 2);
  validateAnalysis({
    version: 1,
    duration: 15,
    chords: [],
    words: result.words,
  });
  assert.equal(result.words[0].start, 11);
});
test("out of range timestamps stay bounded and explicitly approximate", () => {
  const result = normalizeWords(
    [
      { text: "Hola", start: -1, end: 40 },
      { text: "fin", start: 4, end: 4 },
    ],
    5,
  );
  validateAnalysis({
    version: 1,
    duration: 5,
    chords: [],
    words: result.words,
  });
  assert.equal(result.approximate, true);
  assert.equal(result.words[0].text, "Hola fin");
});
test("tuning estimator follows a detuned harmonic signal", () => {
  const audio = Float32Array.from({ length: 22050 * 2 }, (_, i) =>
    Math.sin((2 * Math.PI * 440 * 2 ** (0.3 / 36) * i) / 22050),
  );
  assert.ok(Math.abs(estimateTuning(audio) - 0.3) < 0.08);
});
test("YouTube links are canonical and cannot open an arbitrary host or script", () => {
  assert.equal(
    youtubeURL("https://youtu.be/M7lc1UVf-VE?t=4"),
    "https://www.youtube.com/watch?v=M7lc1UVf-VE",
  );
  for (const value of [
    "javascript:alert(1)",
    "https://youtube.com.evil.test/watch?v=M7lc1UVf-VE",
    "https://user@youtube.com/watch?v=M7lc1UVf-VE",
    "https://youtube.com/playlist?list=abc",
  ])
    assert.throws(() => youtubeURL(value));
});
test("capture records audio tracks only and releases every granted track", async () => {
  const track = () => ({
    stops: 0,
    stop() {
      this.stops++;
    },
    addEventListener() {},
  });
  const video = track(),
    audio = track();
  let recorded;
  class Stream {
    constructor(tracks) {
      this.tracks = tracks;
    }
  }
  class Recorder {
    static isTypeSupported() {
      return true;
    }
    constructor(stream, options) {
      recorded = stream.tracks;
      this.mimeType = options.mimeType;
      this.state = "inactive";
    }
    start() {
      this.state = "recording";
    }
    stop() {
      this.state = "inactive";
      this.ondataavailable({ data: new Blob(["audio"]) });
      this.onstop();
    }
  }
  const stream = {
    getTracks: () => [video, audio],
    getAudioTracks: () => [audio],
  };
  const capture = recordTabAudio(stream, () => {}, Recorder, Stream);
  capture.finish();
  assert.equal((await capture.done).size, 5);
  assert.deepEqual(recorded, [audio]);
  assert.equal(video.stops, 1);
  assert.equal(audio.stops, 1);
  const cancelled = recordTabAudio(stream, () => {}, Recorder, Stream);
  cancelled.cancel();
  assert.equal(await cancelled.done, null);
});
test("capture without audio releases the video instead of recording it", () => {
  let stopped = false;
  assert.throws(
    () =>
      recordTabAudio(
        {
          getTracks: () => [
            {
              stop() {
                stopped = true;
              },
            },
          ],
          getAudioTracks: () => [],
        },
        () => {},
        class {},
        class {},
      ),
    /compartido audio/,
  );
  assert.equal(stopped, true);
});
test("distributed chord assets match their pinned integrity and keep extended vocabulary", async () => {
  for (const file of catalog.chords) {
    const bytes = await readFile(
      new URL("../public" + file.url, import.meta.url),
    );
    assert.equal(bytes.length, file.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256);
  }
  const manifest = JSON.parse(
    await readFile(
      new URL(
        "../public/models/lv-chordia-web-v1/manifest.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.ok(manifest.dictionary.length > 300);
  assert.ok(manifest.dictionary.some((c) => c.label.includes("maj7")));
  assert.ok(manifest.dictionary.some((c) => c.label.includes("/")));
  for (const file of Object.entries(catalog)
    .filter(([key]) => key !== "chords")
    .flatMap(([, files]) => files)) {
    assert.match(
      file.url,
      /^https:\/\/huggingface\.co\/[^/]+\/[^/]+\/resolve\/[0-9a-f]{40}\//,
    );
    assert.match(file.sha256, /^[a-f0-9]{64}$/);
    assert.ok(file.bytes > 0);
  }
});

test("missing speech timestamps preserve valid anchors and mark repaired words approximate", () => {
  for (const value of [NaN, Infinity, undefined, null]) {
    const raw = [
      { text: "Hola", start: 1, end: 2 },
      { text: "mundo", start: value, end: 3 },
    ];
    const result = normalizeWords(raw, 5, 10, 1);
    assert.equal(result.approximate, true);
    assert.deepEqual(result.words, [
      { text: "Hola", start: 11, end: 12, line: 1, timing: "word" },
      { text: "mundo", start: 12, end: 13, line: 1, timing: "grouped" },
    ]);
    validateAnalysis({
      version: 1,
      duration: 15,
      words: result.words,
      chords: [],
    });
  }
});
