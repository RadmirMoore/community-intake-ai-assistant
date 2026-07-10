# Community Intake Assistant

[![CI](https://github.com/RadmirMoore/community-intake-ai-assistant/actions/workflows/ci.yml/badge.svg)](https://github.com/RadmirMoore/community-intake-ai-assistant/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> An AI-assisted intake and triage workflow for small nonprofits, designed to reduce staff workload while keeping humans in control.
![Staff Dashboard](assets/staff%20dashboard.png)
Small nonprofits — food banks, housing programs, public health clinics, legal aid, community centers — receive a steady stream of requests for help, often with very few staff and not everyone technical. This project is a lightweight web app that helps those teams **receive, triage, and follow up** on incoming requests, using Claude to do the tedious first pass while a human always makes the final call.

It's a real, self-hostable app — deploy it and a nonprofit can use it today —
built around a strict principle for when the people on the other end may be in
crisis: Claude never sends a message or changes a status on its own, a request
is never lost if the model call fails, and the system prompt hard-codes limits
on what the AI is allowed to say. See
[`docs/RESPONSIBLE_AI.md`](docs/RESPONSIBLE_AI.md) for the full design and
[`docs/EVALS.md`](docs/EVALS.md) for how triage quality is measured, not just
assumed.

## What it does

1. **Receives requests** through a simple, low-pressure public intake form. ZIP code is optional, at least one of email or phone is required, and consent is required.
2. **Triages with AI**: Claude classifies each request (housing, food, healthcare, legal, emergency, general), assigns an urgency, writes a short summary for staff, drafts a follow-up message in the requester's own language, lists recommended next steps, and raises safety flags.
3. **Keeps humans in control**: every AI output is a *draft* on a staff dashboard. Staff review, edit, change status, and add internal notes.
4. **Closes the loop** even with no contact info: every submission gets an unguessable tracking link (`/status/[id]`); staff review and explicitly publish a reply before it's ever visible there.
5. **Stores submissions** in Supabase (Postgres) — or a local JSON file when no database is configured.
6. **Surfaces a dashboard** with counts, filters (status / category / search), and a "needs attention" view for likely emergencies.

## Privacy & safety by design

This is the most important part of the project.

- **Human review required.** The AI never acts on its own. Its classification, summary, and follow-up message are always drafts a person reviews before anything is sent.
- **No automated legal or medical advice.** The system prompt explicitly forbids diagnosis, treatment, or legal advice; the assistant points people to qualified humans instead.
- **Emergency flagging.** Messages that look urgent (immediate danger, homelessness tonight, etc.) are flagged for immediate human attention and surfaced on the dashboard.
- **A request is never lost.** If the AI call fails (outage, rate limit), the submission is still stored with a transparent rule-based triage and flagged for manual review.
- **Minimal data collection.** ZIP code is optional and only one of email/phone is required, not both; explicit consent is required before a request is stored; the form discourages sharing unnecessary sensitive details.
- **Deletable.** Staff can permanently delete a submission from the dashboard once it's no longer needed — there is no automated retention schedule yet (see `ROADMAP.md`), but deletion doesn't require touching the database or JSON file by hand.
- **Staff-only dashboard.** With `DASHBOARD_PASSWORD` set, the dashboard and its APIs require a staff sign-in (httpOnly session cookie). Without it the app runs in open demo mode and says so on screen.
- **Who reviewed what.** Staff enter a display name once (stored in their browser); it's attached to a submission whenever they change its status or notes. This is self-reported, not verified identity — see [`docs/RESPONSIBLE_AI.md`](docs/RESPONSIBLE_AI.md) for why, and what real per-user accounts would take.
- **A reply can always reach the requester.** There's no automated email/SMS sending in this app yet, so a submission's own id doubles as an unguessable tracking link (`/status/[id]`) — the one built-in delivery path regardless of what contact info was given. Staff must explicitly publish a reply before anything appears there — nothing crosses from AI to requester automatically, and the public endpoint only ever returns status + a published reply, never the original message or contact info.
- **Rate limiting.** The public intake endpoint is rate-limited per IP so bots can't flood the queue or burn the API budget. In-memory by default; set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` for a shared backend on serverless/multi-instance deployments.
- **Server-only secrets.** The Anthropic key and Supabase service-role key are only ever used on the server, never shipped to the browser.

## Tech stack

- **Next.js (App Router) + TypeScript** — UI and API routes
- **Tailwind CSS** — styling
- **Anthropic API** (`@anthropic-ai/sdk`) — structured triage via tool use
- **Supabase** (Postgres) — persistence, with a zero-config **local JSON fallback**
- **Upstash Redis** (`@upstash/redis`) — optional shared rate-limiter backend, with a zero-config **in-memory fallback**
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

**Testing against a real Postgres locally, without a cloud project:** this repo
includes a [Supabase CLI](https://supabase.com/docs/guides/local-development)
config (`supabase/config.toml`, ports shifted to 55321-55329 to avoid clashing
with other local Supabase projects). `supabase start` spins up a full local
Postgres + PostgREST stack in Docker; apply the schema with
`psql -h 127.0.0.1 -p 55322 -U postgres -d postgres -f supabase/schema.sql`,
then point `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` in `.env.local` at the
`API URL` / `service_role key` printed by `supabase status`. This is how
`SupabaseSubmissionStore` gets verified against real Postgres — including
things a mock can't catch, like `.eq("id", id)` throwing (not returning null)
on a malformed UUID, which `src/app/api/status/[id]/route.ts` depends on
handling correctly.

**Testing the Redis-backed rate limiter locally, without an Upstash account:**
run a real Redis plus an Upstash-REST-compatible proxy in front of it —
[`hiett/serverless-redis-http`](https://github.com/hiett/serverless-redis-http)
speaks the same REST protocol `@upstash/redis` expects:

```bash
docker network create ciassistant-redis-test
docker run -d --name ciassistant-redis --network ciassistant-redis-test redis:7-alpine
docker run -d --name ciassistant-srh --network ciassistant-redis-test -p 18080:80 \
  -e SRH_MODE=env -e SRH_TOKEN=test-local-token \
  -e SRH_CONNECTION_STRING="redis://ciassistant-redis:6379" \
  hiett/serverless-redis-http:latest
```

Then set `UPSTASH_REDIS_REST_URL=http://localhost:18080` and
`UPSTASH_REDIS_REST_TOKEN=test-local-token` in `.env.local`. Inspect real state
with `docker exec ciassistant-redis redis-cli KEYS "rate-limit:*"`.

## Deploying

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FRadmirMoore%2Fcommunity-intake-ai-assistant&env=ANTHROPIC_API_KEY,DASHBOARD_PASSWORD,SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,UPSTASH_REDIS_REST_URL,UPSTASH_REDIS_REST_TOKEN&envDescription=See%20.env.example%20for%20what%20each%20variable%20does%20%E2%80%94%20all%20are%20optional%20except%20DASHBOARD_PASSWORD%20for%20a%20real%20deployment&envLink=https%3A%2F%2Fgithub.com%2FRadmirMoore%2Fcommunity-intake-ai-assistant%2Fblob%2Fmain%2F.env.example&project-name=community-intake-assistant&repository-name=community-intake-assistant)

The app is a standard Next.js app and deploys to Vercel (or any Node host)
with no extra configuration. Environment variables, all optional except as
noted:

| Variable | Required? | Effect if unset |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | No | Falls back to rule-based triage (still emergency-aware, clearly labeled non-AI) |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-sonnet-5` |
| `DASHBOARD_PASSWORD` | **Yes, for any real deployment** | Dashboard runs open/unauthenticated ("demo mode") |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | No | Falls back to a local JSON file — fine for evaluation, not for multi-instance production |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | No | Rate limiter falls back to an in-memory map — fine for a single instance, not coordinated across serverless instances |

For a traditional server instead of Vercel, see
[`docs/DEVELOPMENT_RULES.md`](docs/DEVELOPMENT_RULES.md) for the
git-fetch-and-restart deployment flow this project follows.

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
    status/page.tsx           # public: paste a tracking code
    status/[id]/page.tsx      # public: view status + any published reply
    api/
      intake/route.ts             # POST: rate limit -> validate -> triage -> store
      preview-triage/route.ts     # POST: live triage demo on the landing page (preset-only)
      submissions/route.ts        # GET:  list submissions (staff only)
      submissions/[id]/route.ts   # GET/PATCH/DELETE: read + update + delete (staff only)
      submissions/[id]/reply/route.ts # POST/DELETE: publish/unpublish a reply (staff only)
      status/[id]/route.ts        # GET: public status + published reply lookup (rate limited)
      staff/login/route.ts        # POST/DELETE: staff session cookie
  components/             # UI (form, dashboard, detail panel, login, badges, status lookup)
  lib/
    types.ts             # domain types + Zod schemas
    triage.ts            # Anthropic triage + rule-based fallback
    auth.ts              # staff password + session cookie helpers
    rate-limit.ts        # in-memory rate limiter (pluggable Redis backend)
    storage/             # SubmissionStore interface + Supabase & local adapters
    i18n/                # locale dictionary + context (intake form, status pages)
    __fixtures__/        # golden-dataset cases for the triage eval harness
scripts/eval-triage.ts    # opt-in accuracy eval against the real Anthropic API
supabase/schema.sql      # Postgres schema (RLS enabled)
docs/
  DEVELOPMENT_RULES.md   # git / deploy workflow
  RESPONSIBLE_AI.md      # safety architecture writeup
  EVALS.md               # triage eval methodology
ROADMAP.md               # scoped, not-yet-built gaps
.github/workflows/ci.yml  # lint + test + build on every push and PR
```

## Tests

```bash
npm test
```

Tests cover the rule-based triage (keyword classification, emergency
flagging), the Zod input schemas (including per-locale error messages), the
rate limiter, the staff auth helpers, the local JSON store, every API route
(`src/app/api/**/*.test.ts`), and key component behavior (intake form
validation and i18n, the dashboard's staff-name flow, submission detail
actions, badge accessibility) via Vitest + jsdom + Testing Library. CI runs
lint, tests, and a production build on every push and pull request.
`src/lib/storage/supabase-store.ts` remains untested — see `ROADMAP.md`.

There's also an opt-in triage **accuracy eval** against the real Anthropic
API — see [`docs/EVALS.md`](docs/EVALS.md). It costs API credits and isn't
part of the default CI job. It reads `ANTHROPIC_API_KEY` from `.env.local`
the same way `next dev` does:

```bash
npm run eval:triage
# or, without a .env.local file:
ANTHROPIC_API_KEY=sk-ant-... npm run eval:triage
```

## Known limitations

This is a real, self-hostable tool, but it's early and honest about what it
doesn't do yet — see [`ROADMAP.md`](ROADMAP.md) for the scoped version of each
of these:

- The staff sign-in is a single shared password with no per-user accounts.
  Submissions do track a `reviewedBy` name, but it's self-reported (typed in,
  not logged in) — see [`docs/RESPONSIBLE_AI.md`](docs/RESPONSIBLE_AI.md).
- The intake form is available in English and Spanish (including validation
  messages); the landing page, `/intake` page chrome, and staff dashboard are
  still English-only.
- A first accessibility pass landed (per-field form errors, `aria-live`
  status/emergency regions, labeled dashboard filters) but there's no
  screen-reader or contrast audit yet.

## Disclaimer

This tool helps a nonprofit's own staff triage and respond to requests. It is
not a substitute for professional legal, medical, or emergency services, and it
does not provide emergency response. In an emergency, call 911 or your local
emergency number.

## License

[MIT](LICENSE)
