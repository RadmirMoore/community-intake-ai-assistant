"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CategoryBadge, StatusBadge, UrgencyBadge } from "@/components/badges";
import { SubmissionDetail } from "@/components/submission-detail";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  STATUSES,
  STATUS_LABELS,
  type Category,
  type Status,
  type Submission,
} from "@/lib/types";
import { formatDateTime } from "@/lib/ui";

type StatusFilter = Status | "all" | "attention";
type CategoryFilter = Category | "all";

const STAFF_NAME_STORAGE_KEY = "staffDisplayName";
const STAFF_NAME_HEADER = "X-Staff-Name";

interface DashboardProps {
  initialSubmissions: Submission[];
  initialBackend: string;
  isProtected: boolean;
}

export function Dashboard({ initialSubmissions, initialBackend, isProtected }: DashboardProps) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [backend] = useState<string>(initialBackend);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [search, setSearch] = useState("");
  const [staffName, setStaffName] = useState("");

  useEffect(() => {
    // localStorage isn't available during server rendering; load the
    // previously-entered name after mount rather than in the initial state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStaffName(window.localStorage.getItem(STAFF_NAME_STORAGE_KEY) ?? "");
  }, []);

  function saveStaffName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    window.localStorage.setItem(STAFF_NAME_STORAGE_KEY, trimmed);
    setStaffName(trimmed);
  }

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/submissions", { cache: "no-store" });
      if (res.status === 401) {
        // Session expired — send the user back through the login gate.
        router.refresh();
        return;
      }
      if (!res.ok) throw new Error("Failed to load submissions.");
      const data = (await res.json()) as { submissions: Submission[]; backend: string };
      setSubmissions(data.submissions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load submissions.");
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  const updateSubmission = useCallback(
    async (id: string, patch: { status?: Status; staffNotes?: string }) => {
      const res = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          // Header values must be Latin-1/ASCII-safe; encode so accented
          // names (José, François, ...) survive the round trip.
          ...(staffName ? { [STAFF_NAME_HEADER]: encodeURIComponent(staffName) } : {}),
        },
        body: JSON.stringify(patch),
      });
      if (res.status === 401) {
        router.refresh();
        return;
      }
      if (!res.ok) {
        setError("Failed to update the request.");
        return;
      }
      const data = (await res.json()) as { submission: Submission };
      setSubmissions((prev) => prev.map((s) => (s.id === id ? data.submission : s)));
    },
    [router, staffName],
  );

  const publishReply = useCallback(
    async (id: string, message: string) => {
      const res = await fetch(`/api/submissions/${id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(staffName ? { [STAFF_NAME_HEADER]: encodeURIComponent(staffName) } : {}),
        },
        body: JSON.stringify({ message }),
      });
      if (res.status === 401) {
        router.refresh();
        return;
      }
      if (!res.ok) {
        setError("Failed to publish the reply.");
        return;
      }
      const data = (await res.json()) as { submission: Submission };
      setSubmissions((prev) => prev.map((s) => (s.id === id ? data.submission : s)));
    },
    [router, staffName],
  );

  const unpublishReply = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/submissions/${id}/reply`, {
        method: "DELETE",
        headers: {
          ...(staffName ? { [STAFF_NAME_HEADER]: encodeURIComponent(staffName) } : {}),
        },
      });
      if (res.status === 401) {
        router.refresh();
        return;
      }
      if (!res.ok) {
        setError("Failed to unpublish the reply.");
        return;
      }
      const data = (await res.json()) as { submission: Submission };
      setSubmissions((prev) => prev.map((s) => (s.id === id ? data.submission : s)));
    },
    [router, staffName],
  );

  const deleteSubmission = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/submissions/${id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.refresh();
        return;
      }
      if (!res.ok) {
        setError("Failed to delete the request.");
        return;
      }
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      setSelectedId((prev) => (prev === id ? null : prev));
    },
    [router],
  );

  const signOut = useCallback(async () => {
    await fetch("/api/staff/login", { method: "DELETE" });
    router.refresh();
  }, [router]);

  const stats = useMemo(() => {
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
    let attention = 0;
    for (const s of submissions) {
      byStatus[s.status] += 1;
      if (s.triage.requiresImmediateAttention && s.status !== "resolved" && s.status !== "closed") {
        attention += 1;
      }
    }
    return { total: submissions.length, byStatus, attention };
  }, [submissions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return submissions.filter((s) => {
      if (statusFilter === "attention") {
        if (!s.triage.requiresImmediateAttention) return false;
      } else if (statusFilter !== "all" && s.status !== statusFilter) {
        return false;
      }
      if (categoryFilter !== "all" && s.triage.category !== categoryFilter) return false;
      if (q) {
        const haystack = `${s.input.fullName} ${s.input.message} ${s.triage.summary}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [submissions, statusFilter, categoryFilter, search]);

  const selected = submissions.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
            Staff dashboard
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Review incoming requests, AI triage drafts, and update statuses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={refreshing}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-paper-dim disabled:opacity-60"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          {isProtected && (
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-paper-dim"
            >
              Sign out
            </button>
          )}
        </div>
      </div>

      {!isProtected && (
        <p className="mt-3 rounded-lg bg-gold-soft px-3 py-2 text-xs text-ink">
          The dashboard is running without a password (demo mode). Set{" "}
          <code className="font-mono">DASHBOARD_PASSWORD</code> before any real deployment —
          intake data is sensitive.
        </p>
      )}

      {backend && (
        <p className="mt-3 text-xs text-ink-faint">
          Storage backend:{" "}
          <span className="font-medium text-ink-soft">
            {backend === "supabase" ? "Supabase" : "Local JSON file (demo mode)"}
          </span>
        </p>
      )}

      <StaffNameControl staffName={staffName} onSave={saveStaffName} />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total requests" value={stats.total} />
        <StatCard label="New" value={stats.byStatus.new} />
        <StatCard label="In progress" value={stats.byStatus.in_progress} />
        <StatCard label="Needs attention" value={stats.attention} highlight={stats.attention > 0} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <label htmlFor="submission-search" className="sr-only">
          Search submissions
        </label>
        <input
          id="submission-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or message…"
          className="w-full max-w-xs rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
        <label htmlFor="status-filter" className="sr-only">
          Filter by status
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="all">All statuses</option>
          <option value="attention">Needs attention</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <label htmlFor="category-filter" className="sr-only">
          Filter by category
        </label>
        <select
          id="category-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <EmptyState hasAny={submissions.length > 0} />
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`w-full rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-brand/40 ${
                  selectedId === s.id ? "border-brand ring-1 ring-brand" : "border-line"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{s.input.fullName}</span>
                  <span className="text-xs text-ink-faint">{formatDateTime(s.createdAt)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{s.triage.summary}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <CategoryBadge category={s.triage.category} />
                  <UrgencyBadge urgency={s.triage.urgency} />
                  <StatusBadge status={s.status} />
                  {s.triage.requiresImmediateAttention && (
                    <span className="text-xs font-medium text-red-600">⚠ attention</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          {selected ? (
            <SubmissionDetail
              key={selected.id}
              submission={selected}
              onUpdate={updateSubmission}
              onDelete={deleteSubmission}
              onPublishReply={publishReply}
              onUnpublishReply={unpublishReply}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center text-sm text-ink-faint">
              Select a request to see the full details and AI triage.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StaffNameControl({
  staffName,
  onSave,
}: {
  staffName: string;
  onSave: (name: string) => void;
}) {
  const [editing, setEditing] = useState(!staffName);
  const [draft, setDraft] = useState(staffName);
  // `editing` is mostly derived from `staffName` (exit edit mode once a name
  // is known — e.g. after the dashboard loads it from localStorage — but
  // let the user reopen it via "Change"). Adjust it here, during render, per
  // https://react.dev/learn/you-might-not-need-an-effect rather than in an
  // effect, which would cost an extra render pass.
  const [prevStaffName, setPrevStaffName] = useState(staffName);
  if (staffName !== prevStaffName) {
    setPrevStaffName(staffName);
    if (staffName) setEditing(false);
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    onSave(draft);
  }

  if (!editing) {
    return (
      <p className="mt-3 text-xs text-ink-faint">
        Reviewing as <span className="font-medium text-ink-soft">{staffName}</span>.{" "}
        <button
          type="button"
          onClick={() => {
            setDraft(staffName);
            setEditing(true);
          }}
          className="underline hover:text-ink-soft"
        >
          Change
        </button>
      </p>
    );
  }

  return (
    <form onSubmit={handleSave} className="mt-3 flex flex-wrap items-center gap-2 text-xs">
      <label htmlFor="staff-name" className="text-ink-faint">
        Your name (shown to your team — this isn&apos;t a login):
      </label>
      <input
        id="staff-name"
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="e.g. Jordan"
        className="rounded-md border border-line bg-white px-2 py-1 text-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
      />
      <button
        type="submit"
        disabled={!draft.trim()}
        className="rounded-md bg-ink px-2.5 py-1 font-medium text-paper transition hover:bg-brand-dark disabled:opacity-50"
      >
        Save
      </button>
    </form>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? "border-red-200 bg-red-50" : "border-line bg-white"
      }`}
    >
      <p className={`text-2xl font-semibold ${highlight ? "text-red-700" : "text-ink"}`}>
        {value}
      </p>
      <p className="text-xs text-ink-faint">{label}</p>
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center">
      <p className="text-sm text-ink-soft">
        {hasAny ? "No requests match your filters." : "No requests yet."}
      </p>
      {!hasAny && (
        <Link
          href="/intake"
          className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-paper transition hover:bg-brand-dark"
        >
          Submit a test request
        </Link>
      )}
    </div>
  );
}
