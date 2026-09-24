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
