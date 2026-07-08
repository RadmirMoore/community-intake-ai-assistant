# Community Intake Assistant

> An AI-assisted intake and triage workflow for small nonprofits, designed to reduce staff workload while keeping humans in control.

Small nonprofits — food banks, housing programs, public health clinics, legal aid, community centers — receive a steady stream of requests for help, often with very few staff and not everyone technical. This project is a lightweight web app that helps those teams **receive, triage, and follow up** on incoming requests, using Claude to do the tedious first pass while a human always makes the final call.

## What it does

1. **Receives requests** through a simple, low-pressure public intake form. Contact details are optional and consent is required.
2. **Triages with AI**: Claude classifies each request (housing, food, healthcare, legal, emergency, general), assigns an urgency, writes a short summary for staff, drafts a follow-up message in the requester's own language, lists recommended next steps, and raises safety flags.
3. **Keeps humans in control**: every AI output is a *draft* on a staff dashboard. Staff review, edit, change status, and add internal notes.
4. **Stores submissions** in Supabase (Postgres) — or a local JSON file when no database is configured.
5. **Surfaces a dashboard** with counts, filters (status / category / search), and a "needs attention" view for likely emergencies.

## Privacy & safety by design

This is the most important part of the project.

- **Human review required.** The AI never acts on its own. Its classification, summary, and follow-up message are always drafts a person reviews before anything is sent.
- **No automated legal or medical advice.** The system prompt explicitly forbids diagnosis, treatment, or legal advice; the assistant points people to qualified humans instead.
- **Emergency flagging.** Messages that look urgent (immediate danger, homelessness tonight, etc.) are flagged for immediate human attention and surfaced on the dashboard.
- **A request is never lost.** If the AI call fails (outage, rate limit), the submission is still stored with a transparent rule-based triage and flagged for manual review.
- **Minimal data collection.** Contact fields are optional; explicit consent is required before a request is stored; the form discourages sharing unnecessary sensitive details.
- **Staff-only dashboard.** With `DASHBOARD_PASSWORD` set, the dashboard and its APIs require a staff sign-in (httpOnly session cookie). Without it the app runs in open demo mode and says so on screen.
- **Rate limiting.** The public intake endpoint is rate-limited per IP so bots can't flood the queue or burn the API budget.
- **Server-only secrets.** The Anthropic key and Supabase service-role key are only ever used on the server, never shipped to the browser.

## Tech stack

- **Next.js (App Router) + TypeScript** — UI and API routes
- **Tailwind CSS** — styling
- **Anthropic API** (`@anthropic-ai/sdk`) — structured triage via tool use
- **Supabase** (Postgres) — persistence, with a zero-config **local JSON fallback**
- **Zod** — input validation
- **Vitest** — unit tests, run in CI via GitHub Actions

## Quick start

The app runs with **zero configuration**. Without any keys it uses a local JSON
store and a transparent rule-based triage, so you can evaluate the whole workflow
immediately.

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000):

- `/` — overview
- `/intake` — the public request form
- `/dashboard` — the staff dashboard

### Enable real AI triage

Copy the example env file and add your Anthropic key:

```bash
cp .env.example .env.local
# then set ANTHROPIC_API_KEY in .env.local
```

The triage model defaults to `claude-sonnet-5` and can be overridden with
`ANTHROPIC_MODEL`.

### Protect the staff dashboard

Set `DASHBOARD_PASSWORD` in `.env.local`. The dashboard and the submissions
APIs will then require a staff sign-in. **Always set this before deploying
anywhere real** — intake data is sensitive.

### Enable Supabase storage

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

The app automatically switches from the local JSON store to Supabase when both
variables are present (shown in the dashboard footer).

## How the triage works

`src/lib/triage.ts` sends the request to Claude with a strict system prompt and a
single `record_triage` tool whose schema mirrors the app's domain types. Forcing
tool use gives reliable, structured output. The draft follow-up message is
written in the language the person wrote in; the staff-facing summary stays in
English.

If no API key is configured — or the AI call fails — a deterministic keyword
classifier fills in and clearly labels itself as non-AI so staff know the
request was not intelligently reviewed.

## Project structure

```
src/
  app/
    page.tsx              # landing / overview
    intake/page.tsx       # public intake form
    dashboard/page.tsx    # staff dashboard (behind the staff sign-in)
    api/
      intake/route.ts             # POST: rate limit -> validate -> triage -> store
      submissions/route.ts        # GET:  list submissions (staff only)
      submissions/[id]/route.ts   # GET/PATCH: read + update (staff only)
      staff/login/route.ts        # POST/DELETE: staff session cookie
  components/             # UI (form, dashboard, detail panel, login, badges)
  lib/
    types.ts             # domain types + Zod schemas
    triage.ts            # Anthropic triage + rule-based fallback
    auth.ts              # staff password + session cookie helpers
    rate-limit.ts        # in-memory rate limiter for the public intake
    storage/             # SubmissionStore interface + Supabase & local adapters
supabase/schema.sql      # Postgres schema (RLS enabled)
docs/DEVELOPMENT_RULES.md # git / deploy workflow
.github/workflows/ci.yml  # lint + test + build on every push and PR
```

## Tests

```bash
npm test
```

Unit tests cover the rule-based triage (keyword classification, emergency
flagging), the Zod input schemas, the rate limiter, and the staff auth helpers.
CI runs lint, tests, and a production build on every push and pull request.

## Known limitations

This is a demonstration project, honest about what it doesn't do yet:

- The staff sign-in is a single shared password — fine for a small team demo,
  but a real deployment should use per-user accounts (e.g. Supabase Auth).
- The rate limiter is in-memory (per process); on serverless platforms use a
  shared store such as Redis.
- There is no data-retention automation yet; deleting a submission means
  deleting the row in Supabase (or editing the local JSON file).

## Disclaimer

This is a demonstration project. It is not a substitute for professional legal,
medical, or emergency services. In an emergency, call 911 or your local emergency
number.

## License

[MIT](LICENSE)
