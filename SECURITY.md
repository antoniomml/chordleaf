# Security

## Reporting a vulnerability

Please do not post exploit details, private songs, credentials or recovery files in a public issue. Use GitHub's [private vulnerability reporting](https://github.com/antoniomml/chordleaf/security/advisories/new) to contact the maintainers. If that option is unavailable, open an issue requesting a private contact without including the vulnerability details.

Include the affected version, a minimal invented example, reproduction steps and the expected impact. There is no published response-time commitment or long-term support policy yet; fixes target the current codebase.

## Security boundaries

- Local documents are processed in the browser. Saved website HTML and pasted content are read only at the user’s request, within file/text budgets, and stay on the device. HTML is parsed in an unattached template, never mounted as a live webpage; embedded scripts and resources are not executed or loaded.
- Web imports allow specific HTTPS hosts, reject credentials and nonstandard ports, revalidate redirects, and bound time and response size. Client-visible failures use a small fixed set of translated messages; technical details stay in server logs.
- Vercel web imports require explicit activation after deployment-level rate limiting. This is a public endpoint, not an authenticated service.
- Production CSP blocks inline and external scripts; inline styles remain necessary for document geometry. Framing, MIME sniffing and unnecessary device permissions are restricted. Responses also set `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy` to `same-origin`, and deployment configuration fixes `Access-Control-Allow-Origin` to `https://chordleaf.com`, overriding the wildcard observed on static production responses.
- HSTS does not include `subdomains` or `preload` yet. Enabling `preload` is a deliberate, hard-to-reverse operation reserved for a domain whose subdomains are all HTTPS.
- File, text, DOCX, PDF-page and diagram limits reduce accidental exhaustion. Compressed Word documents are inflated in a worker with a decoded-size budget before the parser reads them. They are not a complete sandbox against all compressed-document or parser attacks.
- Songs are not encrypted or synchronized. Browser storage and XSS prevention are critical to protecting local documents.

Run `pnpm audit`, `pnpm check` and production browser tests when changing dependencies or import code. Never commit `.env` files, tokens, private documents or generated audit outputs.
