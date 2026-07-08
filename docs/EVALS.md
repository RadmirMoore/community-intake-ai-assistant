# Triage evals

Unit tests (`npm test`) check the deterministic rule-based fallback and the
surrounding plumbing (schemas, auth, rate limiting). They don't tell you
anything about whether **Claude's actual classification is any good** — that
requires running real cases through the real model and checking the output,
which is what `scripts/eval-triage.ts` does.

## Running it

```bash
npm run eval:triage
```

It reads `ANTHROPIC_API_KEY` from `.env.local` the same way `next dev` does
(via Node's `--env-file-if-exists`), or you can pass it inline instead:
`ANTHROPIC_API_KEY=sk-ant-... npm run eval:triage`.

This calls the real Anthropic API once per case in
`src/lib/__fixtures__/triage-eval-cases.ts`, so it costs API credits. It is
**not** part of the default CI job (`.github/workflows/ci.yml`) for that
reason — run it manually after a change to the system prompt
(`src/lib/triage.ts`) or before a release.

## What it measures

For each case, the script compares Claude's output against an expected
result and reports three numbers:

- **Category accuracy** — did it pick the right service area (housing, food,
  healthcare, legal, emergency, general)? Judgment calls are allowed to
  differ here; this is a quality signal, not a hard gate.
- **Urgency accuracy** — is the assigned urgency at least as high as expected?
  A model that over-escalates a borderline case is fine; under-escalating
  isn't.
- **Emergency recall** — of the cases that *must* be flagged
  (`requiresImmediateAttention: true` — domestic violence, suicidal ideation,
  medical emergencies, homelessness or hunger "tonight"), how many actually
  were flagged? **This is the number that matters.** The script exits non-zero
  if it's below 100%, because a missed emergency flag means a person in
  crisis doesn't get surfaced to staff — that failure mode is treated as a
  release blocker, unlike category/urgency disagreement.

## The dataset

`src/lib/__fixtures__/triage-eval-cases.ts` holds ~15 synthetic cases (written
for this project, not copied from real submissions) spanning every category,
a range of urgency levels, a couple of explicit emergency scenarios, and one
non-English message to check the pipeline handles it. It's intentionally
small and readable rather than large — the goal is a fast, legible signal you
can reason about case by case, not a statistically rigorous benchmark.

### Adding a case

Add an entry to `TRIAGE_EVAL_CASES` with a synthetic message (never a real
submission — these fixtures are checked into a public repo) and the expected
`category`, `expectedMinUrgency`, and `expectedRequiresImmediateAttention`.
Add a case whenever a real deployment surfaces a misclassification worth
guarding against, so the eval grows from real failure modes over time.

## Known gaps

This eval only checks the *structured fields* (category, urgency, emergency
flag) — it doesn't check whether the free-text summary or suggested
follow-up actually honors the "no legal or medical advice" constraint in the
system prompt. That would need either a human review pass or a second model
call acting as a judge; neither is wired up yet (see `ROADMAP.md`).
