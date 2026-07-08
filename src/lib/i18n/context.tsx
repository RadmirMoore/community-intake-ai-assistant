"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, DICTIONARIES, isLocale, type Dictionary, type Locale } from "@/lib/i18n/dictionary";

const LOCALE_COOKIE = "NEXT_LOCALE";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: <K extends keyof Dictionary>(key: K) => Dictionary[K];
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  const value = match?.[1];
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Renders both server and first client paint at DEFAULT_LOCALE, then applies
 * a returning visitor's saved language after mount. A brief flash to their
 * preferred language is an acceptable trade-off for not needing the server
 * layout to read the cookie (see ROADMAP.md).
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    // Reading the cookie during render would mismatch server/first-client
    // output (document isn't available on the server); syncing it once after
    // mount is the standard fix for client-only initial state, not a derived
    // value that belongs in render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocaleState(readStoredLocale());
  }, []);

  function setLocale(next: Locale) {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
  }

  function t<K extends keyof Dictionary>(key: K): Dictionary[K] {
    return DICTIONARIES[locale][key];
  }

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
