import { lyricLineStarts } from "./audio-lyric-lines.js";
import { chordRE } from "./music.js";

export function validateAnalysis(data) {
  if (
    data?.version !== 1 ||
    !Number.isFinite(data.duration) ||
    data.duration <= 0 ||
    data.duration > 600 ||
    !Array.isArray(data.words) ||
    !Array.isArray(data.chords) ||
    data.words.length > 10000 ||
    data.chords.length > 10000
  )
    throw new Error("Invalid audio analysis");
  for (const [kind, events] of [
    ["words", data.words],
    ["chords", data.chords],
  ]) {
    let lastEnd = 0;
    for (const event of events) {
      if (
        !Number.isFinite(event.start) ||
        !Number.isFinite(event.end) ||
        event.start < lastEnd - 0.001 ||
        event.end <= event.start ||
        event.end > data.duration + 0.001
      )
        throw new Error("Invalid audio timeline");
      if (
        kind === "chords"
          ? typeof event.label !== "string" ||
            event.label.length > 80 ||
            (event.label !== "N" && !chordRE.test(event.label))
          : typeof event.text !== "string" ||
            !event.text.trim() ||
            event.text.length >
              (["grouped", "segment"].includes(event.timing) ? 4000 : 200) ||
            !Number.isInteger(event.line) ||
            event.line < 0
      )
        throw new Error("Invalid audio event");
      lastEnd = event.end;
    }
  }
  return data;
}

// Layout does not change source intervals. Multi-word approximate groups use
// proportional text anchors for the sheet only; these are not word timestamps.
function sheetWords(words) {
  return words.flatMap((word) => {
    const parts = word.text
      .replace(/[\[\]{}\r\n]/g, "")
      .trim()
      .split(/\s+/u);
    const size = parts.reduce((n, text) => n + text.length, 0);
    let offset = 0;
    return parts.filter(Boolean).map((text) => {
      const start = word.start + (word.end - word.start) * (offset / size);
      offset += text.length;
      return {
        ...word,
        text,
        start,
        end: word.start + (word.end - word.start) * (offset / size),
      };
    });
  });
}

export function analysisToText(input) {
  const data = validateAnalysis(input);
  const chords = [];
  for (const chord of data.chords) {
    const prior = chords.at(-1);
    if (chord.label === "N") continue;
    if (
      prior?.label === chord.label &&
      Math.abs(prior.end - chord.start) < 0.001
    )
      prior.end = chord.end;
    else chords.push({ ...chord });
  }
  const words = sheetWords(data.words);
  const starts = lyricLineStarts(words);
  const lines = [];
  let line = "",
    previous,
    index = 0;
  const flush = () => {
    if (line.trim()) lines.push(line.trim());
    line = "";
  };
  const instrumental = (events, section = "Instrumental") => {
    flush();
    for (let i = 0; i < events.length; i += 8)
      lines.push(
        (words.length ? `[${section}] ` : "") +
          events
            .slice(i, i + 8)
            .map((c) => `[${c.label}]`)
            .join(" "),
      );
  };
  // An inconsistent opening alignment can collapse a short phrase and its
  // introduction into one long group. Proportional syllable positions would
  // fragment the phrase and imply precision the model did not provide. Keep
  // the opening progression together without guessing where the voice began.
  const opening = data.words[0];
  if (
    opening?.timing === "grouped" &&
    opening.end - opening.start >= 6 &&
    (opening.end - opening.start) / opening.text.trim().split(/\s+/u).length > 2
  ) {
    const events = [];
    while (index < chords.length && chords[index].start < opening.end)
      events.push(chords[index++]);
    if (events.length) instrumental(events, "Inicio");
  }
  for (let position = 0; position < words.length; position++) {
    const word = words[position];
    const gap = previous ? word.start - previous.end : Infinity;
    if (starts.has(position)) flush();
    // Breaths are part of the lyric phrase, not instrumental interludes.
    if (gap > 3) {
      if (previous) {
        flush();
        if (lines.length && lines.at(-1) !== "") lines.push("");
      }
      const events = [];
      while (
        index < chords.length &&
        (chords[index].start < word.start - 0.2 ||
          chords[index].end <= word.start)
      ) {
        const chord = chords[index++];
        events.push(chord);
      }
      if (events.length)
        instrumental(events, previous ? "Instrumental" : "Intro");
      if (previous && events.length) lines.push("");
    }
    let prefix = "";
    const changes = [];
    const next = words[position + 1];
    // A change near the end of a sung word belongs to the next onset, rather
    // than jumping backwards to the beginning of the current word. Long
    // interludes still retain their separate instrumental progression.
    const cutoff =
      next &&
      next.start - word.end <= 3 &&
      word.end - word.start <= 2 &&
      !["grouped", "segment"].includes(word.timing)
        ? Math.min(word.end, (word.start + next.start) / 2)
        : word.end;
    while (index < chords.length && chords[index].start < cutoff) {
      const chord = chords[index++];
      prefix += `[${chord.label}]`;
      changes.push(chord);
    }
    // A long, weakly aligned token cannot supply anchors for an entire solo.
    // Preserve those intervals as a progression instead of stacking many
    // labels over a single syllable and suggesting impossible precision.
    const overflow = changes.length > 1 && word.end - word.start > 2;
    const onset = overflow && changes[0].start <= word.start + 0.2;
    if (overflow) prefix = onset ? `[${changes[0].label}]` : "";
    // A visual line break is not a harmonic change. Emit each detected onset
    // once, including when the previous harmony continues into a new verse.
    line += (line ? " " : "") + prefix + word.text;
    previous = word;
    if (overflow) instrumental(onset ? changes.slice(1) : changes);
  }
  flush();
  if (index < chords.length) instrumental(chords.slice(index), "Final");
  return lines.join("\n");
}

export function formatAudioTime(seconds) {
  const hundredths = Math.round(seconds * 100);
  return `${Math.floor(hundredths / 6000)}:${((hundredths % 6000) / 100).toFixed(2).padStart(5, "0")}`;
}
