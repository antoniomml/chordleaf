import { t } from "./i18n.js";
import guitar from "./data/guitar.json" with { type: "json" };
import {
  chords,
  diagram,
  fingerings,
  normalizeChord,
  NOTES,
  pc,
} from "./music.js";
import { identifyChord, replaceChord } from "./harmony.js";
import { fretboardMarkup } from "./fretboard-ui.js";

export function setupChordsPanel({
  song,
  changed,
  refresh,
  esc,
  notify,
  onModeChange,
}) {
  const host = document.createElement("section");
  host.id = "chords-panel";
  host.hidden = true;
  host.innerHTML = t`<div id="song-chords" role="tabpanel" aria-label="Acordes de la canción"></div>
    <div id="search-chords" role="tabpanel" aria-label="Buscar acordes" hidden><label class="field">BUSCAR ACORDE<input id="catalog-search" type="search" placeholder="C, Emaj7, Abm7b5, C/G…" autocomplete="off"></label><p class="chord-help">Busca un nombre y toca un diagrama para ver sus posiciones.</p><p id="search-count" role="status"></p><div id="catalog-grid" class="chord-card-grid"></div><button id="more-chords">Mostrar más</button><p class="chord-help">828 acordes · 3283 posiciones · E A D G B e<br>Datos de <a href="https://github.com/tombatossals/chords-db">chords-db</a> · <a href="/licenses/chords-db.txt">MIT</a></p></div>
    <div id="identify-chords" role="tabpanel" aria-label="Identificar acorde" hidden>
      <div class="identify-instrument"><h2>Dibuja un acorde</h2><p class="chord-help">Toca un traste por cuerda. El 0 está antes de la cejuela; púlsalo para dejarla al aire o apagarla.</p>
      <div class="fretboard-options"><div class="fret-window"><button id="frets-back" aria-label="Bajar un traste">−</button><span id="first-fret" aria-live="polite">Traste 1</span><button id="frets-forward" aria-label="Subir un traste">+</button></div><button id="clear-frets">Limpiar</button></div>
      <div class="fretboard-scroll"><div id="fretboard" aria-label="Mástil horizontal de guitarra"></div></div><p class="fretboard-legend"><span>● Pulsada</span><span>○ Al aire</span><span>× Apagada</span></p>
      <p id="capo-notes" class="chord-help"></p></div>
      <div class="identify-readings"><div class="readings-heading"><h2>Posibles nombres</h2><span id="interpretation-count"></span></div><p class="chord-help">Elige un nombre para usarlo en la canción.</p><div id="chord-results" aria-live="polite"></div><div id="identified-choice"></div><p class="harmony-context">Una misma posición puede tener varios nombres. El contexto musical decide cuál encaja.</p></div>
    </div>
    <section id="use-chord" hidden><div class="chosen-heading"><h2 id="chosen-name"></h2><button id="close-chosen" aria-label="Cerrar acorde seleccionado">×</button></div><div id="chosen-diagram"></div><div class="position-navigation"><button id="chosen-prev" aria-label="Posición anterior">←</button><span id="chosen-position"></span><button id="chosen-next" aria-label="Posición siguiente">→</button></div><p id="chosen-detail" class="chord-help"></p><button id="insert-chosen" class="primary">Insertar en el cursor</button><label class="field">SUSTITUIR EN LA CANCIÓN<select id="replace-target"></select></label><label class="field">APARICIONES<select id="replace-occurrence"></select></label><p class="chord-help">La digitación elegida se comparte con todas las apariciones del mismo nombre.</p><button id="replace-chosen">Sustituir acorde</button><button id="undo-chord" hidden>Deshacer último cambio</button></section>`;
  document.querySelector(".editor-panel").append(host);
  const $ = (s) => host.querySelector(s);
  let mode = "song",
    frets = [-1, -1, -1, -1, -1, -1],
    first = 1,
    selected,
    undo;
  const snapshot = () =>
    JSON.stringify([song().text, song().chordShapes, song().chordStickers]);
  let searchLimit = 24;
  const catalog = Object.entries(guitar).map(([key, positions]) => {
    const [root, suffix] = key.split(":");
    return {
      name:
        NOTES[Number(root)] +
        suffix.replace(/\/(\d+)$/, (_, bass) => "/" + NOTES[Number(bass)]),
      positions,
    };
  });
  function setMode(value) {
    mode = value;
    onModeChange?.(mode);
    for (const name of ["song", "search", "identify"])
      $("#" + name + "-chords").hidden = name !== mode;
    $("#use-chord").hidden = true;
    if (mode === "search") search();
    if (mode === "identify") drawFretboard();
  }
  function search() {
    const query = normalizeChord($("#catalog-search").value.trim());
    const matches = catalog.filter(
      (c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        normalizeChord(c.name).toLowerCase() === query.toLowerCase(),
    );
    // Prefer an exact symbol, then its extensions. Enharmonic spellings are
    // resolved through the catalog's pitch-class key, independently of case.
    const root = query.match(/^([A-G][#b]?)(.*)$/);
    if (root) {
      const alternatives = catalog.filter((c) => {
        const a = c.name.match(/^([A-G][#b]?)(.*)$/);
        return (
          pc(a[1]) === pc(root[1]) &&
          a[2].replace(/\/([A-G][#b]?)$/, (_, n) => "/" + pc(n)) ===
            root[2].replace(/\/([A-G][#b]?)$/, (_, n) => "/" + pc(n))
        );
      });
      for (const c of alternatives.reverse()) {
        const i = matches.indexOf(c);
        if (i >= 0) matches.splice(i, 1);
        matches.unshift(c);
      }
    }
    $("#search-count").textContent = matches.length
      ? t`${matches.length} acordes · ${Math.min(searchLimit, matches.length)} visibles`
      : t(
          "Sin resultados. Prueba otro nombre o dibuja la posición en Identificar.",
        );
    $("#catalog-grid").innerHTML = matches
      .slice(0, searchLimit)
      .map(
        (c, i) =>
          t`<button class="chord-card" data-result="${i}" aria-label="Usar ${esc(c.name)}"><strong>${esc(c.name)}</strong>${diagram(c.name)}<small>${c.positions.length} posiciones</small></button>`,
      )
      .join("");
    $("#more-chords").hidden = matches.length <= searchLimit;
    host.querySelectorAll("[data-result]").forEach(
      (button) =>
        (button.onclick = () => {
          const c = matches[Number(button.dataset.result)];
          choose(
            c.name,
            c.positions,
            t("Posición del catálogo en afinación estándar."),
          );
        }),
    );
  }
  $("#catalog-search").oninput = () => {
    searchLimit = 24;
    search();
  };
  $("#more-chords").onclick = () => {
    searchLimit += 24;
    search();
  };
  function drawFretboard(focus) {
    $("#fretboard").innerHTML = fretboardMarkup(frets, first);
    $("#frets-back").disabled = first === 1;
    $("#frets-forward").disabled = first === 20;
    host.querySelectorAll("[data-string]").forEach(
      (b) =>
        (b.onclick = () => {
          const string = Number(b.dataset.string),
            fret = Number(b.dataset.fret);
          frets[string] =
            fret < 0
              ? frets[string] < 0
                ? 0
                : -1
              : frets[string] === fret
                ? -1
                : fret;
          $("#use-chord").hidden = true;
          drawFretboard(`[data-string="${string}"][data-fret="${fret}"]`);
        }),
    );
    if (focus) $(focus)?.focus();
    analyze();
  }
  function analyze() {
    const result = identifyChord(frets);
    $("#interpretation-count").textContent = result.matches.length || "";
    $("#capo-notes").dataset.capo = String(song().capo);
    $("#capo-notes").textContent = song().capo
      ? t`Trastes y nombres relativos a la cejilla ${song().capo}.`
      : t("Afinación estándar · E A D G B e");
    $("#chord-results").innerHTML = result.matches.length
      ? result.matches
          .map(
            (m, i) =>
              `<button class="chord-match" data-match="${i}" aria-pressed="false"><strong>${esc(m.symbol)}</strong><span>${m.exact ? t("Completo") : m.missing.map((n) => (n === 0 ? t("Sin raíz") : t("Sin quinta"))).join(" · ")} · ${esc(m.notes.join(" · "))}</span></button>`,
          )
          .join("")
      : `<p class="chord-help">${result.pitches.length < 2 ? t("Los nombres aparecerán aquí al formar una posición.") : t("No hay coincidencias en las fórmulas disponibles. Prueba otra posición.")}</p>`;
    host.querySelectorAll("[data-match]").forEach(
      (b) =>
        (b.onclick = () => {
          host
            .querySelectorAll(".chord-match")
            .forEach((el) => el.setAttribute("aria-pressed", el === b));
          const m = result.matches[Number(b.dataset.match)];
          const positions = [[...frets]];
          for (const position of fingerings(m.symbol))
            if (
              !positions.some(
                (candidate) => candidate.join() === position.join(),
              )
            )
              positions.push(position);
          choose(
            m.symbol,
            positions,
            t`${m.exact ? t("Todas las notas del acorde están presentes.") : t("Omisiones indicadas en el nombre: no1 = sin raíz; no5 = sin quinta.")} Notas: ${m.notes.join(" · ")}.`,
          );
        }),
    );
  }
  for (const [id, offset] of [
    ["frets-back", -1],
    ["frets-forward", 1],
  ]) {
    $("#" + id).onclick = () => {
      first = Math.max(1, Math.min(20, first + offset));
      $("#first-fret").textContent = t`Traste ${first}`;
      drawFretboard();
    };
  }
  $("#clear-frets").onclick = () => {
    frets = [-1, -1, -1, -1, -1, -1];
    $("#use-chord").hidden = true;
    drawFretboard();
  };
  function choose(name, positions, detail) {
    selected = { name, positions, position: 0, songId: song().id };
    (mode === "identify"
      ? $("#identified-choice")
      : $("#search-chords")
    ).append($("#use-chord"));
    $("#use-chord").hidden = false;
    $("#chosen-name").textContent = name;
    $("#chosen-detail").textContent = detail;
    updateTargets();
    drawChosen();
    $("#use-chord").scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function drawChosen() {
    $("#chosen-diagram").innerHTML = diagram(
      selected.name,
      0,
      selected.positions[selected.position],
    );
    $("#chosen-position").textContent =
      `${selected.position + 1} / ${selected.positions.length}`;
    $("#chosen-prev").disabled = selected.position === 0;
    $("#chosen-next").disabled =
      selected.position === selected.positions.length - 1;
  }
  $("#chosen-prev").onclick = () => {
    selected.position--;
    drawChosen();
  };
  $("#chosen-next").onclick = () => {
    selected.position++;
    drawChosen();
  };
  $("#close-chosen").onclick = () => {
    $("#use-chord").hidden = true;
  };
  function updateTargets() {
    const names = chords(song().text),
      previous = $("#replace-target").value;
    $("#replace-target").innerHTML = names
      .map((n) => `<option>${esc(n)}</option>`)
      .join("");
    if (names.includes(previous)) $("#replace-target").value = previous;
    $("#replace-chosen").disabled = !names.length;
    occurrences();
    $("#undo-chord").hidden = !undo || undo.id !== song().id;
  }
  function occurrences() {
    const from = $("#replace-target").value;
    const locations = [...song().text.matchAll(/\[([^\]]+)\]/g)].filter(
      (m) => normalizeChord(m[1]) === normalizeChord(from),
    );
    $("#replace-occurrence").innerHTML =
      t`<option value="all">Todas (${locations.length})</option>` +
      locations
        .map(
          (m, i) =>
            t`<option value="${i}">Solo ${i + 1} · línea ${song().text.slice(0, m.index).split("\n").length}</option>`,
        )
        .join("");
  }
  $("#replace-target").onchange = occurrences;
  function apply(replacing) {
    if (!selected || selected.songId !== song().id) return;
    const s = song(),
      from = $("#replace-target").value;
    const occurrence = $("#replace-occurrence").value;
    const source = document.querySelector("#source");
    const nextCursor = source.selectionStart + selected.name.length + 2;
    undo = {
      id: s.id,
      text: s.text,
      chordShapes: structuredClone(s.chordShapes),
      chordStickers: structuredClone(s.chordStickers),
    };
    if (replacing) {
      s.text = replaceChord(
        s.text,
        from,
        selected.name,
        occurrence === "all",
        Number(occurrence),
      );
      if (occurrence === "all")
        for (const sticker of s.chordStickers || [])
          if (Array.isArray(sticker.chords))
            sticker.chords = [
              ...new Set(
                sticker.chords.map((n) =>
                  normalizeChord(n) === normalizeChord(from)
                    ? selected.name
                    : n,
                ),
              ),
            ];
    } else {
      const input = document.querySelector("#source");
      s.text =
        s.text.slice(0, input.selectionStart) +
        `[${selected.name}]` +
        s.text.slice(input.selectionEnd);
    }
    s.chordShapes ||= {};
    s.chordShapes[selected.name] = {
      frets: [...selected.positions[selected.position]],
      star: false,
    };
    undo.after = snapshot();
    changed();
    refresh();
    if (!replacing) source.setSelectionRange(nextCursor, nextCursor);
    updateTargets();
    notify(
      replacing
        ? t("Acorde sustituido. Puedes deshacer el cambio.")
        : t("Acorde y posición añadidos a la canción."),
    );
  }
  $("#insert-chosen").onclick = () => apply(false);
  $("#replace-chosen").onclick = () => apply(true);
  $("#undo-chord").onclick = () => {
    if (!undo || undo.id !== song().id) return;
    if (undo.after !== snapshot()) {
      undo = null;
      updateTargets();
      notify(t("Hay cambios posteriores; se conservan tus últimas ediciones."));
      return;
    }
    const { text, chordShapes, chordStickers } = undo;
    Object.assign(song(), { text, chordShapes, chordStickers });
    undo = null;
    changed();
    refresh();
    updateTargets();
    notify(t("Cambio de acorde deshecho."));
  };
  return {
    setMode,
    refresh() {
      if (selected && selected.songId !== song().id) {
        selected = null;
        $("#use-chord").hidden = true;
      }
      // Do not allow undo to overwrite subsequent text edits.
      if (undo && undo.after !== undefined && undo.after !== snapshot())
        undo = null;

      updateTargets();
      if (mode === "identify") analyze();
    },
  };
}
