# Development

[← Back to chordleaf](../README.md) · [Architecture](architecture.md) · [Contributing](../CONTRIBUTING.md)

## Set up the environment

Use **Node.js 24 LTS** and **pnpm 12.5.1**, pinned in `package.json`. Follow the [official pnpm installation guide](https://pnpm.io/installation). `pnpm-lock.yaml` is the project's only dependency lockfile.

```sh
git clone https://github.com/antoniomml/chordleaf.git
cd chordleaf
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

## Commands

| Command                 | Purpose                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `pnpm dev`              | Development server with automatic reload.                          |
| `pnpm check`            | Formatting, unit tests, production-origin build and SEO metadata.  |
| `pnpm start`            | Serve the build with security headers and the web-import endpoint. |
| `pnpm audit`            | Query the dependency advisory database.                            |
| `pnpm build`            | Static application in `dist/`.                                     |
| `pnpm preview`          | Local preview of the production build.                             |
| `pnpm test`             | Unit tests for music, harmony, layout and imports.                 |
| `pnpm test:e2e`         | Browser and automated accessibility checks; requires a server.     |
| `pnpm format`           | Format code and documentation.                                     |
| `pnpm format:check`     | Check formatting without modifying files.                          |
| `pnpm docs:screenshots` | Refresh documentation screenshots using the demo song.             |
| `pnpm pwa:icons`        | Regenerate the installable PNG icons from the logo.                |

To check the interface and exports:

```sh
pnpm exec playwright install chromium
pnpm dev
# In another terminal:
pnpm test:e2e
```

Browser tests use Chromium and write ignored files under `artifacts/`. Override the server URL with `CHORDLEAF_URL`. Public screenshots under `docs/images/` use a clean browser context without personal data.

To inspect a local reference PDF:

```sh
CHORDLEAF_REFERENCE_PDF="/path/to/original.pdf" pnpm exec node tests/reference-pdf.mjs
```

Do not commit that document or its generated outputs.

## Dependencies and pnpm

Use `pnpm add`, `pnpm add -D` or `pnpm update`. Commit changes to `package.json` and `pnpm-lock.yaml` together; do not generate another package manager's lockfile.

`pnpm-workspace.yaml` allows esbuild's required install script and disables core-js's script. Review new dependencies before extending that list. The configuration follows [pnpm's `allowBuilds` model](https://github.com/pnpm/pnpm.io/blob/main/docs/migration.md).

CI installs the declared pnpm version with `--frozen-lockfile`, then runs formatting, unit tests, the build, a high-severity dependency audit and Chromium, Firefox and WebKit browser tests against the built Node server on Linux. PDF and Word libraries load on demand; Vite may report large export bundles.

## Repository contents

Commit code, tests with invented examples, documentation, demo screenshots, licensed fonts and the attributed chord catalog. Exclude `node_modules/`, `dist/`, reports, personal files and local configuration, as defined in `.gitignore`.

The previous application was removed from the current tree. Historical commits retain it; removing that history requires a separate explicit history rewrite.

## Static content pages

`build/metadata.js` emits ES/EN content pages into `dist/` during the build: pairs such as `/es/editor-de-acordes/` and `/en/chord-sheet-maker/`. Each page is a self-contained HTML document with canonical and reciprocal `hreflang` links, Open Graph and Twitter tags, `WebPage`/`FAQPage` JSON-LD, a real screenshot, a short FAQ, a repeated CTA and a footer with guide, privacy, import-policy, changelog and GitHub links. Pages only load the built CSS assets (`assets/index-*.css` and `content-pages.css`); they contain no executable scripts, so the CSP stays untouched.

The same build writes the sitemap covering the home pair plus every content pair with `lastmod` and locale alternates. `scripts/check-metadata.mjs` (run by `pnpm check`) validates titles, descriptions, canonicals, reciprocal hreflang, structured data, footers, escaping, 600+ words per page and every internal link. Keep the copy original: no third-party lyrics, no public song index, no invented promises, and keep the privacy and import-policy pages consistent with `SECURITY.md` and the web-import section above. `public/images/editor-workspace.png` is the current screenshot used by those pages; refresh it from `docs/images/workspace.png` when the interface changes.

## Releases

The current tagged release is **`v1.0.0`**. Before another release:

1. Update `version` in `package.json` and add its changes to `CHANGELOG.md`.
2. Run frozen installation, formatting, tests, build and browser checks.
3. Merge the checked pull request into `main`.
4. Create an annotated `vX.Y.Z` tag on the merged `main` commit, push it, then publish release notes on GitHub.

`private: true` in `package.json` prevents accidental registry publication; it does not control GitHub repository visibility. The original application code is licensed under MIT; third-party notices must be retained.

## Web imports and production

`pnpm dev` and `pnpm preview` include `/api/import-web`. For a built application with the same endpoint, run `pnpm build` followed by `pnpm start` (Node.js, default `127.0.0.1:3000`; configure `HOST` and `PORT` as needed). Put a normal HTTPS reverse proxy in front for a public deployment. Hosting `dist/` alone does not enable web downloads.

For Vercel, follow [Deployment](deployment.md); the endpoint is disabled until explicitly enabled after firewall configuration. Local `dev`, `preview` and `start` enable it unless the process environment sets `CHORDLEAF_WEB_IMPORT_ENABLED=false`.

The endpoint accepts HTTPS song URLs from Cifra Club, LaCuerda and Ultimate Guitar only. Redirects are checked against the same host allowlist, downloads time out after 18 seconds, and HTML is limited to 3 MiB. No accounts, cookies or credentials are forwarded. The browser extracts song text from inert HTML; downloaded scripts are never run. Sites can block downloads or change their markup; inaccessible versions produce an error and the file/text import remains available.

`CHORDLEAF_LIVE_IMPORTS=1 node tests/import-browser.mjs` additionally exercises public song URLs through the running server. Regular CI uses invented fixtures and does not depend on third-party availability.

## Production parity and optional audits

For the same compiled assets and headers used in production, build, run `PORT=5173 pnpm start`, and execute `pnpm test:e2e` in another terminal. Stop Vite first if it is using that port. Browser fixtures use the UI and mocked external pages, so they also work with a production build.

The browser suite runs axe-core in the empty workspace, new-song dialog, editor and chord workspace. It also verifies the accessible column state and delayed previews for long songs. Run manual keyboard, screen-reader and 200% zoom checks before release; automated checks are not a complete accessibility certification. Lighthouse can be run as a temporary tool on a protected Vercel preview. Local timings are not field performance measurements.

Environment variables are documented in [.env.example](../.env.example). Vite reads `SITE_URL` during builds. The Node import handler reads its process environment: export `CHORDLEAF_WEB_IMPORT_ENABLED=false` in your shell when testing disabled imports locally. Do not prefix secrets with `VITE_`; those variables are exposed to browser bundles.

For the cross-browser persistence/backup suite, install the engines with `pnpm exec playwright install chromium firefox webkit`, then run `pnpm test:compatibility` against the built server. `CHORDLEAF_BROWSERS=chromium,webkit` narrows local diagnosis; CI deliberately runs all three engines.

## PWA icons and offline support

The installable web app manifest is `public/manifest.webmanifest`. Its PNG icons are generated from `public/logo.svg` and committed to the repository:

```sh
pnpm pwa:icons
```

The command renders every size with the Playwright Chromium already installed for browser tests and rewrites `public/icons/*.png`. Run it after changing the logo and commit the result.

`public/sw.js` is a plain, dependency-free service worker served from the site root. It is registered only in production builds (`import.meta.env.PROD`), never by `pnpm dev`. Navigation is network-first with a cached fallback, `/assets/*` is cache-first, and `/fonts/*`, `/logo.svg`, `/icons/*` and `/licenses/*` use stale-while-revalidate. `/api/*` and cross-origin requests are never cached.

Bump `CACHE_VERSION` in `public/sw.js` (`chordleaf-v1` → `chordleaf-v2`…) in every release that changes the shell or its URLs; activation deletes the caches of previous versions.

To exercise the manifest and the offline shell against a production build:

```sh
pnpm build
PORT=5173 pnpm start
# In another terminal:
CHORDLEAF_URL=http://localhost:5173 node tests/pwa-browser.mjs
```

`tests/pwa-browser.mjs` runs on Chromium, Firefox and WebKit; local runs skip WebKit when the host lacks its system libraries, and `CHORDLEAF_BROWSERS=chromium,firefox` narrows the engines. It checks the manifest, the icon sizes, an offline reload of the shell, offline editing and the `/api/*` exclusion.
