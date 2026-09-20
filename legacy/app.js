const DEFAULT_SONG = {
  title: "La Ultima Funcion",
  artist: "El Rique, El Kanka",
  source: `[G]Yo era el arbol
[Cadd9]En la obra de teatro de mi vida
[G]Pero a veces
[Cadd9]Me cambiabas de papel

[G]Yo era el genio
[Cadd9]De una lampara que siempre conseguia
[G]Tus deseos
[Cadd9]Pero nunca los de el

[A7]Y en tu guion fui un soldado
[Am]Usado como [D7]carne de [G]canon
[E7]Para tus dias de guerra
[Am]Y muero siempre en la misma escena
[G]Que pena que asi cerro el [E7]telon
[Am]Muchas gracias, corazon
[D7]Me voy, es la ultima funcion   [G - Cadd9] x2

[G]Yo era el astronauta
[Cadd9]Que se sacrificaba en el espacio
[G]Arreglando tu cohete [Cadd9]para huir

[G]Yo era el heroe
[Cadd9]Tenia todo menos el gimnasio
[G]Solo falta todo lo que [Cadd9]no ves en mi

[A7]Y en tu guion fui un soldado
[Am]Usado como [D7]carne de [G]canon
[E7]Para tus dias de guerra
[Am]Y muero siempre en la misma escena
[G]Que pena que asi cerro el [E7]telon
[Am]Muchas gracias, corazon
[D7]Me voy, es la ultima [G]funcion [E7]

[Am]Mucha mierda, corazon
[D7]Adios, es la ultima [G]funcion`
};

const STORAGE_KEY = "chordiDocuments";
const LEGACY_STORAGE_KEY = "guitarChordEditor";

const BLANK_SONG = {
  title: "Nueva canción",
  artist: "",
  source: "# Intro\n\n[G]Primera linea de la letra\n[C]Segunda linea con otro acorde\n\n# Estribillo\n\n[Am]Escribe aqui tu cancion"
};

