import { t } from "./i18n.js";
import { importText, titleCase } from "./files.js";
import { chordRE, chords, unresolvedChordRE } from "./music.js";
import { LACUERDA_HOSTS, songUrl, webProvider } from "./web-sources.js";
import { readWebMarkup } from "./web-markup.js";

// Read text only; never mount downloaded markup or execute website scripts.
function preText(root) {
  function read(node) {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return "";
    if (["SCRIPT", "STYLE", "BUTTON", "IFRAME"].includes(node.tagName))
      return "";
    if (node.tagName === "BR") return "\n";
    const text = [...node.childNodes].map(read).join("");
    // Inline chord names retain their exact horizontal spacing. importText
    // converts chord-only rows into anchored chords afterwards.
    if (["DIV", "P"].includes(node.tagName))
      return text + (text.endsWith("\n") ? "" : "\n");
    return text;
  }
  return read(root).replace(/\u00a0/g, " ");
}
function laCuerdaPlainText(value) {
  const lines = value.replace(/\r/g, "").split("\n");
  const dividers = lines
    .map((line, index) => (/^={20,}\s*$/.test(line) ? index : -1))
    .filter((index) => index >= 0);
  const start = dividers[1] === undefined ? 0 : dividers[1] + 1;
  const footer = lines.findIndex(
    (line, index) =>
      index >= start && /^={10,}\s*lacuerda\.net\s*={10,}\s*$/i.test(line),
  );
  return lines
    .slice(start, footer < 0 ? undefined : footer)
    .join("\n")
    .trim();
}
function laCuerdaChord(value) {
  const spanishNotes = {
    DO: "C",
    RE: "D",
    MI: "E",
    FA: "F",
    SOL: "G",
    LA: "A",
    SI: "B",
  };
  const chord = value
    .replace(
      /^(DO|RE|MI|FA|SOL|LA|SI)([#b]?)/,
      (_, note, accidental) => spanishNotes[note] + accidental,
    )
    .replace(/^([A-G][#b]?)4\/7$/, (_, root) => `${root}7sus4`)
    .replace(/^([A-G][#b]?)4$/, (_, root) => `${root}sus4`)
    .replace(/^([A-G][#b]?m7)\/5b$/, (_, base) => `${base}b5`);
  return chordRE.test(chord) ? chord : value;
}
const plausibleChord = (token) =>
  /\d/.test(token) &&
  /^(?:(?:DO|RE|MI|FA|SOL|LA|SI)|[A-H])(?:[#b]|m|M|maj|dim|aug|sus|add|\d)[A-Za-z0-9#b/+()?-]{0,12}$/i.test(
    token,
  );
function laCuerdaNotation(text) {
  return text
    .split("\n")
    .map((line) => {
      const tokens = line.trim().split(/\s+/);
      const chordToken = (token) => laCuerdaChord(token.replace(/\.+$/, ""));
      const unresolved = (token) => /^\[\?[^\[\]\n]{1,40}\]$/.test(token);
      if (
        tokens.some(
          (token) =>
            chordRE.test(chordToken(token)) ||
            unresolved(token) ||
            plausibleChord(chordToken(token)),
        ) &&
        tokens.every(
          (token) =>
            chordRE.test(chordToken(token)) ||
            unresolved(token) ||
            plausibleChord(chordToken(token)) ||
            /^[.\-|:]+$/.test(token),
        )
      )
        return line.replace(/\S+/g, (token) => {
          if (/^[.\-|:]+$/.test(token)) return token.replace(/\./g, "");
          if (unresolved(token)) return token;
          const name = chordToken(token);
          return chordRE.test(name) ? name : `[?${name}]`;
        });
      return line.replace(
        /(?<!\S)(?:FA#7(?:\/A#)?|[A-G][#b]?(?:4(?:\/7)?|m7\/5b))(?!\S)/g,
        laCuerdaChord,
      );
    })
    .join("\n");
}
/** TusAcordes writes chords as `(LA )`/`(MIm)`; keep the column so the text
 * importer can still anchor each chord over the following lyric line. */
export function tusAcordesNotation(text) {
  return text
    .split("\n")
    .map((line) =>
      line.replace(/\(([^()\n]{1,24})\)/g, (all, raw) => {
        const token = raw.replace(/\s|\.+$/g, "");
        if (!token) return all;
        const name = laCuerdaChord(token);
        if (!chordRE.test(name)) return all;
        return name.length >= all.length
          ? name
          : name + " ".repeat(all.length - name.length);
      }),
    )
    .join("\n");
}
/** Pick the provider's sheet container. Chordie diagrams live in <pre>
 * blocks that must not be imported as lyrics. */
function songSheet(doc, provider) {
  if (provider === "lacuerda")
    return (
      doc.querySelector("#t_body pre") ||
      doc.querySelector(".rtBody pre, pre[data-chord-content], pre:not(#tCode)")
    );
  if (provider === "acordesweb") return doc.querySelector("pre#chordsPre");
  if (provider === "tusacordes") return doc.querySelector(".tablatura-content");
  if (provider === "chordie") {
    const sheet = doc.querySelector("#song, .songChord");
    for (const diagram of sheet?.querySelectorAll("pre") || [])
      diagram.remove();
    return sheet;
  }
  if (provider === "acordescc") return doc.querySelector("pre");
  return doc.querySelector(
    "pre[data-chord-content], .cifra_cnt pre, .rtBody pre, pre",
  );
}
// Some LaCuerda sheets append a six-row fingering legend. It is a diagram,
// not another verse or chord sequence, so keep it out of the editable song.
export function stripLaCuerdaFretGrids(text) {
  const lines = text.split("\n");
  for (let i = 0; i <= lines.length - 6; i++) {
    const counts = Array.from({ length: 6 }, (_, row) => {
      const value = lines[i + row].trim();
      const cells =
        value.match(new RegExp(`${row + 1}-(?:X|\\d{1,2})`, "gi")) || [];
      return cells.length &&
        value
          .replace(new RegExp(`${row + 1}-(?:X|\\d{1,2})`, "gi"), "")
          .trim() === ""
        ? cells.length
        : 0;
    });
    if (!counts[0] || !counts.every((count) => count === counts[0])) continue;
    let start = i;
    const heading = lines[i - 1]?.trim().split(/\s+/) || [];
    if (
      heading.length === counts[0] &&
      heading.every((name) => chordRE.test(name))
    )
      start--;
    lines.splice(start, i + 6 - start);
    while (
      start > 0 &&
      start < lines.length &&
      !lines[start - 1].trim() &&
      !lines[start].trim()
    )
      lines.splice(start, 1);
    if (
      lines.slice(start).every((line) => !line.trim()) &&
      /^(?:INTRO|CORO|ESTRIBILLO|SOLO|FINAL|PUENTE)\s*:?$/i.test(
        lines
          .slice(0, start)
          .findLast((line) => line.trim())
          ?.trim() || "",
      )
    ) {
      const section = lines.findLastIndex(
        (line, index) => index < start && line.trim(),
      );
      lines.splice(section);
    }
    i = Math.max(-1, start - 1);
  }
  return lines.join("\n").replace(/\n+$/, "");
}
function markSectionChords(text) {
  return text
    .split("\n")
    .map((line) => {
      const m = line.match(
        /^(\s*(?:\[(?:Intro|Final|Solo)\]|(?:INTRO|FINAL|SOLO)\s*:)\s*)(.*)$/i,
      );
      return m
        ? m[1] + m[2].replace(/\S+/g, (c) => (chordRE.test(c) ? `[${c}]` : c))
        : line;
    })
    .join("\n");
}

export function parseWebSong(html, sourceUrl, contentType = "text/html") {
  const url = songUrl(sourceUrl);
  const doc = readWebMarkup(html);
  const documentTitle = doc.querySelector("title")?.textContent || "";
  let text = "",
    title = "",
    artist = "",
    capo = 0;
  const provider = webProvider(url.hostname);
  if (provider === "ultimate-guitar") {
    let data;
    try {
      data = JSON.parse(
        doc.querySelector(".js-store")?.getAttribute("data-content"),
      )?.store?.page?.data;
    } catch {}
    const content = data?.tab_view?.wiki_tab?.content;
    if (typeof content === "string" && !data.tab_view.blocked) {
      text = content
        .replace(/\[ch\]([^\[\]\n]{1,40})\[\/ch\]/g, (_, name) =>
          chordRE.test(name) ? name : `[?${name}]`,
        )
        .replace(/\[\/?tab\]/g, "");
      title = data.tab?.song_name || "";
      artist = data.tab?.artist_name || "";
      capo = Number(data.tab_view.meta?.capo) || 0;
    }
  } else {
    const laCuerda = provider === "lacuerda";
    const plainText =
      contentType === "text/plain" || url.pathname.endsWith(".txt");
    const pre = plainText ? null : songSheet(doc, provider);
    if (plainText && laCuerda) text = laCuerdaPlainText(html);
    if (pre) {
      // Mark chords on mixed lines (Intro: C - G) without changing spacing on chord rows.
      for (const el of pre.querySelectorAll("b, a")) {
        const original = el.textContent.trim();
        const value = laCuerda ? laCuerdaChord(original) : original;
        if (!chordRE.test(value)) {
          if (
            (laCuerda || (el.tagName === "B" && plausibleChord(original))) &&
            /^[^\s\[\]]{1,40}$/.test(original)
          )
            el.textContent = `[?${original}]`;
          continue;
        }
        if (value !== original)
          el.textContent = el.textContent.replace(original, value);
        const line = el.parentNode.textContent;
        if (
          el.parentNode !== pre &&
          !line.includes("\n") &&
          /\[(?:Intro|Final|Solo)\]/i.test(line)
        )
          el.textContent = `[${value}]`;
      }
      text = preText(pre);
      if (laCuerda) text = laCuerdaNotation(text);
      if (provider === "tusacordes") text = tusAcordesNotation(text);
      if (provider === "acordescc") text = laCuerdaNotation(text);
    }
    if (laCuerda) {
      if (plainText) text = laCuerdaNotation(text);
      if (plainText) {
        title = html.match(/^\|\s*CANCION:\s*(.*?)\s*\|?\s*$/im)?.[1] || "";
        artist = html.match(/^\|\s*ARTISTA:\s*(.*?)\s*\|?\s*$/im)?.[1] || "";
      } else {
        title = doc.querySelector("#tH1 h1 a")?.textContent.trim() || "";
        artist = doc.querySelector("#tH1 h2 a")?.textContent.trim() || "";
        if (!title || !artist) {
          const names = documentTitle.match(/^(.*?),\s*(.*?):\s*Acordes/i);
          title ||= names?.[1] || "";
          artist ||= names?.[2] || "";
        }
      }
    } else if (provider === "acordesweb") {
      title =
        doc.querySelector(".s-title")?.textContent.trim() ||
        doc.querySelector("h1")?.textContent.trim() ||
        "";
      artist =
        doc.querySelector(".s-artist a, .s-artist")?.textContent.trim() || "";
      if (!artist)
        artist = documentTitle.match(/ - (.*?):\s*Acordes/i)?.[1]?.trim() || "";
      if (!title) title = documentTitle.match(/^(.*?) - /)?.[1]?.trim() || "";
    } else if (provider === "tusacordes") {
      const heading = doc.querySelector("h1")?.cloneNode(true);
      heading?.querySelector(".badge")?.remove();
      title = heading?.textContent.trim() || "";
      artist =
        doc
          .querySelector("h2.h4, .breadcrumb-item:nth-last-child(2) a")
          ?.textContent.trim() || "";
    } else if (provider === "chordie") {
      const heading = doc.querySelector("h1.titleLeft, h1");
      artist = heading?.querySelector("a")?.textContent.trim() || "";
      title = (heading?.textContent || "").replace(artist, "").trim();
    } else if (provider === "acordescc") {
      const names = documentTitle.match(/^(.*?),\s*(.*?)\s*\(acordes\)/i);
      artist = names?.[1]?.trim() || "";
      title = names?.[2]?.trim() || "";
    } else {
      title = doc.querySelector("h1")?.textContent.trim() || "";
      artist = doc.querySelector("h1 + a h2, .t2 a")?.textContent.trim() || "";
      if (!artist)
        artist = documentTitle.match(/ - (.*?) - Cifra Club/)?.[1] || "";
    }
    // Mixed section/chord lines are instrumental, including LaCuerda TXT.
    text = markSectionChords(text);
    if (laCuerda || provider === "chordie")
      text = text
        .split("\n")
        .map((line) => line.trimStart())
        .join("\n");
    if (laCuerda) text = stripLaCuerdaFretGrids(text);
    const capoMatch = text.match(
      /(?:capo|cejilla|capotraste)\s*[:=]?\s*(\d+)/i,
    );
    capo = Number(capoMatch?.[1]) || 0;
    if (laCuerda && !capo) {
      const ordinalLine =
        /^\s*-?\s*(?:capo|cejilla|capotraste)\s+en\s+(primer|segundo|tercer|cuarto|quinto|sexto|s[eé]ptimo|octavo|noveno|d[eé]cimo)\s+traste\s*-?\s*$/im;
      const ordinal = text
        .match(ordinalLine)?.[1]
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      capo =
        [
          "primer",
          "segundo",
          "tercer",
          "cuarto",
          "quinto",
          "sexto",
          "septimo",
          "octavo",
          "noveno",
          "decimo",
        ].indexOf(ordinal) + 1;
      if (capo) text = text.replace(ordinalLine, "").trimStart();
    }
  }
  if (!text.trim())
    throw new Error(
      t(
        "La web no ofrece una versión de texto accesible de esta canción. Prueba otro enlace o importa un archivo.",
      ),
    );
  const result = importText(text, title || t("Canción importada"));
  if (LACUERDA_HOSTS.has(url.hostname))
    result.text = result.text
      .split("\n")
      .map((line) => line.trimStart())
      .join("\n");
  return {
    ...result,
    title: titleCase(title || result.title),
    artist: titleCase(artist),
    capo: Math.max(0, Math.min(12, capo || result.capo)),
    sourceUrl: url.href,
    ...(!chords(result.text).length &&
    ![...result.text.matchAll(/\[([^\]]+)\]/g)].some((m) =>
      unresolvedChordRE.test(m[1]),
    )
      ? { notice: t("No se detectaron acordes; revisa el texto importado.") }
      : {}),
  };
}
export async function importWebSong(value, { signal } = {}) {
  signal?.throwIfAborted();
  const url = songUrl(value);
  let response;
  try {
    response = await fetch(
      `/api/import-web?url=${encodeURIComponent(url.href)}`,
      {
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(25000)])
          : AbortSignal.timeout(25000),
      },
    );
  } catch {
    signal?.throwIfAborted();
    throw new Error(
      t(
        "No se pudo conectar con la web. Comprueba la conexión y vuelve a intentarlo.",
      ),
    );
  }
  if (response.status === 429)
    throw new Error(
      t(
        "Has hecho varias importaciones seguidas. Espera un minuto y vuelve a intentarlo.",
      ),
    );
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error(
      t(
        "La importación web necesita el servidor de Chordleaf. Puedes importar un archivo en esta instalación.",
      ),
    );
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(
      data.error || t("No se pudo descargar la canción."),
    );
    if (data.code === "SOURCE_FORBIDDEN") error.code = data.code;
    throw error;
  }
  return parseWebSong(data.html, data.url, data.contentType);
}
