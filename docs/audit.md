# Production readiness audit

**Updated:** September 22, 2026. Baseline: `39bf11b`, plus the production-readiness changes.

[← Back to Chordleaf](../README.md) · [Deployment guide](deployment.md) · [Security policy](../SECURITY.md)

## Current decision

The application is suitable for a protected review deployment. The original code now has the owner-approved MIT license. English and Spanish are supported, while repository documentation remains English. The owner has explicitly chosen to keep both GitHub and Vercel private for this release.

Vercel's first deployment was automatically assigned to production. **All project deployments are now protected with Vercel Authentication**, including the production alias at `https://chordleaf-app.vercel.app`. An unauthenticated request redirects to sign-in. `chordleaf.com` has been selected as the intended custom domain but still needs to be registered and connected. The initial review was merged in [pull request #1](https://github.com/antoniomml/chordleaf/pull/1).

## Remaining priorities

| Priority | Action before the relevant release                                         | Evidence / limitation                                                                                                                                                                                                                                                                                                                                                           |
| -------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Review provider availability and usage before enabling public web imports. | The Vercel firewall is active at 10 requests/IP/minute; a bounded test returned ten 503 responses from the disabled endpoint, then two 429 responses. Imports are enabled only behind Vercel Authentication in the owner’s production and preview environments. All three providers also passed a real protected-preview import into an editable song. Availability can change. |
| P1       | Perform human accessibility and real-device acceptance checks.             | Automated Chromium/Firefox/WebKit coverage and earlier axe checks do not replace a real iPhone, keyboard-at-200%-zoom and screen-reader session.                                                                                                                                                                                                                                |
| P2       | Choose the final public origin and register Search Console after launch.   | Static `/en/` and `/es/` pages, reciprocal language links, a social image and sitemap are implemented. `SITE_URL` supports the temporary Vercel alias and a later custom domain.                                                                                                                                                                                                |
| P2       | Continue profiling unusually large or hostile documents.                   | Word and auto-fit use terminable workers; PDF parsing has cancellation, timeout and cumulative text/geometry budgets. These are not a complete hostile-document sandbox. Low-end phone profiling remains useful.                                                                                                                                                                |
| P2       | Consolidate remaining UI render helpers and CSS incrementally.             | The static shell and document/key render helpers were extracted. Removed 24 superseded CSS declarations with twelve pixel-identical desktop/tablet/mobile screenshots. Continue gradual extraction when changing features.                                                                                                                                                      |

## Completed changes

| Area                       | Implementation and verification                                                                                                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Licensing and presentation | MIT license, package metadata, contribution guide, English documentation, preserved visual README and refreshed demo screenshots; third-party licenses retained.                                                                                                                    |
| Vercel                     | Real successful cloud build; Node.js 24 pinned in package, local version file and CI, confirmed in project settings. Shared GET function adapter and security headers.                                                                                                              |
| Network security           | Allowlisted HTTPS hosts, redirect validation, timeout, request/response bounds, explicit production import activation, CSP, anti-framing, MIME/referrer/permissions headers. Hosted disabled function returned JSON 503 with the expected policy.                                   |
| Abuse prevention           | Published Vercel Firewall rule: exact `/api/import-web`, fixed 60-second window, 10 requests per IP; actual 429 behavior verified. No pretend in-memory distributed rate limiter.                                                                                                   |
| Secret review              | Gitleaks 8.30.1, downloaded from its official release and checksum-verified: All 13 reachable commits at verification and the current working directory scanned with redacted output, no findings. This is not a guarantee that every possible secret or ownership issue is absent. |
| Safe state                 | Known-field restoration and bounded identifiers, dimensions and chord shapes. Corrupt storage is retained for recovery rather than overwritten. Save failures are visible.                                                                                                          |
| Multiple windows           | Exclusive Web Lock prevents a second tab from editing stale state. Closing the owner allows the waiting tab to load current data. Chromium and WebKit tests verify persistence and takeover.                                                                                        |
| Backups                    | Full workspace JSON export and additive restore; version validation, fresh IDs, 10 MiB/500-song limits, preserved layout and existing tabs. Unit and browser round trips pass.                                                                                                      |
| Imports                    | 10 MiB files, 50 PDF pages, 50,000 characters per normal song import. PDF resources released on failures. DOCX preflight limits declared expansion to 32 MiB and 2,000 entries; malformed/encrypted archives rejected.                                                              |
| Exports                    | Deep state snapshots and retryable font loading. PDF, Word and TXT regression workflows pass.                                                                                                                                                                                       |
| Languages / SEO            | English and Spanish interfaces without translating user data; distinct static language URLs, language links, metadata, optional canonical/sitemap and generated social preview.                                                                                                     |
| Responsiveness             | Self-hosted fonts, immutable hashed assets, lazy optional export libraries. Auto-fit parses once and runs in a worker with a 10-second timeout, discarding results if the song changes.                                                                                             |
| Accessibility              | Improved contrast and target sizes, dialog names, keyboard-scrollable preview and reduced-motion support. Earlier 12 screen/locale axe combinations detected no violations.                                                                                                         |
| Dependencies / CI          | Four runtime libraries with distinct roles; no new runtime dependency. Vite is a development dependency. Pinned action revisions, least-privilege workflow, Dependabot and built-server browser tests.                                                                              |