function createDocument(song, overrides = {}) {
  const id = overrides.id || `song-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    title: song.title,
    artist: song.artist,
    source: song.source,
    transpose: 0,
    capo: song.title === DEFAULT_SONG.title ? 4 : 0,
    capoAdjust: false,
    twoColumns: true,
    fontSize: 18,
    marginMm: 12,
    editPreview: false,
    currentPage: 0,
    ...overrides
  };
}

const NOTE_NAMES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_NAMES_ES = {
  C: "Do",
  "C#": "Do#",
  D: "Re",
  "D#": "Re#",
  E: "Mi",
  F: "Fa",
  "F#": "Fa#",
  G: "Sol",
  "G#": "Sol#",
  A: "La",
  "A#": "La#",
  B: "Si"
};
const MAJOR_PATTERN = [0, 2, 4, 5, 7, 9, 11];
const MINOR_PATTERN = [0, 2, 3, 5, 7, 8, 10];
const MAJOR_QUALITIES = ["", "m", "m", "", "", "m", "dim"];
const MINOR_QUALITIES = ["m", "dim", "", "m", "m", "", ""];
const FLAT_TO_SHARP = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#"
};

const CHORD_SHAPES = {
  A: { frets: [-1, 0, 2, 2, 2, 0], fingers: ["", "", "1", "2", "3", ""] },
  A7: { frets: [-1, 0, 2, 0, 2, 0], fingers: ["", "", "2", "", "3", ""] },
  Am: { frets: [-1, 0, 2, 2, 1, 0], fingers: ["", "", "2", "3", "1", ""] },
  B7: { frets: [-1, 2, 1, 2, 0, 2], fingers: ["", "2", "1", "3", "", "4"] },
  C: { frets: [-1, 3, 2, 0, 1, 0], fingers: ["", "3", "2", "", "1", ""] },
  Cadd9: { frets: [-1, 3, 2, 0, 3, 3], fingers: ["", "2", "1", "", "3", "4"] },
  D: { frets: [-1, -1, 0, 2, 3, 2], fingers: ["", "", "", "1", "3", "2"] },
  D7: { frets: [-1, -1, 0, 2, 1, 2], fingers: ["", "", "", "2", "1", "3"] },
  Dm: { frets: [-1, -1, 0, 2, 3, 1], fingers: ["", "", "", "2", "3", "1"] },
  E: { frets: [0, 2, 2, 1, 0, 0], fingers: ["", "2", "3", "1", "", ""] },
  E7: { frets: [0, 2, 0, 1, 0, 0], fingers: ["", "2", "", "1", "", ""] },
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: ["", "2", "3", "", "", ""] },
  F: { frets: [1, 3, 3, 2, 1, 1], fingers: ["1", "3", "4", "2", "1", "1"], barre: 1 },
  Fmaj7: { frets: [-1, -1, 3, 2, 1, 0], fingers: ["", "", "3", "2", "1", ""] },
  G: { frets: [3, 2, 0, 0, 0, 3], fingers: ["3", "2", "", "", "", "4"] },
  G7: { frets: [3, 2, 0, 0, 0, 1], fingers: ["3", "2", "", "", "", "1"] }
};

const state = {
  documents: [createDocument(DEFAULT_SONG, { id: "example" })],
  activeDocId: "example",
  title: DEFAULT_SONG.title,
  artist: DEFAULT_SONG.artist,
  source: DEFAULT_SONG.source,
  transpose: 0,
  capo: 4,
  capoAdjust: false,
  twoColumns: true,
  fontSize: 18,
  marginMm: 12,
  editPreview: false,
  currentPage: 0
};

const els = {
  title: document.querySelector("#songTitle"),
  artist: document.querySelector("#songArtist"),
  source: document.querySelector("#songSource"),
  previewPages: document.querySelector("#previewPages"),
  pageIndicator: document.querySelector("#pageIndicator"),
  prevPage: document.querySelector("#prevPage"),
  nextPage: document.querySelector("#nextPage"),
  transposeValue: document.querySelector("#transposeValue"),
  capoValue: document.querySelector("#capoValue"),
  capoLink: document.querySelector("#capoLink"),
  capoLinkHint: document.querySelector("#capoLinkHint"),
  columnsToggle: document.querySelector("#columnsToggle"),
  fontDown: document.querySelector("#fontDown"),
  fontUp: document.querySelector("#fontUp"),
  fontSizeValue: document.querySelector("#fontSizeValue"),
  marginDown: document.querySelector("#marginDown"),
  marginUp: document.querySelector("#marginUp"),
  marginValue: document.querySelector("#marginValue"),
  keyName: document.querySelector("#keyName"),
  keyChords: document.querySelector("#keyChords"),
  degreeList: document.querySelector("#degreeList"),
  saveStatus: document.querySelector("#saveStatus"),
  editPreview: document.querySelector("#editPreview"),
  chordToolbar: document.querySelector("#chordToolbar"),
  newSong: document.querySelector("#newSong"),
  songTabs: document.querySelector("#songTabs"),
  txtFile: document.querySelector("#txtFile"),
  chordTooltip: document.querySelector("#chordTooltip"),
  newSongModal: document.querySelector("#newSongModal"),
  modalTitle: document.querySelector("#modalTitle"),
  modalArtist: document.querySelector("#modalArtist"),
  modalBlank: document.querySelector("#modalBlank"),
  modalImport: document.querySelector("#modalImport"),
  modalCancel: document.querySelector("#modalCancel"),
  closeSongModal: document.querySelector("#closeSongModal"),
  closeCancel: document.querySelector("#closeCancel"),
  closeExport: document.querySelector("#closeExport"),
  closeConfirm: document.querySelector("#closeConfirm"),
  panelTabs: document.querySelectorAll("[data-panel-tab]"),
  panelSections: document.querySelectorAll("[data-panel]")
};

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currentDocument() {
  return state.documents.find((document) => document.id === state.activeDocId) || state.documents[0];
}

function copyDocumentToState(document) {
  Object.assign(state, {
    title: document.title,
    artist: document.artist,
    source: document.source,
    transpose: document.transpose,
    capo: document.capo,
    capoAdjust: document.capoAdjust,
    twoColumns: document.twoColumns,
    fontSize: document.fontSize,
    marginMm: document.marginMm || marginNameToMm(document.marginSize),
    editPreview: document.editPreview,
    currentPage: document.currentPage
  });
}

function persistStateToDocument() {
  const document = currentDocument();
  if (!document) return;
  Object.assign(document, {
    title: state.title,
    artist: state.artist,
    source: state.source,
    transpose: state.transpose,
    capo: state.capo,
    capoAdjust: state.capoAdjust,
    twoColumns: state.twoColumns,
    fontSize: state.fontSize,
    marginMm: state.marginMm,
    editPreview: state.editPreview,
    currentPage: state.currentPage
  });
}

function normalizeShift(value) {
  return ((value % 12) + 12) % 12;
}

function marginNameToMm(value) {
  return { compact: 8, normal: 12, wide: 16 }[value] || 12;
}

function transposeRoot(root, semitones) {
  const normalized = FLAT_TO_SHARP[root] || root;
  const index = NOTE_NAMES_SHARP.indexOf(normalized);
  if (index < 0) return root;
  return NOTE_NAMES_SHARP[normalizeShift(index + semitones)];
}

function transposeChord(chord, semitones) {
  return chord.replace(/(^|[^A-G#b])([A-G](?:#|b)?)/g, (match, prefix, root) => {
    return `${prefix}${transposeRoot(root, semitones)}`;
  });
}

function chordLookupName(chord) {
  const compact = chord.replace(/\s+/g, "");
  const firstChord = compact.split(/[-/]/)[0] || compact;
  const match = firstChord.match(/^([A-G](?:#|b)?)(.*)$/);
  if (!match) return firstChord;
  const root = transposeRoot(match[1], 0);
  const quality = match[2]
    .replace(/^min/i, "m")
    .replace(/^Δ/, "maj")
    .replace(/^M7/, "maj7")
    .replace(/^minor/i, "m")
    .replace(/^major/i, "maj");
  return `${root}${quality}`;
}

function rootIndex(root) {
  return NOTE_NAMES_SHARP.indexOf(transposeRoot(root, 0));
}

function fretFromRoot(root, baseRoot) {
  const fret = normalizeShift(rootIndex(root) - rootIndex(baseRoot));
  return fret === 0 ? 12 : fret;
}

function movableShapeFor(chord) {
  const match = chordLookupName(chord).match(/^([A-G](?:#)?)(m7|maj7|m|7|sus2|sus4|add9|6|9|dim)?$/);
  if (!match) return null;
  const [, root, rawQuality = ""] = match;
  const quality = ["add9", "6", "9"].includes(rawQuality) ? "" : rawQuality;
  if (quality === "dim") {
    const fret = fretFromRoot(root, "A");
    return { frets: [-1, fret, fret + 1, fret + 2, fret + 1, -1], fingers: ["", "1", "2", "4", "3", ""], barre: fret };
  }
  const eFret = fretFromRoot(root, "E");
  const aFret = fretFromRoot(root, "A");
  const preferE = eFret <= 5 || aFret > 7;
  const baseRoot = preferE ? "E" : "A";
  const fret = fretFromRoot(root, baseRoot);

  if (preferE) {
    if (quality === "m") return { frets: [fret, fret + 2, fret + 2, fret, fret, fret], fingers: ["1", "3", "4", "1", "1", "1"], barre: fret };
    if (quality === "m7") return { frets: [fret, fret + 2, fret, fret, fret, fret], fingers: ["1", "3", "1", "1", "1", "1"], barre: fret };
    if (quality === "maj7") return { frets: [fret, fret + 2, fret + 1, fret + 1, fret, fret], fingers: ["1", "4", "2", "3", "1", "1"], barre: fret };
    if (quality === "7") return { frets: [fret, fret + 2, fret, fret + 1, fret, fret], fingers: ["1", "3", "1", "2", "1", "1"], barre: fret };
    if (quality === "sus4") return { frets: [fret, fret + 2, fret + 2, fret + 2, fret, fret], fingers: ["1", "2", "3", "4", "1", "1"], barre: fret };
    if (quality === "sus2") return { frets: [fret, fret + 2, fret + 2, fret - 1, fret, fret], fingers: ["1", "3", "4", "", "1", "1"], barre: fret };
    return { frets: [fret, fret + 2, fret + 2, fret + 1, fret, fret], fingers: ["1", "3", "4", "2", "1", "1"], barre: fret };
  }

  if (quality === "m") return { frets: [-1, fret, fret + 2, fret + 2, fret + 1, fret], fingers: ["", "1", "3", "4", "2", "1"], barre: fret };
  if (quality === "m7") return { frets: [-1, fret, fret + 2, fret, fret + 1, fret], fingers: ["", "1", "3", "1", "2", "1"], barre: fret };
  if (quality === "maj7") return { frets: [-1, fret, fret + 2, fret + 1, fret + 2, fret], fingers: ["", "1", "3", "2", "4", "1"], barre: fret };
  if (quality === "7") return { frets: [-1, fret, fret + 2, fret, fret + 2, fret], fingers: ["", "1", "3", "1", "4", "1"], barre: fret };
  if (quality === "sus4") return { frets: [-1, fret, fret + 2, fret + 2, fret + 3, fret], fingers: ["", "1", "2", "3", "4", "1"], barre: fret };
  if (quality === "sus2") return { frets: [-1, fret, fret + 2, fret + 2, fret, fret], fingers: ["", "1", "3", "4", "1", "1"], barre: fret };
  return { frets: [-1, fret, fret + 2, fret + 2, fret + 2, fret], fingers: ["", "1", "2", "3", "4", "1"], barre: fret };
}

function getChordShape(chord) {
  return CHORD_SHAPES[chordLookupName(chord)] || movableShapeFor(chord);
}

function extractChordNames(source = state.source) {
  return [...source.matchAll(/\[([^\]]+)\]/g)]
    .flatMap((match) => match[1].split(/[-|]/))
    .map((chord) => chord.trim())
    .filter(Boolean);
}

function chordRoot(chord) {
  return chordLookupName(chord).match(/^([A-G](?:#)?)/)?.[1] || null;
}

function detectKey() {
  const chords = extractChordNames();
  if (!chords.length) return { name: "Sin acordes", suggestions: "Añade acordes para analizar tonalidad." };
  const roots = chords.map(chordRoot).filter(Boolean);
  const lastRoot = roots.at(-1);
  let best = { score: -1, root: roots[0], mode: "major" };

  NOTE_NAMES_SHARP.forEach((root) => {
    const rootIdx = rootIndex(root);
    [
      { mode: "major", pattern: MAJOR_PATTERN },
      { mode: "minor", pattern: MINOR_PATTERN }
    ].forEach((candidate) => {
      const score = roots.reduce((sum, chordRootName, index) => {
        const interval = normalizeShift(rootIndex(chordRootName) - rootIdx);
        const inKey = candidate.pattern.includes(interval);
        const tonicBonus = chordRootName === root ? 1.2 : 0;
        const lastBonus = index === roots.length - 1 && chordRootName === root ? 2 : 0;
        return sum + (inKey ? 1 : -0.25) + tonicBonus + lastBonus;
      }, lastRoot === root ? 1 : 0);
      if (score > best.score) best = { ...candidate, root, score };
    });
  });

  const qualities = best.mode === "major" ? MAJOR_QUALITIES : MINOR_QUALITIES;
  const suggestions = (best.mode === "major" ? MAJOR_PATTERN : MINOR_PATTERN)
    .map((step, index) => `${NOTE_NAMES_SHARP[normalizeShift(rootIndex(best.root) + step)]}${qualities[index]}`)
    .map((chord, index) => ({ degree: ["I", "II", "III", "IV", "V", "VI", "VII"][index], chord }));
  return {
    name: `${NOTE_NAMES_ES[best.root]} ${best.mode === "major" ? "mayor" : "menor"}`,
    suggestions: suggestions.map((item) => item.chord).join(" · "),
    degrees: suggestions
  };
}

function suggestedToolbarChords() {
  const existing = [...new Set(extractChordNames().map(chordLookupName))]
    .filter((chord) => /^[A-G](?:#)?/.test(chord))
    .slice(0, 8);
  if (existing.length >= 4) return existing;
  const keyInfo = detectKey();
  const tonal = keyInfo.suggestions && !keyInfo.suggestions.includes("Añade")
    ? keyInfo.suggestions.split(" · ").slice(0, 8)
    : ["G", "C", "D", "Em", "Am", "D7"];
  return [...new Set([...existing, ...tonal])].slice(0, 8);
}

function renderChordToolbar() {
  els.chordToolbar.innerHTML = "";
  suggestedToolbarChords().forEach((chord) => {
    const button = window.document.createElement("button");
    button.type = "button";
    button.dataset.chord = chord;
    button.textContent = chord;
    els.chordToolbar.append(button);
  });
}

function renderDegrees(keyInfo) {
  els.degreeList.innerHTML = "";
  (keyInfo.degrees || []).forEach((item) => {
    const row = window.document.createElement("div");
    row.className = "degree-row";
    const degree = window.document.createElement("span");
    degree.textContent = item.degree;
    const chord = window.document.createElement("strong");
    chord.textContent = item.chord;
    row.append(degree, chord);
    els.degreeList.append(row);
  });
}

function effectiveShift() {
  return state.transpose - (state.capoAdjust ? state.capo : 0);
}

function toggleCapoLink() {
  const visibleShift = effectiveShift();
  update({
    capoAdjust: !state.capoAdjust,
    transpose: state.capoAdjust ? visibleShift : visibleShift + state.capo
  });
}

function changeCapo(delta) {
  const nextCapo = Math.max(0, Math.min(12, state.capo + delta));
  const appliedDelta = nextCapo - state.capo;
  update({
    capo: nextCapo,
    transpose: state.capoAdjust ? state.transpose + appliedDelta : state.transpose
  });
}

function parseLine(line) {
  const parts = [];
  const chordPattern = /\[([^\]]+)\]/g;
  let cursor = 0;
  let pendingChord = "";
  let match;

  while ((match = chordPattern.exec(line)) !== null) {
    const textBefore = line.slice(cursor, match.index);
    if (textBefore || pendingChord) {
      parts.push({ chord: pendingChord, text: textBefore });
      pendingChord = "";
    }
    pendingChord = match[1].trim();
    cursor = match.index + match[0].length;
  }

  const rest = line.slice(cursor);
  if (rest || pendingChord || parts.length === 0) {
    parts.push({ chord: pendingChord, text: rest });
  }

  return parts;
}

function serializeLine(lineEl) {
  return Array.from(lineEl.querySelectorAll(".token"))
    .map((token) => {
      const chord = token.querySelector(".chord-row")?.textContent.trim() || "";
      const text = token.querySelector(".word-row")?.textContent || "";
      return `${chord ? `[${chord}]` : ""}${text.replace(/\u00a0/g, " ")}`;
    })
    .join("");
}

function updateSourceLine(index, value) {
  const lines = state.source.split(/\r?\n/);
  lines[index] = value;
  state.source = lines.join("\n");
  persistStateToDocument();
  syncControls();
  saveState();
}

function chordDiagramSvg(name, shape) {
  const strings = 6;
  const frets = 5;
  const width = 160;
  const height = 196;
  const left = 26;
  const top = 54;
  const gridWidth = 108;
  const fretGap = 23;
  const stringGap = gridWidth / (strings - 1);
  const maxFret = Math.max(...shape.frets);
  const baseFret = maxFret > 5 ? Math.min(...shape.frets.filter((fret) => fret > 0)) : 1;
  const yForFret = (fret) => top + (fret - baseFret + 0.5) * fretGap;

  let svg = `<svg class="chord-diagram" viewBox="0 0 ${width} ${height}" role="img" aria-label="Acorde ${escapeHtml(name)}">`;
  svg += `<text x="${width / 2}" y="22" text-anchor="middle" fill="#edf4fb" font-size="16" font-weight="900">${escapeHtml(name)}</text>`;

  for (let i = 0; i < strings; i += 1) {
    const x = left + i * stringGap;
    svg += `<line x1="${x}" y1="${top}" x2="${x}" y2="${top + frets * fretGap}" stroke="#b9c8d8" stroke-width="1.4"/>`;
  }

  for (let fret = 0; fret <= frets; fret += 1) {
    const y = top + fret * fretGap;
    const strokeWidth = fret === 0 && baseFret === 1 ? 4 : 1.4;
    svg += `<line x1="${left}" y1="${y}" x2="${left + gridWidth}" y2="${y}" stroke="#b9c8d8" stroke-width="${strokeWidth}"/>`;
  }

  if (baseFret > 1) {
    svg += `<text x="4" y="${top + 16}" fill="#b9c8d8" font-size="12">${baseFret}fr</text>`;
  }

  shape.frets.forEach((fret, index) => {
    const x = left + index * stringGap;
    if (fret === -1) {
      svg += `<text x="${x}" y="${top - 9}" text-anchor="middle" fill="#f19a7b" font-size="13" font-weight="800">x</text>`;
      return;
    }
    if (fret === 0) {
      svg += `<circle cx="${x}" cy="${top - 13}" r="4.3" fill="none" stroke="#b9c8d8" stroke-width="1.6"/>`;
      return;
    }
    svg += `<circle cx="${x}" cy="${yForFret(fret)}" r="8.5" fill="#6eb6ff"/>`;
    const finger = shape.fingers[index];
    if (finger) {
      svg += `<text x="${x}" y="${yForFret(fret) + 4}" text-anchor="middle" fill="#0b111a" font-size="10" font-weight="900">${finger}</text>`;
    }
  });

  if (shape.barre) {
    const y = yForFret(shape.barre);
    svg += `<rect x="${left - 7}" y="${y - 7}" width="${gridWidth + 14}" height="14" rx="7" fill="#6eb6ff" opacity="0.32"/>`;
  }

  svg += `</svg>`;
  return svg;
}

function showChordTooltip(event, chordName) {
  const shape = getChordShape(chordName);
  if (!shape) return;
  els.chordTooltip.innerHTML = chordDiagramSvg(chordName, shape);
  els.chordTooltip.hidden = false;
  moveChordTooltip(event);
}

function moveChordTooltip(event) {
  if (els.chordTooltip.hidden) return;
  const offset = 18;
  const width = 172;
  const left = Math.min(window.innerWidth - width - 14, event.clientX + offset);
  const top = Math.min(window.innerHeight - 210, event.clientY + offset);
  els.chordTooltip.style.left = `${Math.max(12, left)}px`;
  els.chordTooltip.style.top = `${Math.max(12, top)}px`;
}

function hideChordTooltip() {
  els.chordTooltip.hidden = true;
}

function lineWeight(line) {
  if (!line.trim()) return 0.45;
  if (/^\s*#/.test(line)) return 0.75;
  return 1 + Math.max(0, line.length - 52) / 70;
}

function paginateLines(lines) {
  const fontFactor = 18 / state.fontSize;
  const marginFactor = Math.max(0.82, Math.min(1.35, 1.24 - (state.marginMm - 8) * 0.035));
  const capacity = Math.floor((state.twoColumns ? 34 : 18) * fontFactor * marginFactor);
  const pages = [];
  let page = [];
  let weight = 0;

  lines.forEach((line, index) => {
    const nextWeight = lineWeight(line);
    if (page.length && weight + nextWeight > capacity) {
      pages.push(page);
      page = [];
      weight = 0;
    }
    page.push({ line, index });
    weight += nextWeight;
  });

  if (page.length) pages.push(page);
  return pages.length ? pages : [[{ line: "", index: 0 }]];
}

function createPage(pageLines, pageIndex) {
  const paper = document.createElement("article");
  paper.className = "paper";
  paper.dataset.pageIndex = pageIndex;
  paper.classList.toggle("edit-mode", state.editPreview);
  paper.style.setProperty("--preview-font-size", `${state.fontSize}px`);
  paper.style.setProperty("--page-padding-screen", `${Math.round(state.marginMm * 5.3)}px`);
  paper.style.setProperty("--page-padding-print", `${state.marginMm}mm`);

  if (pageIndex === 0) {
    const header = document.createElement("header");
    header.className = "song-header";
    const title = document.createElement("h2");
    title.textContent = `${state.title}${state.artist ? ` - ${state.artist}` : ""}`;
    const meta = document.createElement("p");
    meta.textContent = state.capo > 0 ? `Capo ${state.capo}` : "Sin cejilla";
    header.append(title, meta);
    paper.append(header);
  }

  const preview = document.createElement("div");
  preview.className = "song-preview";
  preview.classList.toggle("two-columns", state.twoColumns);
  paper.append(preview);

  pageLines.forEach(({ line, index }) => renderLine(line, index, preview));
  return paper;
}

function renderLine(line, lineIndex, preview) {
  const shift = effectiveShift();
  if (!line.trim()) {
    const blank = document.createElement("div");
    blank.className = "blank-line";
    preview.append(blank);
    return;
  }

  if (/^\s*#/.test(line)) {
    const title = document.createElement("div");
    title.className = "section-title";
    title.textContent = line.replace(/^\s*#\s*/, "");
    preview.append(title);
    return;
  }

  const lineEl = document.createElement("div");
  lineEl.className = "lyric-line";
  lineEl.dataset.lineIndex = lineIndex;

  parseLine(line).forEach((part) => {
    const token = document.createElement("span");
    token.className = "token";

    const chord = document.createElement("span");
    chord.className = "chord-row";
    const chordText = part.chord ? transposeChord(part.chord, shift) : "";
    chord.textContent = chordText || "\u00a0";
    if (chordText && getChordShape(chordText)) {
      chord.classList.add("has-diagram");
      chord.addEventListener("mouseenter", (event) => showChordTooltip(event, chordText));
      chord.addEventListener("mousemove", moveChordTooltip);
      chord.addEventListener("mouseleave", hideChordTooltip);
    }
    if (state.editPreview) {
      chord.contentEditable = "true";
      chord.spellcheck = false;
    }

    const word = document.createElement("span");
    word.className = part.text ? "word-row" : "word-row plain-line";
    word.textContent = part.text || "\u00a0";
    if (state.editPreview) {
      word.contentEditable = "true";
      word.spellcheck = true;
    }

    token.append(chord, word);
    lineEl.append(token);
  });

  if (state.editPreview) {
    lineEl.addEventListener("focusout", (event) => {
      if (lineEl.contains(event.relatedTarget)) return;
      updateSourceLine(Number(lineEl.dataset.lineIndex), serializeLine(lineEl));
    });
  }

  preview.append(lineEl);
}

function renderSong() {
  const lines = state.source.split(/\r?\n/);
  const pages = paginateLines(lines);
  state.currentPage = Math.min(state.currentPage, pages.length - 1);
  els.previewPages.innerHTML = "";
  pages.forEach((pageLines, index) => els.previewPages.append(createPage(pageLines, index)));
  els.pageIndicator.textContent = `${state.currentPage + 1} de ${pages.length}`;
  els.prevPage.disabled = state.currentPage === 0;
  els.nextPage.disabled = state.currentPage === pages.length - 1;
  observePages();
}

function renderTabs() {
  els.songTabs.innerHTML = "";
  state.documents.forEach((songDocument) => {
    const tab = window.document.createElement("div");
    tab.className = "song-tab";
    tab.classList.toggle("active", songDocument.id === state.activeDocId);
    tab.title = songDocument.artist ? `${songDocument.title} - ${songDocument.artist}` : songDocument.title;
    const label = window.document.createElement("button");
    label.type = "button";
    label.className = "song-tab-label";
    label.textContent = songDocument.title || "Sin título";
    label.addEventListener("click", () => switchDocument(songDocument.id));
    const close = window.document.createElement("button");
    close.type = "button";
    close.className = "close-tab";
    close.title = `Cerrar ${songDocument.title || "canción"}`;
    close.textContent = "×";
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      requestCloseDocument(songDocument.id);
    });
    tab.append(label, close);
    els.songTabs.append(tab);
  });
}

let pageObserver;

function setCurrentPageFromScroll(pageIndex) {
  const pages = Array.from(els.previewPages.querySelectorAll(".paper"));
  state.currentPage = Math.max(0, Math.min(pageIndex, pages.length - 1));
  persistStateToDocument();
  els.pageIndicator.textContent = `${state.currentPage + 1} de ${pages.length || 1}`;
  els.prevPage.disabled = state.currentPage === 0;
  els.nextPage.disabled = state.currentPage === pages.length - 1;
}

function observePages() {
  if (pageObserver) pageObserver.disconnect();
  const pages = Array.from(els.previewPages.querySelectorAll(".paper"));
  pageObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setCurrentPageFromScroll(Number(visible.target.dataset.pageIndex));
    },
    { root: els.previewPages.parentElement, threshold: [0.25, 0.45, 0.65] }
  );
  pages.forEach((page) => pageObserver.observe(page));
}

function saveState() {
  persistStateToDocument();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  els.saveStatus.textContent = "Guardado local";
  window.clearTimeout(saveState.timeout);
  saveState.timeout = window.setTimeout(() => {
    els.saveStatus.textContent = "Listo";
  }, 1200);
}

function syncControls() {
  els.title.value = state.title;
  els.artist.value = state.artist;
  els.source.value = state.source;
  els.transposeValue.textContent = state.transpose > 0 ? `+${state.transpose}` : `${state.transpose}`;
  els.capoValue.textContent = state.capo;
  els.capoLink.classList.toggle("active", state.capoAdjust);
  els.capoLink.textContent = "🔗";
  els.capoLink.title = state.capoAdjust ? "La cejilla compensa los acordes visibles" : "La cejilla solo se muestra como indicación";
  els.capoLinkHint.textContent = state.capoAdjust ? "Cadena activa: la cejilla compensa los acordes visibles" : "Cadena inactiva: la cejilla solo se muestra en la hoja";
  els.columnsToggle.textContent = state.twoColumns ? "2" : "1";
  els.columnsToggle.classList.toggle("active", state.twoColumns);
  els.fontSizeValue.textContent = `${state.fontSize} px`;
  els.marginValue.textContent = `${state.marginMm} mm`;
  const keyInfo = detectKey();
  els.keyName.textContent = keyInfo.name;
  els.keyChords.textContent = keyInfo.suggestions;
  renderDegrees(keyInfo);
  els.editPreview.classList.toggle("active", state.editPreview);
  els.editPreview.title = state.editPreview ? "Salir de edición" : "Editar hoja";
  els.editPreview.setAttribute("aria-label", els.editPreview.title);
  els.editPreview.textContent = state.editPreview ? "✓" : "✎";
  renderChordToolbar();
  renderTabs();
}

function update(next) {
  Object.assign(state, next);
  persistStateToDocument();
  syncControls();
  renderSong();
  saveState();
}

function changeFontSize(delta) {
  update({ fontSize: Math.max(12, Math.min(28, state.fontSize + delta)) });
}

function changeMargin(delta) {
  update({ marginMm: Math.max(6, Math.min(22, state.marginMm + delta)) });
}

function switchDocument(id) {
  persistStateToDocument();
  state.activeDocId = id;
  copyDocumentToState(currentDocument());
  syncControls();
  renderSong();
  jumpToPage(state.currentPage, false);
  saveState();
}

let pendingCloseId = null;

function requestCloseDocument(id) {
  if (state.documents.length === 1) {
    els.saveStatus.textContent = "Deja una canción abierta";
    return;
  }
  pendingCloseId = id;
  els.closeSongModal.showModal();
}

function closePendingDocument() {
  if (!pendingCloseId) return;
  const index = state.documents.findIndex((document) => document.id === pendingCloseId);
  if (index < 0) return;
  state.documents.splice(index, 1);
  if (state.activeDocId === pendingCloseId) {
    state.activeDocId = state.documents[Math.max(0, index - 1)]?.id || state.documents[0].id;
    copyDocumentToState(currentDocument());
  }
  pendingCloseId = null;
  els.closeSongModal.close();
  syncControls();
  renderSong();
  saveState();
}

function jumpToPage(nextPage, smooth = true) {
  const pages = Array.from(els.previewPages.querySelectorAll(".paper"));
  if (!pages.length) return;
  state.currentPage = Math.max(0, Math.min(nextPage, pages.length - 1));
  persistStateToDocument();
  els.pageIndicator.textContent = `${state.currentPage + 1} de ${pages.length}`;
  els.prevPage.disabled = state.currentPage === 0;
  els.nextPage.disabled = state.currentPage === pages.length - 1;
  pages[state.currentPage].scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  saveState();
}

function insertChord(chord) {
  const textarea = els.source;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const insertion = `[${chord}]`;
  const nextSource = `${state.source.slice(0, start)}${insertion}${state.source.slice(end)}`;
  update({ source: nextSource });
  textarea.focus();
  const caret = start + insertion.length;
  textarea.setSelectionRange(caret, caret);
}

function downloadFile(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "cancion";
}

function exportWord() {
  const blob = createDocx();
  downloadFile(`${slugify(state.title)}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", blob);
}

