"use client";

import { useState } from "react";
import { CategoryBadge, StatusBadge, UrgencyBadge } from "@/components/badges";
import { STATUSES, STATUS_LABELS, type Status, type Submission } from "@/lib/types";
import { formatDateTime } from "@/lib/ui";

interface Props {
  submission: Submission;
  onUpdate: (id: string, patch: { status?: Status; staffNotes?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function SubmissionDetail({ submission, onUpdate, onDelete }: Props) {
  // This component is remounted via a `key` on the submission id (see Dashboard),
  // so initializing from props here always reflects the selected submission.
  const [notes, setNotes] = useState(submission.staffNotes);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { input, triage } = submission;

  async function saveNotes() {
    setSavingNotes(true);
    await onUpdate(submission.id, { staffNotes: notes });
    setSavingNotes(false);
    setNotesSaved(true);
  }

  async function confirmDelete() {
    setDeleting(true);
    await onDelete(submission.id);
    setDeleting(false);
  }

  async function copyFollowUp() {
    await navigator.clipboard.writeText(triage.suggestedFollowUp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      {triage.requiresImmediateAttention && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          ⚠ This request was flagged as possibly needing immediate human attention.
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={triage.category} />
          <UrgencyBadge urgency={triage.urgency} />
          <StatusBadge status={submission.status} />
        </div>
        <h2 className="mt-3 font-display text-xl font-medium text-ink">{input.fullName}</h2>
        <p className="text-sm text-ink-faint">Received {formatDateTime(submission.createdAt)}</p>
        {submission.reviewedBy && (
          <p className="mt-0.5 text-xs text-ink-faint">
            Last reviewed by <span className="font-medium text-ink-soft">{submission.reviewedBy}</span>
          </p>
        )}
      </div>

      <section className="rounded-xl border border-line bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Contact</h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink-faint">Email</dt>
          <dd className="text-ink">{input.email || "—"}</dd>
          <dt className="text-ink-faint">Phone</dt>
          <dd className="text-ink">{input.phone || "—"}</dd>
          <dt className="text-ink-faint">Preferred</dt>
          <dd className="text-ink capitalize">{input.preferredContact}</dd>
          <dt className="text-ink-faint">ZIP</dt>
          <dd className="text-ink">{input.zipCode || "—"}</dd>
        </dl>
      </section>

      <section className="rounded-xl border border-line bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Original message
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{input.message}</p>
      </section>

      <section className="rounded-xl border border-brand/25 bg-brand-soft/60 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-dark">
            AI triage · review before acting
          </h3>
          <span className="text-xs text-brand-dark">
            {triage.generatedByAI
              ? `${triage.model} · ${Math.round(triage.confidence * 100)}% conf.`
              : "rule-based (no AI key)"}
          </span>
        </div>

        <p className="mt-3 text-sm font-medium text-ink-faint">Summary</p>
        <p className="mt-1 text-sm text-ink">{triage.summary}</p>

        {triage.safetyFlags.length > 0 && (
          <>
            <p className="mt-3 text-sm font-medium text-ink-faint">Safety flags</p>
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
            <p className="mt-3 text-sm font-medium text-ink-faint">Recommended next steps</p>
            <ul className="mt-1 space-y-1">
              {triage.recommendedActions.map((action, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink">
                  <span aria-hidden className="text-brand">
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
            <p className="text-sm font-medium text-ink-faint">Suggested follow-up (draft)</p>
            <button
              type="button"
              onClick={copyFollowUp}
              aria-live="polite"
              className="rounded-md border border-brand/30 bg-white px-2.5 py-1 text-xs font-medium text-brand-dark transition hover:bg-brand-soft"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-line bg-white p-3 font-sans text-sm text-ink">
            {triage.suggestedFollowUp}
          </pre>
          <p className="mt-1 text-xs text-ink-faint">
            Edit this draft before sending. Do not promise outcomes or eligibility.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
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
                  ? "cursor-default bg-ink text-paper"
                  : "border border-line bg-white text-ink-soft hover:bg-paper-dim"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Staff notes</h3>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesSaved(false);
          }}
          rows={3}
          className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
          placeholder="Internal notes for your team (not visible to the requester)."
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={saveNotes}
            disabled={savingNotes}
            className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-paper transition hover:bg-brand-dark disabled:opacity-60"
          >
            {savingNotes ? "Saving…" : "Save notes"}
          </button>
          {notesSaved && (
            <span role="status" aria-live="polite" className="text-xs text-brand-dark">
              Saved
            </span>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-red-200 bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-red-700">
          Delete request
        </h3>
        <p className="mt-1 text-xs text-ink-faint">
          Permanently removes this submission. There is no automated retention
          policy yet, so deleting is the only way to remove data on request.
        </p>
        {confirmingDelete ? (
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void confirmDelete()}
              disabled={deleting}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Yes, delete permanently"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:bg-paper-dim"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </section>
    </div>
  );
}
