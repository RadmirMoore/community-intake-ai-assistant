-- Community Intake Assistant — Supabase / Postgres schema
-- Run this in the Supabase SQL editor (or `psql`) to create the storage table.

create extension if not exists "pgcrypto";

create table if not exists public.submissions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  status      text not null default 'new'
                check (status in ('new', 'in_review', 'in_progress', 'resolved', 'closed')),
  input       jsonb not null,   -- the intake form data submitted by the person
  triage      jsonb not null,   -- the AI (or rule-based) triage result
  staff_notes text not null default '',
  -- Self-reported staff display name, not verified identity — see
  -- docs/RESPONSIBLE_AI.md. Real per-user auth is tracked in ROADMAP.md.
  reviewed_by text
);

create index if not exists submissions_created_at_idx
  on public.submissions (created_at desc);

create index if not exists submissions_status_idx
  on public.submissions (status);

-- Row Level Security: intake data is sensitive.
-- This app talks to Supabase with the SERVICE ROLE key from the server only,
-- which bypasses RLS. We still enable RLS so that the anon/public key cannot
-- read or write these rows directly from a browser.
alter table public.submissions enable row level security;

-- (Intentionally no permissive anon policies.) Add policies here only if you
-- introduce authenticated staff accounts that should query Supabase directly.
