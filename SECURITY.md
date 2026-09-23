# Security

## Reporting a vulnerability

Please do not post exploit details, private songs, credentials or recovery files in a public issue. Use GitHub's [private vulnerability reporting](https://github.com/antoniomml/chordleaf/security/advisories/new) to contact the maintainers. If that option is unavailable, open an issue requesting a private contact without including the vulnerability details.

Include the affected version, a minimal invented example, reproduction steps and the expected impact. There is no published response-time commitment or long-term support policy yet; fixes target the current codebase.

## Security boundaries

- Local documents are processed in the browser. Imported HTML is parsed as data, never mounted as a live webpage.
- Web imports allow specific HTTPS hosts, reject credentials and nonstandard ports, revalidate redirects, and bound time and response size.
- Vercel web imports require explicit activation after deployment-level rate limiting. This is a public endpoint, not an authenticated service.
- Production CSP blocks inline and external scripts; inline styles remain necessary for document geometry. Framing, MIME sniffing and unnecessary device permissions are restricted.
- File, text and PDF-page limits reduce accidental exhaustion. They are not a complete sandbox against all compressed-document or parser attacks.
- Songs are not encrypted or synchronized. Browser storage and XSS prevention are critical to protecting local documents.

Run `pnpm audit`, `pnpm check` and production browser tests when changing dependencies or import code. Never commit `.env` files, tokens, private documents or generated audit outputs.
