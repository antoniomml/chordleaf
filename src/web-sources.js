import { t } from "./i18n.js";
export const LACUERDA_HOSTS = new Set([
  "acordes.lacuerda.net",
  "lacuerda.net",
  "www.lacuerda.net",
]);
export const ACORDESWEB_HOSTS = new Set([
  "acordesweb.com",
  "www.acordesweb.com",
]);
export const TUSACORDES_HOSTS = new Set([
  "tusacordes.com",
  "www.tusacordes.com",
]);
export const CHORDIE_HOSTS = new Set(["www.chordie.com"]);
export const ACORDES_CC_HOSTS = new Set(["acordes.cc", "www.acordes.cc"]);
export const ULTIMATE_GUITAR_HOSTS = new Set([
  "tabs.ultimate-guitar.com",
  "es.ultimate-guitar.com",
]);
// Cifra Club still parses saved HTML offline, but its server downloads are
// blocked with 403, so it is no longer advertised as an import source.
export const WEB_HOSTS = new Set([
  "cifraclub.com",
  "www.cifraclub.com",
  "cifraclub.com.br",
  "www.cifraclub.com.br",
  ...LACUERDA_HOSTS,
  ...ACORDESWEB_HOSTS,
  ...TUSACORDES_HOSTS,
  ...CHORDIE_HOSTS,
  ...ACORDES_CC_HOSTS,
  ...ULTIMATE_GUITAR_HOSTS,
]);
/** Provider id for the supported hosts; unknown hosts never reach a parser. */
export function webProvider(hostname) {
  if (ULTIMATE_GUITAR_HOSTS.has(hostname)) return "ultimate-guitar";
  if (LACUERDA_HOSTS.has(hostname)) return "lacuerda";
  if (ACORDESWEB_HOSTS.has(hostname)) return "acordesweb";
  if (TUSACORDES_HOSTS.has(hostname)) return "tusacordes";
  if (CHORDIE_HOSTS.has(hostname)) return "chordie";
  if (ACORDES_CC_HOSTS.has(hostname)) return "acordescc";
  return "cifraclub";
}
export function songUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(t("Introduce un enlace completo, empezando por https://."));
  }
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    !WEB_HOSTS.has(url.hostname)
  )
    throw new Error(
      t(
        "Usa un enlace HTTPS de LaCuerda, AcordesWeb, TusAcordes, Chordie o Ultimate Guitar.",
      ),
    );
  url.hash = "";
  return url;
}
