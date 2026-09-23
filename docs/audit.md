# Production readiness audit

**Historical launch review, updated:** September 23, 2026. Baseline: `39bf11b`, plus the production-readiness and public-launch changes. For the latest full assessment, see [the September 23 public audit](public-audit-2026-09-23.md).

[← Back to Chordleaf](../README.md) · [Deployment guide](deployment.md) · [Security policy](../SECURITY.md)

## Current status

The application and MIT-licensed repository are public. English and Spanish are supported, while repository documentation remains English. The production site is accessible without sign-in at `https://chordleaf.com/`; `www` redirects to the apex. Vercel Standard Protection keeps previews behind authentication. The initial review was merged in [pull request #1](https://github.com/antoniomml/chordleaf/pull/1), and the public launch preparation in [pull request #4](https://github.com/antoniomml/chordleaf/pull/4).

Anonymous requests to `/`, `/en/`, `/es/`, `/robots.txt` and `/sitemap.xml` returned 200 after launch. A preview deployment still redirected to Vercel sign-in. The canonical, Open Graph and language URLs point to `chordleaf.com`. The `chordleaf.com` Domain property is verified in Google Search Console. Discovery does not guarantee indexing.

## Remaining priorities

Continue real-device and human accessibility checks, monitor public web-import usage and provider availability, and watch Search Console as Google processes the new property. These are follow-up checks on the public service.

### September 23 launch review

- `chordleaf.com` is the configured production origin; `www.chordleaf.com` redirects to it. Production was rebuilt after setting `SITE_URL`, and its metadata uses the canonical domain.
- Vercel Authentication changed from **All Deployments** to **Standard Protection**. Production is public and previews remain protected.
- GitHub is public. Dependency graph, vulnerability and malware alerts, Dependabot security updates, private vulnerability reporting and CodeQL default setup are enabled. Actions use read-only workflow tokens and full-length SHA-pinned actions. An active `main` ruleset requires a PR, resolved review threads and up-to-date `app` and `Vercel` checks, and blocks force pushes and deletion.
- Vercel's `/api/import-web` rule remains active at 10 requests per IP per 60 seconds, returning 429. Project data sharing for model training is off. Web imports are enabled in Production and Preview; review public usage and provider availability.
- Google Search Console verified the Domain property through a Vercel DNS TXT record. The apex sitemap was submitted and marked correct with two discovered pages before the subsequent SEO update; indexing is pending.

The first CodeQL scan found three partial LaCuerda hostname checks and one request-forgery alert. [Pull request #5](https://github.com/antoniomml/chordleaf/pull/5) replaced the substring checks with exact hostname matches; the next `main` scan closed all three alerts. The remaining request-forgery alert was reviewed and dismissed as a false positive with the reason recorded in GitHub: `songUrl` accepts only HTTPS URLs whose host exactly matches a fixed allowlist, rejects credentials and nonstandard ports, and revalidates every manually handled redirect before another fetch. No CodeQL alerts remain open after that review.

| Priority | Follow-up                                      | Evidence / limitation                                                                                                                                                                          |
| -------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Monitor public web-import usage and providers. | The firewall limits `/api/import-web` to 10 requests/IP/minute. All three providers worked on a protected preview, but availability and usage can change. Keep text/file import as a fallback. |
| P1       | Perform human accessibility and device checks. | Automated browser and earlier axe checks do not replace a real iPhone, keyboard use at 200% zoom and a screen-reader session.                                                                  |
| P2       | Watch indexing in Search Console.              | The Domain property is verified and the apex sitemap is correct; Google has not yet reported indexing for this new property.                                                                   |
| P2       | Profile unusually large or hostile documents.  | Word and auto-fit use terminable workers; PDF parsing has cancellation, timeout and cumulative text/geometry budgets. These are not a complete hostile-document sandbox.                       |
| P2       | Consolidate UI render helpers and CSS.         | The static shell and document/key render helpers were extracted. Continue gradual extraction when changing features.                                                                           |

## 0.4.0 pre-public repository review

The current tree contains no committed `.env`, backup, imported song, generated report or local Vercel configuration. The four published images were visually reviewed and contain the invented demo song or Chordleaf artwork. The original legacy application remains reachable in older commits; it was inspected for obvious private material and is not part of the current tree. Rewriting published history was unnecessary because the checks below found no secret to remove.

Gitleaks 8.30.1 was downloaded from its official release and matched its published SHA-256 checksum. The full reachable history (24 commits; 20 patch commits scanned by Gitleaks) produced no findings. The release changes and final tree were checked again before tagging. `pnpm audit --audit-level=high` reported no known advisories. Automated scanners cannot prove that every possible secret, personal detail or rights issue is absent; contributors should still avoid real songs and private files in issues and fixtures.

The import regression review used the owner-provided Spanish Ultimate Guitar URL and both LaCuerda versions of the Alejandro Sanz song in ignored local artifacts only. Tests committed to this repository use invented short examples. All five live imports passed locally; public-provider availability may change independently of Chordleaf.

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

At the time of the 0.3.0 review, the repository was private and branch protection and private vulnerability reporting were unavailable under that plan. The repository is now public and those controls are enabled as described above. No paid plan upgrade was made.

The Vite 8.3.0 dependency update was reviewed and merged separately, then tested together with the import changes. The observed local production build dropped from approximately 2.0 seconds to 0.37 seconds; these are individual development-machine measurements, not website load-time claims. No application dependency was added.
