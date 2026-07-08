import Link from "next/link";
import { BrandMark } from "@/components/icons";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-paper">
            <BrandMark className="h-4.5 w-4.5" />
          </span>
          <span className="hidden font-display text-[1.05rem] font-medium tracking-tight sm:inline">
            Community Intake Assistant
          </span>
          <span className="font-display text-[1.05rem] font-medium tracking-tight sm:hidden">
            Intake
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          <Link
            href="/intake"
            className="rounded-md px-3 py-2 text-ink-soft transition hover:bg-paper-dim hover:text-ink"
          >
            Request help
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md bg-ink px-3 py-2 text-paper transition hover:bg-brand-dark"
          >
            Staff dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
