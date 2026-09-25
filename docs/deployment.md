# Deploy Chordleaf on Vercel

[← Back to Chordleaf](../README.md) · [Development](development.md)

Chordleaf uses a static Vite frontend and one Node.js function for importing public song pages. No database, authentication provider or secret API key is required. The repository includes deployment configuration. The public production domain is `https://chordleaf.com/`, with `https://www.chordleaf.com/` redirecting to it. Vercel Standard Protection keeps preview deployments behind authentication.

## 1. Check the code

Run `pnpm install --frozen-lockfile` and `pnpm check`. Build once, run `PORT=5173 pnpm start`, then run `pnpm test:e2e` in another terminal. CI performs these checks on Linux.

The original code is licensed under MIT. Keep the font and chord-data licenses intact.

## 2. Create a Vercel project

Connect your GitHub repository in Vercel and import it as a **Vite** project. Keep the repository root as the project directory. `vercel.json` configures:

| Setting                   | Value                                             |
| ------------------------- | ------------------------------------------------- |
| Install                   | `npx --yes pnpm@12.5.1 install --frozen-lockfile` |
| Build                     | `npx --yes pnpm@12.5.1 build`                     |
| Output                    | `dist`                                            |
| Function                  | `api/import-web.js`                               |
| Function maximum duration | 25 seconds                                        |

The explicit pnpm invocation avoids relying on Vercel's globally installed pnpm version. Vercel serves the compiled assets and discovers the function in `api/`; it does **not** use `pnpm start` or the Vite development server. Node.js 24 LTS is pinned in package.json, .node-version and CI. Confirm the build runtime in the deployment log.

Create a protected preview first. Keep production changes gated on the Checks workflow. Do not add a catch-all rewrite to `index.html`: this application has no client-side path router and `/api/import-web` must reach the function.

## 3. Configure the production origin

Set **`SITE_URL`** in Vercel's Production environment to `https://chordleaf.com`. Use no path, query, fragment or credentials. Rebuild after changing it.

The build uses this value for canonical and Open Graph URLs, language links and a bilingual sitemap. `/` is the English canonical; `/en/` remains a direct English route with a canonical pointing to `/`, and `/es/` is the Spanish canonical. The static HTML contains useful feature descriptions even before JavaScript runs. `pnpm check` builds with this production origin and verifies the generated metadata. Without `SITE_URL`, canonical URLs and the sitemap are omitted instead of inventing a domain. `robots.txt` excludes `/api/`; it is not a security control. Preview indexing and access should remain restricted using Vercel Deployment Protection and its preview indexing controls.

## 4. Protect and enable web imports

On Vercel, web imports return **503** until `CHORDLEAF_WEB_IMPORT_ENABLED=true` is set. Pasting text and importing local files still work. This is intentional: a public fetch endpoint can create bandwidth and function costs even when its destinations are allowlisted.

Before enabling it:

1. Add a Vercel Firewall rate-limit rule for the exact path `/api/import-web`. The production baseline is a fixed window of 10 requests per 60 seconds per IP address, returning 429. Review legitimate usage before changing it. Vercel tracks these counters per region, so this is a cost control rather than a global quota.
2. Review usage and spend notifications available on your Vercel plan, plus function errors and invocation counts. Some anomaly alerts require a paid plan; do not assume they are active on Hobby.
3. Set `CHORDLEAF_WEB_IMPORT_ENABLED=true` only in the environments where those controls are ready, then redeploy.
4. Test one supported URL from each provider. Public sites can block data-center traffic even when imports work locally. Do not bypass their access controls; retain file/text import as the fallback.

To stop imports quickly, set the variable to `false` and redeploy. A browser-origin check is defense in depth, not a distributed rate limiter; scripts can forge request headers. The code deliberately does not pretend that an in-memory counter protects independently scaled functions.

## 5. Harden headers and the domain

`vercel.json` applies `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-origin` to every response, and a seven-day cache (`max-age=604800`) to `/fonts/*`, `/icons/*`, `/logo.svg` and `/social-preview.png`. Hashed `/assets/*` stay immutable, while HTML and API responses stay uncached. `server/security.js` and `server/start.js` mirror the same policy for local preview builds. This application needs no cross-origin reads or writes, so anything broader is unnecessary.

Two header operations live outside the repository and must be reviewed in the Vercel dashboard or your DNS provider:

1. **Remove the blanket CORS header.** Vercel may attach `access-control-allow-origin: *` to responses from a project-level setting that is not stored in `vercel.json`. Check it with `curl -I https://chordleaf.com/` after a deployment and delete the setting in **Project → Settings → Headers** (or replace it with an explicit, minimal policy). Same-origin requests keep working, and wildcard CORS only widens what other origins can read.
2. **Treat HSTS `preload` as a separate operation.** Production sends `Strict-Transport-Security` with a long lifetime today. Adding `includeSubDomains; preload` and submitting the domain to <https://hstspreload.org/> commits every current and future subdomain to HTTPS-only, and removal from browser preload lists can take months. Enable it only when every subdomain is under your control and serves valid HTTPS; keep the header without `preload` until then.

## 6. Check the preview before launch

- Open the editor at desktop and phone widths in English and Spanish. Switch language after an edit and confirm the song stays intact.
- Import an invented TXT, a selectable PDF and a DOCX. Export each format, reload, and check the saved song.
- Confirm `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, the long cache for fonts, logo, icons and the social preview, hashed asset caching, and JSON errors from `/api/import-web` (405 for POST, 422 for invalid URLs after activation).
- Confirm that `/src/app.js` and unknown paths return 404, rather than publishing source files or returning HTML for the API.
- Run Lighthouse against the deployed preview; verify canonical/robots/sitemap on the final domain and add an absolute social-preview image URL.
- Check Safari/iPhone and Firefox as well as Chromium. Test keyboard navigation, 200% zoom and a screen reader.

Promote the reviewed preview only after the applicable launch priorities are resolved. Keep the previous deployment available for rollback. Browser songs belong to their origin: moving from a preview URL to a custom domain does not move local storage. Tell testers to export a full workspace JSON backup before switching domains.

## References

[Vite deployment](https://vite.dev/guide/static-deploy), [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js), [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json), [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).
