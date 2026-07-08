import Link from "next/link";
import { CATEGORY_ICONS } from "@/components/icons";
import { LiveTriagePreview } from "@/components/live-triage-preview";
import { CATEGORY_LABELS, type Category } from "@/lib/types";

const STEPS = [
  {
    title: "Person submits a request",
    body: "A simple, low-pressure form. Contact details are optional so people in crisis can still reach out.",
  },
  {
    title: "AI drafts a triage",
    body: "Claude classifies the request, writes a short summary, flags safety concerns, and drafts a follow-up message.",
  },
  {
    title: "Staff review and act",
    body: "A human always reviews the AI draft, updates the status, and decides what happens next. Nothing is automated end to end.",
  },
];

const CATEGORIES: Category[] = ["housing", "food", "healthcare", "legal", "emergency", "general"];

export default function Home() {
  return (
    <div>
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <span className="inline-flex items-center rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-dark ring-1 ring-inset ring-brand/20">
            Built for small nonprofits
          </span>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
            AI-assisted intake and triage that keeps humans in control
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-soft">
            A lightweight workflow that helps food banks, housing programs, clinics, legal aid, and
            community centers process incoming requests faster — without ever removing the human from
            the loop.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/intake"
              className="rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-paper shadow-sm transition hover:bg-brand-dark"
            >
              Try the intake form
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-paper-dim"
            >
              Open the staff dashboard
            </Link>
          </div>
        </div>
      </section>

      <LiveTriagePreview />

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">How it works</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="rounded-xl border border-line bg-white p-6 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper">
                {index + 1}
              </div>
              <h3 className="mt-4 font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">
            Requests we help route
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c];
              return (
                <div
                  key={c}
                  className="flex flex-col items-center gap-2.5 rounded-xl border border-line bg-paper p-4 text-center"
                >
                  <Icon className="h-6 w-6 text-brand" />
                  <span className="text-sm font-medium text-ink">{CATEGORY_LABELS[c]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="rounded-2xl border border-line bg-gold-soft p-6 sm:p-8">
          <h2 className="font-display text-lg font-medium text-ink">Privacy &amp; safety by design</h2>
          <ul className="mt-4 grid gap-3 text-sm text-ink-soft sm:grid-cols-2">
            <li className="flex gap-2">
              <span aria-hidden className="text-gold">✓</span>
              <span>
                <strong className="text-ink">Human review required.</strong> AI output is always a
                draft for staff to approve, edit, or discard.
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="text-gold">✓</span>
              <span>
                <strong className="text-ink">No automated advice.</strong> The assistant never gives
                legal or medical advice — it points people to qualified humans.
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="text-gold">✓</span>
              <span>
                <strong className="text-ink">Minimal data.</strong> Contact fields are optional and
                consent is required before a request is stored.
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="text-gold">✓</span>
              <span>
                <strong className="text-ink">Emergency flagging.</strong> Requests that look urgent
                are surfaced for immediate human attention.
              </span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
