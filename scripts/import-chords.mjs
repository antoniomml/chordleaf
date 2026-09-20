// Usage: node scripts/import-chords.mjs /path/to/chords-db/lib/guitar.json
// Download the source separately and retain its MIT license when updating.
import { readFile, writeFile } from "node:fs/promises";
const path = process.argv[2];
if (!path) throw new Error("Provide the upstream guitar.json path");
const source = JSON.parse(await readFile(path, "utf8"));
const pitches = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pc = (n) =>
  (pitches[n[0]] + (n.includes("#") ? 1 : n.includes("b") ? -1 : 0) + 12) % 12;
const result = {};
const barres = {};
for (const group of Object.values(source.chords)) {
  for (const chord of group) {
    let suffix = { major: "", minor: "m" }[chord.suffix] ?? chord.suffix;
    suffix = suffix.replace(/\/([A-G][#b]?)$/, (_, bass) => "/" + pc(bass));
    for (const position of chord.positions) {
      const frets = position.frets.map((fret) =>
        fret <= 0 ? fret : fret + position.baseFret - 1,
      );
      const values = (position.barres || []).map(
        (fret) => fret + position.baseFret - 1,
      );
      if (!(frets.join(",") in barres) || values.length)
        barres[frets.join(",")] = values;
    }
    result[`${pc(chord.key)}:${suffix}`] = chord.positions.map((position) =>
      position.frets.map((fret) =>
        fret <= 0 ? fret : fret + position.baseFret - 1,
      ),
    );
  }
}
await writeFile(
  new URL("../src/data/guitar.json", import.meta.url),
  JSON.stringify(result) + "\n",
);
console.log(`Imported ${Object.keys(result).length} chord entries.`);

await writeFile(
  new URL("../src/data/barres.json", import.meta.url),
  JSON.stringify(barres) + "\n",
);
