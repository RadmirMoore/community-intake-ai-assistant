# Roadmap

This project is intentionally scoped as a demonstration, and the README says
so plainly (see "Known limitations"). The items below are the concrete gaps
between that and something a real small nonprofit could run day to day.
They're written up here — instead of half-built — so a contributor can pick
one up as a self-contained piece of work. Pull requests welcome; see
[CONTRIBUTING.md](CONTRIBUTING.md).

## Real per-user staff accounts (Supabase Auth)

Submissions now carry a `reviewedBy` field (`src/lib/types.ts`), populated
from a self-reported display name a staff member enters once in the
dashboard (stored in `localStorage`, sent as an `X-Staff-Name` header — see
`src/lib/auth.ts`'s `readStaffNameHeader`). This answers "who last touched
this" for a small trusted team, but it is **not authentication** — anyone
with dashboard access can type any name. `DASHBOARD_PASSWORD` is still the
only real access control, and it's still a single shared password with no
per-user login or audit-proof identity.

The real fix is Supabase Auth: per-user sign-in, `reviewedBy` populated
server-side from the authenticated session instead of a client-supplied
header, and RLS policies keyed to `auth.uid()` for any code path that
queries Supabase directly (today the app only ever uses the service-role key,
which bypasses RLS entirely — introducing per-user sessions means designing
real policies, not just filling in the "no policies yet" comment in
`supabase/schema.sql`). This needs a live Supabase project to build and test
against safely; get one before attempting it, since a wrong RLS policy either
locks out staff or leaks rows.

## Accessibility: remaining gaps

A first pass landed: per-field intake-form errors with `aria-describedby`/
`aria-invalid` instead of one flat error message, `aria-live` regions for the
emergency banner and save/copy confirmations, labels on the dashboard's
search and filter controls, and a hidden decorative glyph on the critical
urgency badge (`src/components/badges.tsx`). Still open: an actual
screen-reader pass (VoiceOver/NVDA — not verifiable in a typical CI sandbox),
focus management when the submission detail panel changes selection, and a
real color-contrast audit rather than a visual read of the palette.

## Multi-language coverage beyond the intake form

The public intake form (`src/components/intake-form.tsx`) now supports
English and Spanish via `src/lib/i18n/`, including server-side validation
messages that match the requester's chosen language
(`buildIntakeInputSchema` in `src/lib/types.ts`). Not yet translated: the
`/intake` page's own heading and intro copy (outside the form component), the
landing page, and the staff dashboard (deliberately English-only for now,
since staff-facing text was out of scope for this pass). Adding a third
language is mechanical — extend `Locale` and `DICTIONARIES` in
`src/lib/i18n/dictionary.ts` — but translating the page chrome around the
form is a small follow-up worth doing for full coherence.

**Resolved:** the rule-based fallback (`ruleBasedTriage` in
`src/lib/triage.ts`, used only when `ANTHROPIC_API_KEY` is unset or the AI
call fails) originally matched English keywords only. Once the intake form
started accepting Spanish, that meant a Spanish-language crisis message could
go unflagged for immediate attention on exactly the path that's supposed to
be the safety net — the AI can read any language fine, but the deterministic
fallback couldn't. `CATEGORY_KEYWORDS` now mixes English and Spanish terms
per category (checked regardless of the requester's stated locale, so a
misidentified or missing locale doesn't suppress the match); see
`src/lib/triage.test.ts` for coverage. A third language would need its terms
added the same way.

## LLM-judge eval for the "no legal/medical advice" constraint

`scripts/eval-triage.ts` (see `docs/EVALS.md`) checks the structured triage
fields (category, urgency, emergency flag) against a golden dataset, but not
whether the free-text summary or suggested follow-up actually honors the
system prompt's hard constraint against legal or medical advice. That needs
either a human review pass over a sample of outputs, or a second model call
acting as a judge against a rubric.

## Test coverage: what's still not covered

Unit and component tests now cover the API routes (`src/app/api/**/*.test.ts`),
key component behavior (intake form validation and i18n, the dashboard's
staff-name flow, submission detail actions, badge accessibility), and the
local JSON store. `src/lib/storage/supabase-store.ts` remains untested — it
needs either a mocked `@supabase/supabase-js` client (asserting the right
query-builder calls, not true integration coverage) or a real local/test
Supabase instance, neither of which exists in this repo yet.
