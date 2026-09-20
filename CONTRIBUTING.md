# Help make room for more songs

[← Back to chordi](README.md)

You do not need to code to contribute. Missing chords, import problems and confusing controls are useful reports from real musical practice.

## Report a problem

[Open an issue](https://github.com/antoniomml/chordi/issues/new?template=bug_report.yml) describing what you tried, reproduction steps and the expected result. Include your browser and device. Use two or three invented lines and the affected chord names; do not share personal documents or complete third-party lyrics.

## Suggest an idea

[Describe your proposal](https://github.com/antoniomml/chordi/issues/new?template=feature_request.yml) in terms of what you want to achieve and when it would help. Sketches, wording improvements and accessibility suggestions are welcome.

## Work on the code

Follow the [pnpm development guide](docs/development.md) and read the [architecture](docs/architecture.md). Use a focused branch and explain the problem, resulting behavior and validation.

- Keep musical transformations and layout independent of UI controls.
- Test behavior changes, especially anchors, harmony, imports and exports.
- Run `pnpm format:check`, `pnpm test`, `pnpm build` and `pnpm test:e2e` with Vite running.
- Use pnpm exclusively and keep its lockfile up to date.
- Preserve data/font attribution; exclude credentials, private documents and generated results.

Open-source publication and the license for original code await the owner's decision. Third-party licenses are retained in [the notices](THIRD_PARTY_NOTICES.md).
