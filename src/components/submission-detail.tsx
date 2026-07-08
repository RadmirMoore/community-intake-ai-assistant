"use client";

import { useState } from "react";
import { CategoryBadge, StatusBadge, UrgencyBadge } from "@/components/badges";
import { STATUSES, STATUS_LABELS, type Status, type Submission } from "@/lib/types";
import { formatDateTime } from "@/lib/ui";

interface Props {
  submission: Submission;
  onUpdate: (id: string, patch: { status?: Status; staffNotes?: string }) => Promise<void>;
}

export function SubmissionDetail({ submission, onUpdate }: Props) {
  // This component is remounted via a `key` on the submission id (see Dashboard),
  // so initializing from props here always reflects the selected submission.
  const [notes, setNotes] = useState(submission.staffNotes);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const { input, triage } = submission;

  async function saveNotes() {
    setSavingNotes(true);
    await onUpdate(submission.id, { staffNotes: notes });
    setSavingNotes(false);
    setNotesSaved(true);
  }

  async function copyFollowUp() {
    await navigator.clipboard.writeText(triage.suggestedFollowUp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      {triage.requiresImmediateAttention && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          ⚠ This request was flagged as possibly needing immediate human attention.
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={triage.category} />
          <UrgencyBadge urgency={triage.urgency} />
          <StatusBadge status={submission.status} />
        </div>
        <h2 className="mt-3 text-xl font-semibold text-slate-900">{input.fullName}</h2>
        <p className="text-sm text-slate-500">Received {formatDateTime(submission.createdAt)}</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-slate-500">Email</dt>
          <dd className="text-slate-800">{input.email || "—"}</dd>
          <dt className="text-slate-500">Phone</dt>
          <dd className="text-slate-800">{input.phone || "—"}</dd>
          <dt className="text-slate-500">Preferred</dt>
          <dd className="text-slate-800 capitalize">{input.preferredContact}</dd>
          <dt className="text-slate-500">ZIP</dt>
          <dd className="text-slate-800">{input.zipCode || "—"}</dd>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Original message
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{input.message}</p>
      </section>

      <section className="rounded-xl border border-teal-200 bg-teal-50/50 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-700">
            AI triage · review before acting
          </h3>
          <span className="text-xs text-teal-700">
            {triage.generatedByAI
              ? `${triage.model} · ${Math.round(triage.confidence * 100)}% conf.`
              : "rule-based (no AI key)"}
          </span>
        </div>

        <p className="mt-3 text-sm font-medium text-slate-500">Summary</p>
        <p className="mt-1 text-sm text-slate-800">{triage.summary}</p>

        {triage.safetyFlags.length > 0 && (
          <>
            <p className="mt-3 text-sm font-medium text-slate-500">Safety flags</p>
            <ul className="mt-1 space-y-1">
              {triage.safetyFlags.map((flag, i) => (
                <li key={i} className="flex gap-2 text-sm text-red-700">
                  <span aria-hidden>•</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {triage.recommendedActions.length > 0 && (
          <>
            <p className="mt-3 text-sm font-medium text-slate-500">Recommended next steps</p>
            <ul className="mt-1 space-y-1">
              {triage.recommendedActions.map((action, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-800">
                  <span aria-hidden className="text-teal-600">
                    ✓
                  </span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Suggested follow-up (draft)</p>
            <button
              type="button"
              onClick={copyFollowUp}
              className="rounded-md border border-teal-300 bg-white px-2.5 py-1 text-xs font-medium text-teal-700 transition hover:bg-teal-50"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 font-sans text-sm text-slate-800">
            {triage.suggestedFollowUp}
          </pre>
          <p className="mt-1 text-xs text-slate-500">
            Edit this draft before sending. Do not promise outcomes or eligibility.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Update status
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onUpdate(submission.id, { status: s })}
              disabled={submission.status === s}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                submission.status === s
                  ? "cursor-default bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Staff notes</h3>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesSaved(false);
          }}
          rows={3}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
          placeholder="Internal notes for your team (not visible to the requester)."
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={saveNotes}
            disabled={savingNotes}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {savingNotes ? "Saving…" : "Save notes"}
          </button>
          {notesSaved && <span className="text-xs text-emerald-600">Saved</span>}
        </div>
      </section>
    </div>
  );
}