function xmlEscape(value) {
  return escapeHtml(value).replaceAll("\n", " ");
}

function docxParagraph(text, options = {}) {
  const align = options.align ? `<w:jc w:val="${options.align}"/>` : "";
  const size = options.size ? `<w:sz w:val="${options.size}"/>` : "";
  const color = options.color ? `<w:color w:val="${options.color}"/>` : "";
  const bold = options.bold ? "<w:b/>" : "";
  const spacing = `<w:spacing w:after="${options.after || 80}"/>`;
  return `<w:p><w:pPr>${align}${spacing}</w:pPr><w:r><w:rPr>${bold}${size}${color}</w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
}

function docxLine(line, shift) {
  const bodySize = Math.round(state.fontSize * 1.5);
  if (!line.trim()) return docxParagraph("", { after: 120 });
  if (/^\s*#/.test(line)) return docxParagraph(line.replace(/^\s*#\s*/, ""), { bold: true, color: "9A4A26", after: 90 });
  const parts = parseLine(line);
  const chordLine = parts.map((part) => (part.chord ? transposeChord(part.chord, shift) : " ".repeat(Math.max(1, part.text.length)))).join(" ");
  const lyricLine = parts.map((part) => part.text).join("");
  return `${docxParagraph(chordLine, { bold: true, size: bodySize, after: 0 })}${docxParagraph(lyricLine, { size: bodySize, after: 95 })}`;
}

function docxTableColumn(lines, shift) {
  return lines.map((line) => docxLine(line, shift)).join("");
}

function docxSongBody() {
  const shift = effectiveShift();
  const marginTwips = Math.round(state.marginMm * 56.7);
  const header = [
    docxParagraph(`${state.title}${state.artist ? ` - ${state.artist}` : ""}`, { align: "center", bold: true, size: 48, color: "125C9F", after: 140 }),
    docxParagraph(state.capo > 0 ? `Capo ${state.capo}` : "Sin cejilla", { align: "center", size: 32, color: "68707D", after: 420 })
  ];
  const lines = state.source.split(/\r?\n/);
  if (!state.twoColumns) {
    header.push(lines.map((line) => docxLine(line, shift)).join(""));
  } else {
    const midpoint = Math.ceil(lines.length / 2);
    const left = lines.slice(0, midpoint);
    const right = lines.slice(midpoint);
    header.push(`<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="5000"/><w:gridCol w:w="5000"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="2500" w:type="pct"/></w:tcPr>${docxTableColumn(left, shift)}</w:tc><w:tc><w:tcPr><w:tcW w:w="2500" w:type="pct"/></w:tcPr>${docxTableColumn(right, shift)}</w:tc></w:tr></w:tbl>`);
  }
  header.push(`<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="${marginTwips}" w:right="${marginTwips}" w:bottom="${marginTwips}" w:left="${marginTwips}"/></w:sectPr>`);
  return header.join("");
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}

function writeUint32(bytes, value) {
  bytes.push(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255);
}

function writeUint16(bytes, value) {
  bytes.push(value & 255, (value >>> 8) & 255);
}

function zipStore(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local = [];
    writeUint32(local, 0x04034b50);
    writeUint16(local, 20);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint32(local, crc);
    writeUint32(local, data.length);
    writeUint32(local, data.length);
    writeUint16(local, nameBytes.length);
    writeUint16(local, 0);
    chunks.push(new Uint8Array([...local, ...nameBytes, ...data]));

    const directory = [];
    writeUint32(directory, 0x02014b50);
    writeUint16(directory, 20);
    writeUint16(directory, 20);
    writeUint16(directory, 0);
    writeUint16(directory, 0);
    writeUint16(directory, 0);
    writeUint16(directory, 0);
    writeUint32(directory, crc);
    writeUint32(directory, data.length);
    writeUint32(directory, data.length);
    writeUint16(directory, nameBytes.length);
    writeUint16(directory, 0);
    writeUint16(directory, 0);
    writeUint16(directory, 0);
    writeUint16(directory, 0);
    writeUint32(directory, 0);
    writeUint32(directory, offset);
    central.push(new Uint8Array([...directory, ...nameBytes]));
    offset += local.length + nameBytes.length + data.length;
  });

  const centralSize = central.reduce((sum, item) => sum + item.length, 0);
  const end = [];
  writeUint32(end, 0x06054b50);
  writeUint16(end, 0);
  writeUint16(end, 0);
  writeUint16(end, files.length);
  writeUint16(end, files.length);
  writeUint32(end, centralSize);
  writeUint32(end, offset);
  writeUint16(end, 0);
  return new Blob([...chunks, ...central, new Uint8Array(end)], { type: "application/zip" });
}

function createDocx() {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${docxSongBody()}</w:body></w:document>`;
  return zipStore([
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: "word/document.xml", content: documentXml }
  ]);
}

