"use client";

import { useCallback, useMemo, useState } from "react";
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
        headers: { "Content-Type": "application/json" },
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Staff dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Review incoming requests, AI triage drafts, and update statuses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={refreshing}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          {isProtected && (
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Sign out
            </button>
          )}
        </div>
      </div>

      {!isProtected && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          The dashboard is running without a password (demo mode). Set{" "}
          <code className="font-mono">DASHBOARD_PASSWORD</code> before any real deployment —
          intake data is sensitive.
        </p>
      )}

      {backend && (
        <p className="mt-3 text-xs text-slate-500">
          Storage backend:{" "}
          <span className="font-medium text-slate-700">
            {backend === "supabase" ? "Supabase" : "Local JSON file (demo mode)"}
          </span>
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total requests" value={stats.total} />
        <StatCard label="New" value={stats.byStatus.new} />
        <StatCard label="In progress" value={stats.byStatus.in_progress} />
        <StatCard label="Needs attention" value={stats.attention} highlight={stats.attention > 0} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or message…"
          className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
        >
          <option value="all">All statuses</option>
          <option value="attention">Needs attention</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
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
                className={`w-full rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-teal-300 ${
                  selectedId === s.id ? "border-teal-500 ring-1 ring-teal-500" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{s.input.fullName}</span>
                  <span className="text-xs text-slate-400">{formatDateTime(s.createdAt)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{s.triage.summary}</p>
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
            <SubmissionDetail key={selected.id} submission={selected} onUpdate={updateSubmission} />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              Select a request to see the full details and AI triage.
            </div>
          )}
        </div>
      </div>
    </div>
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
        highlight ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-2xl font-bold ${highlight ? "text-red-700" : "text-slate-900"}`}>
        {value}
      </p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-sm text-slate-600">
        {hasAny ? "No requests match your filters." : "No requests yet."}
      </p>
      {!hasAny && (
        <Link
          href="/intake"
          className="mt-3 inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          Submit a test request
        </Link>
      )}
    </div>
  );
}
