# Contributing

Thanks for considering a contribution to this project. It's a small, focused
codebase — keep changes that way too.

## Getting started

```bash
npm install
npm run dev
```

The app runs with zero configuration (local JSON storage, rule-based
triage fallback), so you can evaluate and change the whole workflow without
provisioning anything. See the README for how to enable real AI triage and
Supabase storage if your change needs them.

## Before opening a pull request

Run, locally, on your branch:

```bash
npm run lint
npm test
npm run build
```

All three must pass — the same checks run in CI
(`.github/workflows/ci.yml`) on every push and pull request.

## Workflow

This repo follows the branching and deployment rules in
[`docs/DEVELOPMENT_RULES.md`](docs/DEVELOPMENT_RULES.md): `main` is always
deployable and is never committed to directly; work happens on
`feature/<short-description>` or `fix/<short-description>` branches with
small, focused diffs.

## What to work on

- Check open issues, especially any labeled `good first issue`.
- [`ROADMAP.md`](ROADMAP.md) lists larger, scoped gaps (per-user staff
  accounts, a serverless-safe rate limiter, multi-language form UI,
  accessibility, broader test coverage) if you're looking for something more
  substantial.
- For anything not already tracked, open an issue describing the problem
  before sending a large PR, so we can agree on the approach first.

## Reporting bugs / requesting features

Use the issue templates — they ask for the context that's actually useful
here (small nonprofit intake/triage workflows, human-in-the-loop AI review).

## Safety-sensitive changes

This app is used, in real deployments, for people asking for help with
housing, food, healthcare, legal, and emergency needs. Changes that touch
`src/lib/triage.ts` (the system prompt, the fallback classifier), `src/lib/auth.ts`,
or anything affecting what data is collected or who can see it should call
that out explicitly in the PR description. See
[`docs/RESPONSIBLE_AI.md`](docs/RESPONSIBLE_AI.md) for the safety design this
project relies on.
