import { layout, PAGE } from "../layout.js";

// Reuse the document's wrapping and chord collision rules in the import review.
export function setupAudioPreview(draft, preview) {
  const size = 13;
  function render() {
    const width = preview.clientWidth - 24;
    if (width <= 0) return;
    const sheet = layout({
      text: draft.value,
      title: "",
      artist: "",
      fontSize: size,
      margin: (Math.max(0, PAGE.width - width) / 2) * (25.4 / 72),
      columns: 1,
      chordStickers: [],
    });
    const fragment = document.createDocumentFragment();
    for (const row of sheet.pages.flatMap((page) => page.columns.flat())) {
      if (row.break) continue;
      const line = document.createElement("div");
      line.className = "audio-sheet-line";
      line.style.height = `${row.height}px`;
      for (const mark of row.marks) {
        const chord = document.createElement("strong");
        chord.className = "audio-sheet-chord";
        chord.style.left = `${mark.x * size * 0.6}px`;
        chord.style.top = `${(mark.lane || 0) * size * 1.44}px`;
        chord.textContent = mark.chord;
        line.append(chord);
      }
      const lyric = document.createElement("span");
      lyric.className = "audio-sheet-lyric";
      lyric.style.top = `${row.lyricOffset}px`;
      lyric.textContent = row.lyric || " ";
      line.append(lyric);
      fragment.append(line);
    }
    preview.replaceChildren(fragment);
  }
  draft.addEventListener("input", render);
  let lastWidth;
  new ResizeObserver(([entry]) => {
    if (entry.contentRect.width !== lastWidth) {
      lastWidth = entry.contentRect.width;
      render();
    }
  }).observe(preview);
  return render;
}
