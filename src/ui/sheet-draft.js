import { readSheetLyrics } from "./sheet-editor.js";
import { alignmentLine } from "../chord-alignment.js";

/** Native plaintext editors may contain several text nodes. Match those nodes
 * to innerText so BR/block separators do not shift source offsets. */
export function sheetTextPoints(input) {
  const text = readSheetLyrics(input),
    points = [];
  const walker = document.createTreeWalker(input, NodeFilter.SHOW_TEXT);
  let node,
    cursor = 0;
  while ((node = walker.nextNode())) {
    const found = text.indexOf(node.data, cursor);
    const start = found < 0 ? cursor : found;
    points.push({
      node,
      start,
      end: Math.min(text.length, start + node.length),
    });
    cursor = start + node.length;
  }
  return { text, points };
}

export function sheetTextPoint(input, offset) {
  const { text, points } = sheetTextPoints(input);
  offset = Math.max(0, Math.min(text.length, offset));
  for (const point of points) {
    if (offset <= point.end)
      return [point.node, Math.max(0, offset - point.start)];
  }
  return [input, input.childNodes.length];
}

export function sheetCaretOffset(input) {
  const selection = window.getSelection();
  if (!selection?.focusNode || !input.contains(selection.focusNode)) return 0;
  const { text, points } = sheetTextPoints(input);
  const point = points.find(({ node }) => node === selection.focusNode);
  if (point) return Math.min(text.length, point.start + selection.focusOffset);
  const range = document.createRange();
  range.selectNodeContents(input);
  range.setEnd(selection.focusNode, selection.focusOffset);
  return Math.min(text.length, range.toString().length);
}

export function setSheetCaret(input, offset) {
  const [node, at] = sheetTextPoint(input, offset);
  input.focus({ preventScroll: true });
  window.getSelection().setBaseAndExtent(node, at, node, at);
}

/** Move existing labels with the native text, without replacing the focused
 * editor or its undo history. The inverse map excludes collision padding. */
export function paintLyricDraft(el, input, row, raw, positions, original) {
  const marks = alignmentLine(raw).marks;
  const indices = new Map(positions.map((at, i) => [at, i]));
  const bounds = el.getBoundingClientRect(),
    scale = bounds.width / row.width;
  const cw = parseFloat(el.style.fontSize) * 0.6;
  const labels = el.querySelectorAll(".sheet-chord");
  for (const [ordinal, mark] of row.marks.entries()) {
    const source = original.findIndex((value) => value.start === mark.rawIndex);
    const next = marks[source],
      label = labels[ordinal];
    if (!next || !label) continue;
    const offset = indices.get(next.at) ?? readSheetLyrics(input).length;
    const [node, at] = sheetTextPoint(input, offset);
    const range = document.createRange();
    range.setStart(node, at);
    range.setEnd(
      node,
      node.nodeType === Node.TEXT_NODE ? Math.min(node.length, at + 1) : at,
    );
    const rect = range.getBoundingClientRect();
    const anchor =
      ((rect.height
        ? rect.left
        : input.getBoundingClientRect().left + offset * cw * scale) -
        bounds.left) /
      scale;
    label.style.left = `${anchor - Math.floor((label.textContent.length - 1) / 2) * cw}px`;
  }
}
