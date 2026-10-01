import { readFileSync } from "node:fs";
import { getLocale, setLocale, t } from "../src/i18n.js";
import { introHtml } from "../src/ui/intro-copy.js";
import { entrySheetMarkup } from "../src/ui/entry.js";

const shell = readFileSync(
  new URL("../src/ui/shell.html", import.meta.url),
  "utf8",
);

/** Render the same empty workspace before JS loads. Keep no-JS guidance and
 * crawlable features, while controls wait for the editor's event handlers. */
export function renderStartupEntry(locale) {
  const previous = getLocale();
  setLocale(locale);
  try {
    const compact = shell.replace(/\s+/g, " ");
    const header = compact.slice(0, compact.indexOf("</header>") + 9);
    const start = compact.indexOf('<section id="empty-state"');
    const end = compact.indexOf("<main>", start);
    let html = t(header + compact.slice(start, end))
      .replace('role="main" hidden', 'role="main"')
      .replace(
        '<div id="intro-content"></div>',
        `<div id="intro-content">${introHtml(locale, { features: false })}</div>`,
      )
      .replace(
        '<figure id="entry-sheet" class="entry-sheet" aria-hidden="true"></figure>',
        `<figure id="entry-sheet" class="entry-sheet" aria-hidden="true">${entrySheetMarkup(locale)}</figure>`,
      )
      .replace(/<button\b/g, "<button disabled")
      .replace(
        '<span id="language-label">ES</span>',
        `<span id="language-label">${locale.toUpperCase()}</span>`,
      );
    html += `<noscript><p>${locale === "es" ? "Activa JavaScript para abrir el editor." : "Enable JavaScript to open the song editor."}</p>${introHtml(locale)}</noscript>`;
    return html;
  } finally {
    setLocale(previous);
  }
}
