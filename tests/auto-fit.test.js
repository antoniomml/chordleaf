import test from "node:test";
import assert from "node:assert/strict";
import { fitToPage, layout, PAGE } from "../src/layout.js";
import { diagram } from "../src/music.js";
const base = {
  title: "Prueba",
  artist: "",
  text: "[C]Luz de mañana",
  columns: 1,
  margin: 10,
  fontSize: 10,
};
test("automatic fit enlarges small songs and keeps modest margins", () => {
  const fit = fitToPage(base);
  assert.equal(fit.fontSize, 20);
  assert.equal(fit.margin, 10);
  assert.equal(fit.columns, 1);
  assert.equal(base.fontSize, 10);
});
test("automatic fit selects the largest size across both column options", () => {
  const song = { ...base, text: "[C]Luz de mañana\n".repeat(42) };
  const fit = fitToPage(song);
  assert.equal(fit.columns, 2);
  assert.equal(layout({ ...song, ...fit }).pages.length, 1);
  for (const columns of [1, 2])
    for (const margin of [6, 7, 8, 9, 10])
      assert.ok(
        layout({ ...song, columns, margin, fontSize: fit.fontSize + 0.5 }).pages
          .length > 1,
      );
});
test("automatic fit avoids wrapping source lines on one page", () => {
  const song = {
    ...base,
    text: "[C]" + "Palabra ".repeat(8).trim() + "\n" + "[G]Corta\n".repeat(6),
  };
  const fit = fitToPage(song);
  const result = layout({ ...song, ...fit });
  assert.equal(result.pages.length, 1);
  assert.equal(result.wrapped, 0);
  assert.equal(fit.columns, 1);
  assert.ok(fit.margin >= 6 && fit.margin <= 10);
  // A larger size also fits one page, but only by breaking the long line.
  const larger = layout({
    ...song,
    fontSize: fit.fontSize + 0.5,
    columns: fit.columns,
    margin: fit.margin,
  });
  assert.equal(larger.pages.length, 1);
  assert.ok(larger.wrapped > 0);
});
test("wrapping is kept and minimized when no readable size can avoid it", () => {
  const song = { ...base, text: "[C]" + "a".repeat(200) };
  const fit = fitToPage(song);
  const result = layout({ ...song, ...fit });
  assert.equal(fit.columns, 2);
  assert.equal(result.pages.length, 1);
  assert.ok(result.wrapped > 0);
});
test("two columns keep the fewest pages and broken lines", () => {
  const line = "[C]" + "Palabra ".repeat(6).trim();
  const song = { ...base, text: (line + "\n").repeat(70) };
  const fit = fitToPage(song);
  const result = layout({ ...song, ...fit });
  assert.equal(result.wrapped, 0);
  assert.ok(result.pages.length > 1);
  assert.equal(fit.columns, 2);
  // The old font-first choice used a larger size with broken lines instead.
  let first;
  outer: for (let fontSize = 20; fontSize >= 8; fontSize -= 0.5)
    for (const columns of [1, 2])
      for (const margin of [10, 9, 8, 7, 6]) {
        const pages = layout({ ...song, fontSize, columns, margin }).pages
          .length;
        if (pages === result.pages.length) {
          first = { fontSize, columns, margin };
          break outer;
        }
      }
  assert.ok(first);
  assert.ok(fit.fontSize < first.fontSize);
  assert.ok(layout({ ...song, ...first }).wrapped > 0);
});
test("very long songs retain every line and readable type across pages", () => {
  const song = { ...base, text: "[C]Luz de mañana\n".repeat(200) };
  const fit = fitToPage(song),
    result = layout({ ...song, ...fit });
  assert.equal(fit.text, song.text);
  assert.ok(fit.fontSize >= 8);
  assert.ok(result.pages.length > 1);
  assert.equal(
    result.pages.flatMap((p) => p.columns.flat()).filter((r) => r.lyric.trim())
      .length,
    200,
  );
  for (const row of result.pages.flatMap((p) => p.columns.flat()))
    assert.ok(row.y + row.height <= PAGE.height - 24);
});
test("manual page and column breaks survive automatic fitting", () => {
  assert.equal(
    fitToPage({
      ...base,
      text: "[C]Uno\n{column}\n[D]Dos\n{new_page}\n[G]Tres",
    }).text,
    "[C]Uno\n{column}\n[D]Dos\n{new_page}\n[G]Tres",
  );
  const fitted = fitToPage({
    ...base,
    text: "[C]Uno\n{column}\n[D]Dos\n{new_page}\n[G]Tres",
  });
  assert.ok(layout({ ...base, ...fitted }).pages.length >= 2);
});
test("F has a full barre, Bm a partial barre, open chords no barre", () => {
  assert.match(diagram("F"), /class="diagram-barre" d="M30 39H115"/);
  assert.match(diagram("Bm"), /class="diagram-barre"/);
  for (const c of ["C", "D", "E", "Am", "G"])
    assert.doesNotMatch(diagram(c), /diagram-barre/, c);
  assert.doesNotMatch(diagram("C", 0, [1, 0, 3, 2, 1, 1]), /diagram-barre/);
});
