export const WEB_HOSTS = new Set([
  "cifraclub.com",
  "www.cifraclub.com",
  "cifraclub.com.br",
  "www.cifraclub.com.br",
  "acordes.lacuerda.net",
  "lacuerda.net",
  "www.lacuerda.net",
  "tabs.ultimate-guitar.com",
]);
export function songUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Introduce un enlace completo, empezando por https://.");
  }
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    !WEB_HOSTS.has(url.hostname)
  )
    throw new Error(
      "Usa un enlace HTTPS de Cifra Club, LaCuerda o Ultimate Guitar.",
    );
  url.hash = "";
  return url;
}
