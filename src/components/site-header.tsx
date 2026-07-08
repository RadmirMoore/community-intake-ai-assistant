import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white"
          >
            CI
          </span>
          <span className="hidden sm:inline">Community Intake Assistant</span>
          <span className="sm:hidden">Intake</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          <Link
            href="/intake"
            className="rounded-md px-3 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Request help
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md bg-slate-900 px-3 py-2 text-white transition hover:bg-slate-700"
          >
            Staff dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
