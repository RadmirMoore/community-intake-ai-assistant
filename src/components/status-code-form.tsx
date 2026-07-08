"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/context";

export function StatusCodeForm() {
  const router = useRouter();
  const { locale, setLocale, t } = useLocale();
  const [code, setCode] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    router.push(`/status/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center justify-end gap-1 text-xs">
        {(["en", "es"] as const).map((localeCode) => (
          <button
            key={localeCode}
            type="button"
            onClick={() => setLocale(localeCode)}
            aria-pressed={locale === localeCode}
            className={`rounded-md px-2 py-1 font-medium transition ${
              locale === localeCode
                ? "bg-ink text-paper"
                : "text-ink-faint hover:bg-paper-dim hover:text-ink"
            }`}
          >
            {localeCode === "en" ? t("languageEnglish") : t("languageSpanish")}
          </button>
        ))}
      </div>

      <p className="mt-2 text-sm text-ink-soft">{t("statusPageIntro")}</p>

      <form onSubmit={handleSubmit} className="mt-4">
        <label htmlFor="status-code" className="block text-sm font-medium text-ink">
          {t("statusCodeInputLabel")}
        </label>
        <input
          id="status-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t("statusCodeInputPlaceholder")}
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 font-mono text-sm text-ink shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
        <button
          type="submit"
          disabled={!code.trim()}
          className="mt-4 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-paper shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("statusCheckButton")}
        </button>
      </form>
    </div>
  );
}