function isChordLine(line) {
  const chord = "(?:[A-G](?:#|b)?(?:maj|min|m|sus|add|dim|aug)?\\d*(?:/[A-G](?:#|b)?)?)";
  const trimmed = line.trim();
  if (!trimmed || !/[A-G]/.test(trimmed)) return false;
  const chordMatches = trimmed.match(new RegExp(chord, "g")) || [];
  const chordChars = chordMatches.join("").length;
  const letterChars = (trimmed.match(/[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]/g) || []).length;
  return new RegExp(`^\\s*(?:${chord}|[-()x0-9\\s|:.,])+\\s*$`).test(trimmed) || (chordMatches.length >= 1 && chordChars / Math.max(1, letterChars) > 0.68);
}

function chordRegex() {
  return /[A-G](?:#|b)?(?:(?:maj|min|m|sus|add|dim|aug)?\d+|maj|min|m|sus|add|dim|aug)?(?:\/[A-G](?:#|b)?)?/g;
}

function splitPackedChords(text) {
  return text.replace(/[A-G](?:#|b)?(?:(?:maj|min|m|sus|add|dim|aug)?\d*)?(?:[A-G](?:#|b)?(?:(?:maj|min|m|sus|add|dim|aug)?\d*)?)+/g, (chunk) => {
    const matches = chunk.match(chordRegex()) || [chunk];
    return matches.join(" ");
  });
}

function normalizePotentialChordLine(line) {
  return splitPackedChords(line.replace(/\b([A-G])\s+(m|maj|dim|sus|add)?\s*(\d)\b/g, "$1$2$3"));
}

function normalizeLyricSpacing(line) {
  return line
    .replace(/\b([A-Za-zÁÉÍÓÚÜáéíóúüÑñ]{2,})\s+([áéíóúü])\b/g, "$1$2")
    .replace(/\s+/g, " ")
    .trimEnd();
}

function normalizeImportedLine(line) {
  const normalized = normalizePotentialChordLine(line);
  if (isChordLine(normalized)) return normalized.trimEnd();
  return normalizeLyricSpacing(normalized);
}

function mergeChordLine(chordLine, lyricLine) {
  const matches = [...splitPackedChords(chordLine).matchAll(chordRegex())];
  if (!matches.length) return lyricLine;
  let result = lyricLine;
  matches.reverse().forEach((match) => {
    const position = Math.min(match.index || 0, result.length);
    result = `${result.slice(0, position)}[${match[0]}]${result.slice(position)}`;
  });
  return result;
}

function chordifyPlainText(text) {
  const clean = normalizeImportedText(text);
  if (/\[[A-G](?:#|b)?/.test(clean)) return clean;
  const lines = clean.split("\n");
  const output = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (isChordLine(lines[i]) && lines[i + 1] && !isChordLine(lines[i + 1])) {
      output.push(mergeChordLine(lines[i], lines[i + 1]));
      i += 1;
    } else {
      output.push(lines[i]);
    }
  }
  return output.join("\n").replace(/\n{4,}/g, "\n\n\n");
}

function normalizeImportedText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, "    ")
    .split("\n")
    .map(normalizeImportedLine)
    .filter((line, index, lines) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (/^\d+$/.test(trimmed)) return false;
      if (/^(page|pagina|página)\s+\d+/i.test(trimmed)) return false;
      return !(index > 0 && trimmed === lines[index - 1]?.trim());
    })
    .join("\n");
}

