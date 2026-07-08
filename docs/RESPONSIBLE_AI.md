# Responsible AI design

This document explains the safety architecture already built into the app —
what decisions Claude is (and isn't) allowed to make, what happens when the AI
call fails, and how the design minimizes risk to people submitting requests
who may be in crisis. Every mechanism described here is implemented in code;
the file references point at the actual source.

## 1. Human-in-the-loop, always

Claude never acts on a request. `triageIntake` (`src/lib/triage.ts`) produces a
*draft*: a category, urgency, summary, suggested follow-up message, and
recommended next steps. Nothing is sent to the requester and no status
changes automatically — a staff member reviews every field on the dashboard
(`src/components/submission-detail.tsx`) and explicitly edits, copies, or acts
on it. The system prompt states this directly: "You are ADVISORY ONLY. A
human always reviews and makes the final decision" (`triage.ts:20`).

## 2. Hard constraints on what the model may say

The system prompt (`triage.ts:18-30`) forbids legal advice, medical diagnosis,
treatment recommendations, and promises about benefits eligibility or
outcomes. The follow-up draft is required to point people toward a qualified
human instead. These are prompt-level constraints today; the eval harness
(`docs/EVALS.md`) exists to check the model actually honors them on realistic
input, not just assume it will.

## 3. Emergency detection and escalation

The system prompt requires Claude to set `requiresImmediateAttention: true`
and `urgency: "critical"` whenever a message suggests immediate danger
(domestic violence, suicidal ideation, medical emergency, homelessness
tonight, imminent eviction) and to add a safety flag explaining why
(`triage.ts:24`). The dashboard surfaces these separately from the normal
queue — a "Needs attention" counter and filter (`src/components/dashboard.tsx`)
so a busy or non-technical staff member can't miss it, and the detail view
renders a persistent red banner for any submission flagged this way
(`submission-detail.tsx:38-42`).

## 4. A request is never silently lost

If no `ANTHROPIC_API_KEY` is configured, or the Anthropic API call throws
(rate limit, outage, timeout), `triageIntake` falls back to a deterministic
keyword classifier (`ruleBasedTriage`, `triage.ts:207-241`) instead of failing
the submission. The fallback:

- still runs the same emergency-keyword check and sets
  `requiresImmediateAttention` accordingly, so a crisis message is flagged
  even without a working model call;
- is labeled `generatedByAI: false` and carries a visible safety flag telling
  staff the record was classified by keywords only and needs manual review
  (`triage.ts:129-136`, shown in the UI at `submission-detail.tsx:81-84`).

The goal: a person asking for help is never met with a generic error page,
and staff are never misled into thinking an unreviewed request was
AI-reviewed.

## 5. Minimal data collection, explicit consent

The public intake form makes every contact field optional — someone in
crisis can ask for help without handing over an email, phone number, or ZIP
code (`src/lib/types.ts:36-50`). Submission requires an explicit consent
checkbox (`consent: z.literal(true, ...)`) before anything is stored. The
staff-facing summary is written in English regardless of the requester's
language, but the *draft* follow-up message is written back to the requester
in the language they used, so staff can send it without a translation step
that would otherwise expose the message to a third-party translation tool.

The form itself (labels, placeholders, validation messages) is now available
in English and Spanish (`src/lib/i18n/`), with server-side validation
(`api/intake/route.ts`) matching whichever language the requester chose —
someone who can't read English shouldn't have to guess what a red error
message says.

## 6. Secrets and access control

- `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are read only in server
  code (API routes, `src/lib/`) and are never sent to the browser.
- The staff dashboard and its APIs require authentication whenever
  `DASHBOARD_PASSWORD` is set (`src/lib/auth.ts`). The session cookie stores a
  SHA-256 digest of the password, not the password itself, and both the login
  check and the session check use `timingSafeEqual` to avoid timing side
  channels. Without a password set, the app runs in an explicitly-labeled open
  demo mode (`dashboard.tsx:146-152`) — never silently.
- The public intake endpoint is rate-limited per client IP
  (`src/lib/rate-limit.ts`, pluggable to a shared Upstash Redis backend) so it
  can't be used to flood the queue or burn the Anthropic API budget.

## 7. Who touched what: a deliberately honest audit trail

Every submission can carry a `reviewedBy` field, set whenever a staff member
changes its status or notes (`src/app/api/submissions/[id]/route.ts`,
`readStaffNameHeader` in `src/lib/auth.ts`). The name comes from a one-time
prompt in the dashboard, stored in that browser's `localStorage`
(`src/components/dashboard.tsx`) — **it is self-reported, not verified
identity**. Anyone with dashboard access can type any name. This is
deliberate: it closes the "no idea who touched this" gap for a small trusted
team without pretending to be real per-user authentication, which
`DASHBOARD_PASSWORD` (a single shared password) doesn't provide either. See
`ROADMAP.md` for what real per-user accounts (Supabase Auth) would take.

## 8. Known gaps

This is honest about what isn't solved yet — see `ROADMAP.md` for real
per-user staff accounts (today's `DASHBOARD_PASSWORD` is a single shared
password, and `reviewedBy` above is self-reported, not verified), remaining
accessibility work, and the LLM-judge eval for the legal/medical-advice
constraint. The in-repo [`README`](../README.md#known-limitations) tracks the
current state of these.
