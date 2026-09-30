// Preserve the transcript's order. Inconsistent aligner slots become explicitly
// approximate groups; raw slots remain available in the exported analysis.
export function normalizeWords(raw, duration, offset = 0, line = 0) {
  if (
    raw.some(
      (word) => !Number.isFinite(word.start) || !Number.isFinite(word.end),
    )
  ) {
    const repaired = raw.map((word, index) => {
      const previous = raw
        .slice(0, index)
        .findLast((w) => Number.isFinite(w.end));
      const next = raw.slice(index + 1).find((w) => Number.isFinite(w.start));
      return {
        ...word,
        start: Number.isFinite(word.start) ? word.start : (previous?.end ?? 0),
        end: Number.isFinite(word.end) ? word.end : (next?.start ?? duration),
        approximate: !Number.isFinite(word.start) || !Number.isFinite(word.end),
      };
    });
    return {
      ...normalizeWords(repaired, duration, offset, line),
      approximate: true,
    };
  }

  const groups = [];
  let approximate = false;
  for (const word of raw) {
    const start = Math.max(
      0,
      Math.min(duration, Math.min(word.start, word.end)),
    );
    const end = Math.max(0, Math.min(duration, Math.max(word.start, word.end)));
    const next = {
      text: word.text,
      start,
      end,
      line,
      timing: word.approximate ? "grouped" : "word",
    };
    if (word.end <= word.start || start !== word.start || end !== word.end) {
      approximate = true;
      next.timing = "grouped";
    }
    const previous = groups.at(-1);
    if (
      previous &&
      (next.start < previous.end ||
        next.end <= next.start ||
        previous.end <= previous.start)
    ) {
      previous.text += " " + next.text;
      previous.start = Math.min(previous.start, next.start);
      previous.end = Math.max(previous.end, next.end);
      previous.timing = "grouped";
      approximate = true;
      // An inverted slot can reach into more than one earlier group.
      while (groups.length > 1 && groups.at(-1).start < groups.at(-2).end) {
        const last = groups.pop(),
          prior = groups.at(-1);
        prior.text += " " + last.text;
        prior.start = Math.min(prior.start, last.start);
        prior.end = Math.max(prior.end, last.end);
        prior.timing = "grouped";
      }
    } else groups.push(next);
  }
  if (groups.some((w) => w.end <= w.start)) {
    return {
      words: raw.length
        ? [
            {
              text: raw.map((w) => w.text).join(" "),
              start: offset,
              end: offset + duration,
              line,
              timing: "grouped",
            },
          ]
        : [],
      approximate: true,
    };
  }
  return {
    words: groups.map((w) => ({
      ...w,
      start: w.start + offset,
      end: w.end + offset,
    })),
    approximate,
  };
}