function inferTitle(text, fallback) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !isChordLine(line) && !/\[[A-G]/.test(line))
    ?.slice(0, 80) || fallback;
}

function normalizeComparable(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stripImportedHeader(source, title, artist) {
  const titleKey = normalizeComparable(title);
  const artistKey = normalizeComparable(artist);
  const lines = source.split("\n");
  let index = 0;

  while (index < Math.min(lines.length, 8)) {
    const key = normalizeComparable(lines[index]);
    const isTitle = titleKey && (key === titleKey || key.includes(titleKey) || titleKey.includes(key));
    const isArtist = artistKey && (key === artistKey || key.includes(artistKey));
    const isCapo = /^(capo|cejilla|sin cejilla)(\s+\d+)?$/i.test(lines[index].trim());
    if (!key || isTitle || isArtist || isCapo) {
      index += 1;
      continue;
    }
    break;
  }

  return lines.slice(index).join("\n").replace(/^\n+/, "");
}

function extractPdfLikeText(raw) {
  const literalStrings = [...raw.matchAll(/\(([^()]|\\.){2,}\)/g)]
    .map((match) => match[0].slice(1, -1).replace(/\\([()\\])/g, "$1"))
    .map((value) => value.replace(/[^\n\r\t -~ÁÉÍÓÚÜáéíóúüÑñ¿¡]/g, " ").replace(/\s+/g, " ").trim())
    .filter((value) => value.length > 2 && /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(value));
  return literalStrings.join("\n");
}

function looksReadable(text) {
  const compact = text.replace(/\s/g, "");
  if (compact.length < 12) return false;
  const readable = compact.match(/[A-Za-zÁÉÍÓÚÜáéíóúüÑñ0-9.,;:¿?!¡()[\]#/\-]/g)?.length || 0;
  const weird = compact.match(/[\uFFFD@{}<>^~\\]/g)?.length || 0;
  return readable / compact.length > 0.78 && weird / compact.length < 0.08;
}

function importTextFromFile(file, text) {
  const fallbackTitle = file.name.replace(/\.[^.]+$/, "");
  const initialSource = chordifyPlainText(text);
  const title = pendingImportMeta?.title || inferTitle(initialSource, fallbackTitle);
  const artist = pendingImportMeta?.artist || "";
  const source = stripImportedHeader(initialSource, title, artist);
  const document = createDocument({
    title,
    artist,
    source
  }, {
    capo: 0
  });
  pendingImportMeta = null;
  state.documents.push(document);
  switchDocument(document.id);
  update({
    source,
    title: document.title,
    artist: document.artist,
    transpose: 0,
    currentPage: 0
  });
}

let pendingImportMeta = null;

function readModalMeta() {
  return {
    title: els.modalTitle.value.trim(),
    artist: els.modalArtist.value.trim()
  };
}

function openNewSongModal() {
  els.modalTitle.value = "";
  els.modalArtist.value = "";
  els.newSongModal.showModal();
  els.modalTitle.focus();
}

function showPanel(panelName) {
  els.panelTabs.forEach((button) => button.classList.toggle("active", button.dataset.panelTab === panelName));
  els.panelSections.forEach((section) => section.classList.toggle("active", section.dataset.panel === panelName));
}

function createBlankFromModal() {
  const meta = readModalMeta();
  const document = createDocument({
    ...BLANK_SONG,
    title: meta.title || BLANK_SONG.title,
    artist: meta.artist
  }, { editPreview: true });
  state.documents.push(document);
  els.newSongModal.close();
  switchDocument(document.id);
}

function importTextFile(file) {
  const lowerName = file.name.toLowerCase();
  if (/\.(doc|docx)$/i.test(lowerName)) {
    pendingImportMeta = null;
    els.saveStatus.textContent = "DOC/DOCX no soportado aún";
    return;
  }
  if (lowerName.endsWith(".pdf")) {
    importPdfFile(file);
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    let raw = "";
    if (reader.result instanceof ArrayBuffer) {
      raw = new TextDecoder("latin1").decode(reader.result);
    } else {
      raw = String(reader.result || "");
    }
    const isBinaryImport = /\.(pdf|doc|docx)$/i.test(lowerName);
    const source = lowerName.endsWith(".pdf") ? extractPdfLikeText(raw) : raw;
    if (!source.trim() || (isBinaryImport && !looksReadable(source))) {
      pendingImportMeta = null;
      els.saveStatus.textContent = "Archivo sin texto legible";
      return;
    }
    importTextFromFile(file, source);
  });
  reader.readAsText(file);
}

async function importPdfFile(file) {
  if (!window.pdfjsLib) {
    pendingImportMeta = null;
    els.saveStatus.textContent = "PDF.js no disponible";
    return;
  }
  try {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await window.pdfjsLib.getDocument({ data }).promise;
    const pageTexts = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });
      pageTexts.push(textItemsToLines(textContent.items, viewport.width, viewport.height));
    }
    const text = pageTexts.join("\n\n").trim();
    if (!looksReadable(text)) {
      pendingImportMeta = null;
      els.saveStatus.textContent = "PDF sin texto legible";
      return;
    }
    importTextFromFile(file, text);
  } catch {
    pendingImportMeta = null;
    els.saveStatus.textContent = "No pude leer el PDF";
  }
}

