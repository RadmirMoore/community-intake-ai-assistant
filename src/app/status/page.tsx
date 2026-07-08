import type { Metadata } from "next";
import { StatusCodeForm } from "@/components/status-code-form";
import { LocaleProvider } from "@/lib/i18n/context";

export const metadata: Metadata = {
  title: "Check your request · Community Intake Assistant",
  robots: { index: false, follow: false },
};

export default function StatusPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
        Check your request
      </h1>
      <div className="mt-8">
        <LocaleProvider>
          <StatusCodeForm />
        </LocaleProvider>
      </div>
    </div>
  );
}
