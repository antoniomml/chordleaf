# Deploy Chordi on Vercel

[← Back to Chordi](../README.md) · [Launch priorities](audit.md)

Chordi uses a static Vite frontend and one Node.js function for importing public song pages. No database, authentication provider or secret API key is required. The repository includes deployment configuration. The production alias is https://chordi-black.vercel.app. The current review build is linked from [pull request #1](https://github.com/antoniomml/chordi/pull/1); access requires the owner’s Vercel account.

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

Once you have chosen a public domain, set **`SITE_URL`** in Vercel's Production environment to its HTTPS origin, for example `https://your-domain.example`. Use no path, query, fragment or credentials. Rebuild after changing it.

The build uses this value for the canonical URL, Open Graph URL and a bilingual sitemap, with separate `/en/` and `/es/` pages and reciprocal language links. Without it, those URLs are omitted instead of inventing a domain. `robots.txt` excludes `/api/`; it is not a security control. Preview indexing and access should remain restricted using Vercel Deployment Protection and its preview indexing controls.

## 4. Protect and enable web imports

On Vercel, web imports return **503** until `CHORDI_WEB_IMPORT_ENABLED=true` is set. Pasting text and importing local files still work. This is intentional: a public fetch endpoint can create bandwidth and function costs even when its destinations are allowlisted.

Before enabling it:

1. Add a Vercel Firewall rate-limit rule for the exact path `/api/import-web`. Start conservatively (for example, 10 requests per client IP per minute), then review legitimate usage and your plan's available controls. Return 429 when the limit is exceeded.
2. Configure usage/budget notifications and review function errors and invocation counts.
3. Set `CHORDI_WEB_IMPORT_ENABLED=true` only in the environments where those controls are ready, then redeploy.
4. Test one supported URL from each provider. Public sites can block data-center traffic even when imports work locally. Do not bypass their access controls; retain file/text import as the fallback.

To stop imports quickly, set the variable to `false` and redeploy. A browser-origin check is defense in depth, not a distributed rate limiter; scripts can forge request headers. The code deliberately does not pretend that an in-memory counter protects independently scaled functions.

## 5. Check the preview before launch

- Open the editor at desktop and phone widths in English and Spanish. Switch language after an edit and confirm the song stays intact.
- Import an invented TXT, a selectable PDF and a DOCX. Export each format, reload, and check the saved song.
- Confirm security headers on `/`, hashed asset caching, and JSON errors from `/api/import-web` (405 for POST, 422 for invalid URLs after activation).
- Confirm that `/src/app.js` and unknown paths return 404, rather than publishing source files or returning HTML for the API.
- Run Lighthouse against the deployed preview; verify canonical/robots/sitemap on the final domain and add an absolute social-preview image URL.
- Check Safari/iPhone and Firefox as well as Chromium. Test keyboard navigation, 200% zoom and a screen reader.

Promote the reviewed preview only after the applicable launch priorities are resolved. Keep the previous deployment available for rollback. Browser songs belong to their origin: moving from a preview URL to a custom domain does not move local storage. Tell testers to export a full workspace JSON backup before switching domains.

## References

[Vite deployment](https://vite.dev/guide/static-deploy), [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js), [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json), [Vercel rate limiting](https://vercel.com/kb/guide/add-rate-limiting-vercel).

## Current hosted configuration

- Project: `chordi`, Node.js `24.x`, Vercel Hobby.
- All deployments require Vercel Authentication, including the production alias. Vercel assigned the first deployment to production automatically; it is protected and has not been publicly launched.
- Firewall rule: exact path `/api/import-web`, 10 requests per IP per 60 seconds, fixed window, HTTP 429 after the limit.
- `SITE_URL` can use `https://chordi-black.vercel.app` until a custom domain is chosen.
- GitHub branch protection is unavailable for the current private repository/account plan. Keep changes on a review branch; enable required checks when the repository becomes public or the account supports private protections.

The protected preview was tested end to end with Cifra Club, LaCuerda and Ultimate Guitar: each returned a page that parsed into an editable song. Provider availability can change; retain the text/file fallback. Production and preview imports are enabled behind authentication and the firewall.

The account currently uses Hobby, which has usage caps rather than paid overages. Vercel documents automatic usage notifications for all plans. No paid upgrade, spending increase or billing-setting change was made. Review the owner's usage dashboard before a public launch; if moving to a paid plan, configure its spending limit first. See [Vercel usage notifications](https://vercel.com/docs/pricing/manage-and-optimize-usage) and [plan limits](https://vercel.com/pricing).

For the 0.3.0 release, the owner explicitly retained private GitHub visibility and authentication on all Vercel deployments. Deploying and tagging this release does not authorize removing those controls.
