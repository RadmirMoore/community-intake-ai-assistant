"use client";

import { useState } from "react";
import Link from "next/link";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  preferredContact: "email" | "phone" | "either";
  zipCode: string;
  message: string;
  consent: boolean;
};

const EMPTY: FormState = {
  fullName: "",
  email: "",
  phone: "",
  preferredContact: "either",
  zipCode: "",
  message: "",
  consent: false,
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30";

export function IntakeForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!form.consent) {
      setError("Please confirm consent so a staff member can review your request.");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          email: form.email || undefined,
          phone: form.phone || undefined,
          zipCode: form.zipCode || undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }

      setStatus("success");
      setForm(EMPTY);
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white">
          ✓
        </div>
        <h2 className="mt-4 text-xl font-semibold text-emerald-900">We received your request</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-emerald-800">
          A member of our team will review your request and follow up with you. If your situation is
          an emergency, please call 911 or your local emergency line now.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-5">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
            Your name <span className="text-red-500">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            className={inputClass}
            placeholder="How should we address you?"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
              Phone <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className={inputClass}
              placeholder="(555) 555-5555"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="preferredContact" className="block text-sm font-medium text-slate-700">
              Preferred contact
            </label>
            <select
              id="preferredContact"
              value={form.preferredContact}
              onChange={(e) =>
                update("preferredContact", e.target.value as FormState["preferredContact"])
              }
              className={inputClass}
            >
              <option value="either">Either is fine</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
          </div>
          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-slate-700">
              ZIP code <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="zipCode"
              type="text"
              value={form.zipCode}
              onChange={(e) => update("zipCode", e.target.value)}
              className={inputClass}
              placeholder="Helps us find local resources"
            />
          </div>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-slate-700">
            How can we help? <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            required
            rows={6}
            value={form.message}
            onChange={(e) => update("message", e.target.value)}
            className={inputClass}
            placeholder="Tell us what you need in your own words. Please avoid sharing more sensitive details than necessary."
          />
          <p className="mt-1 text-xs text-slate-500">
            Please don&apos;t include sensitive information like full financial account numbers.
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(e) => update("consent", e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-slate-600">
            I consent to a staff member reviewing this request to help me. I understand this is not
            an emergency service and does not provide legal or medical advice.{" "}
            <span className="text-red-500">*</span>
          </span>
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            In an emergency, call <strong>911</strong> instead of using this form.
          </p>
          <button
            type="submit"
            disabled={status === "submitting"}
            className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "submitting" ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Are you staff?{" "}
        <Link href="/dashboard" className="underline hover:text-slate-600">
          Go to the dashboard
        </Link>
      </p>
    </form>
  );
}
