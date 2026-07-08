"use client";

import { useRef, useState } from "react";
import { CategoryBadge, UrgencyBadge } from "@/components/badges";
import { CATEGORY_ICONS } from "@/components/icons";
import { PREVIEW_PRESETS } from "@/lib/preview-presets";
import type { Triage } from "@/lib/types";

type PreviewStatus = "idle" | "loading" | "success" | "error";

export function LiveTriagePreview() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [triage, setTriage] = useState<Triage | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function runPreset(id: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSelectedId(id);
    setStatus("loading");
    setTriage(null);

    try {
      const res = await fetch("/api/preview-triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId: id }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Preview request failed.");
      const data = (await res.json()) as { triage: Triage };
      setTriage(data.triage);
      setStatus("success");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setStatus("error");
    }
  }

  const selectedPreset = selectedId ? PREVIEW_PRESETS[selectedId] : null;

  return (
    <section className="border-b border-line bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
          </span>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">Try it live</h2>
        </div>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Pick an example below — this calls the same triage engine the app uses, not a recording.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {Object.entries(PREVIEW_PRESETS).map(([id, preset]) => {
            const Icon = CATEGORY_ICONS[preset.category];
            const active = selectedId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => void runPreset(id)}
                disabled={status === "loading"}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  active
                    ? "border-brand bg-brand-soft text-brand-dark"
                    : "border-line bg-white text-ink hover:bg-paper-dim"
                }`}
              >
                <Icon className="h-4 w-4" />
                {preset.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          Example messages for demonstration only — if you or someone else needs help right now, call
          911 or your local emergency line.
        </p>

        {selectedPreset && (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-paper p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Example message
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{selectedPreset.message}</p>
            </div>

            <div>
              {status === "loading" && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex h-full min-h-[180px] items-center justify-center rounded-xl border border-dashed border-line bg-white text-sm text-ink-faint"
                >
                  Running triage…
                </div>
              )}

              {status === "error" && (
                <div
                  role="alert"
                  className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line bg-white p-4 text-center text-sm text-ink-faint"
                >
                  <p>Something went wrong running this preview.</p>
                  <button
                    type="button"
                    onClick={() => selectedId && void runPreset(selectedId)}
                    className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-paper-dim"
                  >
                    Try again
                  </button>
                </div>
              )}

              {status === "success" && triage && (
                <section className="rounded-xl border border-brand/25 bg-brand-soft/60 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-dark">
                      AI triage result
                    </h3>
                    <span className="text-xs text-brand-dark">
                      {triage.generatedByAI
                        ? `${triage.model} · ${Math.round(triage.confidence * 100)}% conf.`
                        : "rule-based (no AI key)"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <CategoryBadge category={triage.category} />
                    <UrgencyBadge urgency={triage.urgency} />
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

                  <p className="mt-3 text-sm font-medium text-ink-faint">Suggested follow-up (draft)</p>
                  <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-line bg-white p-3 font-sans text-sm text-ink">
                    {triage.suggestedFollowUp}
                  </pre>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
