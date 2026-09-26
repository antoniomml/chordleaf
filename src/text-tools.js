/** Whole-song cleanup used by the document panel. It only touches blank
 * lines: inline spacing keeps chord anchors over the lyrics intact.
 * A lone blank line disappears; a run of two or more keeps a single one. */
const lines = (text) =>
  String(text ?? "")
    .replace(/\r/g, "")
    .split("\n");
const blank = (line) => !line.trim();

export function blankLineCount(text) {
  return lines(text).filter(blank).length;
}

export function compressBlankLines(text) {
  const kept = [];
  let blankRun = 0;
  for (const line of lines(text)) {
    if (blank(line)) {
      blankRun++;
      continue;
    }
    if (blankRun > 1 && kept.length) kept.push("");
    blankRun = 0;
    kept.push(line);
  }
  return kept.join("\n");
}
