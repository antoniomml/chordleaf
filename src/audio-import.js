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

// Keep the original timing in JSON. A text sheet can only anchor to words;
// changes inside a sustained word snap to its beginning, never fake syllables.
export function analysisToText(input) {
  const data = validateAnalysis(input);
  const chords = data.chords.filter((c) => c.label !== "N");
  const lines = [];
  let line = "",
    previous,
    index = 0;
  const flush = () => {
    if (line.trim()) lines.push(line.trim());
    line = "";
  };
  for (const word of data.words) {
    if (
      previous &&
      (word.line !== previous.line || word.start - previous.end > 1.5)
    )
      flush();
    // Preserve chords in introductions, pauses and instrumental breaks.
    while (
      index < chords.length &&
      chords[index].start < word.start &&
      (!previous || chords[index].start >= previous.end) &&
      word.start - chords[index].start > 0.5
    ) {
      flush();
      lines.push(`[${chords[index++].label}]`);
    }
    let prefix = "";
    while (index < chords.length && chords[index].start < word.end)
      prefix += `[${chords[index++].label}]`;
    const text = word.text.replace(/[\[\]{}\r\n]/g, "").trim();
    line += (line ? " " : "") + prefix + text;
    previous = word;
  }
  flush();
  for (; index < chords.length; index++) lines.push(`[${chords[index].label}]`);
  return lines.join("\n");
}

export function formatAudioTime(seconds) {
  const hundredths = Math.round(seconds * 100);
  return `${Math.floor(hundredths / 6000)}:${((hundredths % 6000) / 100).toFixed(2).padStart(5, "0")}`;
}
