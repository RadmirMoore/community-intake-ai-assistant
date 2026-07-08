"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Password gate shown in front of the staff dashboard when DASHBOARD_PASSWORD
 * is configured. On success the server sets an httpOnly session cookie and the
 * page is refreshed to render the dashboard.
 */
export function StaffLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError(res.status === 401 ? "Incorrect password." : "Something went wrong. Try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-stretch px-4 py-16 sm:px-6">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Staff sign in</h1>
      <p className="mt-2 text-sm text-ink-soft">
        The dashboard contains sensitive requests from people seeking help. Enter the staff
        password to continue.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-ink">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
        </label>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={submitting || password.length === 0}
          className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-paper transition hover:bg-brand-dark disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