## Initial audit validation (September 21)

- Node.js 24.21.0: formatting, **65 unit tests** and production build passed.
- Seven existing Chromium browser suites passed after adding worker-based fitting, language routes and backups.
- Additional Chromium, Firefox and WebKit workflow checks passed in GitHub Actions on Linux: exclusive editing, takeover, persistence, backup restore and language switching.
- Frozen install, dependency audit, formatting, build, 65 unit tests, seven Chromium suites and the three-engine compatibility suite passed in hosted CI on Node.js 24.20.0. No reported dependency advisories.
- Earlier local Lighthouse mobile: performance 90, accessibility 100, best practices 100, SEO 100; FCP 2.3 seconds, LCP 3.3 seconds, TBT 10 ms, CLS 0. These predate the final follow-up features and are not field metrics or a fresh score for the deployed build.
- The initial build warned about optional export chunk sizes. The 0.2.0 main bundle remains roughly 66 kB gzip; the 522 kB Word worker loads only when importing DOCX.
- Ignored `artifacts/` contains local reports and synthetic export samples. No personal songs are committed.

## Scope and limits

Reviewed application modules, state restoration, HTML escaping, imports/exports, backend requests, dependencies, build/deployment configuration, CI, repository documentation, attribution and reachable Git history. This is not a penetration test, formal license opinion, comprehensive dependency-source audit or accessibility certification.

Follow [the deployment guide](deployment.md) for runtime, environment variables, rollback and workspace migration. Export a full JSON backup before moving to another origin. Retain file/text import when a provider rejects server traffic; do not bypass provider access controls.

### Hosted acceptance checks

The protected preview returned 200 for `/`, `/en/`, `/es/` and `/sitemap.xml`, with Spanish initial metadata on `/es/`; source paths and unknown routes returned 404. Cifra Club, LaCuerda and Ultimate Guitar each parsed into an editable song through the deployed function. Changing language and reloading preserved a synthetic edited song. No provider lyrics were added to repository fixtures.

The cross-browser CI run found and resolved a WebKit timing issue: lock release can lag behind window closure. A waiting tab now queues for ownership after an explicit retry rather than requiring another click. The final automated browser step passed in [GitHub Actions](https://github.com/antoniomml/chordleaf/actions/runs/35647847238).

### 0.2.0 follow-up

Word parsing now runs in a dedicated worker, skips embedded images, limits returned markup and terminates after cancellation or 15 seconds. PDF decoding is destroyed on cancellation/timeout; text and geometry budgets apply before proportional-font measurements. Web download requests and auto-fit workers are cancelled when leaving the import flow.

Five additional unit cases exercise cumulative PDF limits, oversized fragments/items, oversized songs in backups and LaCuerda plain-text response policy (70 unit tests total). Cross-browser checks cover real DOCX import plus a deliberately stalled decoder for cancellation and timeout. Existing PDF/Word export and reimport regressions remain in the full browser suite. Twelve screenshots across Document, Key, Chords and New Song at 1440, 768 and 390 pixels matched byte-for-byte before and after CSS cleanup.

### 0.3.0 release review

Version 0.3.0 removes the preloaded sample song, clarifies chord-diagram actions and gives language/export controls consistent application chrome. Language-menu behavior now lives in a focused UI module with keyboard navigation and Escape handling. Live local acceptance imported the same Alejandro Sanz song through both LaCuerda HTML and `/TXT/` URLs, alongside Cifra Club and Ultimate Guitar. The HTML failure was caused by LaCuerda placing an empty utility `<pre>` before the actual `#t_body` sheet; the provider adapter now selects the real sheet explicitly.

Private publication is intentional. Required branch protection and GitHub private vulnerability reporting remain unavailable under the current private-repository plan; revisit them if visibility or plan changes. No paid upgrade or visibility change was made.

The Vite 8.3.0 dependency update was reviewed and merged separately, then tested together with the import changes. The observed local production build dropped from approximately 2.0 seconds to 0.37 seconds; these are individual development-machine measurements, not website load-time claims. No application dependency was added.
