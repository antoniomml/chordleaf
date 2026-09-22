import test from "node:test";
import assert from "node:assert/strict";
import { t, setLocale } from "../src/i18n.js";
import { txt } from "../src/files.js";
test("UI literals translate but interpolated song content does not", () => {
  setLocale("en");
  try {
    assert.equal(t`Cerrar ${"Nueva canción"}`, "Close Nueva canción");
    assert.equal(t`Página ${2} de ${3}`, "Page 2 of 3");
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