function textItemsToLines(items, pageWidth = 0, pageHeight = 0) {
  const usableItems = items
    .map((item) => ({
      x: item.transform?.[4] || 0,
      y: item.transform?.[5] || 0,
      width: item.width || 0,
      text: item.str || ""
    }))
    .filter((item) => item.text.trim());
  if (!usableItems.length) return "";
  const textXs = usableItems.map((item) => item.x);
  const minX = Math.min(...textXs);
  const maxX = Math.max(...textXs);
  const hasTwoColumns = pageWidth > 0 && maxX - minX > pageWidth * 0.55;
  if (!hasTwoColumns) return itemsToColumnLines(usableItems);

  const splitX = pageWidth / 2;
  const rows = groupPdfRows(usableItems);
  const headerRows = [];
  const bodyItems = [];
  const topLimit = pageHeight ? pageHeight * 0.76 : Infinity;

  rows.forEach((row) => {
    const rowMinX = Math.min(...row.items.map((item) => item.x));
    const rowMaxX = Math.max(...row.items.map((item) => item.x + item.width));
    const crossesCenter = rowMinX < splitX && rowMaxX > splitX;
    const rowText = row.items.map((item) => item.text).join(" ");
    const isTopHeader = row.y > topLimit && !isChordLine(rowText);
    if (crossesCenter && isTopHeader) {
      headerRows.push(row);
    } else {
      bodyItems.push(...row.items.map((item) => ({ ...item, y: row.y })));
    }
  });

  const left = bodyItems.filter((item) => item.x < splitX);
  const right = bodyItems.filter((item) => item.x >= splitX);
  const headerText = headerRows
    .sort((a, b) => b.y - a.y)
    .map((row) => normalizeImportedLine(row.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(" ")))
    .filter(Boolean)
    .join("\n");
  const bodyText = [left, right]
    .filter((columnItems) => columnItems.length)
    .map(itemsToColumnLines)
    .join("\n\n");
  return [headerText, bodyText].filter(Boolean).join("\n\n");
}

