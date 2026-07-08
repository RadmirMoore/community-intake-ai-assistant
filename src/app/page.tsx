import Link from "next/link";

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

const CATEGORIES = [
  { label: "Housing", emoji: "🏠" },
  { label: "Food & nutrition", emoji: "🥫" },
  { label: "Healthcare access", emoji: "🩺" },
  { label: "Legal aid", emoji: "⚖️" },
  { label: "Emergency", emoji: "🚨" },
  { label: "General", emoji: "💬" },
];

export default function Home() {
  return (
    <div>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-600/20">
            Built for small nonprofits
          </span>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            AI-assisted intake and triage that keeps humans in control
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            A lightweight workflow that helps food banks, housing programs, clinics, legal aid, and
            community centers process incoming requests faster — without ever removing the human from
            the loop.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/intake"
              className="rounded-lg bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
            >
              Try the intake form
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Open the staff dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-700">How it works</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {index + 1}
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Requests we help route
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((c) => (
              <div
                key={c.label}
                className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-center"
              >
                <span className="text-2xl" aria-hidden>
                  {c.emoji}
                </span>
                <span className="text-sm font-medium text-slate-700">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-amber-900">Privacy &amp; safety by design</h2>
          <ul className="mt-4 grid gap-3 text-sm text-amber-900 sm:grid-cols-2">
            <li className="flex gap-2">
              <span aria-hidden>✓</span>
              <span>
                <strong>Human review required.</strong> AI output is always a draft for staff to
                approve, edit, or discard.
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>✓</span>
              <span>
                <strong>No automated advice.</strong> The assistant never gives legal or medical
                advice — it points people to qualified humans.
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>✓</span>
              <span>
                <strong>Minimal data.</strong> Contact fields are optional and consent is required
                before a request is stored.
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>✓</span>
              <span>
                <strong>Emergency flagging.</strong> Requests that look urgent are surfaced for
                immediate human attention.
              </span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
