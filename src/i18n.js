import english from "./locales/en.js";
let locale =
  globalThis.document && !globalThis.navigator?.language?.startsWith("es")
    ? "en"
    : "es";
try {
  const saved = globalThis.document
    ? (globalThis.localStorage?.getItem("chordleaf-language") ??
      globalThis.localStorage?.getItem("chordi-language"))
    : null;
  if (["en", "es"].includes(saved)) locale = saved;
} catch {
  /* Storage can be unavailable in private or restricted contexts. */
}
const pathLocale =
  globalThis.location?.pathname.match(/^\/(en|es)(?:\/|$)/)?.[1];
if (pathLocale) locale = pathLocale;
export function getLocale() {
  return locale;
}
export function setLocale(value) {
  locale = value === "en" ? "en" : "es";
}
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Match once, longest first: English replacements are never translated again.
// The tiny connector " de " applies only to an entire template segment.
const pattern = new RegExp(
  Object.keys(english)
    .filter((k) => k !== " de ")
    .sort((a, b) => b.length - a.length)
    .map(escape)
    .join("|"),
  "g",
);
function literal(value) {
  if (locale !== "en") return value;
  return Object.hasOwn(english, value)
    ? english[value]
    : value.replace(pattern, (key) => english[key]);
}
/** Translate source literals only. Tagged-template interpolations remain intact:
 * t`Cerrar ${title}` translates the label, never the user's song title.
 * HTML callers remain responsible for escaping interpolated user values. */
export function t(strings, ...values) {
  if (typeof strings === "string") return literal(strings);
  return strings.reduce(
    (out, part, i) =>
      out + literal(part) + (i < values.length ? values[i] : ""),
    "",
  );
}
