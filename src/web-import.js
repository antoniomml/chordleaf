import { t } from "./i18n.js";
import { importText, titleCase } from "./files.js";
import { chordRE, chords } from "./music.js";
import { songUrl } from "./web-sources.js";

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
  return lines.slice(start).join("\n").trim();
}

export function parseWebSong(html, sourceUrl, contentType = "text/html") {
  const url = songUrl(sourceUrl);
  const doc = new DOMParser().parseFromString(html, "text/html");
  let text = "",
    title = "",
    artist = "",
    capo = 0;
  if (url.hostname === "tabs.ultimate-guitar.com") {
    let data;
    try {
      data = JSON.parse(
        doc.querySelector(".js-store")?.getAttribute("data-content"),
      )?.store?.page?.data;
    } catch {}
    const content = data?.tab_view?.wiki_tab?.content;
    if (typeof content === "string" && !data.tab_view.blocked) {
      text = content.replace(/\[\/?(?:tab|ch)\]/g, "");
      title = data.tab?.song_name || "";
      artist = data.tab?.artist_name || "";
      capo = Number(data.tab_view.meta?.capo) || 0;
    }
  } else {
    const laCuerda = url.hostname.includes("lacuerda.net");
    const plainText =
      contentType === "text/plain" || url.pathname.endsWith(".txt");
    const pre = plainText
      ? null
      : laCuerda
        ? doc.querySelector("#t_body pre") ||
          doc.querySelector(
            ".rtBody pre, pre[data-chord-content], pre:not(#tCode)",
          )
        : doc.querySelector(
            "pre[data-chord-content], .cifra_cnt pre, .rtBody pre, pre",
          );
    if (plainText && laCuerda) text = laCuerdaPlainText(html);
    if (pre) {
      // Mark chords on mixed lines (Intro: C - G) without changing spacing on chord rows.
      for (const el of pre.querySelectorAll("b, a")) {
        const value = el.textContent.trim();
        if (!chordRE.test(value)) continue;
        const line = el.parentNode.textContent;
        if (
          el.parentNode !== pre &&
          !line.includes("\n") &&
          /\[(?:Intro|Final|Solo)\]/i.test(line)
        )
          el.textContent = `[${value}]`;
      }
      text = preText(pre);
      // Mixed section/chord lines are instrumental, not sung lyrics.
      text = text
        .split("\n")
        .map((line) => {
          const m = line.match(
            /^(\s*(?:\[(?:Intro|Final|Solo)\]|(?:INTRO|FINAL|SOLO)\s*:)\s*)(.*)$/i,
          );
          return m
            ? m[1] +
                m[2].replace(/\S+/g, (c) => (chordRE.test(c) ? `[${c}]` : c))
            : line;
        })
        .join("\n");
    }
    if (laCuerda) {
      if (plainText) {
        title = html.match(/^\|\s*CANCION:\s*(.*?)\s*\|?\s*$/im)?.[1] || "";
        artist = html.match(/^\|\s*ARTISTA:\s*(.*?)\s*\|?\s*$/im)?.[1] || "";
      } else {
        title = doc.querySelector("#tH1 h1 a")?.textContent.trim() || "";
        artist = doc.querySelector("#tH1 h2 a")?.textContent.trim() || "";
        if (!title || !artist) {
          const names = doc.title.match(/^(.*?),\s*(.*?):\s*Acordes/i);
          title ||= names?.[1] || "";
          artist ||= names?.[2] || "";
        }
      }
    } else {
      title = doc.querySelector("h1")?.textContent.trim() || "";
      artist = doc.querySelector("h1 + a h2, .t2 a")?.textContent.trim() || "";
      if (!artist) artist = doc.title.match(/ - (.*?) - Cifra Club/)?.[1] || "";
    }
    const capoMatch = text.match(
      /(?:capo|cejilla|capotraste)\s*[:=]?\s*(\d+)/i,
    );
    capo = Number(capoMatch?.[1]) || 0;
  }
  if (!text.trim())
    throw new Error(
      t(
        "La web no ofrece una versión de texto accesible de esta canción. Prueba otro enlace o importa un archivo.",
      ),
    );
  const result = importText(text, title || t("Canción importada"));
  if (!chords(result.text).length)
    throw new Error(
      t(
        "No se han encontrado acordes en este enlace. Abre una versión de acordes, no una tablatura o una página de búsqueda.",
      ),
    );
  return {
    ...result,
    title: titleCase(title || result.title),
    artist: titleCase(artist),
    capo: Math.max(0, Math.min(12, capo || result.capo)),
    sourceUrl: url.href,
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
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error(
      t(
        "La importación web necesita el servidor de Chordleaf. Puedes importar un archivo en esta instalación.",
      ),
    );
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || t("No se pudo descargar la canción."));
  return parseWebSong(data.html, data.url, data.contentType);
}
