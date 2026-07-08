"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";
import { buildIntakeInputSchema } from "@/lib/types";

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
  "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25";

type FieldErrors = Partial<Record<keyof FormState, string>>;

export function IntakeForm() {
  const { locale, setLocale, t } = useLocale();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = buildIntakeInputSchema(locale).safeParse(form);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const nextFieldErrors: FieldErrors = {};
      for (const key of Object.keys(flat) as Array<keyof FormState>) {
        const message = flat[key]?.[0];
        if (message) nextFieldErrors[key] = message;
      }
      setFieldErrors(nextFieldErrors);
      return;
    }
    setFieldErrors({});

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
          locale,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? t("genericError"));
      }

      const data = (await res.json()) as { submission: { id: string } };
      setSubmissionId(data.submission.id);
      setStatus("success");
      setForm(EMPTY);
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : t("genericError"));
    }
  }

  async function copyCode() {
    if (!submissionId) return;
    await navigator.clipboard.writeText(submissionId);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  const languageSwitcher = (
    <div className="flex items-center justify-end gap-1 text-xs">
      <span className="sr-only">{t("languageLabel")}</span>
      {(["en", "es"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={`rounded-md px-2 py-1 font-medium transition ${
            locale === code
              ? "bg-ink text-paper"
              : "text-ink-faint hover:bg-paper-dim hover:text-ink"
          }`}
        >
          {code === "en" ? t("languageEnglish") : t("languageSpanish")}
        </button>
      ))}
    </div>
  );

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-line bg-brand-soft p-8 text-center">
        {languageSwitcher}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand text-2xl text-paper">
          ✓
        </div>
        <h2 className="mt-4 font-display text-xl font-medium text-ink">{t("successTitle")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{t("successBody")}</p>

        {submissionId && (
          <div className="mx-auto mt-6 max-w-md rounded-xl border border-line bg-white p-4 text-left">
            <h3 className="font-display text-sm font-medium text-ink">{t("statusSaveIdTitle")}</h3>
            <p className="mt-1 text-xs text-ink-soft">{t("statusSaveIdBody")}</p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 truncate rounded-md border border-line bg-paper px-2.5 py-1.5 font-mono text-xs text-ink">
                {submissionId}
              </code>
              <button
                type="button"
                onClick={() => void copyCode()}
                aria-live="polite"
                className="rounded-md border border-brand/30 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-dark transition hover:bg-brand-soft"
              >
                {codeCopied ? t("statusCodeCopied") : t("statusCopyCode")}
              </button>
            </div>
            <Link
              href={`/status/${submissionId}`}
              className="mt-3 inline-block text-xs font-medium text-brand-dark underline hover:text-brand"
            >
              {t("statusCheckLinkCta")}
            </Link>
            <p className="mt-3 text-xs text-ink-faint">{t("statusPrivacyNote")}</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setSubmissionId(null);
          }}
          className="mt-6 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-paper transition hover:bg-brand-dark"
        >
          {t("submitAnother")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
      {languageSwitcher}
      <div className="mt-4 grid gap-5">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-ink">
            {t("nameLabel")} <span className="text-red-600">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            className={inputClass}
            placeholder={t("namePlaceholder")}
            aria-invalid={Boolean(fieldErrors.fullName)}
            aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
          />
          {fieldErrors.fullName && (
            <p id="fullName-error" role="alert" className="mt-1 text-xs text-red-600">
              {fieldErrors.fullName}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs text-ink-faint">{t("contactRequiredHint")}</p>
          <div className="mt-2 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink">
                {t("emailLabel")}
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputClass}
                placeholder={t("emailPlaceholder")}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
              />
              {fieldErrors.email && (
                <p id="email-error" role="alert" className="mt-1 text-xs text-red-600">
                  {fieldErrors.email}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-ink">
                {t("phoneLabel")}
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className={inputClass}
                placeholder={t("phonePlaceholder")}
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
              />
              {fieldErrors.phone && (
                <p id="phone-error" role="alert" className="mt-1 text-xs text-red-600">
                  {fieldErrors.phone}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="preferredContact" className="block text-sm font-medium text-ink">
              {t("preferredContactLabel")}
            </label>
            <select
              id="preferredContact"
              value={form.preferredContact}
              onChange={(e) =>
                update("preferredContact", e.target.value as FormState["preferredContact"])
              }
              className={inputClass}
            >
              <option value="either">{t("preferredContactEither")}</option>
              <option value="email">{t("preferredContactEmail")}</option>
              <option value="phone">{t("preferredContactPhone")}</option>
            </select>
          </div>
          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-ink">
              {t("zipLabel")} <span className="text-ink-faint">{t("zipOptional")}</span>
            </label>
            <input
              id="zipCode"
              type="text"
              value={form.zipCode}
              onChange={(e) => update("zipCode", e.target.value)}
              className={inputClass}
              placeholder={t("zipPlaceholder")}
            />
          </div>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-ink">
            {t("messageLabel")} <span className="text-red-600">*</span>
          </label>
          <textarea
            id="message"
            required
            rows={6}
            value={form.message}
            onChange={(e) => update("message", e.target.value)}
            className={inputClass}
            placeholder={t("messagePlaceholder")}
            aria-invalid={Boolean(fieldErrors.message)}
            aria-describedby={fieldErrors.message ? "message-error" : "message-hint"}
          />
          {fieldErrors.message ? (
            <p id="message-error" role="alert" className="mt-1 text-xs text-red-600">
              {fieldErrors.message}
            </p>
          ) : (
            <p id="message-hint" className="mt-1 text-xs text-ink-faint">
              {t("messageHint")}
            </p>
          )}
        </div>

        <div>
          <label className="flex items-start gap-3 rounded-lg bg-paper-dim p-4">
            <input
              id="consent"
              type="checkbox"
              checked={form.consent}
              onChange={(e) => update("consent", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-line text-brand focus:ring-brand"
              aria-invalid={Boolean(fieldErrors.consent)}
              aria-describedby={fieldErrors.consent ? "consent-error" : undefined}
            />
            <span className="text-sm text-ink-soft">
              {t("consentLabel")} <span className="text-red-600">*</span>
            </span>
          </label>
          {fieldErrors.consent && (
            <p id="consent-error" role="alert" className="mt-1 text-xs text-red-600">
              {fieldErrors.consent}
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-ink-faint">{t("emergencyNotice")}</p>
          <button
            type="submit"
            disabled={status === "submitting"}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-paper shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "submitting" ? t("submittingButton") : t("submitButton")}
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-ink-faint">
        {t("staffLinkPrefix")}{" "}
        <Link href="/dashboard" className="underline hover:text-ink-soft">
          {t("staffLinkCta")}
        </Link>
      </p>
    </form>
  );
}
