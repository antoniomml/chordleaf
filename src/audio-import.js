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
  const chords = data.chords.filter((c) => c.label !== "N");
  const lines = [];
  let line = "",
    previous,
    active,
    characters = 0,
    count = 0,
    index = 0;
  const flush = () => {
    if (line.trim()) lines.push(line.trim());
    line = "";
    characters = count = 0;
  };
  const instrumental = (events) => {
    flush();
    for (let i = 0; i < events.length; i += 8)
      lines.push(
        events
          .slice(i, i + 8)
          .map((c) => `[${c.label}]`)
          .join(" "),
      );
  };
  for (const word of sheetWords(data.words)) {
    const gap = previous ? word.start - previous.end : Infinity;
    if (
      previous &&
      (gap > 1.2 ||
        (gap > 0.55 && count >= 3) ||
        /[.!?。！？]$/u.test(previous.text) ||
        characters + word.text.length > 64 ||
        (word.line !== previous.line && count >= 6 && gap > 0.2))
    )
      flush();
    // Breaths are part of the lyric phrase, not instrumental interludes.
    if (gap > 3) {
      const events = [];
      while (index < chords.length && chords[index].start < word.start - 0.75) {
        const chord = chords[index++];
        active = chord;
        events.push(chord);
      }
      if (events.length) instrumental(events);
    }
    let prefix = "";
    const sounding = active?.end > word.start ? active : null;
    const changes = [];
    while (index < chords.length && chords[index].start < word.end) {
      active = chords[index++];
      prefix += `[${active.label}]`;
      changes.push(active);
    }
    // A long, weakly aligned token cannot supply anchors for an entire solo.
    // Preserve those intervals as a progression instead of stacking many
    // labels over a single syllable and suggesting impossible precision.
    const overflow = changes.length > 2 && word.end - word.start > 2;
    if (overflow) prefix = `[${(sounding || changes[0]).label}]`;
    // Repeat the sounding harmony at a new lyric line, even without a change.
    // A preceding N interval or expired chord must never carry into the verse.
    if (!line && !prefix && active && active.end > word.start)
      prefix = `[${active.label}]`;
    line += (line ? " " : "") + prefix + word.text;
    characters += word.text.length + 1;
    count++;
    previous = word;
    if (overflow) instrumental(sounding ? changes : changes.slice(1));
  }
  flush();
  if (index < chords.length) instrumental(chords.slice(index));
  return lines.join("\n");
}

export function formatAudioTime(seconds) {
  const hundredths = Math.round(seconds * 100);
  return `${Math.floor(hundredths / 6000)}:${((hundredths % 6000) / 100).toFixed(2).padStart(5, "0")}`;
}
