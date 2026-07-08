import type { Metadata } from "next";
import { StatusLookup } from "@/components/status-lookup";
import { LocaleProvider } from "@/lib/i18n/context";

export const metadata: Metadata = {
  title: "Check your request · Community Intake Assistant",
  // The URL itself is a bearer token (the id) — it must never end up in a
  // search index or a shared link-preview cache. See docs/RESPONSIBLE_AI.md.
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StatusIdPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
        Check your request
      </h1>
      <div className="mt-8">
        <LocaleProvider>
          <StatusLookup id={id} />
        </LocaleProvider>
      </div>
    </div>
  );
}