function groupPdfRows(items) {
  const rows = [];
  const yTolerance = 3;
  items.forEach((item) => {
    const { y } = item;
    let row = rows.find((candidate) => Math.abs(candidate.y - y) <= yTolerance);
    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }
    row.items.push(item);
  });
  return rows;
}

function itemsToColumnLines(items) {
  return groupPdfRows(items)
    .sort((a, b) => b.y - a.y)
    .map((row) => row.items.sort((a, b) => a.x - b.x).map((item, index, sorted) => {
      const previous = sorted[index - 1];
      const gap = previous ? item.x - previous.x : 0;
      const spacer = previous && gap > 18 ? "   " : " ";
      return `${index ? spacer : ""}${item.text}`;
    }).join(""))
    .map(normalizeImportedLine)
    .filter(Boolean)
    .join("\n");
}

function wireEvents() {
  els.title.addEventListener("input", (event) => update({ title: event.target.value }));
  els.artist.addEventListener("input", (event) => update({ artist: event.target.value }));
  els.source.addEventListener("input", (event) => update({ source: event.target.value }));
  els.capoLink.addEventListener("click", toggleCapoLink);
  els.columnsToggle.addEventListener("click", () => update({ twoColumns: !state.twoColumns }));
  els.fontDown.addEventListener("click", () => changeFontSize(-1));
  els.fontUp.addEventListener("click", () => changeFontSize(1));
  els.marginDown.addEventListener("click", () => changeMargin(-1));
  els.marginUp.addEventListener("click", () => changeMargin(1));
  els.panelTabs.forEach((button) => {
    button.addEventListener("click", () => showPanel(button.dataset.panelTab));
  });

  document.querySelector("#transposeDown").addEventListener("click", () => update({ transpose: state.transpose - 1 }));
  document.querySelector("#transposeUp").addEventListener("click", () => update({ transpose: state.transpose + 1 }));
  document.querySelector("#capoDown").addEventListener("click", () => changeCapo(-1));
  document.querySelector("#capoUp").addEventListener("click", () => changeCapo(1));
  els.editPreview.addEventListener("click", () => update({ editPreview: !state.editPreview }));
  els.newSong.addEventListener("click", openNewSongModal);
  els.modalCancel.addEventListener("click", () => els.newSongModal.close());
  els.modalBlank.addEventListener("click", createBlankFromModal);
  els.modalImport.addEventListener("click", () => {
    pendingImportMeta = readModalMeta();
    els.newSongModal.close();
    els.txtFile.click();
  });
  els.prevPage.addEventListener("click", () => jumpToPage(state.currentPage - 1));
  els.nextPage.addEventListener("click", () => jumpToPage(state.currentPage + 1));
  els.closeCancel.addEventListener("click", () => els.closeSongModal.close());
  els.closeExport.addEventListener("click", () => {
    const documentToClose = state.documents.find((document) => document.id === pendingCloseId);
    if (documentToClose) downloadFile(`${slugify(documentToClose.title)}.txt`, "text/plain;charset=utf-8", documentToClose.source);
  });
  els.closeConfirm.addEventListener("click", closePendingDocument);
  els.txtFile.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) importTextFile(file);
    event.target.value = "";
  });

  els.chordToolbar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-chord]");
    if (button) insertChord(button.dataset.chord);
  });

  document.querySelector("#resetSong").addEventListener("click", () => {
    update({ ...DEFAULT_SONG, transpose: 0, capo: 4, capoAdjust: false, twoColumns: true, fontSize: 18, marginMm: 12, editPreview: false, currentPage: 0 });
  });

  document.querySelector("#downloadTxt").addEventListener("click", () => {
    downloadFile(`${slugify(state.title)}.txt`, "text/plain;charset=utf-8", state.source);
  });

  document.querySelector("#downloadDoc").addEventListener("click", exportWord);
  document.querySelector("#printPdf").addEventListener("click", () => window.print());
}

function init() {
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (saved) {
    try {
      Object.assign(state, JSON.parse(saved));
      if (!Array.isArray(state.documents) || !state.documents.length) {
        state.documents = [createDocument({
          title: state.title || DEFAULT_SONG.title,
          artist: state.artist || "",
          source: state.source || DEFAULT_SONG.source
        }, {
          id: "example",
          transpose: state.transpose || 0,
          capo: Number.isFinite(state.capo) ? state.capo : 4,
          capoAdjust: Boolean(state.capoAdjust),
          twoColumns: state.twoColumns !== false,
          fontSize: state.fontSize || 18,
          marginMm: state.marginMm || marginNameToMm(state.marginSize),
          editPreview: Boolean(state.editPreview),
          currentPage: state.currentPage || 0
        })];
        state.activeDocId = "example";
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  }

  if (!state.activeDocId || !currentDocument()) state.activeDocId = state.documents[0].id;
  copyDocumentToState(currentDocument());
  syncControls();
  renderSong();
  wireEvents();
}

init();
