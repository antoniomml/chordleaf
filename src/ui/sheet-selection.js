import { alignmentLine } from "../chord-alignment.js";
import {
  lyricSourceOffset,
  displaySourceBoundary,
} from "../sheet-selection.js";
import { isMobileLayout } from "../mobile-layout.js";

/** A selection may cross separately positioned verses, columns and pages.
 * Finish the single-verse draft before extending it, then map the DOM range
 * back to source instead of letting the browser delete the print layout. */
export function setupSheetSelection({
  enabled,
  song,
  rowFor,
  finish,
  update,
  editLine,
  history,
  pending = () => false,
}) {
  const pages = document.querySelector("#pages"),
    scroll = document.querySelector("#pages-scroll");
  let drag,
    extending = false,
    suppressClick = false;
  const available = () => enabled() && !isMobileLayout();
  const rowKey = (el) => `${el.dataset.line}:${rowFor(el)?.offset ?? 0}`;
  function lyricPoint(node, offset) {
    const el = (node?.nodeType === 1 ? node : node?.parentElement)?.closest(
      ".lyric",
    );
    if (!el || !pages.contains(el)) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.setEnd(node, offset);
    return { el, offset: range.toString().length };
  }
  function nodePoint(point) {
    const walker = document.createTreeWalker(point.el, NodeFilter.SHOW_TEXT);
    let node,
      remaining = point.offset;
    while ((node = walker.nextNode())) {
      if (remaining <= node.length) return [node, remaining];
      remaining -= node.length;
    }
    return [point.el, point.el.childNodes.length];
  }
  function atPoint(x, y) {
    let el = document
      .elementFromPoint(x, y)
      ?.closest(".song-line")
      ?.querySelector(".lyric");
    if (el) {
      const row = el.closest(".song-line").getBoundingClientRect();
      // Reject stale hit targets outside their printed row during native
      // selection capture; geometry still identifies the verse under the mouse.
      if (x < row.left || x > row.right || y < row.top || y > row.bottom)
        el = undefined;
    }
    if (!el) {
      let distance = Infinity;
      for (const candidate of pages.querySelectorAll(".lyric")) {
        const row = candidate.closest(".song-line").getBoundingClientRect(),
          rect = candidate.getBoundingClientRect();
        const next =
          Math.max(row.left - x, 0, x - row.right) +
          Math.abs(y - (rect.top + rect.bottom) / 2);
        if (next < distance) {
          el = candidate;
          distance = next;
        }
      }
    }
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = Math.max(rect.left, Math.min(rect.right, x)),
      py = (rect.top + rect.bottom) / 2;
    const position = document.caretPositionFromPoint?.(px, py);
    let point = position && lyricPoint(position.offsetNode, position.offset);
    if (point?.el === el) return point;
    const range = document.caretRangeFromPoint?.(px, py);
    point = range && lyricPoint(range.startContainer, range.startOffset);
    if (point?.el === el) return point;
    return {
      el,
      offset: Math.max(
        0,
        Math.min(
          el.textContent.length,
          Math.round(
            ((x - rect.left) / (rect.width || 1)) * el.textContent.length,
          ),
        ),
      ),
    };
  }

  function selected() {
    const selection = window.getSelection();
    if (!available() || !selection?.rangeCount || selection.isCollapsed) return;
    const range = selection.getRangeAt(0),
      start = lyricPoint(range.startContainer, range.startOffset),
      end = lyricPoint(range.endContainer, range.endOffset);
    if (!start || !end || start.el === end.el) return;
    return { start, end };
  }
  function sourceOffset(point, end) {
    const el = point.el.closest(".song-line"),
      row = rowFor(el),
      lines = song().text.split("\n");
    const active = pages.querySelector(".inline-lyric-editor");
    const draft = active && rowFor(active.closest(".song-line"))?.draft;
    const shifted = (index) =>
      index + (draft && index > draft.index ? draft.lineDelta : 0);
    const index = shifted(Number(el.dataset.end));
    const model = point.el === active ? draft : row;
    const raw = point.el === active ? draft.raw : lines[index];
    const at = displaySourceBoundary(model.positions, point.offset);
    // Legacy chord-only rows belong to the following printed verse.
    const lineIndex =
      !end && at === 0 ? shifted(Number(el.dataset.line)) : index;
    const prefix = lines
      .slice(0, lineIndex)
      .reduce((sum, line) => sum + line.length + 1, 0);
    return (
      prefix +
      (lineIndex < index
        ? 0
        : lyricSourceOffset(raw, at, end && point.offset > 0))
    );
  }
  function pointSource(offset) {
    const lines = song().text.split("\n");
    let index = 0,
      prefix = 0;
    while (index < lines.length - 1 && prefix + lines[index].length < offset)
      prefix += lines[index++].length + 1;
    const model = alignmentLine(lines[index]),
      rawAt = offset - prefix;
    const at =
      rawAt -
      model.marks.reduce(
        (sum, mark) =>
          sum + Math.max(0, Math.min(mark.token.length, rawAt - mark.start)),
        0,
      );
    let best,
      distance = Infinity;
    for (const el of pages.querySelectorAll(".song-line")) {
      if (Number(el.dataset.end) !== index && Number(el.dataset.line) !== index)
        continue;
      const row = rowFor(el),
        lyric = el.querySelector(".lyric");
      for (let i = 0; i <= lyric.textContent.length; i++) {
        const mapped = displaySourceBoundary(row.positions, i);
        const next = Math.abs(mapped - at);
        if (next < distance) {
          best = { el: lyric, offset: i };
          distance = next;
        }
      }
    }
    return best;
  }
  function focusSource(offset) {
    const best = pointSource(offset);
    if (!best) return;
    editLine(best.el.closest(".song-line"));
    const selection = window.getSelection(),
      point = nodePoint(best);
    selection.setBaseAndExtent(...point, ...point);
  }
  function selectPoints(start, end, editable = false) {
    if (editable && start.el === end.el)
      editLine(start.el.closest(".song-line"));
    else scroll.focus({ preventScroll: true });
    window
      .getSelection()
      .setBaseAndExtent(...nodePoint(start), ...nodePoint(end));
  }
  function replaceSelection(text) {
    const selection = selected();
    if (!selection) return false;
    const before = song().text,
      start = sourceOffset(selection.start, false),
      end = sourceOffset(selection.end, true);
    const after = before.slice(0, start) + text + before.slice(end);
    if (!finish({ render: false }) || !update(after, start)) return true;
    focusSource(start + text.length);
    return true;
  }
  pages.addEventListener(
    "pointerdown",
    (event) => {
      suppressClick = false;
      if (available() && event.target.closest(".sheet-chord") && selected())
        window.getSelection().removeAllRanges();
      if (
        !available() ||
        event.button !== 0 ||
        event.pointerType === "touch" ||
        event.target.closest(
          ".sheet-chord, .sheet-chord-lane, .sheet-chord-handle, .inline-chord-editor",
        ) ||
        !event.target.closest(".song-line")
      )
        return;
      drag = {
        x: event.clientX,
        y: event.clientY,
        row: rowKey(event.target.closest(".song-line")),
      };
      extending = false;
    },
    true,
  );
  function extendTo(x, y) {
    let point = atPoint(x, y);
    if (
      !point ||
      (!extending && rowKey(point.el.closest(".song-line")) === drag.row)
    )
      return;
    if (!extending) {
      const anchor = atPoint(drag.x, drag.y);
      const offset = anchor && sourceOffset(anchor, false);
      if (!anchor || !finish()) {
        drag = undefined;
        return;
      }
      scroll.focus({ preventScroll: true });
      drag.anchor = pointSource(offset);
      extending = true;
      point = atPoint(x, y);
    }
    if (drag.anchor && point) {
      drag.focus = point;
      selectPoints(drag.anchor, point);
    }
    const bounds = scroll.getBoundingClientRect();
    if (y > bounds.bottom - 25) scroll.scrollTop += 12;
    if (y < bounds.top + 25) scroll.scrollTop -= 12;
    return true;
  }
  document.addEventListener("pointermove", (event) => {
    if (drag && event.buttons & 1 && extendTo(event.clientX, event.clientY))
      event.preventDefault();
  });
  // Cancel compatibility mouse selection: preventing pointermove alone does
  // not cancel the subsequent mousemove's native selection default on Linux.
  document.addEventListener("mousemove", (event) => {
    if (extending) event.preventDefault();
  });
  document.addEventListener("mouseup", (event) => {
    if (suppressClick) event.preventDefault();
  });
  document.addEventListener("pointerup", (event) => {
    // The last move can be coalesced; release coordinates are authoritative.
    if (drag) extendTo(event.clientX, event.clientY);
    if (extending && drag.anchor && drag.focus)
      selectPoints(drag.anchor, drag.focus, true);
    suppressClick = extending;
    drag = undefined;
    extending = false;
  });
  document.addEventListener("pointercancel", () => {
    drag = undefined;
    extending = false;
  });
  pages.addEventListener(
    "click",
    (event) => {
      if (
        (suppressClick || selected()) &&
        !event.target.closest(
          ".sheet-chord-lane, .sheet-chord-handle, .inline-chord-editor",
        )
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressClick = false;
      }
    },
    true,
  );
  scroll.addEventListener(
    "keydown",
    (event) => {
      if (!available() || event.isComposing) return;
      if (event.shiftKey && ["ArrowUp", "ArrowDown"].includes(event.key)) {
        const selection = window.getSelection();
        const anchor = lyricPoint(
            selection?.anchorNode,
            selection?.anchorOffset,
          ),
          focus = lyricPoint(selection?.focusNode, selection?.focusOffset);
        if (!anchor || !focus) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const anchorOffset = sourceOffset(anchor, false),
          focusOffset = sourceOffset(focus, false);
        if (!finish()) return;
        const start = pointSource(anchorOffset),
          current = pointSource(focusOffset);
        if (!start || !current) return;
        const lyrics = [...pages.querySelectorAll(".lyric")];
        const focusIndex = lyrics.indexOf(current.el);
        const next = Math.max(
          0,
          Math.min(
            lyrics.length - 1,
            focusIndex + (event.key === "ArrowDown" ? 1 : -1),
          ),
        );
        const end = {
          el: lyrics[next],
          offset: Math.min(current.offset, lyrics[next].textContent.length),
        };
        selectPoints(start, end, true);
        end.el.scrollIntoView({ block: "nearest", inline: "nearest" });
        return;
      }
      const command = event.ctrlKey || event.metaKey,
        key = event.key.toLowerCase();
      const redo = command && ((key === "z" && event.shiftKey) || key === "y");
      const entry = history.peek(redo);
      if (
        command &&
        (event.target === scroll || event.target.closest(".lyric")) &&
        (key === "z" || redo) &&
        entry &&
        !pending()
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (finish({ render: false }) && history.restore(redo)) {
          focusSource(entry.offset);
        }
        return;
      }
      if (!selected()) return;
      let text;
      if (["Backspace", "Delete"].includes(event.key)) text = "";
      else if (event.key === "Enter") text = "\n";
      else if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      )
        text = event.key;
      if (text === undefined) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      replaceSelection(text);
    },
    true,
  );
  scroll.addEventListener("paste", (event) => {
    if (!selected()) return;
    event.preventDefault();
    replaceSelection(event.clipboardData.getData("text/plain"));
  });
}
