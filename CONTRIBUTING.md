# Contributing to Chordi

You do not need to write code to help. Report confusing controls, suggest clearer explanations, or share an idea through the repository's issue templates. Use a short invented song example instead of private or copyrighted material.

For code changes, start with the [development guide](docs/development.md). Use Node.js 24 and the pinned pnpm version. Keep documentation and code identifiers in English, and update both English and Spanish interface copy. Preserve user song content exactly.

Before opening a pull request, run `pnpm check`, the browser suites and `pnpm test:compatibility` against a built local server. Explain the user-visible change and relevant validation. Include a screenshot with demo data when the interface changes.

Changes should keep editing local, avoid unnecessary dependencies and preserve accessible keyboard controls. Security concerns belong in the private reporting process described in [SECURITY.md](SECURITY.md), not a public issue. Contributions to original application code are covered by the [MIT license](LICENSE).
