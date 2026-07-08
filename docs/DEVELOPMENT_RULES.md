# Development & Deployment Rules

This project follows a strict Git-based workflow. GitHub is the source of truth,
and any production server is always kept in sync with the `main` branch.

## Branching

- `main` is the stable, deployable branch. **Never commit directly to `main`.**
- All new work happens on a feature or fix branch:
  - `feature/<short-description>`
  - `fix/<short-description>`
- Keep diffs small and focused. Explain the root cause of any bug you fix.

## Before merging to `main`

Always run and pass, locally, on the feature branch:

```bash
npm install
npm run lint
npm test
npm run build
```

Open a pull request into `main` and merge only after the above pass. The same
checks run automatically in CI (`.github/workflows/ci.yml`) on every push and
pull request.

## Environments

- Development happens **locally**, never directly on a production server.
- Never edit code directly on a production server unless it is an explicitly
  labeled **emergency hotfix** (and backport it to GitHub immediately after).

## Production deployment

Deploy **only** from the GitHub `main` branch. A typical update on a server:

```bash
git fetch origin
git reset --hard origin/main
npm install
npm run build
# restart the app process (systemd unit, pm2, etc.)
```

Platforms like Vercel can instead deploy `main` automatically on push.

## Configuration in production

Set the runtime secrets in the server environment (never commit them):

- `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`)
- `DASHBOARD_PASSWORD` — **required**; without it the staff dashboard is open
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
