"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import { formatDateTime } from "@/lib/ui";

type LookupStatus = "loading" | "not-found" | "found";

interface StatusResponse {
  status: string;
  createdAt: string;
  reply: { message: string; publishedAt: string } | null;
}

export function StatusLookup({ id }: { id: string }) {
  const { locale, setLocale, t } = useLocale();
  const [status, setStatus] = useState<LookupStatus>("loading");
  const [data, setData] = useState<StatusResponse | null>(null);

  useEffect(() => {
    // No need to reset to "loading" here — that's already the initial state,
    // and `id` is fixed for the lifetime of this component (one id per page).
    let cancelled = false;
    fetch(`/api/status/${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json() as Promise<StatusResponse>;
      })
      .then((body) => {
        if (cancelled) return;
        setData(body);
        setStatus("found");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("not-found");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const languageSwitcher = (
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
  );

  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
      {languageSwitcher}

      <div className="mt-4" role="status" aria-live="polite">
        {status === "loading" && <p className="text-sm text-ink-faint">…</p>}

        {status === "not-found" && (
          <>
            <h2 className="font-display text-lg font-medium text-ink">
              {t("statusNotFoundTitle")}
            </h2>
            <p className="mt-2 text-sm text-ink-soft">{t("statusNotFoundBody")}</p>
          </>
        )}

        {status === "found" && data && (
          <>
            {data.reply ? (
              <>
                <h2 className="font-display text-lg font-medium text-ink">
                  {t("statusReplyTitle")}
                </h2>
                <p className="mt-1 text-xs text-ink-faint">
                  {t("statusReplySentLabel")} {formatDateTime(data.reply.publishedAt)}
                </p>
                <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-line bg-paper p-3 font-sans text-sm text-ink">
                  {data.reply.message}
                </pre>
              </>
            ) : (
              <>
                <h2 className="font-display text-lg font-medium text-ink">
                  {t("statusStillReviewingTitle")}
                </h2>
                <p className="mt-2 text-sm text-ink-soft">{t("statusStillReviewingBody")}</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
