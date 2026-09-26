import DOMPurify from "dompurify";
import { MAX_FILE_BYTES } from "./song-state.js";
import { t } from "./i18n.js";

// Keep only the text structure and metadata used by the song parsers. The
// returned fragment belongs to an inert document and is never mounted.
export function readWebMarkup(html) {
  if (
    html.length > MAX_FILE_BYTES ||
    new TextEncoder().encode(html).length > MAX_FILE_BYTES
  )
    throw new Error(t("El archivo es demasiado grande. El límite es 10 MiB."));
  return DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    RETURN_DOM_FRAGMENT: true,
    ALLOWED_TAGS: [
      "html",
      "head",
      "body",
      "title",
      "meta",
      "link",
      "a",
      "b",
      "br",
      "div",
      "h1",
      "h2",
      "h3",
      "i",
      "p",
      "pre",
      "section",
      "article",
      "span",
      "strong",
      "em",
      "font",
      "ul",
      "ol",
      "li",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
    ],
    ALLOWED_ATTR: [
      "id",
      "class",
      "href",
      "rel",
      "property",
      "content",
      "data-content",
      "data-chord-content",
    ],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
}
