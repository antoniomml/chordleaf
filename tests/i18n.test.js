import test from "node:test";
import assert from "node:assert/strict";
import { t, setLocale } from "../src/i18n.js";
import { txt } from "../src/files.js";
import { introHtml } from "../src/ui/intro-copy.js";
test("UI literals translate but interpolated song content does not", () => {
  setLocale("en");
  try {
    assert.equal(t`Cerrar ${"Nueva canción"}`, "Close Nueva canción");
    assert.equal(t`Página ${2} de ${3}`, "Page 2 of 3");
    assert.equal(t("Canción sin título"), "Untitled song");
    assert.equal(t("Una columna"), "One column");
    assert.match(introHtml("en"), /Write your way/);
    assert.match(introHtml("es"), /Escribe a tu manera/);
    assert.equal(
      t('<button aria-label="Nueva canción">Nueva canción</button>'),
      '<button aria-label="New song">New song</button>',
    );
    const song = {
      title: "Nueva canción",
      artist: "Guardar",
      text: "[C]Cerrar",
      capo: 0,
      columns: 1,
      fontSize: 10,
      margin: 10,
    };
    assert.ok(txt(song).includes("{title: Nueva canción}"));
    assert.ok(txt(song).includes("{chordleaf:"));
    assert.ok(txt(song).endsWith("[C]Cerrar"));
  } finally {
    setLocale("es");
  }
  assert.equal(t("Nueva canción"), "Nueva canción");
});
