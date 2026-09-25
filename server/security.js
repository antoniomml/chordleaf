// Keep the standalone server and Vercel deployment on the same policy.
import config from "../vercel.json" with { type: "json" };
export function securityHeaders(res) {
  for (const { key, value } of config.headers[0].headers)
    res.setHeader(key, value);
}
/** Mirrors the public cache rules declared in vercel.json. */
export function cacheControlFor(pathname) {
  if (pathname.startsWith("/assets/"))
    return "public, max-age=31536000, immutable";
  if (
    pathname.startsWith("/fonts/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/logo.svg" ||
    pathname === "/social-preview.png"
  )
    return "public, max-age=604800";
  return "no-cache";
}
